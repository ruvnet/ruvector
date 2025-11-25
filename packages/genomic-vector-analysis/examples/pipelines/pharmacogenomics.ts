/**
 * Pharmacogenomics Pipeline
 *
 * Workflow: Genotype → Drug interactions → Recommendations
 * Provides personalized medication recommendations based on genetic variants
 */

import { GenomicVectorDB } from '../../src/index';

export interface PharmacogenomicVariant {
  gene: string;
  variantId: string;
  rsId?: string;
  genotype: string;
  alleles: string[];
  starAllele?: string;
  phenotype: string;
  activityScore?: number;
}

export interface DrugRecommendation {
  drug: string;
  drugClass: string;
  recommendation: 'standard' | 'use_with_caution' | 'alternative_recommended' | 'contraindicated';
  reasoning: string;
  dosageAdjustment?: string;
  alternatives?: string[];
  evidence: {
    level: 'high' | 'moderate' | 'low';
    guidelines: string[];
    publications: string[];
  };
  affectedGenes: Array<{
    gene: string;
    variant: string;
    phenotype: string;
  }>;
}

export interface PharmacogenomicReport {
  patientId: string;
  reportDate: string;
  genotypedVariants: PharmacogenomicVariant[];
  metabolizerStatus: Map<string, string>;
  drugRecommendations: DrugRecommendation[];
  warnings: string[];
  summary: string;
}

/**
 * Pharmacogenomic knowledge base
 */
const PGX_GENES = {
  CYP2D6: {
    function: 'Drug metabolism enzyme',
    drugs: ['codeine', 'tramadol', 'fluoxetine', 'paroxetine', 'atomoxetine', 'tamoxifen'],
    phenotypes: {
      'ultrarapid': { activityScore: '>2.0', description: 'Increased enzyme activity' },
      'normal': { activityScore: '1.0-2.0', description: 'Normal enzyme activity' },
      'intermediate': { activityScore: '0.5-1.0', description: 'Decreased enzyme activity' },
      'poor': { activityScore: '0', description: 'No enzyme activity' }
    }
  },
  CYP2C19: {
    function: 'Drug metabolism enzyme',
    drugs: ['clopidogrel', 'escitalopram', 'omeprazole', 'voriconazole'],
    phenotypes: {
      'ultrarapid': { activityScore: '>2.0', description: 'Increased enzyme activity' },
      'rapid': { activityScore: '1.5-2.0', description: 'Increased enzyme activity' },
      'normal': { activityScore: '1.0-1.5', description: 'Normal enzyme activity' },
      'intermediate': { activityScore: '0.5-1.0', description: 'Decreased enzyme activity' },
      'poor': { activityScore: '0', description: 'No enzyme activity' }
    }
  },
  CYP2C9: {
    function: 'Drug metabolism enzyme',
    drugs: ['warfarin', 'phenytoin', 'NSAIDs'],
    phenotypes: {
      'normal': { activityScore: '2.0', description: 'Normal enzyme activity' },
      'intermediate': { activityScore: '1.0', description: 'Decreased enzyme activity' },
      'poor': { activityScore: '0', description: 'No enzyme activity' }
    }
  },
  VKORC1: {
    function: 'Warfarin sensitivity',
    drugs: ['warfarin'],
    phenotypes: {
      'low': { description: 'Low sensitivity, higher dose needed' },
      'normal': { description: 'Normal sensitivity' },
      'high': { description: 'High sensitivity, lower dose needed' }
    }
  },
  SLCO1B1: {
    function: 'Drug transporter',
    drugs: ['simvastatin', 'atorvastatin'],
    phenotypes: {
      'normal': { description: 'Normal function' },
      'decreased': { description: 'Decreased function, increased myopathy risk' },
      'poor': { description: 'Poor function, high myopathy risk' }
    }
  },
  TPMT: {
    function: 'Thiopurine metabolism',
    drugs: ['azathioprine', '6-mercaptopurine', 'thioguanine'],
    phenotypes: {
      'normal': { activityScore: '1.0', description: 'Normal enzyme activity' },
      'intermediate': { activityScore: '0.5', description: 'Decreased enzyme activity' },
      'poor': { activityScore: '0', description: 'No enzyme activity' }
    }
  },
  DPYD: {
    function: 'Fluoropyrimidine metabolism',
    drugs: ['5-fluorouracil', 'capecitabine'],
    phenotypes: {
      'normal': { description: 'Normal enzyme activity' },
      'intermediate': { description: 'Decreased enzyme activity' },
      'poor': { description: 'No enzyme activity, severe toxicity risk' }
    }
  },
  G6PD: {
    function: 'Glucose-6-phosphate dehydrogenase',
    drugs: ['rasburicase', 'primaquine', 'dapsone'],
    phenotypes: {
      'normal': { description: 'Normal enzyme activity' },
      'deficient': { description: 'Enzyme deficiency, hemolysis risk' }
    }
  }
};

