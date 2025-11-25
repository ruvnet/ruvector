/**
 * Clinical Reporting Pipeline
 *
 * Workflow: Variants → Classification → Report Generation
 * Generates comprehensive clinical reports with ACMG classification
 */

import { GenomicVectorDB } from '../../src/index';
import ClinVarImporter from '../../integrations/clinvar-importer';
import GnomADIntegration from '../../integrations/gnomad-integration';
import HPOLookup from '../../integrations/hpo-lookup';

export interface ACMGCriteria {
  // Pathogenic criteria
  pvs1?: boolean;  // Null variant in LoF-intolerant gene
  ps1?: boolean;   // Same amino acid change as known pathogenic
  ps2?: boolean;   // De novo variant
  ps3?: boolean;   // Functional studies show deleterious
  ps4?: boolean;   // Prevalence in affected > controls
  pm1?: boolean;   // Located in mutational hot spot
  pm2?: boolean;   // Absent from controls
  pm3?: boolean;   // Detected in trans with pathogenic variant
  pm4?: boolean;   // Protein length change
  pm5?: boolean;   // Novel missense at same position as pathogenic
  pm6?: boolean;   // Assumed de novo
  pp1?: boolean;   // Cosegregation with disease
  pp2?: boolean;   // Missense in gene with low missense variation
  pp3?: boolean;   // Computational evidence supports deleterious
  pp4?: boolean;   // Patient phenotype specific for gene
  pp5?: boolean;   // Reputable source pathogenic

  // Benign criteria
  ba1?: boolean;   // High allele frequency (>5%)
  bs1?: boolean;   // Allele frequency higher than expected
  bs2?: boolean;   // Healthy adult homozygous
  bs3?: boolean;   // Functional studies show no deleterious effect
  bs4?: boolean;   // Non-segregation with disease
  bp1?: boolean;   // Missense in gene where truncating is mechanism
  bp2?: boolean;   // Observed in trans with pathogenic
  bp3?: boolean;   // In-frame indel in repeat without function
  bp4?: boolean;   // Computational evidence supports benign
  bp5?: boolean;   // Found in case with alternate cause
  bp6?: boolean;   // Reputable source benign
  bp7?: boolean;   // Synonymous with no splicing impact
}

export interface ACMGClassification {
  classification: 'pathogenic' | 'likely_pathogenic' | 'uncertain_significance' | 'likely_benign' | 'benign';
  criteria: ACMGCriteria;
  evidence: {
    pathogenic: string[];
    benign: string[];
  };
  confidence: 'high' | 'moderate' | 'low';
}

export interface ClinicalVariant {
  variantId: string;
  gene: string;
  transcript: string;
  hgvsc: string;
  hgvsp: string;
  consequence: string;
  zygosity: 'homozygous' | 'heterozygous' | 'hemizygous';
  alleleFrequency?: number;
  acmgClassification: ACMGClassification;
  inheritance?: string;
  phenotypeMatch?: number;
}

export interface ClinicalReport {
  patientId: string;
  reportId: string;
  generatedDate: string;
  referringPhysician?: string;
  indication: string;
  phenotypes: string[];

  // Sample information
  sampleType: string;
  sequencingMethod: string;
  coverage: number;

  // Findings
  primaryFindings: ClinicalVariant[];
  secondaryFindings: ClinicalVariant[];
  incidentalFindings: ClinicalVariant[];

  // Summary
  summary: string;
  recommendations: string[];

  // Disclaimer
  limitations: string[];
  disclaimer: string;
}

export class ClinicalReportingPipeline {
  private db: GenomicVectorDB;
  private clinvar: ClinVarImporter;
  private gnomad: GnomADIntegration;
  private hpo: HPOLookup;

  constructor(
    clinvar: ClinVarImporter,
    gnomad: GnomADIntegration,
    hpo: HPOLookup
  ) {
    this.db = new GenomicVectorDB({
      embeddingModel: 'text-embedding-3-small',
      dimension: 1536
    });
    this.clinvar = clinvar;
    this.gnomad = gnomad;
    this.hpo = hpo;
  }

