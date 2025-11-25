/**
 * Variant Annotation Pipeline Example
 *
 * Complete workflow: VCF → Parse → Embed → Search → Annotate
 * Demonstrates integration of VCF parsing, ANNOVAR, VEP, ClinVar, and gnomAD
 */

import { GenomicVectorDB } from '../../src/index';
import { VCFParser, GATKIntegration } from '../../integrations/vcf-parser';
import ANNOVARIntegration from '../../integrations/annovar-integration';
import VEPIntegration from '../../integrations/vep-comparison';
import ClinVarImporter from '../../integrations/clinvar-importer';
import GnomADIntegration from '../../integrations/gnomad-integration';

export interface AnnotationPipelineConfig {
  // Input
  vcfFile: string;
  referenceGenome?: string;

  // Tool paths
  annovarPath?: string;
  vepPath?: string;

  // Databases
  humandb?: string;
  vepCache?: string;
  clinvarVcf?: string;
  gnomadVcf?: string;

  // Processing options
  buildver?: 'hg19' | 'hg38';
  assembly?: 'GRCh37' | 'GRCh38';
  maxAF?: number;

  // Output
  outputDir: string;
}

export interface AnnotatedVariant {
  variantId: string;
  chromosome: string;
  position: number;
  ref: string;
  alt: string;

  // Annotations from different sources
  vcf: any;
  annovar?: any;
  vep?: any;
  clinvar?: any;
  gnomad?: any;

  // Consolidated interpretation
  clinicalSignificance?: string;
  pathogenicity?: 'pathogenic' | 'likely_pathogenic' | 'uncertain' | 'likely_benign' | 'benign';
  alleleFrequency?: number;
  rarity?: 'rare' | 'low_frequency' | 'common';
  functionalImpact?: string;

  // Recommendation
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
}

export class VariantAnnotationPipeline {
  private db: GenomicVectorDB;
  private config: AnnotationPipelineConfig;

  private vcfParser?: VCFParser;
  private annovar?: ANNOVARIntegration;
  private vep?: VEPIntegration;
  private clinvar?: ClinVarImporter;
  private gnomad?: GnomADIntegration;

  constructor(config: AnnotationPipelineConfig) {
    this.config = config;
    this.db = new GenomicVectorDB({
      embeddingModel: 'text-embedding-3-small',
      dimension: 1536
    });
  }

  /**
   * Initialize all tools and databases
   */
  async initialize(): Promise<void> {
    console.log('Initializing variant annotation pipeline...');

    // Initialize VCF parser
    this.vcfParser = new VCFParser(this.db);

    // Initialize ANNOVAR if configured
    if (this.config.annovarPath && this.config.humandb) {
      this.annovar = new ANNOVARIntegration({
        annovarPath: this.config.annovarPath,
        humandb: this.config.humandb,
        buildver: this.config.buildver || 'hg38'
      }, this.db);
      console.log('ANNOVAR initialized');
    }

    // Initialize VEP if configured
    if (this.config.vepPath && this.config.vepCache) {
      this.vep = new VEPIntegration({
        vepPath: this.config.vepPath,
        cacheDir: this.config.vepCache,
        assembly: this.config.assembly || 'GRCh38',
        plugins: ['CADD', 'dbNSFP']
      }, this.db);
      console.log('VEP initialized');
    }

    // Initialize ClinVar
    if (this.config.clinvarVcf) {
      this.clinvar = new ClinVarImporter(this.db);
      console.log('Loading ClinVar database...');
      await this.clinvar.importClinVarVCF(this.config.clinvarVcf, {
        onProgress: (count) => {
          if (count % 10000 === 0) console.log(`  Loaded ${count} ClinVar variants`);
        }
      });
      console.log('ClinVar loaded');
    }

    // Initialize gnomAD
    if (this.config.gnomadVcf) {
      this.gnomad = new GnomADIntegration(this.db);
      console.log('Loading gnomAD database...');
      await this.gnomad.importGnomADVCF(this.config.gnomadVcf, {
        maxAF: this.config.maxAF || 0.01,
        onProgress: (count) => {
          if (count % 10000 === 0) console.log(`  Loaded ${count} gnomAD variants`);
        }
      });
      console.log('gnomAD loaded');
    }
  }