/**
 * Drug interaction rules
 */
const DRUG_RULES: Record<string, (variants: PharmacogenomicVariant[]) => DrugRecommendation> = {
  clopidogrel: (variants) => {
    const cyp2c19 = variants.find(v => v.gene === 'CYP2C19');

    if (!cyp2c19) {
      return {
        drug: 'Clopidogrel',
        drugClass: 'Antiplatelet',
        recommendation: 'standard',
        reasoning: 'No CYP2C19 genotype information available',
        evidence: { level: 'moderate', guidelines: [], publications: [] },
        affectedGenes: []
      };
    }

    if (cyp2c19.phenotype === 'poor' || cyp2c19.phenotype === 'intermediate') {
      return {
        drug: 'Clopidogrel',
        drugClass: 'Antiplatelet',
        recommendation: 'alternative_recommended',
        reasoning: `Patient is a CYP2C19 ${cyp2c19.phenotype} metabolizer. Clopidogrel efficacy may be reduced.`,
        alternatives: ['Prasugrel', 'Ticagrelor'],
        evidence: {
          level: 'high',
          guidelines: ['CPIC', 'FDA'],
          publications: ['PMID: 23719780']
        },
        affectedGenes: [{
          gene: 'CYP2C19',
          variant: cyp2c19.variantId,
          phenotype: cyp2c19.phenotype
        }]
      };
    }

    if (cyp2c19.phenotype === 'ultrarapid' || cyp2c19.phenotype === 'rapid') {
      return {
        drug: 'Clopidogrel',
        drugClass: 'Antiplatelet',
        recommendation: 'use_with_caution',
        reasoning: `Patient is a CYP2C19 ${cyp2c19.phenotype} metabolizer. Increased risk of bleeding.`,
        dosageAdjustment: 'Consider lower dose or more frequent monitoring',
        evidence: {
          level: 'moderate',
          guidelines: ['CPIC'],
          publications: ['PMID: 23719780']
        },
        affectedGenes: [{
          gene: 'CYP2C19',
          variant: cyp2c19.variantId,
          phenotype: cyp2c19.phenotype
        }]
      };
    }

    return {
      drug: 'Clopidogrel',
      drugClass: 'Antiplatelet',
      recommendation: 'standard',
      reasoning: 'Patient has normal CYP2C19 metabolism. Standard dosing recommended.',
      evidence: {
        level: 'high',
        guidelines: ['CPIC'],
        publications: ['PMID: 23719780']
      },
      affectedGenes: [{
        gene: 'CYP2C19',
        variant: cyp2c19.variantId,
        phenotype: cyp2c19.phenotype
      }]
    };
  },

  warfarin: (variants) => {
    const cyp2c9 = variants.find(v => v.gene === 'CYP2C9');
    const vkorc1 = variants.find(v => v.gene === 'VKORC1');

    const adjustments: string[] = [];
    const affectedGenes: DrugRecommendation['affectedGenes'] = [];

    let recommendation: DrugRecommendation['recommendation'] = 'standard';
    let reasoning = 'Standard warfarin dosing can be used.';

    if (cyp2c9 && (cyp2c9.phenotype === 'intermediate' || cyp2c9.phenotype === 'poor')) {
      recommendation = 'use_with_caution';
      adjustments.push('Reduced initial dose recommended due to decreased CYP2C9 activity');
      affectedGenes.push({
        gene: 'CYP2C9',
        variant: cyp2c9.variantId,
        phenotype: cyp2c9.phenotype
      });
    }

    if (vkorc1 && vkorc1.phenotype === 'high') {
      recommendation = 'use_with_caution';
      adjustments.push('Lower dose needed due to increased warfarin sensitivity');
      affectedGenes.push({
        gene: 'VKORC1',
        variant: vkorc1.variantId,
        phenotype: vkorc1.phenotype
      });
    }

    if (adjustments.length > 0) {
      reasoning = adjustments.join('. ') + '. Use pharmacogenomic dosing algorithm.';
    }

    return {
      drug: 'Warfarin',
      drugClass: 'Anticoagulant',
      recommendation,
      reasoning,
      dosageAdjustment: adjustments.length > 0 ? adjustments.join('; ') : undefined,
      evidence: {
        level: 'high',
        guidelines: ['CPIC', 'FDA'],
        publications: ['PMID: 21716271']
      },
      affectedGenes
    };
  },

  simvastatin: (variants) => {
    const slco1b1 = variants.find(v => v.gene === 'SLCO1B1');

    if (!slco1b1) {
      return {
        drug: 'Simvastatin',
        drugClass: 'Statin',
        recommendation: 'standard',
        reasoning: 'No SLCO1B1 genotype information available',
        evidence: { level: 'moderate', guidelines: [], publications: [] },
        affectedGenes: []
      };
    }

    if (slco1b1.phenotype === 'poor' || slco1b1.phenotype === 'decreased') {
      return {
        drug: 'Simvastatin',
        drugClass: 'Statin',
        recommendation: 'alternative_recommended',
        reasoning: 'Increased risk of simvastatin-associated myopathy due to decreased SLCO1B1 function.',
        dosageAdjustment: 'Limit dose to 20mg daily OR consider alternative statin',
        alternatives: ['Pravastatin', 'Rosuvastatin'],
        evidence: {
          level: 'high',
          guidelines: ['CPIC', 'FDA'],
          publications: ['PMID: 22617227']
        },
        affectedGenes: [{
          gene: 'SLCO1B1',
          variant: slco1b1.variantId,
          phenotype: slco1b1.phenotype
        }]
      };
    }

    return {
      drug: 'Simvastatin',
      drugClass: 'Statin',
      recommendation: 'standard',
      reasoning: 'Normal SLCO1B1 function. Standard dosing appropriate.',
      evidence: {
        level: 'high',
        guidelines: ['CPIC'],
        publications: ['PMID: 22617227']
      },
      affectedGenes: [{
        gene: 'SLCO1B1',
        variant: slco1b1.variantId,
        phenotype: slco1b1.phenotype
      }]
    };
  },

  azathioprine: (variants) => {
    const tpmt = variants.find(v => v.gene === 'TPMT');

    if (!tpmt) {
      return {
        drug: 'Azathioprine',
        drugClass: 'Immunosuppressant',
        recommendation: 'use_with_caution',
        reasoning: 'No TPMT genotype information. Consider phenotype testing before starting therapy.',
        evidence: { level: 'high', guidelines: ['CPIC', 'FDA'], publications: [] },
        affectedGenes: []
      };
    }

    if (tpmt.phenotype === 'poor') {
      return {
        drug: 'Azathioprine',
        drugClass: 'Immunosuppressant',
        recommendation: 'contraindicated',
        reasoning: 'TPMT deficiency detected. Severe, life-threatening myelosuppression risk.',
        alternatives: ['Alternative immunosuppressant therapy'],
        evidence: {
          level: 'high',
          guidelines: ['CPIC', 'FDA'],
          publications: ['PMID: 23422873']
        },
        affectedGenes: [{
          gene: 'TPMT',
          variant: tpmt.variantId,
          phenotype: tpmt.phenotype
        }]
      };
    }

    if (tpmt.phenotype === 'intermediate') {
      return {
        drug: 'Azathioprine',
        drugClass: 'Immunosuppressant',
        recommendation: 'use_with_caution',
        reasoning: 'Reduced TPMT activity. Start with 30-70% of standard dose.',
        dosageAdjustment: 'Start with 30-70% of standard dose, monitor CBC weekly for 4 weeks',
        evidence: {
          level: 'high',
          guidelines: ['CPIC', 'FDA'],
          publications: ['PMID: 23422873']
        },
        affectedGenes: [{
          gene: 'TPMT',
          variant: tpmt.variantId,
          phenotype: tpmt.phenotype
        }]
      };
    }

    return {
      drug: 'Azathioprine',
      drugClass: 'Immunosuppressant',
      recommendation: 'standard',
      reasoning: 'Normal TPMT activity. Standard dosing appropriate with routine monitoring.',
      evidence: {
        level: 'high',
        guidelines: ['CPIC'],
        publications: ['PMID: 23422873']
      },
      affectedGenes: [{
        gene: 'TPMT',
        variant: tpmt.variantId,
        phenotype: tpmt.phenotype
      }]
    };
  }
};