  /**
   * Classify variant using ACMG/AMP guidelines
   */
  async classifyVariant(
    variant: any,
    patientPhenotypes?: string[]
  ): Promise<ACMGClassification> {
    const criteria: ACMGCriteria = {};
    const pathogenicEvidence: string[] = [];
    const benignEvidence: string[] = [];

    // PVS1: Null variant in LoF-intolerant gene
    if (this.isNullVariant(variant.consequence)) {
      const constraint = this.gnomad.getGeneConstraint(variant.gene);
      if (constraint && constraint.pLI > 0.9) {
        criteria.pvs1 = true;
        pathogenicEvidence.push('Null variant in loss-of-function intolerant gene (pLI > 0.9)');
      }
    }

    // PS1: Same amino acid change as known pathogenic
    const clinvarVariants = await this.clinvar.searchByGene(variant.gene);
    const sameAAChange = clinvarVariants.find(cv =>
      cv.metadata.proteinChange === variant.hgvsp &&
      cv.metadata.clinicalSignificance?.toLowerCase().includes('pathogenic')
    );
    if (sameAAChange) {
      criteria.ps1 = true;
      pathogenicEvidence.push('Same amino acid change as known pathogenic variant');
    }

    // PM2: Absent or extremely low frequency in population databases
    if (variant.alleleFrequency !== undefined) {
      if (variant.alleleFrequency === 0 || variant.alleleFrequency < 0.0001) {
        criteria.pm2 = true;
        pathogenicEvidence.push(`Extremely rare (AF: ${variant.alleleFrequency.toExponential(2)})`);
      }
    }

    // PP3: Computational evidence supports deleterious effect
    if (this.hasDeleteriousPredictions(variant)) {
      criteria.pp3 = true;
      pathogenicEvidence.push('Multiple computational predictions support deleterious effect');
    }

    // PP4: Patient phenotype highly specific for gene
    if (patientPhenotypes && patientPhenotypes.length > 0) {
      const genePhenotypes = this.hpo.getPhenotypesForGene(variant.gene);
      const overlap = patientPhenotypes.filter(p => genePhenotypes.includes(p)).length;
      if (overlap >= 3) {
        criteria.pp4 = true;
        pathogenicEvidence.push(`Strong phenotype match (${overlap} overlapping features)`);
      }
    }

    // BA1: High allele frequency (>5%)
    if (variant.alleleFrequency !== undefined && variant.alleleFrequency > 0.05) {
      criteria.ba1 = true;
      benignEvidence.push(`Common variant (AF: ${variant.alleleFrequency.toFixed(4)})`);
    }

    // BS1: Allele frequency greater than expected for disorder
    if (variant.alleleFrequency !== undefined &&
        variant.alleleFrequency > 0.01 &&
        variant.alleleFrequency <= 0.05) {
      criteria.bs1 = true;
      benignEvidence.push(`Higher frequency than expected (AF: ${variant.alleleFrequency.toFixed(4)})`);
    }

    // BP4: Computational evidence supports benign impact
    if (this.hasBenignPredictions(variant)) {
      criteria.bp4 = true;
      benignEvidence.push('Multiple computational predictions support benign effect');
    }

    // BP7: Synonymous variant with no predicted splicing impact
    if (variant.consequence?.toLowerCase().includes('synonymous')) {
      criteria.bp7 = true;
      benignEvidence.push('Synonymous variant with no predicted splicing impact');
    }

    // Classify based on criteria
    const classification = this.determineACMGClassification(criteria);

    return {
      classification,
      criteria,
      evidence: {
        pathogenic: pathogenicEvidence,
        benign: benignEvidence
      },
      confidence: this.calculateConfidence(criteria, pathogenicEvidence, benignEvidence)
    };
  }

  /**
   * Check if variant is null/loss-of-function
   */
  private isNullVariant(consequence: string): boolean {
    const lofConsequences = [
      'frameshift',
      'nonsense',
      'stop_gained',
      'stop_lost',
      'start_lost',
      'splice_acceptor',
      'splice_donor'
    ];

    return lofConsequences.some(lof =>
      consequence.toLowerCase().includes(lof)
    );
  }

  /**
   * Check computational predictions
   */
  private hasDeleteriousPredictions(variant: any): boolean {
    let delCount = 0;

    if (variant.sift?.toLowerCase() === 'deleterious') delCount++;
    if (variant.polyphen?.toLowerCase().includes('damaging')) delCount++;
    if (variant.cadd && variant.cadd > 20) delCount++;

    return delCount >= 2;
  }

