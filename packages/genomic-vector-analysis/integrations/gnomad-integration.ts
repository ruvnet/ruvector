/**
 * gnomAD (Genome Aggregation Database) Integration
 *
 * Integrates population frequency data from gnomAD for variant filtering
 * and interpretation. Provides allele frequency lookups and constraint metrics.
 */

import * as fs from 'fs';
import * as readline from 'readline';
import * as zlib from 'zlib';
import { GenomicVectorDB } from '../src/index';

export interface GnomADVariant {
  variantId: string;
  chromosome: string;
  position: number;
  ref: string;
  alt: string;
  filters: string[];
  alleleFrequencies: {
    global: number;
    afr: number;    // African/African American
    amr: number;    // Latino/Admixed American
    asj: number;    // Ashkenazi Jewish
    eas: number;    // East Asian
    fin: number;    // Finnish
    nfe: number;    // Non-Finnish European
    sas: number;    // South Asian
    oth: number;    // Other
  };
  alleleCounts: {
    global: { ac: number; an: number; nhomalt: number };
    [population: string]: { ac: number; an: number; nhomalt: number };
  };
  vep?: {
    gene: string;
    consequence: string;
    impact: string;
    lof?: string;
  };
}

export interface GeneConstraint {
  gene: string;
  pLI: number;              // Probability of Loss-of-Function Intolerance
  oe_lof: number;           // Observed/Expected ratio for LoF variants
  oe_lof_upper: number;
  oe_mis: number;           // Observed/Expected ratio for missense variants
  oe_mis_upper: number;
  constraint_flag?: string;
}

export class GnomADIntegration {
  private db: GenomicVectorDB;
  private geneConstraints: Map<string, GeneConstraint> = new Map();

  constructor(db: GenomicVectorDB) {
    this.db = db;
  }

  /**
   * Import gnomAD VCF file
   */
  async importGnomADVCF(
    vcfPath: string,
    options?: {
      maxAF?: number;
      populations?: string[];
      batchSize?: number;
      onProgress?: (processed: number) => void;
    }
  ): Promise<number> {
    const batchSize = options?.batchSize || 1000;
    let batch: GnomADVariant[] = [];
    let processedCount = 0;

    const isGzipped = vcfPath.endsWith('.gz');
    const stream = isGzipped
      ? fs.createReadStream(vcfPath).pipe(zlib.createGunzip())
      : fs.createReadStream(vcfPath);

    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (line.startsWith('#')) continue;

      const variant = this.parseVCFLine(line);
      if (!variant) continue;

      // Filter by maximum allele frequency
      if (options?.maxAF && variant.alleleFrequencies.global > options.maxAF) {
        continue;
      }

      batch.push(variant);

      if (batch.length >= batchSize) {
        await this.ingestBatch(batch);
        processedCount += batch.length;
        batch = [];

        if (options?.onProgress) {
          options.onProgress(processedCount);
        }
      }
    }

    // Ingest remaining
    if (batch.length > 0) {
      await this.ingestBatch(batch);
      processedCount += batch.length;

      if (options?.onProgress) {
        options.onProgress(processedCount);
      }
    }

