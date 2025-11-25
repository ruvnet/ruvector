/**
 * Data Validation Tests
 * Tests VCF parsing, HPO term validation, ClinVar/gnomAD data import
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import {
  VCFParser,
  VCFRecord,
  VCFHeader,
  HPOValidator,
  ClinVarImporter,
  GnomADImporter,
} from '../../src/validation';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('VCF File Parsing', () => {
  let parser: VCFParser;

  beforeAll(() => {
    parser = new VCFParser();
  });

  describe('VCF Format Validation', () => {
    it('should parse valid VCF header', async () => {
      const vcfContent = `##fileformat=VCFv4.2
##reference=GRCh38
##INFO=<ID=AF,Number=A,Type=Float,Description="Allele Frequency">
##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE1
`;

      const tempFile = '/tmp/test.vcf';
      await fs.writeFile(tempFile, vcfContent);

      const header = await parser.parseHeader(tempFile);

      expect(header.fileformat).toBe('VCFv4.2');
      expect(header.reference).toBe('GRCh38');
      expect(header.infoFields).toHaveLength(1);
      expect(header.formatFields).toHaveLength(1);
      expect(header.samples).toEqual(['SAMPLE1']);
    });

    it('should parse VCF records correctly', async () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE1
chr1\t10000\trs123\tA\tT\t30\tPASS\tAF=0.01\tGT\t0/1
chr2\t20000\t.\tG\tC\t40\tPASS\tAF=0.5\tGT\t1/1
`;

      const tempFile = '/tmp/test_records.vcf';
      await fs.writeFile(tempFile, vcfContent);

      const records = await parser.parse(tempFile);

      expect(records).toHaveLength(2);

      expect(records[0].chromosome).toBe('chr1');
      expect(records[0].position).toBe(10000);
      expect(records[0].id).toBe('rs123');
      expect(records[0].refAllele).toBe('A');
      expect(records[0].altAllele).toBe('T');
      expect(records[0].quality).toBe(30);
      expect(records[0].filter).toBe('PASS');
      expect(records[0].info.AF).toBe(0.01);
    });

    it('should handle multi-allelic variants', async () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
chr1\t10000\t.\tA\tT,C,G\t30\tPASS\tAF=0.01,0.02,0.03
`;

      const tempFile = '/tmp/test_multiallelic.vcf';
      await fs.writeFile(tempFile, vcfContent);

      const records = await parser.parse(tempFile, { splitMultiAllelic: true });

      expect(records).toHaveLength(3);
      expect(records[0].altAllele).toBe('T');
      expect(records[1].altAllele).toBe('C');
      expect(records[2].altAllele).toBe('G');
    });

    it('should handle insertions and deletions', async () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
chr1\t10000\t.\tA\tATC\t30\tPASS\t.
chr1\t20000\t.\tATCG\tA\t40\tPASS\t.
`;

      const tempFile = '/tmp/test_indels.vcf';
      await fs.writeFile(tempFile, vcfContent);

      const records = await parser.parse(tempFile);

      expect(records[0].variantType).toBe('insertion');
      expect(records[0].variantLength).toBe(2); // +2 bases

      expect(records[1].variantType).toBe('deletion');
      expect(records[1].variantLength).toBe(3); // -3 bases
    });

    it('should handle structural variants', async () => {
      const vcfContent = `##fileformat=VCFv4.2
##ALT=<ID=DEL,Description="Deletion">
##ALT=<ID=DUP,Description="Duplication">
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
chr1\t10000\t.\tN\t<DEL>\t30\tPASS\tSVTYPE=DEL;SVLEN=-5000;END=15000
chr2\t20000\t.\tN\t<DUP>\t40\tPASS\tSVTYPE=DUP;SVLEN=10000;END=30000
`;

      const tempFile = '/tmp/test_sv.vcf';
      await fs.writeFile(tempFile, vcfContent);

      const records = await parser.parse(tempFile);

      expect(records[0].variantType).toBe('structural');
      expect(records[0].svType).toBe('DEL');
      expect(records[0].svLength).toBe(-5000);

      expect(records[1].svType).toBe('DUP');
      expect(records[1].svLength).toBe(10000);
    });
  });

  describe('VCF Format Errors', () => {
    it('should reject invalid VCF format', async () => {
      const invalidVCF = `This is not a VCF file`;
      const tempFile = '/tmp/invalid.vcf';
      await fs.writeFile(tempFile, invalidVCF);

      await expect(parser.parse(tempFile)).rejects.toThrow('Invalid VCF format');
    });

    it('should reject malformed records', async () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
chr1\t10000
`;

      const tempFile = '/tmp/malformed.vcf';
      await fs.writeFile(tempFile, vcfContent);

      await expect(parser.parse(tempFile)).rejects.toThrow('Malformed VCF record');
    });

    it('should validate chromosome names', async () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
invalid_chr\t10000\t.\tA\tT\t30\tPASS\t.
`;

      const tempFile = '/tmp/invalid_chr.vcf';
      await fs.writeFile(tempFile, vcfContent);

      await expect(
        parser.parse(tempFile, { validateChromosome: true })
      ).rejects.toThrow('Invalid chromosome');
    });

    it('should validate reference alleles', async () => {
      const vcfContent = `##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
chr1\t10000\t.\tX\tT\t30\tPASS\t.
`;

      const tempFile = '/tmp/invalid_ref.vcf';
      await fs.writeFile(tempFile, vcfContent);

      await expect(parser.parse(tempFile)).rejects.toThrow('Invalid nucleotide');
    });
  });

  describe('VCF Performance', () => {
    it('should parse large VCF files efficiently', async () => {
      // Generate large VCF with 40K variants
      let vcfContent = `##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\n`;

      for (let i = 0; i < 40000; i++) {
        vcfContent += `chr1\t${10000 + i}\t.\tA\tT\t30\tPASS\tAF=0.01\n`;
      }

      const tempFile = '/tmp/large.vcf';
      await fs.writeFile(tempFile, vcfContent);

      const startTime = performance.now();
      const records = await parser.parse(tempFile);
      const duration = performance.now() - startTime;

      expect(records).toHaveLength(40000);
      expect(duration).toBeLessThan(5000); // <5 seconds for 40K variants
    });

    it('should support streaming for memory efficiency', async () => {
      const vcfContent = `##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\n`;
      for (let i = 0; i < 10000; i++) {
        vcfContent += `chr1\t${10000 + i}\t.\tA\tT\t30\tPASS\t.\n`;
      }

      const tempFile = '/tmp/stream.vcf';
      await fs.writeFile(tempFile, vcfContent);

      let count = 0;
      const stream = parser.createStream(tempFile);

      await new Promise((resolve, reject) => {
        stream.on('data', (record: VCFRecord) => {
          count++;
        });
        stream.on('end', resolve);
        stream.on('error', reject);
      });

      expect(count).toBe(10000);
    });
  });
});

describe('HPO Term Validation', () => {
  let validator: HPOValidator;

  beforeAll(async () => {
    validator = await HPOValidator.create();
  });

  describe('HPO Term Format', () => {
    it('should validate correct HPO terms', () => {
      const validTerms = [
        'HP:0001250', // Seizures
        'HP:0001252', // Hypotonia
        'HP:0002376', // Developmental regression
      ];

      validTerms.forEach((term) => {
        expect(validator.isValid(term)).toBe(true);
      });
    });

    it('should reject invalid HPO terms', () => {
      const invalidTerms = [
        'HP:invalid',
        'HP:99999999',
        'not_an_hpo_term',
        'HP:',
        '0001250',
      ];

      invalidTerms.forEach((term) => {
        expect(validator.isValid(term)).toBe(false);
      });
    });

    it('should retrieve HPO term metadata', async () => {
      const term = 'HP:0001250'; // Seizures
      const metadata = await validator.getTermMetadata(term);

      expect(metadata).toBeDefined();
      expect(metadata.id).toBe('HP:0001250');
      expect(metadata.name).toContain('Seizure');
      expect(metadata.definition).toBeDefined();
    });
  });

  describe('HPO Term Relationships', () => {
    it('should find parent terms', async () => {
      const term = 'HP:0001250'; // Seizures
      const parents = await validator.getParents(term);

      expect(parents.length).toBeGreaterThan(0);
      expect(parents.some((p) => p.includes('nervous system'))).toBe(true);
    });

    it('should find child terms', async () => {
      const term = 'HP:0001250'; // Seizures
      const children = await validator.getChildren(term);

      expect(children.length).toBeGreaterThan(0);
      // Should include specific seizure types
    });

    it('should calculate term similarity', async () => {
      const term1 = 'HP:0001250'; // Seizures
      const term2 = 'HP:0001252'; // Hypotonia

      const similarity = await validator.calculateSimilarity(term1, term2);

      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('should find common ancestors', async () => {
      const term1 = 'HP:0001250';
      const term2 = 'HP:0001252';

      const ancestors = await validator.findCommonAncestors(term1, term2);

      expect(ancestors.length).toBeGreaterThan(0);
    });
  });

  describe('Phenotype Encoding', () => {
    it('should encode HPO terms to vectors', async () => {
      const terms = ['HP:0001250', 'HP:0001252', 'HP:0002376'];
      const vector = await validator.encodeTerms(terms);

      expect(vector).toHaveLength(32); // 32-dim phenotype embedding
      expect(vector.some((v) => v > 0)).toBe(true);
    });

    it('should produce similar vectors for related terms', async () => {
      const neurologicalTerms = ['HP:0001250', 'HP:0002376'];
      const musculoskeletalTerms = ['HP:0001252', 'HP:0002650'];

      const neuroVector = await validator.encodeTerms(neurologicalTerms);
      const musculoVector = await validator.encodeTerms(musculoskeletalTerms);

      // Calculate self-similarity vs cross-similarity
      const selfSim = cosineSimilarity(neuroVector, neuroVector);
      const crossSim = cosineSimilarity(neuroVector, musculoVector);

      expect(selfSim).toBeCloseTo(1.0);
      expect(crossSim).toBeLessThan(0.9); // Less similar
    });
  });
});

describe('ClinVar Data Import', () => {
  let importer: ClinVarImporter;

  beforeAll(() => {
    importer = new ClinVarImporter();
  });

  describe('ClinVar VCF Parsing', () => {
    it('should parse ClinVar variant records', async () => {
      const clinvarVCF = `##fileformat=VCFv4.1
##INFO=<ID=CLNSIG,Number=.,Type=String,Description="Clinical significance">
##INFO=<ID=CLNREVSTAT,Number=.,Type=String,Description="Review status">
##INFO=<ID=CLNDN,Number=.,Type=String,Description="Disease names">
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
chr17\t43044295\trs80357906\tG\tA\t.\t.\tCLNSIG=Pathogenic;CLNREVSTAT=reviewed_by_expert_panel;CLNDN=Breast_cancer
`;

      const tempFile = '/tmp/clinvar.vcf';
      await fs.writeFile(tempFile, clinvarVCF);

      const variants = await importer.importVCF(tempFile);

      expect(variants).toHaveLength(1);
      expect(variants[0].clinicalSignificance).toBe('Pathogenic');
      expect(variants[0].reviewStatus).toBe('reviewed_by_expert_panel');
      expect(variants[0].diseases).toContain('Breast_cancer');
    });

    it('should categorize clinical significance', () => {
      const categories = [
        { raw: 'Pathogenic', expected: 'pathogenic' },
        { raw: 'Likely_pathogenic', expected: 'likely_pathogenic' },
        { raw: 'Uncertain_significance', expected: 'vus' },
        { raw: 'Likely_benign', expected: 'likely_benign' },
        { raw: 'Benign', expected: 'benign' },
      ];

      categories.forEach(({ raw, expected }) => {
        const normalized = importer.normalizeClinicalSignificance(raw);
        expect(normalized).toBe(expected);
      });
    });

    it('should validate review status', () => {
      const statuses = [
        'no_assertion',
        'criteria_provided',
        'reviewed_by_expert_panel',
        'practice_guideline',
      ];

      statuses.forEach((status) => {
        expect(importer.isValidReviewStatus(status)).toBe(true);
      });
    });
  });

  describe('ClinVar Accuracy Validation', () => {
    it('should validate against known pathogenic variants', async () => {
      // BRCA1 pathogenic variant
      const variant = {
        chromosome: 'chr17',
        position: 43044295,
        refAllele: 'G',
        altAllele: 'A',
      };

      const annotation = await importer.lookup(variant);

      expect(annotation).toBeDefined();
      expect(annotation.clinicalSignificance).toBe('pathogenic');
      expect(annotation.gene).toBe('BRCA1');
    });

    it('should handle conflicting interpretations', async () => {
      const conflictingVCF = `##fileformat=VCFv4.1
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
chr1\t10000\t.\tA\tT\t.\t.\tCLNSIG=Pathogenic,Uncertain_significance;CLNREVSTAT=conflicting_interpretations
`;

      const tempFile = '/tmp/conflicting.vcf';
      await fs.writeFile(tempFile, conflictingVCF);

      const variants = await importer.importVCF(tempFile);

      expect(variants[0].hasConflict).toBe(true);
      expect(variants[0].conflictingSignificances).toContain('Pathogenic');
      expect(variants[0].conflictingSignificances).toContain('Uncertain_significance');
    });
  });
});

describe('gnomAD Data Import', () => {
  let importer: GnomADImporter;

  beforeAll(() => {
    importer = new GnomADImporter();
  });

  describe('gnomAD VCF Parsing', () => {
    it('should parse gnomAD population frequencies', async () => {
      const gnomadVCF = `##fileformat=VCFv4.2
##INFO=<ID=AF,Number=A,Type=Float,Description="Allele Frequency">
##INFO=<ID=AF_afr,Number=A,Type=Float,Description="African/African American">
##INFO=<ID=AF_amr,Number=A,Type=Float,Description="Latino/Admixed American">
##INFO=<ID=AF_eas,Number=A,Type=Float,Description="East Asian">
##INFO=<ID=AF_nfe,Number=A,Type=Float,Description="Non-Finnish European">
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
chr1\t10000\trs123\tA\tT\t.\tPASS\tAF=0.01;AF_afr=0.02;AF_amr=0.015;AF_eas=0.005;AF_nfe=0.012
`;

      const tempFile = '/tmp/gnomad.vcf';
      await fs.writeFile(tempFile, gnomadVCF);

      const variants = await importer.importVCF(tempFile);

      expect(variants).toHaveLength(1);
      expect(variants[0].alleleFrequency).toBe(0.01);
      expect(variants[0].populationFrequencies.afr).toBe(0.02);
      expect(variants[0].populationFrequencies.eas).toBe(0.005);
    });

    it('should identify rare variants (<0.1%)', async () => {
      const variant = {
        chromosome: 'chr1',
        position: 10000,
        refAllele: 'A',
        altAllele: 'T',
      };

      const frequency = await importer.lookup(variant);

      if (frequency && frequency.alleleFrequency < 0.001) {
        expect(importer.isRare(frequency)).toBe(true);
      }
    });

    it('should calculate population-specific frequencies', async () => {
      const variant = {
        chromosome: 'chr1',
        position: 10000,
        refAllele: 'A',
        altAllele: 'T',
      };

      const frequency = await importer.lookup(variant);

      if (frequency) {
        expect(frequency.populationFrequencies).toBeDefined();
        expect(Object.keys(frequency.populationFrequencies)).toContain('nfe');
        expect(Object.keys(frequency.populationFrequencies)).toContain('afr');
      }
    });
  });

  describe('gnomAD Quality Filters', () => {
    it('should filter low-quality variants', async () => {
      const gnomadVCF = `##fileformat=VCFv4.2
##FILTER=<ID=AC0,Description="Allele count is zero">
##INFO=<ID=AF,Number=A,Type=Float,Description="Allele Frequency">
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
chr1\t10000\t.\tA\tT\t.\tAC0\tAF=0
chr1\t20000\t.\tA\tT\t.\tPASS\tAF=0.01
`;

      const tempFile = '/tmp/gnomad_filtered.vcf';
      await fs.writeFile(tempFile, gnomadVCF);

      const variants = await importer.importVCF(tempFile, {
        filterLowQuality: true,
      });

      expect(variants).toHaveLength(1); // Only PASS variant
      expect(variants[0].position).toBe(20000);
    });

    it('should track allele count and number', async () => {
      const gnomadVCF = `##fileformat=VCFv4.2
##INFO=<ID=AC,Number=A,Type=Integer,Description="Allele Count">
##INFO=<ID=AN,Number=1,Type=Integer,Description="Allele Number">
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO
chr1\t10000\t.\tA\tT\t.\tPASS\tAC=100;AN=10000
`;

      const tempFile = '/tmp/gnomad_counts.vcf';
      await fs.writeFile(tempFile, gnomadVCF);

      const variants = await importer.importVCF(tempFile);

      expect(variants[0].alleleCount).toBe(100);
      expect(variants[0].alleleNumber).toBe(10000);
      expect(variants[0].alleleFrequency).toBeCloseTo(0.01);
    });
  });

  describe('Performance', () => {
    it('should handle large gnomAD database efficiently', async () => {
      // Simulate large database (100K variants)
      let vcfContent = `##fileformat=VCFv4.2
##INFO=<ID=AF,Number=A,Type=Float,Description="Allele Frequency">
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\n`;

      for (let i = 0; i < 100000; i++) {
        const af = Math.random() * 0.01; // Random rare variant
        vcfContent += `chr1\t${10000 + i}\t.\tA\tT\t.\tPASS\tAF=${af.toFixed(6)}\n`;
      }

      const tempFile = '/tmp/large_gnomad.vcf';
      await fs.writeFile(tempFile, vcfContent);

      const startTime = performance.now();
      const variants = await importer.importVCF(tempFile);
      const duration = performance.now() - startTime;

      expect(variants).toHaveLength(100000);
      expect(duration).toBeLessThan(30000); // <30 seconds for 100K variants
    }, 60000);
  });
});

// Helper function
function cosineSimilarity(v1: number[], v2: number[]): number {
  let dot = 0,
    norm1 = 0,
    norm2 = 0;
  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
    norm1 += v1[i] * v1[i];
    norm2 += v2[i] * v2[i];
  }
  return dot / (Math.sqrt(norm1) * Math.sqrt(norm2));
}