  /**
   * Check benign predictions
   */
  private hasBenignPredictions(variant: any): boolean {
    let benignCount = 0;

    if (variant.sift?.toLowerCase() === 'tolerated') benignCount++;
    if (variant.polyphen?.toLowerCase() === 'benign') benignCount++;
    if (variant.cadd && variant.cadd < 10) benignCount++;

    return benignCount >= 2;
  }

  /**
   * Determine final ACMG classification based on criteria
   */
  private determineACMGClassification(criteria: ACMGCriteria): ACMGClassification['classification'] {
    // Count evidence strength
    let pathogenicScore = 0;
    let benignScore = 0;

    // Pathogenic criteria
    if (criteria.pvs1) pathogenicScore += 8;  // Very strong
    if (criteria.ps1 || criteria.ps2 || criteria.ps3 || criteria.ps4) pathogenicScore += 4; // Strong
    if (criteria.pm1 || criteria.pm2 || criteria.pm3 || criteria.pm4 || criteria.pm5 || criteria.pm6) pathogenicScore += 2; // Moderate
    if (criteria.pp1 || criteria.pp2 || criteria.pp3 || criteria.pp4 || criteria.pp5) pathogenicScore += 1; // Supporting

    // Benign criteria
    if (criteria.ba1) benignScore += 8;  // Stand-alone
    if (criteria.bs1 || criteria.bs2 || criteria.bs3 || criteria.bs4) benignScore += 4; // Strong
    if (criteria.bp1 || criteria.bp2 || criteria.bp3 || criteria.bp4 || criteria.bp5 || criteria.bp6 || criteria.bp7) benignScore += 1; // Supporting

    // Classification rules
    if (benignScore >= 8) return 'benign';
    if (benignScore >= 4) return 'likely_benign';
    if (pathogenicScore >= 10) return 'pathogenic';
    if (pathogenicScore >= 6) return 'likely_pathogenic';

    return 'uncertain_significance';
  }

  /**
   * Calculate confidence level
   */
  private calculateConfidence(
    criteria: ACMGCriteria,
    pathogenicEvidence: string[],
    benignEvidence: string[]
  ): 'high' | 'moderate' | 'low' {
    const totalEvidence = pathogenicEvidence.length + benignEvidence.length;
    const hasStrongEvidence = criteria.pvs1 || criteria.ps1 || criteria.ba1;

    if (totalEvidence >= 4 && hasStrongEvidence) return 'high';
    if (totalEvidence >= 2) return 'moderate';
    return 'low';
  }

  /**
   * Generate comprehensive clinical report
   */
  async generateReport(
    patientId: string,
    variants: any[],
    patientPhenotypes: string[],
    options: {
      indication: string;
      sampleType: string;
      sequencingMethod: string;
      coverage: number;
      referringPhysician?: string;
    }
  ): Promise<ClinicalReport> {
    console.log(`Generating clinical report for patient ${patientId}...`);

    // Classify all variants
    const classifiedVariants: ClinicalVariant[] = [];

    for (const variant of variants) {
      const classification = await this.classifyVariant(variant, patientPhenotypes);

      // Calculate phenotype match score
      let phenotypeMatch = 0;
      if (patientPhenotypes.length > 0) {
        const genePhenotypes = this.hpo.getPhenotypesForGene(variant.gene);
        phenotypeMatch = patientPhenotypes.filter(p =>
          genePhenotypes.includes(p)
        ).length / patientPhenotypes.length;
      }

      classifiedVariants.push({
        variantId: variant.variantId,
        gene: variant.gene,
        transcript: variant.transcript || '',
        hgvsc: variant.hgvsc || '',
        hgvsp: variant.hgvsp || '',
        consequence: variant.consequence || '',
        zygosity: variant.zygosity || 'heterozygous',
        alleleFrequency: variant.alleleFrequency,
        acmgClassification: classification,
        phenotypeMatch
      });
    }

    // Categorize findings
    const primaryFindings = classifiedVariants.filter(v =>
      (v.acmgClassification.classification === 'pathogenic' ||
       v.acmgClassification.classification === 'likely_pathogenic') &&
      v.phenotypeMatch && v.phenotypeMatch > 0.3
    );

    const secondaryFindings = classifiedVariants.filter(v =>
      v.acmgClassification.classification === 'uncertain_significance' &&
      v.phenotypeMatch && v.phenotypeMatch > 0.3
    );

    const incidentalFindings = classifiedVariants.filter(v =>
      (v.acmgClassification.classification === 'pathogenic' ||
       v.acmgClassification.classification === 'likely_pathogenic') &&
      (!v.phenotypeMatch || v.phenotypeMatch <= 0.3)
    );

    // Generate summary
    const summary = this.generateSummary(primaryFindings, secondaryFindings, patientPhenotypes);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      primaryFindings,
      secondaryFindings,
      incidentalFindings
    );