export class PharmacogenomicsPipeline {
  private db: GenomicVectorDB;

  constructor() {
    this.db = new GenomicVectorDB({
      embeddingModel: 'text-embedding-3-small',
      dimension: 1536
    });
  }

  /**
   * Analyze pharmacogenomic variants
   */
  async analyzeGenotypes(
    variants: Array<{ gene: string; variantId: string; genotype: string; rsId?: string }>
  ): Promise<PharmacogenomicVariant[]> {
    const pgxVariants: PharmacogenomicVariant[] = [];

    for (const variant of variants) {
      // Check if this is a pharmacogenomic gene
      if (!(variant.gene in PGX_GENES)) continue;

      // Determine phenotype based on genotype
      const phenotype = await this.determinePhenotype(variant.gene, variant.genotype);

      pgxVariants.push({
        gene: variant.gene,
        variantId: variant.variantId,
        rsId: variant.rsId,
        genotype: variant.genotype,
        alleles: variant.genotype.split('/'),
        phenotype: phenotype.phenotype,
        activityScore: phenotype.activityScore
      });
    }

    return pgxVariants;
  }

  /**
   * Determine phenotype from genotype
   */
  private async determinePhenotype(
    gene: string,
    genotype: string
  ): Promise<{ phenotype: string; activityScore?: number }> {
    const geneInfo = PGX_GENES[gene as keyof typeof PGX_GENES];
    if (!geneInfo) {
      return { phenotype: 'unknown' };
    }

    // Simplified phenotype determination
    // In practice, this would use star allele lookups and activity scores

    const alleles = genotype.split('/');

    // Example logic for CYP enzymes
    if (gene.startsWith('CYP')) {
      const hasNoFunction = alleles.some(a => a.includes('*2') || a.includes('*3'));
      const hasIncreased = alleles.some(a => a.includes('*17') || a.includes('*1x2'));

      if (alleles.every(a => a.includes('*2') || a.includes('*3'))) {
        return { phenotype: 'poor', activityScore: 0 };
      }
      if (hasNoFunction) {
        return { phenotype: 'intermediate', activityScore: 0.5 };
      }
      if (hasIncreased) {
        return { phenotype: 'ultrarapid', activityScore: 2.5 };
      }
      return { phenotype: 'normal', activityScore: 1.0 };
    }

    return { phenotype: 'normal' };
  }

