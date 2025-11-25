/**
 * VCF Parser Integration
 *
 * Integrates VCF.js library for parsing VCF files and ingesting variants
 * into the genomic vector database for semantic search and analysis.
 */

import * as fs from 'fs';
import * as readline from 'readline';
import { GenomicVectorDB } from '../src/index';

export interface VCFVariant {
  chromosome: string;
  position: number;
  id: string;
  ref: string;
  alt: string[];
  quality: number | null;
  filter: string;
  info: Record<string, any>;
  format?: string[];
  samples?: Record<string, string[]>;
}

export interface VCFHeader {
  fileformat: string;
  metadata: Record<string, any>;
  samples: string[];
}

export class VCFParser {
  private db: GenomicVectorDB;
  private header: VCFHeader | null = null;

  constructor(db: GenomicVectorDB) {
    this.db = db;
  }

  /**
   * Parse VCF file header
   */
  private parseHeader(line: string): void {
    if (line.startsWith('##')) {
      // Parse metadata lines
      const match = line.match(/##(.+?)=(.+)/);
      if (match) {
        const [, key, value] = match;
        if (!this.header) {
          this.header = {
            fileformat: '',
            metadata: {},
            samples: []
          };
        }

        if (key === 'fileformat') {
          this.header.fileformat = value;
        } else {
          this.header.metadata[key] = value;
        }
      }
    } else if (line.startsWith('#CHROM')) {
      // Parse column header
      const columns = line.substring(1).split('\t');
      if (!this.header) {
        this.header = {
          fileformat: '',
          metadata: {},
          samples: []
        };
      }
      this.header.samples = columns.slice(9); // Sample names start at column 9
    }
  }

  /**
   * Parse VCF variant line
   */
  private parseVariant(line: string): VCFVariant | null {
    const fields = line.split('\t');
    if (fields.length < 8) return null;

    const [chrom, pos, id, ref, alt, qual, filter, info, format, ...samples] = fields;

    // Parse INFO field
    const infoObj: Record<string, any> = {};
    info.split(';').forEach(pair => {
      const [key, value] = pair.split('=');
      infoObj[key] = value || true;
    });

    // Parse samples if available
    const sampleData: Record<string, string[]> = {};
    if (format && samples.length > 0 && this.header?.samples) {
      this.header.samples.forEach((sampleName, idx) => {
        if (samples[idx]) {
          sampleData[sampleName] = samples[idx].split(':');
        }
      });
    }

    return {
      chromosome: chrom,
      position: parseInt(pos),
      id: id === '.' ? `${chrom}:${pos}:${ref}:${alt}` : id,
      ref,
      alt: alt.split(','),
      quality: qual === '.' ? null : parseFloat(qual),
      filter,
      info: infoObj,
      format: format ? format.split(':') : undefined,
      samples: Object.keys(sampleData).length > 0 ? sampleData : undefined
    };
  }

  /**
   * Parse VCF file and ingest into database
   */
  async parseFile(filePath: string, options?: {
    batchSize?: number;
    onProgress?: (processed: number) => void;
    filterFunction?: (variant: VCFVariant) => boolean;
  }): Promise<number> {
    const batchSize = options?.batchSize || 1000;
    let batch: VCFVariant[] = [];
    let processedCount = 0;

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (line.startsWith('#')) {
        this.parseHeader(line);
        continue;
      }

      const variant = this.parseVariant(line);
      if (!variant) continue;

      // Apply filter if provided
      if (options?.filterFunction && !options.filterFunction(variant)) {
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

    // Ingest remaining variants
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
   * Ingest batch of variants into vector database
   */
  private async ingestBatch(variants: VCFVariant[]): Promise<void> {
    const documents = variants.map(variant => {
      // Create semantic description for embedding
      const description = this.createVariantDescription(variant);

      return {
        id: variant.id,
        content: description,
        metadata: {
          type: 'variant',
          chromosome: variant.chromosome,
          position: variant.position,
          ref: variant.ref,
          alt: variant.alt.join(','),
          quality: variant.quality,
          filter: variant.filter,
          info: JSON.stringify(variant.info),
          source: 'vcf'
        }
      };
    });

    await this.db.addDocuments(documents);
  }

  /**
   * Create semantic description for variant embedding
   */
  private createVariantDescription(variant: VCFVariant): string {
    const parts: string[] = [];

    // Basic variant description
    parts.push(`Genetic variant at chromosome ${variant.chromosome} position ${variant.position}`);
    parts.push(`Reference allele: ${variant.ref}, Alternative allele: ${variant.alt.join(', ')}`);

    // Add quality information
    if (variant.quality !== null) {
      parts.push(`Quality score: ${variant.quality}`);
    }

    // Add filter status
    if (variant.filter !== 'PASS' && variant.filter !== '.') {
      parts.push(`Filter status: ${variant.filter}`);
    }

    // Add INFO annotations
    if (variant.info.AF) {
      parts.push(`Allele frequency: ${variant.info.AF}`);
    }
    if (variant.info.DP) {
      parts.push(`Read depth: ${variant.info.DP}`);
    }
    if (variant.info.Gene) {
      parts.push(`Gene: ${variant.info.Gene}`);
    }
    if (variant.info.Consequence) {
      parts.push(`Consequence: ${variant.info.Consequence}`);
    }

    return parts.join('. ');
  }

  /**
   * Search for similar variants
   */
  async searchSimilarVariants(variant: VCFVariant, limit: number = 10): Promise<any[]> {
    const query = this.createVariantDescription(variant);
    return await this.db.search(query, { limit });
  }

  /**
   * Get header information
   */
  getHeader(): VCFHeader | null {
    return this.header;
  }
}

/**
 * Example usage with Samtools integration
 */
export class SamtoolsIntegration {
  /**
   * Call variants using samtools and parse results
   */
  static async callVariants(
    bamFile: string,
    referenceGenome: string,
    db: GenomicVectorDB,
    options?: {
      region?: string;
      minQuality?: number;
    }
  ): Promise<number> {
    const { execSync } = require('child_process');
    const tmpVcf = '/tmp/samtools_output.vcf';

    // Build samtools command
    const regionArg = options?.region ? `-r ${options.region}` : '';
    const qualArg = options?.minQuality ? `-q ${options.minQuality}` : '';

    const command = `samtools mpileup -uf ${referenceGenome} ${bamFile} ${regionArg} | ` +
                   `bcftools call -mv ${qualArg} -o ${tmpVcf}`;

    try {
      execSync(command);

      // Parse and ingest VCF
      const parser = new VCFParser(db);
      const count = await parser.parseFile(tmpVcf);

      // Clean up
      fs.unlinkSync(tmpVcf);

      return count;
    } catch (error) {
      throw new Error(`Samtools variant calling failed: ${error}`);
    }
  }
}

/**
 * GATK Pipeline Integration
 */
export class GATKIntegration {
  /**
   * Run GATK HaplotypeCaller and ingest variants
   */
  static async haplotypeCaller(
    bamFile: string,
    referenceGenome: string,
    db: GenomicVectorDB,
    options?: {
      intervals?: string;
      dbsnp?: string;
      outputVcf?: string;
    }
  ): Promise<number> {
    const { execSync } = require('child_process');
    const outputVcf = options?.outputVcf || '/tmp/gatk_output.vcf';

    // Build GATK command
    const intervalsArg = options?.intervals ? `-L ${options.intervals}` : '';
    const dbsnpArg = options?.dbsnp ? `--dbsnp ${options.dbsnp}` : '';

    const command = `gatk HaplotypeCaller ` +
                   `-R ${referenceGenome} ` +
                   `-I ${bamFile} ` +
                   `-O ${outputVcf} ` +
                   `${intervalsArg} ${dbsnpArg}`;

    try {
      execSync(command);

      // Parse and ingest VCF
      const parser = new VCFParser(db);
      const count = await parser.parseFile(outputVcf);

      // Clean up if temporary
      if (!options?.outputVcf) {
        fs.unlinkSync(outputVcf);
      }

      return count;
    } catch (error) {
      throw new Error(`GATK HaplotypeCaller failed: ${error}`);
    }
  }

  /**
   * Apply GATK VQSR filtering
   */
  static async applyVQSR(
    inputVcf: string,
    referenceGenome: string,
    db: GenomicVectorDB,
    options: {
      resource: string[];
      mode: 'SNP' | 'INDEL';
      outputVcf?: string;
    }
  ): Promise<number> {
    const { execSync } = require('child_process');
    const recalFile = '/tmp/vqsr.recal';
    const tranchesFile = '/tmp/vqsr.tranches';
    const outputVcf = options.outputVcf || '/tmp/vqsr_filtered.vcf';

    // Build resource arguments
    const resourceArgs = options.resource.join(' ');

    try {
      // Variant recalibration
      execSync(`gatk VariantRecalibrator ` +
              `-R ${referenceGenome} ` +
              `-V ${inputVcf} ` +
              `${resourceArgs} ` +
              `-mode ${options.mode} ` +
              `-O ${recalFile} ` +
              `--tranches-file ${tranchesFile}`);

      // Apply recalibration
      execSync(`gatk ApplyVQSR ` +
              `-R ${referenceGenome} ` +
              `-V ${inputVcf} ` +
              `-mode ${options.mode} ` +
              `--recal-file ${recalFile} ` +
              `--tranches-file ${tranchesFile} ` +
              `-O ${outputVcf}`);

      // Parse and ingest filtered VCF
      const parser = new VCFParser(db);
      const count = await parser.parseFile(outputVcf);

      // Clean up
      fs.unlinkSync(recalFile);
      fs.unlinkSync(tranchesFile);
      if (!options.outputVcf) {
        fs.unlinkSync(outputVcf);
      }

      return count;
    } catch (error) {
      throw new Error(`GATK VQSR failed: ${error}`);
    }
  }
}

export { VCFParser, SamtoolsIntegration, GATKIntegration };