    const report: ClinicalReport = {
      patientId,
      reportId: `RPT-${Date.now()}`,
      generatedDate: new Date().toISOString(),
      referringPhysician: options.referringPhysician,
      indication: options.indication,
      phenotypes: patientPhenotypes,
      sampleType: options.sampleType,
      sequencingMethod: options.sequencingMethod,
      coverage: options.coverage,
      primaryFindings,
      secondaryFindings,
      incidentalFindings,
      summary,
      recommendations,
      limitations: this.getStandardLimitations(),
      disclaimer: this.getStandardDisclaimer()
    };

    return report;
  }

  /**
   * Generate summary text
   */
  private generateSummary(
    primaryFindings: ClinicalVariant[],
    secondaryFindings: ClinicalVariant[],
    phenotypes: string[]
  ): string {
    const parts: string[] = [];

    if (primaryFindings.length === 0) {
      parts.push('No pathogenic or likely pathogenic variants were identified that explain the patient\'s phenotype.');
    } else if (primaryFindings.length === 1) {
      const v = primaryFindings[0];
      parts.push(`A ${v.acmgClassification.classification.replace('_', ' ')} variant was identified in the ${v.gene} gene.`);
      parts.push(`This variant (${v.hgvsp}) is consistent with the patient's clinical presentation.`);
    } else {
      parts.push(`${primaryFindings.length} pathogenic or likely pathogenic variants were identified.`);
      const genes = primaryFindings.map(v => v.gene).join(', ');
      parts.push(`These variants affect the following genes: ${genes}.`);
    }

    if (secondaryFindings.length > 0) {
      parts.push(`Additionally, ${secondaryFindings.length} variant(s) of uncertain significance were identified that may be relevant to the phenotype.`);
    }

    return parts.join(' ');
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    primaryFindings: ClinicalVariant[],
    secondaryFindings: ClinicalVariant[],
    incidentalFindings: ClinicalVariant[]
  ): string[] {
    const recommendations: string[] = [];

    if (primaryFindings.length > 0) {
      recommendations.push('Genetic counseling is recommended to discuss inheritance, recurrence risk, and family testing.');
      recommendations.push('Clinical correlation with patient phenotype is essential.');

      // Check for actionable genes (ACMG SF v3.0)
      const actionableGenes = new Set([
        'BRCA1', 'BRCA2', 'TP53', 'STK11', 'MLH1', 'MSH2', 'MSH6', 'PMS2',
        'APC', 'MUTYH', 'VHL', 'RET', 'PTEN', 'RB1', 'WT1', 'NF2'
      ]);

      primaryFindings.forEach(v => {
        if (actionableGenes.has(v.gene)) {
          recommendations.push(`Consider clinical management guidelines for ${v.gene}-related conditions.`);
        }
      });

      recommendations.push('Confirmatory testing by Sanger sequencing or alternative method may be indicated.');
    }

    if (secondaryFindings.length > 0) {
      recommendations.push('Re-evaluation of variants of uncertain significance may be warranted as new evidence becomes available.');
      recommendations.push('Segregation analysis in family members may help clarify pathogenicity.');
    }

    if (incidentalFindings.length > 0) {
      recommendations.push('Incidental findings were reported according to ACMG recommendations. Patient should be informed and counseled appropriately.');
    }

    if (primaryFindings.length === 0 && secondaryFindings.length === 0) {
      recommendations.push('Consider additional testing modalities (e.g., deletion/duplication analysis, RNA studies) if clinical suspicion remains high.');
      recommendations.push('Re-analysis of data may be beneficial as variant interpretation improves over time.');
    }

    return recommendations;
  }

  /**
   * Standard limitations
   */
  private getStandardLimitations(): string[] {
    return [
      'This test only detects variants in the coding regions and splice junctions of analyzed genes.',
      'Large deletions and duplications may not be detected.',
      'Variants in regulatory regions are not analyzed.',
      'Low coverage regions may result in false negatives.',
      'Variant interpretation is based on current scientific knowledge and may change over time.',
      'Mosaicism may not be detected if below detection threshold.',
      'Secondary findings are limited to genes recommended by ACMG.'
    ];
  }

  /**
   * Standard disclaimer
   */
  private getStandardDisclaimer(): string {
    return 'This test was developed and its performance characteristics determined by [Laboratory Name]. ' +
           'It has not been cleared or approved by the U.S. Food and Drug Administration. ' +
           'This test is used for clinical purposes and should not be regarded as investigational or for research. ' +
           'Results should be correlated with other clinical and laboratory findings.';
  }

  /**
   * Export report to various formats
   */
  async exportReport(report: ClinicalReport, format: 'json' | 'html' | 'pdf', outputPath: string): Promise<void> {
    if (format === 'json') {
      const fs = require('fs');
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
      console.log(`Report exported to ${outputPath}`);
    } else if (format === 'html') {
      const html = this.generateHTML(report);
      const fs = require('fs');
      fs.writeFileSync(outputPath, html);
      console.log(`Report exported to ${outputPath}`);
    } else if (format === 'pdf') {
      console.log('PDF generation requires additional dependencies (e.g., puppeteer)');
      // Implementation would use puppeteer or similar to convert HTML to PDF
    }
  }

  /**
   * Generate HTML report
   */
  private generateHTML(report: ClinicalReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Clinical Genetics Report - ${report.patientId}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #2c3e50; }
    h2 { color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 5px; }
    .variant { background: #ecf0f1; padding: 15px; margin: 10px 0; border-left: 4px solid #3498db; }
    .pathogenic { border-left-color: #e74c3c; }
    .uncertain { border-left-color: #f39c12; }
    .benign { border-left-color: #2ecc71; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #34495e; color: white; }
    .recommendations { background: #e8f8f5; padding: 15px; border-left: 4px solid #1abc9c; }
  </style>
</head>
<body>
  <h1>Clinical Genetics Report</h1>

  <table>
    <tr><th>Report ID</th><td>${report.reportId}</td></tr>
    <tr><th>Patient ID</th><td>${report.patientId}</td></tr>
    <tr><th>Generated</th><td>${new Date(report.generatedDate).toLocaleDateString()}</td></tr>
    ${report.referringPhysician ? `<tr><th>Referring Physician</th><td>${report.referringPhysician}</td></tr>` : ''}
    <tr><th>Indication</th><td>${report.indication}</td></tr>
  </table>

  <h2>Summary</h2>
  <p>${report.summary}</p>

  <h2>Primary Findings</h2>
  ${report.primaryFindings.length === 0 ? '<p>No primary findings.</p>' : ''}
  ${report.primaryFindings.map(v => `
    <div class="variant pathogenic">
      <strong>${v.gene}</strong> - ${v.variantId}<br>
      <strong>Classification:</strong> ${v.acmgClassification.classification.replace('_', ' ').toUpperCase()}<br>
      <strong>Consequence:</strong> ${v.consequence}<br>
      <strong>Protein Change:</strong> ${v.hgvsp}<br>
      <strong>Zygosity:</strong> ${v.zygosity}<br>
      ${v.alleleFrequency ? `<strong>Allele Frequency:</strong> ${v.alleleFrequency.toExponential(3)}<br>` : ''}
      <strong>Evidence:</strong> ${v.acmgClassification.evidence.pathogenic.join('; ')}
    </div>
  `).join('')}

  <h2>Recommendations</h2>
  <div class="recommendations">
    <ul>
      ${report.recommendations.map(r => `<li>${r}</li>`).join('')}
    </ul>
  </div>

  <h2>Limitations</h2>
  <ul>
    ${report.limitations.map(l => `<li>${l}</li>`).join('')}
  </ul>

  <h2>Disclaimer</h2>
  <p><small>${report.disclaimer}</small></p>
</body>
</html>
    `.trim();
  }
}

export default ClinicalReportingPipeline;
