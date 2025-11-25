/**
 * VEP (Variant Effect Predictor) Comparison Integration
 *
 * Integrates with Ensembl VEP and provides comparison with ruvector annotations.
 * Enables side-by-side analysis and validation of variant predictions.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { GenomicVectorDB } from '../src/index';

export interface VEPConfig {
  vepPath: string;
  cacheDir: string;
  assembly: 'GRCh37' | 'GRCh38';
  plugins?: string[];
}

export interface VEPAnnotation {
  variantId: string;
  chromosome: string;
  position: number;
  ref: string;
  alt: string;
  consequences: VEPConsequence[];
  regulatoryFeatures?: any[];
  colocatedVariants?: any[];
}

export interface VEPConsequence {
  gene: string;
  geneId: string;
  transcript: string;
  transcriptId: string;
  biotype: string;
  consequence: string[];
  impact: 'HIGH' | 'MODERATE' | 'LOW' | 'MODIFIER';
  hgvsc?: string;
  hgvsp?: string;
  cdnaPosition?: string;
  cdsPosition?: string;
  proteinPosition?: string;
  aminoAcids?: string;
  codons?: string;
  existingVariation?: string;
  sift?: { prediction: string; score: number };
  polyphen?: { prediction: string; score: number };
  cadd?: number;
}

export interface ComparisonResult {
  variantId: string;
  vep: VEPAnnotation;
  ruvector: any;
  agreement: {
    gene: boolean;
    consequence: boolean;
    impact: boolean;
    predictions: boolean;
  };
  discrepancies: string[];
  confidence: number;
}

export class VEPIntegration {
  private config: VEPConfig;
  private db: GenomicVectorDB;

  constructor(config: VEPConfig, db: GenomicVectorDB) {
    this.config = config;
    this.db = db;
  }

  /**
   * Run VEP annotation on VCF file
   */
  async annotateWithVEP(
    vcfFile: string,
    options?: {
      outputFile?: string;
      format?: 'json' | 'vcf' | 'tab';
      fields?: string[];
      flags?: string[];
    }
  ): Promise<VEPAnnotation[]> {
    const outputFile = options?.outputFile || '/tmp/vep_output.json';
    const format = options?.format || 'json';

    // Build VEP command
    const vepCommand = path.join(this.config.vepPath, 'vep');
    const flags = options?.flags || [
      '--cache',
      '--offline',
      '--everything',
      '--force_overwrite',
      '--assembly', this.config.assembly
    ];

    // Add plugins if configured
    const pluginArgs = this.config.plugins?.map(p => `--plugin ${p}`).join(' ') || '';

    const command = `${vepCommand} ` +
                   `-i ${vcfFile} ` +
                   `-o ${outputFile} ` +
                   `--dir_cache ${this.config.cacheDir} ` +
                   `--${format} ` +
                   `${flags.join(' ')} ` +
                   `${pluginArgs}`;

    try {
      execSync(command, { maxBuffer: 1024 * 1024 * 10 });

      // Parse VEP output
      const annotations = this.parseVEPOutput(outputFile, format);

      // Ingest into vector database
      await this.ingestVEPAnnotations(annotations);

      return annotations;
    } catch (error) {
      throw new Error(`VEP annotation failed: ${error}`);
    }
  }

  /**
   * Parse VEP JSON output
   */
  private parseVEPOutput(outputFile: string, format: string): VEPAnnotation[] {
    if (format !== 'json') {
      throw new Error('Only JSON format is currently supported');
    }

    const content = fs.readFileSync(outputFile, 'utf-8');
    const vepData = JSON.parse(content);

    return vepData.map((variant: any) => {
      const [chr, pos, alleles] = variant.input.split(/[\s\/]/);
      const [ref, alt] = alleles ? alleles.split('/') : ['.', '.'];

      const consequences: VEPConsequence[] = variant.transcript_consequences?.map((tc: any) => ({
        gene: tc.gene_symbol || '',
        geneId: tc.gene_id || '',
        transcript: tc.transcript_id || '',
        transcriptId: tc.transcript_id || '',
        biotype: tc.biotype || '',
        consequence: tc.consequence_terms || [],
        impact: tc.impact || 'MODIFIER',
        hgvsc: tc.hgvsc,
        hgvsp: tc.hgvsp,
        cdnaPosition: tc.cdna_start ? `${tc.cdna_start}-${tc.cdna_end}` : undefined,
        cdsPosition: tc.cds_start ? `${tc.cds_start}-${tc.cds_end}` : undefined,
        proteinPosition: tc.protein_start ? `${tc.protein_start}-${tc.protein_end}` : undefined,
        aminoAcids: tc.amino_acids,
        codons: tc.codons,
        existingVariation: tc.existing_variation,
        sift: tc.sift_prediction ? {
          prediction: tc.sift_prediction,
          score: tc.sift_score
        } : undefined,
        polyphen: tc.polyphen_prediction ? {
          prediction: tc.polyphen_prediction,
          score: tc.polyphen_score
        } : undefined,
        cadd: tc.cadd_phred
      })) || [];

      return {
        variantId: `${chr}:${pos}:${ref}:${alt}`,
        chromosome: chr,
        position: parseInt(pos),
        ref,
        alt,
        consequences,
        regulatoryFeatures: variant.regulatory_feature_consequences,
        colocatedVariants: variant.colocated_variants
      };
    });
  }

  /**
   * Ingest VEP annotations into vector database
   */
  private async ingestVEPAnnotations(annotations: VEPAnnotation[]): Promise<void> {
    const documents = annotations.map(ann => {
      const description = this.createVEPDescription(ann);

      return {
        id: `vep_${ann.variantId}`,
        content: description,
        metadata: {
          type: 'vep_annotation',
          variantId: ann.variantId,
          chromosome: ann.chromosome,
          position: ann.position,
          consequences: JSON.stringify(ann.consequences),
          source: 'vep'
        }
      };
    });

    await this.db.addDocuments(documents);
  }

  /**
   * Create semantic description from VEP annotation
   */
  private createVEPDescription(ann: VEPAnnotation): string {
    const parts: string[] = [];

    parts.push(`Variant ${ann.variantId}`);

    if (ann.consequences.length > 0) {
      const mainConseq = ann.consequences[0];

      if (mainConseq.gene) {
        parts.push(`in gene ${mainConseq.gene}`);
      }

      parts.push(`with ${mainConseq.consequence.join(', ')} consequence`);
      parts.push(`impact level: ${mainConseq.impact}`);

      if (mainConseq.hgvsc) {
        parts.push(`cDNA change: ${mainConseq.hgvsc}`);
      }

      if (mainConseq.hgvsp) {
        parts.push(`protein change: ${mainConseq.hgvsp}`);
      }

      if (mainConseq.sift) {
        parts.push(`SIFT: ${mainConseq.sift.prediction} (${mainConseq.sift.score})`);
      }

      if (mainConseq.polyphen) {
        parts.push(`PolyPhen: ${mainConseq.polyphen.prediction} (${mainConseq.polyphen.score})`);
      }

      if (mainConseq.cadd) {
        parts.push(`CADD score: ${mainConseq.cadd}`);
      }
    }

    if (ann.colocatedVariants && ann.colocatedVariants.length > 0) {
      const known = ann.colocatedVariants.filter(v => v.id);
      if (known.length > 0) {
        parts.push(`Known variants: ${known.map(v => v.id).join(', ')}`);
      }
    }

    return parts.join('. ');
  }

  /**
   * Compare VEP annotations with ruvector predictions
   */
  async compareWithRuvector(vcfFile: string): Promise<ComparisonResult[]> {
    // Get VEP annotations
    const vepAnnotations = await this.annotateWithVEP(vcfFile);

    const comparisons: ComparisonResult[] = [];

    for (const vepAnn of vepAnnotations) {
      // Search for corresponding ruvector annotation
      const ruvectorResults = await this.db.search(vepAnn.variantId, {
        limit: 1,
        filter: { type: 'variant' }
      });

      if (ruvectorResults.length === 0) continue;

      const ruvectorAnn = ruvectorResults[0];

      // Compare annotations
      const comparison = this.performComparison(vepAnn, ruvectorAnn);
      comparisons.push(comparison);
    }

    return comparisons;
  }

  /**
   * Perform detailed comparison between VEP and ruvector
   */
  private performComparison(vep: VEPAnnotation, ruvector: any): ComparisonResult {
    const discrepancies: string[] = [];
    let agreementCount = 0;
    let totalChecks = 0;

    // Compare gene
    totalChecks++;
    const vepGenes = vep.consequences.map(c => c.gene);
    const ruvectorGene = ruvector.metadata?.gene;
    const geneAgreement = ruvectorGene && vepGenes.includes(ruvectorGene);
    if (geneAgreement) agreementCount++;
    else if (ruvectorGene) discrepancies.push(`Gene: VEP=${vepGenes.join(',')}, ruvector=${ruvectorGene}`);

    // Compare consequence
    totalChecks++;
    const vepConsequences = vep.consequences.flatMap(c => c.consequence);
    const ruvectorConseq = ruvector.metadata?.consequence;
    const consequenceAgreement = ruvectorConseq && vepConsequences.some(vc =>
      ruvectorConseq.toLowerCase().includes(vc.toLowerCase())
    );
    if (consequenceAgreement) agreementCount++;
    else if (ruvectorConseq) discrepancies.push(`Consequence: VEP=${vepConsequences.join(',')}, ruvector=${ruvectorConseq}`);

    // Compare impact
    totalChecks++;
    const vepImpact = vep.consequences[0]?.impact;
    const ruvectorImpact = ruvector.metadata?.impact;
    const impactAgreement = vepImpact === ruvectorImpact;
    if (impactAgreement) agreementCount++;
    else if (ruvectorImpact) discrepancies.push(`Impact: VEP=${vepImpact}, ruvector=${ruvectorImpact}`);

    // Compare predictions
    totalChecks++;
    const vepSift = vep.consequences[0]?.sift?.prediction;
    const ruvectorSift = ruvector.metadata?.sift_prediction;
    const predictionsAgreement = !vepSift || !ruvectorSift || vepSift === ruvectorSift;
    if (predictionsAgreement) agreementCount++;
    else discrepancies.push(`SIFT: VEP=${vepSift}, ruvector=${ruvectorSift}`);

    const confidence = agreementCount / totalChecks;

    return {
      variantId: vep.variantId,
      vep,
      ruvector,
      agreement: {
        gene: geneAgreement,
        consequence: consequenceAgreement,
        impact: impactAgreement,
        predictions: predictionsAgreement
      },
      discrepancies,
      confidence
    };
  }

  /**
   * Generate comparison report
   */
  generateComparisonReport(comparisons: ComparisonResult[]): string {
    const totalVariants = comparisons.length;
    const highConfidence = comparisons.filter(c => c.confidence >= 0.75).length;
    const mediumConfidence = comparisons.filter(c => c.confidence >= 0.5 && c.confidence < 0.75).length;
    const lowConfidence = comparisons.filter(c => c.confidence < 0.5).length;

    const geneAgreement = comparisons.filter(c => c.agreement.gene).length;
    const consequenceAgreement = comparisons.filter(c => c.agreement.consequence).length;
    const impactAgreement = comparisons.filter(c => c.agreement.impact).length;
    const predictionsAgreement = comparisons.filter(c => c.agreement.predictions).length;

    const report = [
      '# VEP vs ruvector Comparison Report',
      '',
      `## Summary`,
      `- Total variants compared: ${totalVariants}`,
      `- High confidence (≥75%): ${highConfidence} (${(highConfidence/totalVariants*100).toFixed(1)}%)`,
      `- Medium confidence (50-75%): ${mediumConfidence} (${(mediumConfidence/totalVariants*100).toFixed(1)}%)`,
      `- Low confidence (<50%): ${lowConfidence} (${(lowConfidence/totalVariants*100).toFixed(1)}%)`,
      '',
      `## Agreement Metrics`,
      `- Gene annotation: ${geneAgreement}/${totalVariants} (${(geneAgreement/totalVariants*100).toFixed(1)}%)`,
      `- Consequence: ${consequenceAgreement}/${totalVariants} (${(consequenceAgreement/totalVariants*100).toFixed(1)}%)`,
      `- Impact level: ${impactAgreement}/${totalVariants} (${(impactAgreement/totalVariants*100).toFixed(1)}%)`,
      `- Predictions: ${predictionsAgreement}/${totalVariants} (${(predictionsAgreement/totalVariants*100).toFixed(1)}%)`,
      '',
      `## Discrepancies`,
      ''
    ];

    // Add top discrepancies
    const withDiscrepancies = comparisons.filter(c => c.discrepancies.length > 0);
    report.push(`Found ${withDiscrepancies.length} variants with discrepancies:`);
    report.push('');

    withDiscrepancies.slice(0, 10).forEach(comp => {
      report.push(`### ${comp.variantId} (confidence: ${(comp.confidence * 100).toFixed(1)}%)`);
      comp.discrepancies.forEach(d => report.push(`- ${d}`));
      report.push('');
    });

    return report.join('\n');
  }
}

export default VEPIntegration;