  /**
   * Generate drug recommendations
   */
  generateDrugRecommendations(
    pgxVariants: PharmacogenomicVariant[],
    requestedDrugs?: string[]
  ): DrugRecommendation[] {
    const recommendations: DrugRecommendation[] = [];

    // Get all drugs affected by patient's genotypes
    const affectedDrugs = new Set<string>();
    pgxVariants.forEach(variant => {
      const geneInfo = PGX_GENES[variant.gene as keyof typeof PGX_GENES];
      if (geneInfo) {
        geneInfo.drugs.forEach(drug => affectedDrugs.add(drug));
      }
    });

    // Generate recommendations for requested drugs or all affected drugs
    const drugsToAnalyze = requestedDrugs || Array.from(affectedDrugs);

    drugsToAnalyze.forEach(drug => {
      const ruleFunction = DRUG_RULES[drug.toLowerCase()];
      if (ruleFunction) {
        const recommendation = ruleFunction(pgxVariants);
        recommendations.push(recommendation);
      }
    });

    return recommendations;
  }

  /**
   * Generate comprehensive pharmacogenomic report
   */
  async generateReport(
    patientId: string,
    variants: Array<{ gene: string; variantId: string; genotype: string; rsId?: string }>,
    requestedDrugs?: string[]
  ): Promise<PharmacogenomicReport> {
    console.log(`Generating pharmacogenomic report for patient ${patientId}...`);

    // Analyze genotypes
    const pgxVariants = await this.analyzeGenotypes(variants);

    // Determine metabolizer status
    const metabolizerStatus = new Map<string, string>();
    pgxVariants.forEach(variant => {
      if (variant.gene.startsWith('CYP') || variant.gene === 'TPMT' || variant.gene === 'DPYD') {
        metabolizerStatus.set(variant.gene, variant.phenotype);
      }
    });

    // Generate drug recommendations
    const drugRecommendations = this.generateDrugRecommendations(pgxVariants, requestedDrugs);

    // Generate warnings
    const warnings: string[] = [];
    drugRecommendations.forEach(rec => {
      if (rec.recommendation === 'contraindicated') {
        warnings.push(`⚠️ ${rec.drug} is contraindicated: ${rec.reasoning}`);
      } else if (rec.recommendation === 'alternative_recommended') {
        warnings.push(`⚠️ ${rec.drug} may have reduced efficacy or increased risk: ${rec.reasoning}`);
      }
    });

    // Generate summary
    const summary = this.generateSummary(pgxVariants, drugRecommendations, metabolizerStatus);

    return {
      patientId,
      reportDate: new Date().toISOString(),
      genotypedVariants: pgxVariants,
      metabolizerStatus,
      drugRecommendations,
      warnings,
      summary
    };
  }

