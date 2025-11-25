/**
 * ClinVar Database Importer
 *
 * Imports and manages ClinVar variant data for clinical interpretation.
 * Provides semantic search over clinical significance, conditions, and evidence.
 */

import * as fs from 'fs';
import * as readline from 'readline';
import * as zlib from 'zlib';
import { GenomicVectorDB } from '../src/index';

export interface ClinVarVariant {
  variationId: string;
  variantId: string;
  chromosome: string;
  position: number;
  ref: string;
  alt: string;
  geneSymbol: string;
  geneId: string;
  clinicalSignificance: string;
  reviewStatus: string;
  conditions: string[];
  phenotypes: string[];
  molecularConsequence: string;
  proteinChange: string;
  assembly: string;
  submitters: string[];
  lastEvaluated: string;
  guidelines?: string[];
  citations?: string[];
}

export class ClinVarImporter {
  private db: GenomicVectorDB;

  constructor(db: GenomicVectorDB) {
    this.db = db;
  }

  /**
   * Import ClinVar VCF file
   */
  async importClinVarVCF(
    vcfPath: string,
    options?: {
      significanceFilter?: string[];
      batchSize?: number;
      onProgress?: (processed: number) => void;
    }
  ): Promise<number> {
    const batchSize = options?.batchSize || 1000;
    let batch: ClinVarVariant[] = [];
    let processedCount = 0;

    // Check if file is gzipped
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

      // Apply significance filter
      if (options?.significanceFilter &&
          !options.significanceFilter.includes(variant.clinicalSignificance)) {
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
   * Parse ClinVar VCF line
   */
  private parseVCFLine(line: string): ClinVarVariant | null {
    const fields = line.split('\t');
    if (fields.length < 8) return null;

    const [chrom, pos, id, ref, alt, qual, filter, info] = fields;

    // Parse INFO field
    const infoObj = this.parseInfoField(info);

    // Extract ClinVar-specific fields
    const geneInfo = infoObj.GENEINFO?.split(':') || ['', ''];
    const conditions = infoObj.CLNDN?.split('|') || [];
    const phenotypes = infoObj.CLNDISDB?.split('|') || [];

    return {
      variationId: id,
      variantId: `${chrom}:${pos}:${ref}:${alt}`,
      chromosome: chrom,
      position: parseInt(pos),
      ref,
      alt,
      geneSymbol: geneInfo[0] || '',
      geneId: geneInfo[1] || '',
      clinicalSignificance: infoObj.CLNSIG || '',
      reviewStatus: infoObj.CLNREVSTAT || '',
      conditions,
      phenotypes,
      molecularConsequence: infoObj.MC || '',
      proteinChange: infoObj.CLNHGVS || '',
      assembly: infoObj.ASSEMBLY || 'GRCh38',
      submitters: infoObj.CLNSUBMIT?.split('|') || [],
      lastEvaluated: infoObj.CLNLASTEVAL || '',
      guidelines: infoObj.CLNGUID?.split('|'),
      citations: infoObj.CLNPMID?.split('|')
    };
  }

  /**
   * Parse INFO field into key-value object
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
   * Ingest batch of ClinVar variants
   */
  private async ingestBatch(variants: ClinVarVariant[]): Promise<void> {
    const documents = variants.map(variant => {
      const description = this.createClinVarDescription(variant);

      return {
        id: `clinvar_${variant.variationId}`,
        content: description,
        metadata: {
          type: 'clinvar',
          variationId: variant.variationId,
          variantId: variant.variantId,
          chromosome: variant.chromosome,
          position: variant.position,
          geneSymbol: variant.geneSymbol,
          clinicalSignificance: variant.clinicalSignificance,
          reviewStatus: variant.reviewStatus,
          conditions: variant.conditions.join('|'),
          assembly: variant.assembly,
          source: 'clinvar'
        }
      };
    });

    await this.db.addDocuments(documents);
  }

  /**
   * Create semantic description for ClinVar variant
   */
  private createClinVarDescription(variant: ClinVarVariant): string {
    const parts: string[] = [];

    parts.push(`ClinVar variant ${variant.variationId}`);
    parts.push(`at ${variant.chromosome}:${variant.position} (${variant.ref}>${variant.alt})`);

    if (variant.geneSymbol) {
      parts.push(`in gene ${variant.geneSymbol}`);
    }

    parts.push(`Clinical significance: ${variant.clinicalSignificance}`);
    parts.push(`Review status: ${variant.reviewStatus}`);

    if (variant.conditions.length > 0) {
      parts.push(`Associated conditions: ${variant.conditions.join(', ')}`);
    }

    if (variant.molecularConsequence) {
      parts.push(`Molecular consequence: ${variant.molecularConsequence}`);
    }

    if (variant.proteinChange) {
      parts.push(`Protein change: ${variant.proteinChange}`);
    }

    if (variant.citations && variant.citations.length > 0) {
      parts.push(`Supported by ${variant.citations.length} citations (PMID: ${variant.citations.slice(0, 3).join(', ')})`);
    }

    return parts.join('. ');
  }

  /**
   * Search for pathogenic variants by condition
   */
  async searchByCondition(
    condition: string,
    options?: {
      significance?: string[];
      limit?: number;
    }
  ): Promise<any[]> {
    const query = `${condition} pathogenic disease`;

    return await this.db.search(query, {
      limit: options?.limit || 50,
      filter: {
        type: 'clinvar',
        ...(options?.significance && {
          clinicalSignificance: options.significance
        })
      }
    });
  }

  /**
   * Find variants by gene
   */
  async searchByGene(gene: string, limit: number = 50): Promise<any[]> {
    const query = `gene ${gene} clinical variant`;

    return await this.db.search(query, {
      limit,
      filter: {
        type: 'clinvar',
        geneSymbol: gene
      }
    });
  }

  /**
   * Get high-confidence pathogenic variants
   */
  async getPathogenicVariants(options?: {
    minStars?: number;
    limit?: number;
  }): Promise<any[]> {
    const query = "pathogenic likely pathogenic disease-causing mutation";

    const results = await this.db.search(query, {
      limit: options?.limit || 100,
      filter: {
        type: 'clinvar',
        clinicalSignificance: ['Pathogenic', 'Likely pathogenic']
      }
    });

    // Filter by review status (star rating)
    if (options?.minStars) {
      const starRatings: Record<string, number> = {
        'practice guideline': 4,
        'reviewed by expert panel': 3,
        'criteria provided, multiple submitters, no conflicts': 2,
        'criteria provided, single submitter': 1,
        'no assertion provided': 0,
        'no assertion criteria provided': 0
      };

      return results.filter(r => {
        const stars = starRatings[r.metadata.reviewStatus?.toLowerCase()] || 0;
        return stars >= (options.minStars || 0);
      });
    }

    return results;
  }

  /**
   * Find conflicting interpretations
   */
  async findConflictingInterpretations(limit: number = 50): Promise<any[]> {
    const query = "conflicting interpretations pathogenicity";

    return await this.db.search(query, {
      limit,
      filter: { type: 'clinvar' }
    });
  }

  /**
   * Search for variants with specific protein changes
   */
  async searchByProteinChange(
    proteinChange: string,
    limit: number = 20
  ): Promise<any[]> {
    const query = `protein change ${proteinChange} amino acid substitution`;

    return await this.db.search(query, {
      limit,
      filter: { type: 'clinvar' }
    });
  }

  /**
   * Get variants with strong evidence (guidelines/citations)
   */
  async getEvidenceBasedVariants(limit: number = 100): Promise<any[]> {
    const query = "clinical guideline evidence citation publication";

    return await this.db.search(query, {
      limit,
      filter: {
        type: 'clinvar',
        reviewStatus: ['practice guideline', 'reviewed by expert panel']
      }
    });
  }

  /**
   * Compare patient variant against ClinVar
   */
  async checkVariantSignificance(
    chromosome: string,
    position: number,
    ref: string,
    alt: string
  ): Promise<ClinVarVariant | null> {
    const variantId = `${chromosome}:${position}:${ref}:${alt}`;

    const results = await this.db.search(variantId, {
      limit: 1,
      filter: {
        type: 'clinvar',
        variantId
      }
    });

    return results.length > 0 ? results[0] : null;
  }
}

export default ClinVarImporter;