  /**
   * Run complete annotation pipeline
   */
  async run(): Promise<AnnotatedVariant[]> {
    console.log('Starting variant annotation pipeline...');

    // Step 1: Parse VCF and ingest variants
    console.log('\n[Step 1/5] Parsing VCF file...');
    const variantCount = await this.vcfParser!.parseFile(this.config.vcfFile, {
      onProgress: (count) => {
        if (count % 1000 === 0) console.log(`  Parsed ${count} variants`);
      }
    });
    console.log(`Parsed ${variantCount} variants`);

    // Step 2: ANNOVAR annotation
    let annovarResults: any[] = [];
    if (this.annovar) {
      console.log('\n[Step 2/5] Running ANNOVAR annotation...');
      annovarResults = await this.annovar.annotateVariants(this.config.vcfFile, {
        outputPrefix: `${this.config.outputDir}/annovar`
      });
      console.log(`Annotated ${annovarResults.length} variants with ANNOVAR`);
    } else {
      console.log('\n[Step 2/5] ANNOVAR not configured, skipping...');
    }

    // Step 3: VEP annotation
    let vepResults: any[] = [];
    if (this.vep) {
      console.log('\n[Step 3/5] Running VEP annotation...');
      vepResults = await this.vep.annotateWithVEP(this.config.vcfFile, {
        outputFile: `${this.config.outputDir}/vep_output.json`
      });
      console.log(`Annotated ${vepResults.length} variants with VEP`);
    } else {
      console.log('\n[Step 3/5] VEP not configured, skipping...');
    }

    // Step 4: Search and retrieve all annotations
    console.log('\n[Step 4/5] Consolidating annotations...');
    const annotatedVariants = await this.consolidateAnnotations(
      annovarResults,
      vepResults
    );
    console.log(`Consolidated ${annotatedVariants.length} annotated variants`);

    // Step 5: Prioritize and interpret
    console.log('\n[Step 5/5] Prioritizing variants...');
    const prioritized = this.prioritizeVariants(annotatedVariants);
    console.log(`Prioritization complete`);

    return prioritized;
  }

  /**
   * Consolidate annotations from all sources
   */
  private async consolidateAnnotations(
    annovarResults: any[],
    vepResults: any[]
  ): Promise<AnnotatedVariant[]> {
    const annotatedVariants: AnnotatedVariant[] = [];

    // Create maps for quick lookup
    const annovarMap = new Map(annovarResults.map(a => [a.variantId, a]));
    const vepMap = new Map(vepResults.map(v => [v.variantId, v]));

    // Get all unique variant IDs
    const allVariantIds = new Set([
      ...annovarResults.map(a => a.variantId),
      ...vepResults.map(v => v.variantId)
    ]);

    for (const variantId of allVariantIds) {
      const [chr, pos, ref, alt] = variantId.split(':');

      // Get annotations from each source
      const annovarAnn = annovarMap.get(variantId);
      const vepAnn = vepMap.get(variantId);

      let clinvarAnn;
      if (this.clinvar) {
        clinvarAnn = await this.clinvar.checkVariantSignificance(chr, parseInt(pos), ref, alt);
      }

      let gnomadAnn;
      let isRare = null;
      if (this.gnomad) {
        isRare = await this.gnomad.isRareVariant(chr, parseInt(pos), ref, alt);
      }

      // Create consolidated variant
      const variant: AnnotatedVariant = {
        variantId,
        chromosome: chr,
        position: parseInt(pos),
        ref,
        alt,
        vcf: {},
        annovar: annovarAnn,
        vep: vepAnn,
        clinvar: clinvarAnn,
        gnomad: gnomadAnn,
        priority: 'low',
        recommendation: ''
      };

      // Determine clinical significance
      if (clinvarAnn) {
        variant.clinicalSignificance = clinvarAnn.clinicalSignificance;
      }

      // Determine rarity
      if (isRare !== null) {
        if (isRare) {
          variant.rarity = 'rare';
        } else {
          const af = gnomadAnn?.alleleFrequencies?.global || 0;
          variant.rarity = af < 0.05 ? 'low_frequency' : 'common';
        }
        variant.alleleFrequency = gnomadAnn?.alleleFrequencies?.global;
      }

      // Determine functional impact
      if (vepAnn?.consequences?.[0]) {
        variant.functionalImpact = vepAnn.consequences[0].impact;
      } else if (annovarAnn?.exonicFunc) {
        variant.functionalImpact = annovarAnn.exonicFunc;
      }

      annotatedVariants.push(variant);
    }

    return annotatedVariants;
  }

