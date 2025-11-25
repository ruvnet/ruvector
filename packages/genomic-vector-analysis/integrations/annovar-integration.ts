/**
 * ANNOVAR Integration
 *
 * Integrates with ANNOVAR for variant annotation and functional prediction.
 * Enriches variant data with gene-based, region-based, and filter-based annotations.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { GenomicVectorDB } from '../src/index';

export interface ANNOVARConfig {
  annovarPath: string;
  humandb: string;
  buildver: 'hg19' | 'hg38' | 'hg18';
}

export interface ANNOVARAnnotation {
  variantId: string;
  chromosome: string;
  position: number;
  ref: string;
  alt: string;
  gene: string;
  geneDetail: string;
  exonicFunc: string;
  aaChange: string;
  databases: {
    [key: string]: any;
  };
}

export class ANNOVARIntegration {
  private config: ANNOVARConfig;
  private db: GenomicVectorDB;

  constructor(config: ANNOVARConfig, db: GenomicVectorDB) {
    this.config = config;
    this.db = db;
  }

  /**
   * Convert VCF to ANNOVAR input format
   */
  private convertVCFtoANNOVAR(vcfFile: string, outputFile: string): void {
    const convertScript = path.join(this.config.annovarPath, 'convert2annovar.pl');

    const command = `perl ${convertScript} ` +
                   `-format vcf4 ` +
                   `${vcfFile} ` +
                   `-outfile ${outputFile} ` +
                   `-allsample -withfreq`;

    execSync(command);
  }

  /**
   * Run ANNOVAR table_annovar for comprehensive annotation
   */
  async annotateVariants(
    vcfFile: string,
    options?: {
      protocols?: string[];
      operations?: string[];
      outputPrefix?: string;
      naString?: string;
    }
  ): Promise<ANNOVARAnnotation[]> {
    const outputPrefix = options?.outputPrefix || '/tmp/annovar_output';
    const inputFile = `${outputPrefix}.avinput`;

    // Default protocols and operations
    const protocols = options?.protocols || [
      'refGene',
      'knownGene',
      'ensGene',
      'clinvar_20220320',
      'gnomad312_genome',
      'dbnsfp42a',
      'dbscsnv11',
      'cosmic70',
      'icgc28'
    ];

    const operations = options?.operations || [
      'g', // gene-based
      'g',
      'g',
      'f', // filter-based
      'f',
      'f',
      'f',
      'f',
      'f'
    ];

    try {
      // Convert VCF to ANNOVAR format
      this.convertVCFtoANNOVAR(vcfFile, inputFile);

      // Run table_annovar
      const tableAnnovar = path.join(this.config.annovarPath, 'table_annovar.pl');
      const command = `perl ${tableAnnovar} ` +
                     `${inputFile} ` +
                     `${this.config.humandb} ` +
                     `-buildver ${this.config.buildver} ` +
                     `-out ${outputPrefix} ` +
                     `-remove ` +
                     `-protocol ${protocols.join(',')} ` +
                     `-operation ${operations.join(',')} ` +
                     `-nastring ${options?.naString || '.'} ` +
                     `-csvout -polish`;

      execSync(command);

      // Parse output and create annotations
      const annotations = this.parseANNOVAROutput(`${outputPrefix}.${this.config.buildver}_multianno.csv`);

      // Ingest into vector database
      await this.ingestAnnotations(annotations);

      return annotations;
    } catch (error) {
      throw new Error(`ANNOVAR annotation failed: ${error}`);
    }
  }

  /**
   * Parse ANNOVAR CSV output
   */
  private parseANNOVAROutput(csvFile: string): ANNOVARAnnotation[] {
    const content = fs.readFileSync(csvFile, 'utf-8');
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));

    const annotations: ANNOVARAnnotation[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const values = this.parseCSVLine(lines[i]);
      const row: Record<string, string> = {};

      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });

      // Extract key fields
      const annotation: ANNOVARAnnotation = {
        variantId: `${row.Chr}:${row.Start}:${row.Ref}:${row.Alt}`,
        chromosome: row.Chr,
        position: parseInt(row.Start),
        ref: row.Ref,
        alt: row.Alt,
        gene: row['Gene.refGene'] || '',
        geneDetail: row['GeneDetail.refGene'] || '',
        exonicFunc: row['ExonicFunc.refGene'] || '',
        aaChange: row['AAChange.refGene'] || '',
        databases: {}
      };

      // Add database annotations
      Object.keys(row).forEach(key => {
        if (!['Chr', 'Start', 'End', 'Ref', 'Alt'].includes(key)) {
          annotation.databases[key] = row[key];
        }
      });

      annotations.push(annotation);
    }

    return annotations;
  }

  /**
   * Parse CSV line handling quoted fields
   */
  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  }

  /**
   * Ingest ANNOVAR annotations into vector database
   */
  private async ingestAnnotations(annotations: ANNOVARAnnotation[]): Promise<void> {
    const documents = annotations.map(ann => {
      const description = this.createAnnotationDescription(ann);

      return {
        id: `annovar_${ann.variantId}`,
        content: description,
        metadata: {
          type: 'annovar_annotation',
          variantId: ann.variantId,
          chromosome: ann.chromosome,
          position: ann.position,
          gene: ann.gene,
          exonicFunc: ann.exonicFunc,
          databases: JSON.stringify(ann.databases),
          source: 'annovar'
        }
      };
    });

    await this.db.addDocuments(documents);
  }

  /**
   * Create semantic description for annotation
   */
  private createAnnotationDescription(ann: ANNOVARAnnotation): string {
    const parts: string[] = [];

    parts.push(`Variant ${ann.variantId}`);

    if (ann.gene) {
      parts.push(`located in gene ${ann.gene}`);
    }

    if (ann.exonicFunc) {
      parts.push(`with ${ann.exonicFunc} effect`);
    }

    if (ann.aaChange) {
      parts.push(`causing amino acid change: ${ann.aaChange}`);
    }

    // Add clinical significance
    if (ann.databases.clinvar_20220320) {
      parts.push(`ClinVar annotation: ${ann.databases.clinvar_20220320}`);
    }

    // Add population frequency
    if (ann.databases.gnomad312_genome) {
      parts.push(`gnomAD frequency: ${ann.databases.gnomad312_genome}`);
    }

    // Add functional predictions
    if (ann.databases.SIFT_pred) {
      parts.push(`SIFT prediction: ${ann.databases.SIFT_pred}`);
    }
    if (ann.databases.Polyphen2_HDIV_pred) {
      parts.push(`PolyPhen-2 prediction: ${ann.databases.Polyphen2_HDIV_pred}`);
    }

    // Add conservation scores
    if (ann.databases.GERP_RS) {
      parts.push(`GERP++ conservation score: ${ann.databases.GERP_RS}`);
    }

    return parts.join('. ');
  }

  /**
   * Search for functionally similar variants
   */
  async searchSimilarAnnotations(variantId: string, limit: number = 10): Promise<any[]> {
    const results = await this.db.search(variantId, {
      limit,
      filter: { source: 'annovar' }
    });

    return results;
  }

  /**
   * Get pathogenic variants from ClinVar
   */
  async getPathogenicVariants(limit: number = 100): Promise<any[]> {
    const query = "pathogenic likely pathogenic disease-causing mutation";
    return await this.db.search(query, {
      limit,
      filter: { source: 'annovar' }
    });
  }

  /**
   * Find variants with specific functional impact
   */
  async findByFunctionalImpact(
    impact: 'frameshift' | 'nonsense' | 'missense' | 'synonymous' | 'splice',
    limit: number = 50
  ): Promise<any[]> {
    const impactQueries: Record<string, string> = {
      frameshift: 'frameshift deletion insertion',
      nonsense: 'stopgain nonsense premature termination',
      missense: 'missense nonsynonymous amino acid substitution',
      synonymous: 'synonymous silent mutation',
      splice: 'splicing splice site acceptor donor'
    };

    const query = impactQueries[impact];
    return await this.db.search(query, {
      limit,
      filter: { source: 'annovar' }
    });
  }

  /**
   * Annotate single variant using ANNOVAR
   */
  async annotateSingleVariant(
    chromosome: string,
    position: number,
    ref: string,
    alt: string
  ): Promise<ANNOVARAnnotation | null> {
    const tmpInput = '/tmp/single_variant.avinput';
    const tmpVcf = '/tmp/single_variant.vcf';

    // Create single-variant VCF
    const vcfContent = [
      '##fileformat=VCFv4.2',
      '#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO',
      `${chromosome}\t${position}\t.\t${ref}\t${alt}\t.\tPASS\t.`
    ].join('\n');

    fs.writeFileSync(tmpVcf, vcfContent);

    try {
      const annotations = await this.annotateVariants(tmpVcf, {
        outputPrefix: '/tmp/single_variant'
      });

      // Clean up
      if (fs.existsSync(tmpInput)) fs.unlinkSync(tmpInput);
      if (fs.existsSync(tmpVcf)) fs.unlinkSync(tmpVcf);

      return annotations.length > 0 ? annotations[0] : null;
    } catch (error) {
      throw new Error(`Single variant annotation failed: ${error}`);
    }
  }
}

export default ANNOVARIntegration;