  /**
   * Generate summary text
   */
  private generateSummary(
    variants: PharmacogenomicVariant[],
    recommendations: DrugRecommendation[],
    metabolizerStatus: Map<string, string>
  ): string {
    const parts: string[] = [];

    parts.push(`Pharmacogenomic analysis identified ${variants.length} actionable variants.`);

    // Metabolizer status summary
    const metabolizerSummary: string[] = [];
    metabolizerStatus.forEach((status, gene) => {
      if (status !== 'normal') {
        metabolizerSummary.push(`${gene}: ${status} metabolizer`);
      }
    });

    if (metabolizerSummary.length > 0) {
      parts.push(`Key findings: ${metabolizerSummary.join('; ')}.`);
    }

    // Recommendation summary
    const highPriority = recommendations.filter(r =>
      r.recommendation === 'contraindicated' || r.recommendation === 'alternative_recommended'
    );

    if (highPriority.length > 0) {
      parts.push(`${highPriority.length} medication(s) require special consideration or alternatives.`);
    }

    return parts.join(' ');
  }

  /**
   * Export report to HTML
   */
  exportReportHTML(report: PharmacogenomicReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Pharmacogenomic Report - ${report.patientId}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
    .contraindicated { background: #f8d7da; border-left: 4px solid #dc3545; }
    .caution { background: #fff3cd; border-left: 4px solid #ffc107; }
    .standard { background: #d1ecf1; border-left: 4px solid #17a2b8; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #343a40; color: white; }
  </style>
</head>
<body>
  <h1>Pharmacogenomic Report</h1>
  <p><strong>Patient ID:</strong> ${report.patientId}</p>
  <p><strong>Report Date:</strong> ${new Date(report.reportDate).toLocaleDateString()}</p>

  <h2>Summary</h2>
  <p>${report.summary}</p>

  ${report.warnings.length > 0 ? `
    <h2>Warnings</h2>
    ${report.warnings.map(w => `<div class="warning">${w}</div>`).join('')}
  ` : ''}

  <h2>Metabolizer Status</h2>
  <table>
    <tr><th>Gene</th><th>Status</th></tr>
    ${Array.from(report.metabolizerStatus.entries()).map(([gene, status]) => `
      <tr><td>${gene}</td><td>${status}</td></tr>
    `).join('')}
  </table>

  <h2>Drug Recommendations</h2>
  ${report.drugRecommendations.map(rec => `
    <div class="${rec.recommendation.replace('_', '-')}">
      <h3>${rec.drug}</h3>
      <p><strong>Recommendation:</strong> ${rec.recommendation.replace('_', ' ').toUpperCase()}</p>
      <p><strong>Reasoning:</strong> ${rec.reasoning}</p>
      ${rec.dosageAdjustment ? `<p><strong>Dosage Adjustment:</strong> ${rec.dosageAdjustment}</p>` : ''}
      ${rec.alternatives ? `<p><strong>Alternatives:</strong> ${rec.alternatives.join(', ')}</p>` : ''}
      <p><strong>Evidence Level:</strong> ${rec.evidence.level}</p>
    </div>
  `).join('')}

  <h2>Genotyped Variants</h2>
  <table>
    <tr><th>Gene</th><th>Variant</th><th>Genotype</th><th>Phenotype</th></tr>
    ${report.genotypedVariants.map(v => `
      <tr>
        <td>${v.gene}</td>
        <td>${v.rsId || v.variantId}</td>
        <td>${v.genotype}</td>
        <td>${v.phenotype}</td>
      </tr>
    `).join('')}
  </table>
</body>
</html>
    `.trim();
  }
}

export default PharmacogenomicsPipeline;