    return processedCount;
  }

  /**
   * Parse gnomAD VCF line
   */
  private parseVCFLine(line: string): GnomADVariant | null {
    const fields = line.split('\t');
    if (fields.length < 8) return null;

    const [chrom, pos, id, ref, alt, qual, filter, info] = fields;

    const infoObj = this.parseInfoField(info);

    // Extract allele frequencies
    const alleleFrequencies = {
      global: parseFloat(infoObj.AF || '0'),
      afr: parseFloat(infoObj.AF_afr || '0'),
      amr: parseFloat(infoObj.AF_amr || '0'),
      asj: parseFloat(infoObj.AF_asj || '0'),
      eas: parseFloat(infoObj.AF_eas || '0'),
      fin: parseFloat(infoObj.AF_fin || '0'),
      nfe: parseFloat(infoObj.AF_nfe || '0'),
      sas: parseFloat(infoObj.AF_sas || '0'),
      oth: parseFloat(infoObj.AF_oth || '0')
    };

    // Extract allele counts
    const alleleCounts: any = {
      global: {
        ac: parseInt(infoObj.AC || '0'),
        an: parseInt(infoObj.AN || '0'),
        nhomalt: parseInt(infoObj.nhomalt || '0')
      }
    };

    ['afr', 'amr', 'asj', 'eas', 'fin', 'nfe', 'sas', 'oth'].forEach(pop => {
      alleleCounts[pop] = {
        ac: parseInt(infoObj[`AC_${pop}`] || '0'),
        an: parseInt(infoObj[`AN_${pop}`] || '0'),
        nhomalt: parseInt(infoObj[`nhomalt_${pop}`] || '0')
      };
    });

    // Extract VEP annotations if present
    const vep = infoObj.vep ? {
      gene: infoObj.vep_gene || '',
      consequence: infoObj.vep_consequence || '',
      impact: infoObj.vep_impact || '',
      lof: infoObj.vep_lof
    } : undefined;

    return {
      variantId: `${chrom}:${pos}:${ref}:${alt}`,
      chromosome: chrom,
      position: parseInt(pos),
      ref,
      alt,
      filters: filter.split(';'),
      alleleFrequencies,
      alleleCounts,
      vep
    };
  }

  /**
   * Parse INFO field
   */
  private parseInfoField(info: string): Record<string, string> {
    const obj: Record<string, string> = {};

    info.split(';').forEach(pair => {
      const [key, value] = pair.split('=');
      obj[key] = value || 'true';
    });

    return obj;
  }

  /**
   * Ingest batch of gnomAD variants
   */
  private async ingestBatch(variants: GnomADVariant[]): Promise<void> {
    const documents = variants.map(variant => {
      const description = this.createGnomADDescription(variant);

      return {
        id: `gnomad_${variant.variantId}`,
        content: description,
        metadata: {
          type: 'gnomad',
          variantId: variant.variantId,
          chromosome: variant.chromosome,
          position: variant.position,
          af_global: variant.alleleFrequencies.global,
          af_afr: variant.alleleFrequencies.afr,
          af_nfe: variant.alleleFrequencies.nfe,
          af_eas: variant.alleleFrequencies.eas,
          ac_global: variant.alleleCounts.global.ac,
          an_global: variant.alleleCounts.global.an,
          gene: variant.vep?.gene,
          source: 'gnomad'
        }
      };
    });

    await this.db.addDocuments(documents);
  }

  /**
   * Create semantic description
   */
  private createGnomADDescription(variant: GnomADVariant): string {
    const parts: string[] = [];

    parts.push(`Population variant ${variant.variantId}`);
    parts.push(`Global allele frequency: ${variant.alleleFrequencies.global.toExponential(3)}`);

    // Highlight if rare
    if (variant.alleleFrequencies.global < 0.01) {
      parts.push('Rare variant (AF < 1%)');
    } else if (variant.alleleFrequencies.global < 0.05) {
      parts.push('Low frequency variant (AF < 5%)');
    } else {
      parts.push('Common variant (AF >= 5%)');
    }

    // Population-specific frequencies
    const popFreqs: string[] = [];
    if (variant.alleleFrequencies.afr > 0.01) popFreqs.push(`African: ${variant.alleleFrequencies.afr.toFixed(4)}`);
    if (variant.alleleFrequencies.nfe > 0.01) popFreqs.push(`European: ${variant.alleleFrequencies.nfe.toFixed(4)}`);
    if (variant.alleleFrequencies.eas > 0.01) popFreqs.push(`East Asian: ${variant.alleleFrequencies.eas.toFixed(4)}`);
    if (variant.alleleFrequencies.sas > 0.01) popFreqs.push(`South Asian: ${variant.alleleFrequencies.sas.toFixed(4)}`);

    if (popFreqs.length > 0) {
      parts.push(`Population frequencies: ${popFreqs.join(', ')}`);
    }

    // Homozygous count
    if (variant.alleleCounts.global.nhomalt > 0) {
      parts.push(`Homozygous individuals: ${variant.alleleCounts.global.nhomalt}`);
    }

    // VEP annotation
    if (variant.vep) {
      parts.push(`Gene: ${variant.vep.gene}, Consequence: ${variant.vep.consequence}`);
      if (variant.vep.lof) {
        parts.push(`Loss-of-function: ${variant.vep.lof}`);
      }
    }

    return parts.join('. ');
  }

  /**
   * Load gene constraint metrics
   */
  async loadGeneConstraints(constraintFile: string): Promise<void> {
    const fileStream = fs.createReadStream(constraintFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let headers: string[] = [];

    for await (const line of rl) {
      if (line.startsWith('gene')) {
        headers = line.split('\t');
        continue;
      }

      const values = line.split('\t');
      const gene = values[0];

      const constraint: GeneConstraint = {
        gene,
        pLI: parseFloat(values[headers.indexOf('pLI')] || '0'),
        oe_lof: parseFloat(values[headers.indexOf('oe_lof')] || '0'),
        oe_lof_upper: parseFloat(values[headers.indexOf('oe_lof_upper')] || '0'),
        oe_mis: parseFloat(values[headers.indexOf('oe_mis')] || '0'),
        oe_mis_upper: parseFloat(values[headers.indexOf('oe_mis_upper')] || '0'),
        constraint_flag: values[headers.indexOf('constraint_flag')]
      };

      this.geneConstraints.set(gene, constraint);
    }
  }

  /**
   * Check if variant is rare
   */
  async isRareVariant(
    chromosome: string,
    position: number,
    ref: string,
    alt: string,
    threshold: number = 0.01
  ): Promise<boolean | null> {
    const variantId = `${chromosome}:${position}:${ref}:${alt}`;

    const results = await this.db.search(variantId, {
      limit: 1,
      filter: {
        type: 'gnomad',
        variantId
      }
    });

    if (results.length === 0) return null; // Not found in gnomAD

    const af = results[0].metadata.af_global;
    return af < threshold;
  }

  /**
   * Get gene constraint
   */
  getGeneConstraint(gene: string): GeneConstraint | undefined {
    return this.geneConstraints.get(gene);
  }

  /**
   * Find rare variants in gene
   */
  async findRareVariantsInGene(
    gene: string,
    maxAF: number = 0.001,
    limit: number = 100
  ): Promise<any[]> {
    const query = `gene ${gene} rare variant`;

    const results = await this.db.search(query, {
      limit,
      filter: {
        type: 'gnomad',
        gene
      }
    });

    return results.filter(r => r.metadata.af_global <= maxAF);
  }

  /**
   * Check if gene is loss-of-function intolerant
   */
  isLoFIntolerant(gene: string, threshold: number = 0.9): boolean {
    const constraint = this.geneConstraints.get(gene);
    if (!constraint) return false;

    return constraint.pLI >= threshold;
  }
}

export default GnomADIntegration;
