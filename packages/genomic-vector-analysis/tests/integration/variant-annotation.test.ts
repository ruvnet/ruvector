/**
 * Integration Tests for Variant Annotation Pipeline
 * Tests end-to-end variant annotation and phenotype matching workflows
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  NICUDiagnosticPipeline,
  VariantAnnotator,
  PhenotypeM atcher,
  ClinicalReport,
} from '../../src/annotation';
import { HNSWIndex } from '../../src/indexing';
import { ProductQuantizer } from '../../src/quantization';
import { VCFParser, HPOTerms } from '../../src/validation';
import { generateMockVCF, generateMockDatabase } from '../fixtures/mock-data';

describe('Variant Annotation Pipeline', () => {
  let pipeline: NICUDiagnosticPipeline;
  let gnomadDB: HNSWIndex;
  let clinvarDB: HNSWIndex;
  let omimDB: HNSWIndex;

  beforeAll(async () => {
    // Initialize databases with mock data
    gnomadDB = await generateMockDatabase('gnomad', 100000);
    clinvarDB = await generateMockDatabase('clinvar', 10000);
    omimDB = await generateMockDatabase('omim', 5000);

    pipeline = new NICUDiagnosticPipeline({
      gnomadDB,
      clinvarDB,
      omimDB,
      cacheSize: 10000,
    });
  });

  afterAll(async () => {
    await gnomadDB.close();
    await clinvarDB.close();
    await omimDB.close();
  });

  describe('End-to-End Variant Annotation', () => {
    it('should annotate whole exome VCF file (<5 minutes)', async () => {
      const vcfPath = await generateMockVCF({ variantCount: 40000, type: 'exome' });

      const startTime = performance.now();
      const annotations = await pipeline.annotateVCF(vcfPath);
      const duration = (performance.now() - startTime) / 1000;

      expect(annotations).toHaveLength(40000);
      expect(duration).toBeLessThan(300); // <5 minutes

      // Verify annotation completeness
      annotations.forEach((ann) => {
        expect(ann.variant).toBeDefined();
        expect(ann.populationFrequency).toBeDefined();
        expect(ann.clinicalSignificance).toBeDefined();
        expect(ann.predictionScores).toBeDefined();
      });
    });

    it('should achieve 50,000+ variants/second throughput', async () => {
      const vcfPath = await generateMockVCF({ variantCount: 50000 });

      const startTime = performance.now();
      await pipeline.annotateVCF(vcfPath);
      const duration = (performance.now() - startTime) / 1000;

      const throughput = 50000 / duration;

      expect(throughput).toBeGreaterThan(50000);
    });

    it('should handle parallel annotation of multiple samples', async () => {
      const vcfPaths = await Promise.all([
        generateMockVCF({ variantCount: 10000, sampleId: 'patient_1' }),
        generateMockVCF({ variantCount: 10000, sampleId: 'patient_2' }),
        generateMockVCF({ variantCount: 10000, sampleId: 'patient_3' }),
        generateMockVCF({ variantCount: 10000, sampleId: 'patient_4' }),
      ]);

      const startTime = performance.now();
      const results = await Promise.all(
        vcfPaths.map((path) => pipeline.annotateVCF(path))
      );
      const duration = (performance.now() - startTime) / 1000;

      expect(results).toHaveLength(4);
      expect(results.every((r) => r.length === 10000)).toBe(true);
      expect(duration).toBeLessThan(10); // Parallel speedup
    });
  });

  describe('Population Frequency Lookup', () => {
    it('should retrieve gnomAD frequencies accurately', async () => {
      const variant = {
        chromosome: 'chr17',
        position: 43044295,
        refAllele: 'G',
        altAllele: 'A',
      };

      const frequency = await pipeline.getPopulationFrequency(variant);

      expect(frequency).toBeDefined();
      expect(frequency.gnomadAF).toBeGreaterThanOrEqual(0);
      expect(frequency.gnomadAF).toBeLessThanOrEqual(1);
      expect(frequency.populations).toBeDefined();
    });

    it('should use cache for common variants', async () => {
      const commonVariant = {
        chromosome: 'chr1',
        position: 10000,
        refAllele: 'A',
        altAllele: 'T',
        gnomadAF: 0.05, // 5% frequency
      };

      // First call (cache miss)
      const start1 = performance.now();
      await pipeline.getPopulationFrequency(commonVariant);
      const duration1 = performance.now() - start1;

      // Second call (cache hit)
      const start2 = performance.now();
      await pipeline.getPopulationFrequency(commonVariant);
      const duration2 = performance.now() - start2;

      expect(duration2).toBeLessThan(duration1 * 0.1); // 10x faster with cache
    });

    it('should handle rare variants (<0.1% frequency)', async () => {
      const rareVariant = {
        chromosome: 'chr1',
        position: 12345,
        refAllele: 'A',
        altAllele: 'T',
      };

      const frequency = await pipeline.getPopulationFrequency(rareVariant);

      if (frequency.gnomadAF) {
        expect(frequency.gnomadAF).toBeLessThan(0.001);
      } else {
        expect(frequency.gnomadAF).toBeNull(); // Not in database
      }
    });
  });

  describe('Clinical Significance Assessment', () => {
    it('should match ClinVar pathogenic variants', async () => {
      const pathogenicVariant = {
        chromosome: 'chr17',
        position: 43044295,
        refAllele: 'G',
        altAllele: 'A',
        gene: 'BRCA1',
      };

      const annotation = await pipeline.annotateVariant(pathogenicVariant);

      expect(annotation.clinicalSignificance).toBeDefined();
      expect(['pathogenic', 'likely_pathogenic', 'vus']).toContain(
        annotation.clinicalSignificance
      );
    });

    it('should find similar pathogenic variants', async () => {
      const queryVariant = {
        chromosome: 'chr17',
        position: 43044295,
        refAllele: 'G',
        altAllele: 'A',
        gene: 'BRCA1',
      };

      const similar = await pipeline.findSimilarPathogenic(queryVariant, 10);

      expect(similar).toHaveLength(10);
      expect(similar.every((v) => v.clinicalSignificance === 'pathogenic')).toBe(true);
      expect(similar[0].similarity).toBeGreaterThan(similar[9].similarity);
    });

    it('should provide ACMG classification criteria', async () => {
      const variant = {
        chromosome: 'chr17',
        position: 43044295,
        refAllele: 'G',
        altAllele: 'A',
        gene: 'BRCA1',
      };

      const annotation = await pipeline.annotateVariant(variant);

      expect(annotation.acmgCriteria).toBeDefined();
      expect(annotation.acmgCriteria.pvs1).toBeDefined(); // Null variant
      expect(annotation.acmgCriteria.pm2).toBeDefined(); // Absent in population
      expect(annotation.acmgCriteria.pp3).toBeDefined(); // Computational evidence
    });
  });

  describe('Phenotype-Driven Prioritization', () => {
    it('should prioritize variants by HPO term matching', async () => {
      const vcfPath = await generateMockVCF({ variantCount: 1000 });
      const phenotypes = ['HP:0001250', 'HP:0001252', 'HP:0002376']; // Seizures, intellectual disability, etc.

      const annotations = await pipeline.annotateVCF(vcfPath);
      const prioritized = await pipeline.prioritizeByPhenotype(annotations, phenotypes);

      expect(prioritized).toHaveLength(annotations.length);
      expect(prioritized[0].phenotypeScore).toBeGreaterThan(
        prioritized[prioritized.length - 1].phenotypeScore
      );

      // Top variants should match phenotypes
      const topVariants = prioritized.slice(0, 10);
      expect(topVariants.some((v) => v.associatedPhenotypes.length > 0)).toBe(true);
    });

    it('should calculate combined clinical score', async () => {
      const variant = {
        chromosome: 'chr17',
        position: 43044295,
        refAllele: 'G',
        altAllele: 'A',
        gene: 'BRCA1',
      };

      const phenotypes = ['HP:0001250'];
      const annotation = await pipeline.annotateVariant(variant);
      const score = await pipeline.calculateClinicalScore(annotation, phenotypes);

      expect(score.acmgScore).toBeGreaterThanOrEqual(0);
      expect(score.acmgScore).toBeLessThanOrEqual(1);
      expect(score.phenotypeScore).toBeGreaterThanOrEqual(0);
      expect(score.phenotypeScore).toBeLessThanOrEqual(1);
      expect(score.combinedScore).toBeGreaterThanOrEqual(0);
      expect(score.combinedScore).toBeLessThanOrEqual(1);

      // Combined = 0.4*ACMG + 0.3*Phenotype + 0.2*Conservation + 0.1*Rarity
      const expected =
        0.4 * score.acmgScore +
        0.3 * score.phenotypeScore +
        0.2 * score.conservationScore +
        0.1 * score.rarityScore;

      expect(score.combinedScore).toBeCloseTo(expected, 2);
    });

    it('should categorize variants by priority', async () => {
      const vcfPath = await generateMockVCF({ variantCount: 100 });
      const annotations = await pipeline.annotateVCF(vcfPath);
      const phenotypes = ['HP:0001250'];

      const prioritized = await pipeline.prioritizeByPhenotype(annotations, phenotypes);

      const categories = {
        HIGH: prioritized.filter((v) => v.category === 'HIGH_PRIORITY'),
        MEDIUM: prioritized.filter((v) => v.category === 'MEDIUM_PRIORITY'),
        LOW: prioritized.filter((v) => v.category === 'LOW_PRIORITY'),
        BENIGN: prioritized.filter((v) => v.category === 'BENIGN'),
      };

      // Should have distribution across categories
      expect(categories.HIGH.length).toBeGreaterThan(0);
      expect(categories.HIGH.length).toBeLessThan(annotations.length * 0.2); // <20% high priority
    });
  });

  describe('Gene-Disease Association', () => {
    it('should match OMIM disease associations', async () => {
      const geneSymbol = 'BRCA1';
      const associations = await pipeline.getDiseaseAssociations(geneSymbol);

      expect(associations).toBeDefined();
      expect(associations.length).toBeGreaterThan(0);
      expect(associations[0].geneSymbol).toBe('BRCA1');
      expect(associations[0].diseases).toContain('Breast cancer');
    });

    it('should perform hybrid search (vector + keyword)', async () => {
      const geneSymbol = 'SCN1A';
      const phenotypes = ['HP:0001250']; // Seizures

      const variants = await pipeline.findDiseaseVariants(geneSymbol, phenotypes);

      expect(variants.length).toBeGreaterThan(0);
      expect(variants.every((v) => v.gene === geneSymbol)).toBe(true);
      expect(variants[0].hybridScore).toBeGreaterThan(variants[variants.length - 1].hybridScore);
    });
  });

  describe('Clinical Report Generation', () => {
    it('should generate comprehensive diagnostic report', async () => {
      const vcfPath = await generateMockVCF({ variantCount: 40000, type: 'exome' });
      const phenotypes = ['HP:0001250', 'HP:0001252'];
      const patientInfo = {
        id: 'NICU_001',
        age: '3 days',
        sex: 'M',
      };

      const report = await pipeline.generateDiagnosticReport(
        vcfPath,
        phenotypes,
        patientInfo
      );

      expect(report.patientId).toBe('NICU_001');
      expect(report.totalVariants).toBe(40000);
      expect(report.prioritizedVariants).toBeDefined();
      expect(report.prioritizedVariants.length).toBeLessThan(50); // Focused list
      expect(report.clinicalInterpretation).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    it('should complete NICU analysis in <9 hours', async () => {
      const vcfPath = await generateMockVCF({ variantCount: 40000, type: 'exome' });
      const phenotypes = ['HP:0001250'];

      const startTime = performance.now();
      const report = await pipeline.analyzePatient(vcfPath, phenotypes);
      const duration = (performance.now() - startTime) / (1000 * 3600); // hours

      expect(duration).toBeLessThan(9); // <9 hours total
      expect(report).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed VCF files gracefully', async () => {
      const badVCFPath = '/tmp/malformed.vcf';
      await expect(pipeline.annotateVCF(badVCFPath)).rejects.toThrow('Invalid VCF');
    });

    it('should handle variants not in database', async () => {
      const novelVariant = {
        chromosome: 'chr1',
        position: 999999999,
        refAllele: 'A',
        altAllele: 'T',
      };

      const annotation = await pipeline.annotateVariant(novelVariant);

      expect(annotation.populationFrequency).toBeNull();
      expect(annotation.clinicalSignificance).toBe('unknown');
    });

    it('should validate HPO terms', async () => {
      const invalidPhenotypes = ['HP:invalid', 'not_an_hpo_term'];

      await expect(
        pipeline.prioritizeByPhenotype([], invalidPhenotypes)
      ).rejects.toThrow('Invalid HPO term');
    });
  });

  describe('Performance Metrics', () => {
    it('should track annotation performance', async () => {
      const vcfPath = await generateMockVCF({ variantCount: 10000 });

      await pipeline.annotateVCF(vcfPath);

      const metrics = pipeline.getMetrics();

      expect(metrics.totalAnnotations).toBe(10000);
      expect(metrics.averageLatency).toBeLessThan(1); // <1ms per variant
      expect(metrics.cacheHitRate).toBeGreaterThan(0.4); // >40% cache hits
      expect(metrics.throughput).toBeGreaterThan(10000); // >10K var/sec
    });

    it('should provide query latency percentiles', async () => {
      const vcfPath = await generateMockVCF({ variantCount: 10000 });
      await pipeline.annotateVCF(vcfPath);

      const metrics = pipeline.getMetrics();

      expect(metrics.latencyP50).toBeLessThan(0.5);
      expect(metrics.latencyP95).toBeLessThan(1.0);
      expect(metrics.latencyP99).toBeLessThan(2.0);
    });
  });
});
