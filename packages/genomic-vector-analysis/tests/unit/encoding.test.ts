/**
 * Unit Tests for Vector Encoding Functions
 * Tests DNA k-mers, protein sequences, and variant encoding
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  VariantEncoder,
  DNAKmerEncoder,
  ProteinSequenceEncoder,
  VariantEmbedding,
  Variant,
} from '../../src/encoding';

describe('DNAKmerEncoder', () => {
  let encoder: DNAKmerEncoder;

  beforeEach(() => {
    encoder = new DNAKmerEncoder({ k: 3, dimensions: 128 });
  });

  describe('K-mer Generation', () => {
    it('should generate correct k-mers for DNA sequence', () => {
      const sequence = 'ATCGATCG';
      const kmers = encoder.generateKmers(sequence, 3);

      expect(kmers).toHaveLength(6);
      expect(kmers).toContain('ATC');
      expect(kmers).toContain('TCG');
      expect(kmers).toContain('CGA');
      expect(kmers).toContain('GAT');
      expect(kmers).toContain('ATC');
      expect(kmers).toContain('TCG');
    });

    it('should handle edge case: sequence shorter than k', () => {
      const sequence = 'AT';
      const kmers = encoder.generateKmers(sequence, 3);

      expect(kmers).toHaveLength(0);
    });

    it('should handle edge case: empty sequence', () => {
      const sequence = '';
      const kmers = encoder.generateKmers(sequence, 3);

      expect(kmers).toHaveLength(0);
    });

    it('should calculate k-mer frequencies correctly', () => {
      const sequence = 'ATCGATCG';
      const frequencies = encoder.calculateKmerFrequencies(sequence);

      expect(frequencies['ATC']).toBe(2 / 6);
      expect(frequencies['TCG']).toBe(2 / 6);
      expect(frequencies['CGA']).toBe(1 / 6);
      expect(frequencies['GAT']).toBe(1 / 6);
    });
  });

  describe('Sequence Context Encoding', () => {
    it('should encode sequence to fixed-dimension vector', () => {
      const sequence = 'ATCGATCGATCGATCG';
      const vector = encoder.encodeSequenceContext(sequence);

      expect(vector).toHaveLength(128);
      expect(vector.every((v) => typeof v === 'number')).toBe(true);
      expect(vector.every((v) => v >= 0 && v <= 1)).toBe(true);
    });

    it('should calculate GC content correctly', () => {
      const sequence = 'GCGC'; // 100% GC
      const gcContent = encoder.calculateGCContent(sequence);

      expect(gcContent).toBe(1.0);
    });

    it('should calculate GC content for mixed sequence', () => {
      const sequence = 'ATCG'; // 50% GC
      const gcContent = encoder.calculateGCContent(sequence);

      expect(gcContent).toBe(0.5);
    });

    it('should normalize vectors to unit length', () => {
      const vector = [3, 4]; // Magnitude 5
      const normalized = encoder.normalizeVector(vector);

      expect(normalized[0]).toBeCloseTo(0.6);
      expect(normalized[1]).toBeCloseTo(0.8);
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid DNA bases', () => {
      const sequence = 'ATXCG'; // X is invalid
      expect(() => encoder.encodeSequenceContext(sequence)).toThrow('Invalid DNA base');
    });

    it('should handle lowercase DNA sequence', () => {
      const sequence = 'atcg';
      const vector = encoder.encodeSequenceContext(sequence);

      expect(vector).toHaveLength(128);
    });

    it('should handle maximum length sequence', () => {
      const sequence = 'A'.repeat(10000);
      const vector = encoder.encodeSequenceContext(sequence);

      expect(vector).toHaveLength(128);
    });
  });
});

describe('ProteinSequenceEncoder', () => {
  let encoder: ProteinSequenceEncoder;

  beforeEach(() => {
    encoder = new ProteinSequenceEncoder({ dimensions: 96 });
  });

  describe('Amino Acid Encoding', () => {
    it('should encode protein sequence to vector', () => {
      const sequence = 'MKLVPGQW';
      const vector = encoder.encodeProtein(sequence);

      expect(vector).toHaveLength(96);
      expect(vector.every((v) => typeof v === 'number')).toBe(true);
    });

    it('should calculate amino acid frequencies', () => {
      const sequence = 'AAAGGG';
      const frequencies = encoder.calculateAAFrequencies(sequence);

      expect(frequencies['A']).toBe(0.5);
      expect(frequencies['G']).toBe(0.5);
    });

    it('should encode hydrophobicity profile', () => {
      const sequence = 'AILMFWYV'; // Hydrophobic amino acids
      const hydrophobicity = encoder.calculateHydrophobicity(sequence);

      expect(hydrophobicity).toBeGreaterThan(0.5);
    });
  });

  describe('Functional Predictions', () => {
    it('should predict SIFT score for protein change', () => {
      const reference = 'MKLVPGQW';
      const variant = 'MKLVRGQW'; // P->R substitution
      const siftScore = encoder.predictSIFT(reference, variant, 4);

      expect(siftScore).toBeGreaterThanOrEqual(0);
      expect(siftScore).toBeLessThanOrEqual(1);
    });

    it('should predict PolyPhen score', () => {
      const reference = 'MKLVPGQW';
      const variant = 'MKLVRGQW';
      const polyphenScore = encoder.predictPolyPhen(reference, variant, 4);

      expect(polyphenScore).toBeGreaterThanOrEqual(0);
      expect(polyphenScore).toBeLessThanOrEqual(1);
    });
  });
});

describe('VariantEncoder', () => {
  let encoder: VariantEncoder;

  beforeEach(() => {
    encoder = new VariantEncoder({
      dimensions: 384,
      sequenceDim: 128,
      conservationDim: 64,
      functionalDim: 96,
      populationDim: 64,
      phenotypeDim: 32,
    });
  });

  describe('Variant Embedding Generation', () => {
    it('should encode complete variant to 384-dim vector', () => {
      const variant: Variant = {
        chromosome: 'chr17',
        position: 43044295,
        refAllele: 'G',
        altAllele: 'A',
        gene: 'BRCA1',
        transcript: 'NM_007294.3',
        consequence: 'missense_variant',
      };

      const embedding = encoder.encodeVariant(variant);

      expect(embedding.toVector()).toHaveLength(384);
      expect(embedding.sequenceContext).toHaveLength(128);
      expect(embedding.conservationScores).toHaveLength(64);
      expect(embedding.functionalPredictions).toHaveLength(96);
      expect(embedding.populationFrequencies).toHaveLength(64);
      expect(embedding.phenotypeAssociations).toHaveLength(32);
    });

    it('should encode conservation scores (PhyloP, GERP)', () => {
      const variant: Variant = {
        chromosome: 'chr1',
        position: 12345,
        refAllele: 'A',
        altAllele: 'T',
        phylopScore: 2.5,
        gerpScore: 4.2,
      };

      const embedding = encoder.encodeVariant(variant);
      const conservation = embedding.conservationScores;

      expect(conservation[0]).toBeCloseTo(2.5 / 10); // Normalized PhyloP
      expect(conservation[1]).toBeCloseTo(4.2 / 6); // Normalized GERP
    });

    it('should encode population frequencies', () => {
      const variant: Variant = {
        chromosome: 'chr1',
        position: 12345,
        refAllele: 'A',
        altAllele: 'T',
        gnomadAF: 0.001,
        exacAF: 0.0012,
      };

      const embedding = encoder.encodeVariant(variant);
      const frequencies = embedding.populationFrequencies;

      expect(frequencies[0]).toBeCloseTo(0.001);
      expect(frequencies[1]).toBeCloseTo(0.0012);
    });

    it('should encode phenotype associations (HPO terms)', () => {
      const variant: Variant = {
        chromosome: 'chr1',
        position: 12345,
        refAllele: 'A',
        altAllele: 'T',
        hpoTerms: ['HP:0001250', 'HP:0001252'],
      };

      const embedding = encoder.encodeVariant(variant);
      const phenotypes = embedding.phenotypeAssociations;

      expect(phenotypes).toHaveLength(32);
      expect(phenotypes.some((v) => v > 0)).toBe(true);
    });
  });

  describe('Distance Calculation', () => {
    it('should calculate cosine similarity between variants', () => {
      const variant1: Variant = {
        chromosome: 'chr1',
        position: 12345,
        refAllele: 'A',
        altAllele: 'T',
      };

      const variant2: Variant = {
        chromosome: 'chr1',
        position: 12346,
        refAllele: 'C',
        altAllele: 'G',
      };

      const emb1 = encoder.encodeVariant(variant1);
      const emb2 = encoder.encodeVariant(variant2);

      const similarity = encoder.cosineSimilarity(emb1.toVector(), emb2.toVector());

      expect(similarity).toBeGreaterThanOrEqual(-1);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('should calculate euclidean distance', () => {
      const emb1 = encoder.encodeVariant({
        chromosome: 'chr1',
        position: 12345,
        refAllele: 'A',
        altAllele: 'T',
      });

      const emb2 = encoder.encodeVariant({
        chromosome: 'chr1',
        position: 12345,
        refAllele: 'A',
        altAllele: 'T',
      });

      const distance = encoder.euclideanDistance(emb1.toVector(), emb2.toVector());

      expect(distance).toBeCloseTo(0, 1); // Same variant should have distance ~0
    });
  });

  describe('Batch Encoding', () => {
    it('should efficiently encode batch of variants', () => {
      const variants: Variant[] = Array.from({ length: 1000 }, (_, i) => ({
        chromosome: 'chr1',
        position: 10000 + i,
        refAllele: 'A',
        altAllele: 'T',
      }));

      const startTime = performance.now();
      const embeddings = encoder.encodeBatch(variants);
      const duration = performance.now() - startTime;

      expect(embeddings).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // < 1ms per variant
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing optional fields', () => {
      const variant: Variant = {
        chromosome: 'chr1',
        position: 12345,
        refAllele: 'A',
        altAllele: 'T',
      };

      const embedding = encoder.encodeVariant(variant);

      expect(embedding.toVector()).toHaveLength(384);
    });

    it('should handle complex variants (insertions, deletions)', () => {
      const insertion: Variant = {
        chromosome: 'chr1',
        position: 12345,
        refAllele: 'A',
        altAllele: 'ATCG',
      };

      const deletion: Variant = {
        chromosome: 'chr1',
        position: 12345,
        refAllele: 'ATCG',
        altAllele: 'A',
      };

      const embIns = encoder.encodeVariant(insertion);
      const embDel = encoder.encodeVariant(deletion);

      expect(embIns.toVector()).toHaveLength(384);
      expect(embDel.toVector()).toHaveLength(384);
    });

    it('should handle structural variants', () => {
      const sv: Variant = {
        chromosome: 'chr1',
        position: 12345,
        refAllele: 'A',
        altAllele: '<DUP>',
        svType: 'duplication',
        svLength: 50000,
      };

      const embedding = encoder.encodeVariant(sv);

      expect(embedding.toVector()).toHaveLength(384);
    });
  });
});