  /**
   * Prioritize variants based on multiple factors
   */
  private prioritizeVariants(variants: AnnotatedVariant[]): AnnotatedVariant[] {
    return variants.map(variant => {
      let score = 0;
      const reasons: string[] = [];

      // Clinical significance (highest weight)
      if (variant.clinicalSignificance) {
        if (variant.clinicalSignificance.toLowerCase().includes('pathogenic')) {
          score += 50;
          reasons.push('Known pathogenic variant in ClinVar');
        } else if (variant.clinicalSignificance.toLowerCase().includes('likely pathogenic')) {
          score += 40;
          reasons.push('Likely pathogenic in ClinVar');
        } else if (variant.clinicalSignificance.toLowerCase().includes('uncertain')) {
          score += 20;
          reasons.push('Uncertain significance in ClinVar');
        }
      }

      // Functional impact
      if (variant.functionalImpact) {
        const impact = variant.functionalImpact.toLowerCase();
        if (impact.includes('high') || impact.includes('frameshift') || impact.includes('nonsense')) {
          score += 30;
          reasons.push('High functional impact');
        } else if (impact.includes('moderate') || impact.includes('missense')) {
          score += 20;
          reasons.push('Moderate functional impact');
        }
      }

      // Rarity
      if (variant.rarity === 'rare') {
        score += 15;
        reasons.push('Rare variant (AF < 1%)');
      } else if (variant.rarity === 'common') {
        score -= 20;
        reasons.push('Common variant - less likely pathogenic');
      }

      // Determine priority
      if (score >= 60) {
        variant.priority = 'high';
        variant.recommendation = 'Review urgently. ' + reasons.join('. ');
      } else if (score >= 30) {
        variant.priority = 'medium';
        variant.recommendation = 'Review for clinical relevance. ' + reasons.join('. ');
      } else {
        variant.priority = 'low';
        variant.recommendation = 'Likely benign or uncertain. ' + (reasons.join('. ') || 'Further investigation may be needed.');
      }

      return variant;
    }).sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate annotation report
   */
  async generateReport(variants: AnnotatedVariant[], outputFile: string): Promise<void> {
    const report: string[] = [
      '# Variant Annotation Report',
      '',
      `Generated: ${new Date().toISOString()}`,
      `Total variants: ${variants.length}`,
      '',
      '## Summary',
      `- High priority: ${variants.filter(v => v.priority === 'high').length}`,
      `- Medium priority: ${variants.filter(v => v.priority === 'medium').length}`,
      `- Low priority: ${variants.filter(v => v.priority === 'low').length}`,
      '',
      '## High Priority Variants',
      ''
    ];

    // Add high priority variants
    variants.filter(v => v.priority === 'high').forEach(variant => {
      report.push(`### ${variant.variantId}`);
      report.push(`**Priority:** ${variant.priority}`);
      if (variant.clinicalSignificance) {
        report.push(`**Clinical Significance:** ${variant.clinicalSignificance}`);
      }
      if (variant.functionalImpact) {
        report.push(`**Functional Impact:** ${variant.functionalImpact}`);
      }
      if (variant.alleleFrequency !== undefined) {
        report.push(`**Allele Frequency:** ${variant.alleleFrequency.toExponential(3)}`);
      }
      report.push(`**Recommendation:** ${variant.recommendation}`);
      report.push('');
    });

    const fs = require('fs');
    fs.writeFileSync(outputFile, report.join('\n'));
    console.log(`Report written to ${outputFile}`);
  }
}

// Example usage
export async function runVariantAnnotationPipeline() {
  const pipeline = new VariantAnnotationPipeline({
    vcfFile: '/path/to/patient.vcf',
    referenceGenome: '/path/to/reference.fa',
    annovarPath: '/path/to/annovar',
    vepPath: '/path/to/vep',
    humandb: '/path/to/annovar/humandb',
    vepCache: '/path/to/vep/cache',
    clinvarVcf: '/path/to/clinvar.vcf.gz',
    gnomadVcf: '/path/to/gnomad.vcf.gz',
    buildver: 'hg38',
    assembly: 'GRCh38',
    maxAF: 0.01,
    outputDir: '/path/to/output'
  });

  await pipeline.initialize();
  const annotatedVariants = await pipeline.run();
  await pipeline.generateReport(annotatedVariants, '/path/to/output/report.md');

  console.log('\nTop 10 prioritized variants:');
  annotatedVariants.slice(0, 10).forEach((v, i) => {
    console.log(`${i + 1}. ${v.variantId} - ${v.priority} priority`);
    console.log(`   ${v.recommendation}`);
  });
}
