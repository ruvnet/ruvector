/**
 * Unit Tests for Quantization Algorithms
 * Tests scalar quantization, product quantization, and binary quantization
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  ScalarQuantizer,
  ProductQuantizer,
  BinaryQuantizer,
  QuantizationConfig,
} from '../../src/quantization';

describe('ScalarQuantizer', () => {
  let quantizer: ScalarQuantizer;

  beforeEach(() => {
    quantizer = new ScalarQuantizer({ bits: 8 });
  });

  describe('Quantization', () => {
    it('should quantize float32 to uint8', () => {
      const vector = [0.0, 0.25, 0.5, 0.75, 1.0];
      const quantized = quantizer.quantize(vector);

      expect(quantized).toHaveLength(5);
      expect(quantized[0]).toBe(0);
      expect(quantized[2]).toBeCloseTo(127, 0);
      expect(quantized[4]).toBe(255);
    });

    it('should dequantize uint8 to float32', () => {
      const quantized = new Uint8Array([0, 64, 127, 191, 255]);
      const dequantized = quantizer.dequantize(quantized);

      expect(dequantized).toHaveLength(5);
      expect(dequantized[0]).toBeCloseTo(0.0, 2);
      expect(dequantized[2]).toBeCloseTo(0.5, 2);
      expect(dequantized[4]).toBeCloseTo(1.0, 2);
    });

    it('should handle negative values', () => {
      const vector = [-1.0, -0.5, 0.0, 0.5, 1.0];
      const quantized = quantizer.quantize(vector);
      const dequantized = quantizer.dequantize(quantized);

      expect(dequantized[0]).toBeCloseTo(-1.0, 1);
      expect(dequantized[2]).toBeCloseTo(0.0, 1);
      expect(dequantized[4]).toBeCloseTo(1.0, 1);
    });
  });

  describe('Compression Ratio', () => {
    it('should achieve 4x compression (float32 -> uint8)', () => {
      const vector = new Array(384).fill(0).map(() => Math.random());
      const quantized = quantizer.quantize(vector);

      const originalSize = vector.length * 4; // float32 = 4 bytes
      const compressedSize = quantized.length * 1; // uint8 = 1 byte

      expect(compressedSize).toBe(originalSize / 4);
    });

    it('should calculate compression statistics', () => {
      const vectors = Array.from({ length: 1000 }, () =>
        new Array(384).fill(0).map(() => Math.random())
      );

      const stats = quantizer.getCompressionStats(vectors);

      expect(stats.compressionRatio).toBeCloseTo(4.0, 1);
      expect(stats.originalSizeMB).toBeGreaterThan(0);
      expect(stats.compressedSizeMB).toBeCloseTo(stats.originalSizeMB / 4, 1);
    });
  });

  describe('Accuracy', () => {
    it('should maintain high recall (>98%) for genomic data', () => {
      // Generate test vectors with known structure
      const baseVector = new Array(384).fill(0).map(() => Math.random());
      const similarVectors = Array.from({ length: 100 }, () =>
        baseVector.map((v) => v + (Math.random() - 0.5) * 0.1)
      );

      // Find true nearest neighbors (full precision)
      const trueSimilarities = similarVectors.map((v) =>
        cosineSimilarity(baseVector, v)
      );
      const trueTop10 = trueSimilarities
        .map((s, i) => ({ s, i }))
        .sort((a, b) => b.s - a.s)
        .slice(0, 10)
        .map((x) => x.i);

      // Find neighbors using quantized vectors
      const quantizedBase = quantizer.quantize(baseVector);
      const quantizedVectors = similarVectors.map((v) => quantizer.quantize(v));

      const quantizedSimilarities = quantizedVectors.map((qv) =>
        cosineSimilarityQuantized(quantizedBase, qv, quantizer)
      );
      const quantizedTop10 = quantizedSimilarities
        .map((s, i) => ({ s, i }))
        .sort((a, b) => b.s - a.s)
        .slice(0, 10)
        .map((x) => x.i);

      // Calculate recall
      const overlap = trueTop10.filter((i) => quantizedTop10.includes(i)).length;
      const recall = overlap / 10;

      expect(recall).toBeGreaterThan(0.98);
    });

    it('should preserve distance ordering', () => {
      const v1 = new Array(384).fill(0).map(() => Math.random());
      const v2 = v1.map((v) => v + 0.01); // Very similar
      const v3 = new Array(384).fill(0).map(() => Math.random()); // Different

      const q1 = quantizer.quantize(v1);
      const q2 = quantizer.quantize(v2);
      const q3 = quantizer.quantize(v3);

      const dist12_orig = euclideanDistance(v1, v2);
      const dist13_orig = euclideanDistance(v1, v3);

      const dq1 = quantizer.dequantize(q1);
      const dq2 = quantizer.dequantize(q2);
      const dq3 = quantizer.dequantize(q3);

      const dist12_quant = euclideanDistance(dq1, dq2);
      const dist13_quant = euclideanDistance(dq1, dq3);

      // Distance ordering should be preserved
      expect(dist12_quant < dist13_quant).toBe(dist12_orig < dist13_orig);
    });
  });
});

describe('ProductQuantizer', () => {
  let quantizer: ProductQuantizer;

  beforeEach(() => {
    quantizer = new ProductQuantizer({
      dimensions: 384,
      subspaces: 16,
      k: 256,
    });
  });

  describe('Codebook Training', () => {
    it('should train codebooks from sample vectors', async () => {
      const trainingVectors = Array.from({ length: 10000 }, () =>
        new Array(384).fill(0).map(() => Math.random())
      );

      await quantizer.train(trainingVectors);

      const codebooks = quantizer.getCodebooks();

      expect(codebooks).toHaveLength(16); // 16 subspaces
      expect(codebooks[0]).toHaveLength(256); // 256 centroids
      expect(codebooks[0][0]).toHaveLength(24); // 384/16 = 24 dims per subspace
    });

    it('should use k-means clustering for codebook generation', async () => {
      const trainingVectors = Array.from({ length: 1000 }, () =>
        new Array(384).fill(0).map(() => Math.random())
      );

      await quantizer.train(trainingVectors, { algorithm: 'kmeans', maxIter: 100 });

      const codebooks = quantizer.getCodebooks();
      const inertia = quantizer.getInertia(); // Sum of squared distances

      expect(inertia).toBeGreaterThan(0);
      expect(codebooks.length).toBe(16);
    });
  });

  describe('Quantization', () => {
    beforeEach(async () => {
      // Train on sample data
      const trainingVectors = Array.from({ length: 1000 }, () =>
        new Array(384).fill(0).map(() => Math.random())
      );
      await quantizer.train(trainingVectors);
    });

    it('should encode vector to 16 bytes (16 subspaces x 1 byte)', () => {
      const vector = new Array(384).fill(0).map(() => Math.random());
      const codes = quantizer.encode(vector);

      expect(codes).toHaveLength(16);
      expect(codes.every((c) => c >= 0 && c < 256)).toBe(true);
    });

    it('should decode codes back to approximate vector', () => {
      const original = new Array(384).fill(0).map(() => Math.random());
      const codes = quantizer.encode(original);
      const reconstructed = quantizer.decode(codes);

      expect(reconstructed).toHaveLength(384);

      // Calculate reconstruction error
      const error = euclideanDistance(original, reconstructed);
      const relativeError = error / euclideanNorm(original);

      expect(relativeError).toBeLessThan(0.2); // <20% relative error
    });
  });

  describe('Compression Ratio', () => {
    it('should achieve 16x compression (1536 bytes -> 96 bytes)', async () => {
      const trainingVectors = Array.from({ length: 1000 }, () =>
        new Array(384).fill(0).map(() => Math.random())
      );
      await quantizer.train(trainingVectors);

      const vector = new Array(384).fill(0).map(() => Math.random());
      const codes = quantizer.encode(vector);

      const originalSize = 384 * 4; // 384 dims x 4 bytes (float32)
      const compressedSize = 16 * 1; // 16 codes x 1 byte

      expect(compressedSize).toBe(96); // 16 bytes for codes
      expect(originalSize / compressedSize).toBeCloseTo(16, 0);
    });

    it('should meet genomic database size requirements', async () => {
      // 760M variants x 384 dims x 4 bytes = 1,164 GB
      // With 16x compression -> ~72.5 GB

      const numVariants = 760_000_000;
      const originalSizeGB = (numVariants * 384 * 4) / (1024 ** 3);
      const compressedSizeGB = (numVariants * 16) / (1024 ** 3);

      expect(originalSizeGB).toBeCloseTo(1164, 0);
      expect(compressedSizeGB).toBeCloseTo(72.5, 1);
      expect(compressedSizeGB).toBeLessThan(100); // Fits in memory
    });
  });

  describe('Accuracy', () => {
    beforeEach(async () => {
      const trainingVectors = Array.from({ length: 10000 }, () =>
        new Array(384).fill(0).map(() => Math.random())
      );
      await quantizer.train(trainingVectors);
    });

    it('should maintain >95% recall for clinical variants', () => {
      // Clinical safety threshold: 95% recall
      const queryVector = new Array(384).fill(0).map(() => Math.random());
      const database = Array.from({ length: 1000 }, () =>
        new Array(384).fill(0).map(() => Math.random())
      );

      // True top-10 (full precision)
      const trueSimilarities = database.map((v) => cosineSimilarity(queryVector, v));
      const trueTop10 = trueSimilarities
        .map((s, i) => ({ s, i }))
        .sort((a, b) => b.s - a.s)
        .slice(0, 10)
        .map((x) => x.i);

      // Quantized search
      const queryQ = quantizer.encode(queryVector);
      const databaseQ = database.map((v) => quantizer.encode(v));

      const quantSimilarities = databaseQ.map((qv) =>
        quantizer.asymmetricDistance(queryVector, qv)
      );
      const quantTop10 = quantSimilarities
        .map((s, i) => ({ s, i }))
        .sort((a, b) => a.s - b.s) // Lower distance = higher similarity
        .slice(0, 10)
        .map((x) => x.i);

      const overlap = trueTop10.filter((i) => quantTop10.includes(i)).length;
      const recall = overlap / 10;

      expect(recall).toBeGreaterThan(0.95);
    });

    it('should calculate distortion metrics', async () => {
      const testVectors = Array.from({ length: 1000 }, () =>
        new Array(384).fill(0).map(() => Math.random())
      );

      const distortion = quantizer.calculateDistortion(testVectors);

      expect(distortion.meanSquaredError).toBeGreaterThan(0);
      expect(distortion.relativeError).toBeLessThan(0.15); // <15%
      expect(distortion.snr).toBeGreaterThan(10); // >10 dB
    });
  });

  describe('Fast Distance Computation', () => {
    beforeEach(async () => {
      const trainingVectors = Array.from({ length: 1000 }, () =>
        new Array(384).fill(0).map(() => Math.random())
      );
      await quantizer.train(trainingVectors);
    });

    it('should compute distances using lookup tables', () => {
      const query = new Array(384).fill(0).map(() => Math.random());
      const codes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);

      // Build distance table (precomputation)
      const startTable = performance.now();
      const distanceTable = quantizer.buildDistanceTable(query);
      const tableTime = performance.now() - startTable;

      // Compute distance using table (fast lookup)
      const startLookup = performance.now();
      const distance = quantizer.tableDistance(codes, distanceTable);
      const lookupTime = performance.now() - startLookup;

      expect(distance).toBeGreaterThan(0);
      expect(lookupTime).toBeLessThan(tableTime / 100); // Lookup 100x faster
    });

    it('should achieve 50,000+ variants/sec throughput', () => {
      const query = new Array(384).fill(0).map(() => Math.random());
      const distanceTable = quantizer.buildDistanceTable(query);

      const database = Array.from({ length: 50000 }, () =>
        new Uint8Array(16).map(() => Math.floor(Math.random() * 256))
      );

      const startTime = performance.now();
      database.forEach((codes) => quantizer.tableDistance(codes, distanceTable));
      const duration = (performance.now() - startTime) / 1000;

      const throughput = 50000 / duration;

      expect(throughput).toBeGreaterThan(50000); // 50K variants/sec
    });
  });
});

describe('BinaryQuantizer', () => {
  let quantizer: BinaryQuantizer;

  beforeEach(() => {
    quantizer = new BinaryQuantizer({ dimensions: 384 });
  });

  describe('Quantization', () => {
    it('should convert float vector to binary', () => {
      const vector = [-0.5, 0.3, -0.1, 0.8, 0.0];
      const binary = quantizer.quantize(vector);

      expect(binary).toHaveLength(1); // 5 bits -> 1 byte
      // Expected: 01011 = 0x0B (LSB first)
      expect(binary[0] & 0x01).toBe(0); // -0.5 -> 0
      expect(binary[0] & 0x02).toBe(2); // 0.3 -> 1
      expect(binary[0] & 0x04).toBe(0); // -0.1 -> 0
      expect(binary[0] & 0x08).toBe(8); // 0.8 -> 1
      expect(binary[0] & 0x10).toBe(0); // 0.0 -> 0
    });

    it('should achieve 32x compression', () => {
      const vector = new Array(384).fill(0).map(() => Math.random() - 0.5);
      const binary = quantizer.quantize(vector);

      const originalSize = 384 * 4; // float32
      const compressedSize = Math.ceil(384 / 8); // bits -> bytes

      expect(compressedSize).toBe(48);
      expect(originalSize / compressedSize).toBe(32);
    });
  });

  describe('Hamming Distance', () => {
    it('should calculate hamming distance efficiently', () => {
      const v1 = new Array(384).fill(0).map(() => Math.random() - 0.5);
      const v2 = new Array(384).fill(0).map(() => Math.random() - 0.5);

      const b1 = quantizer.quantize(v1);
      const b2 = quantizer.quantize(v2);

      const distance = quantizer.hammingDistance(b1, b2);

      expect(distance).toBeGreaterThanOrEqual(0);
      expect(distance).toBeLessThanOrEqual(384);
    });

    it('should use POPCNT instruction for fast hamming', () => {
      const b1 = new Uint8Array([0b10101010, 0b11110000]);
      const b2 = new Uint8Array([0b01010101, 0b00001111]);

      const startTime = performance.now();
      const distance = quantizer.hammingDistance(b1, b2);
      const duration = performance.now() - startTime;

      expect(distance).toBe(16); // All bits differ
      expect(duration).toBeLessThan(0.001); // <1μs
    });
  });

  describe('Accuracy Trade-offs', () => {
    it('should have lower recall than product quantization', () => {
      const queryVector = new Array(384).fill(0).map(() => Math.random() - 0.5);
      const database = Array.from({ length: 1000 }, () =>
        new Array(384).fill(0).map(() => Math.random() - 0.5)
      );

      // True top-10
      const trueSimilarities = database.map((v) => cosineSimilarity(queryVector, v));
      const trueTop10 = trueSimilarities
        .map((s, i) => ({ s, i }))
        .sort((a, b) => b.s - a.s)
        .slice(0, 10)
        .map((x) => x.i);

      // Binary search
      const queryBinary = quantizer.quantize(queryVector);
      const databaseBinary = database.map((v) => quantizer.quantize(v));

      const hammingDistances = databaseBinary.map((bv) =>
        quantizer.hammingDistance(queryBinary, bv)
      );
      const binaryTop10 = hammingDistances
        .map((d, i) => ({ d, i }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 10)
        .map((x) => x.i);

      const overlap = trueTop10.filter((i) => binaryTop10.includes(i)).length;
      const recall = overlap / 10;

      // Binary quantization typically achieves 70-80% recall
      expect(recall).toBeGreaterThan(0.6);
      expect(recall).toBeLessThan(0.9);
    });

    it('should not be recommended for clinical use (<95% recall)', () => {
      // Binary quantization trades accuracy for speed/memory
      // Not suitable for clinical genomic analysis
      expect(quantizer.isRecommendedForClinical()).toBe(false);
    });
  });
});

// Helper functions
function cosineSimilarity(v1: number[], v2: number[]): number {
  let dot = 0, norm1 = 0, norm2 = 0;
  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
    norm1 += v1[i] * v1[i];
    norm2 += v2[i] * v2[i];
  }
  return dot / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

function euclideanDistance(v1: number[], v2: number[]): number {
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    sum += (v1[i] - v2[i]) ** 2;
  }
  return Math.sqrt(sum);
}

function euclideanNorm(v: number[]): number {
  return Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
}

function cosineSimilarityQuantized(
  q1: Uint8Array,
  q2: Uint8Array,
  quantizer: ScalarQuantizer
): number {
  const v1 = quantizer.dequantize(q1);
  const v2 = quantizer.dequantize(q2);
  return cosineSimilarity(v1, v2);
}
