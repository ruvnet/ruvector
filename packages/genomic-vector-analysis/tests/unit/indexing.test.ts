/**
 * Unit Tests for HNSW Indexing Operations
 * Tests graph construction, search, and index management
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  HNSWIndex,
  HNSWConfig,
  SearchQuery,
  SearchResult,
  IndexStats,
} from '../../src/indexing';

describe('HNSWIndex', () => {
  let index: HNSWIndex;
  let config: HNSWConfig;

  beforeEach(() => {
    config = {
      dimensions: 384,
      m: 48,
      efConstruction: 300,
      efSearch: 150,
      maxElements: 1000000,
      distanceMetric: 'cosine',
    };

    index = new HNSWIndex(config);
  });

  afterEach(async () => {
    await index.close();
  });

  describe('Index Construction', () => {
    it('should initialize with correct configuration', () => {
      expect(index.getDimensions()).toBe(384);
      expect(index.getConfig().m).toBe(48);
      expect(index.getConfig().efConstruction).toBe(300);
    });

    it('should insert single vector correctly', async () => {
      const vector = new Array(384).fill(0).map(() => Math.random());
      const id = await index.insert({
        id: 'variant_1',
        vector,
        metadata: { gene: 'BRCA1' },
      });

      expect(id).toBe('variant_1');
      expect(index.size()).toBe(1);
    });

    it('should insert batch of vectors efficiently', async () => {
      const vectors = Array.from({ length: 1000 }, (_, i) => ({
        id: `variant_${i}`,
        vector: new Array(384).fill(0).map(() => Math.random()),
        metadata: { gene: 'TEST', index: i },
      }));

      const startTime = performance.now();
      await index.insertBatch(vectors);
      const duration = performance.now() - startTime;

      expect(index.size()).toBe(1000);
      expect(duration).toBeLessThan(5000); // < 5ms per vector
    });

    it('should handle duplicate IDs correctly', async () => {
      const vector = new Array(384).fill(0).map(() => Math.random());

      await index.insert({ id: 'variant_1', vector });
      await expect(
        index.insert({ id: 'variant_1', vector })
      ).rejects.toThrow('Duplicate ID');
    });

    it('should validate vector dimensions', async () => {
      const wrongDims = new Array(256).fill(0);

      await expect(
        index.insert({ id: 'variant_1', vector: wrongDims })
      ).rejects.toThrow('Invalid vector dimensions');
    });
  });

  describe('Graph Structure', () => {
    beforeEach(async () => {
      // Insert test data
      const vectors = Array.from({ length: 100 }, (_, i) => ({
        id: `variant_${i}`,
        vector: new Array(384).fill(0).map(() => Math.random()),
      }));
      await index.insertBatch(vectors);
    });

    it('should maintain hierarchical structure', () => {
      const stats = index.getStats();

      expect(stats.numLayers).toBeGreaterThan(1);
      expect(stats.layer0Size).toBe(100);
    });

    it('should maintain connectivity (M parameter)', () => {
      const stats = index.getStats();
      const avgConnectivity = stats.avgEdgesPerNode;

      expect(avgConnectivity).toBeGreaterThanOrEqual(config.m * 0.5);
      expect(avgConnectivity).toBeLessThanOrEqual(config.m * 2);
    });

    it('should distribute nodes across layers correctly', () => {
      const stats = index.getStats();

      // Layer sizes should decrease exponentially
      expect(stats.layerSizes[0]).toBe(100);
      expect(stats.layerSizes[1]).toBeLessThan(stats.layerSizes[0]);
    });
  });

  describe('Search Operations', () => {
    beforeEach(async () => {
      // Insert clustered data
      const baseVector = new Array(384).fill(0).map(() => Math.random());

      for (let i = 0; i < 100; i++) {
        const vector = baseVector.map((v) => v + (Math.random() - 0.5) * 0.1);
        await index.insert({
          id: `variant_${i}`,
          vector,
          metadata: { cluster: 'A', index: i },
        });
      }
    });

    it('should find exact matches', async () => {
      const query = await index.getVector('variant_50');
      const results = await index.search({
        vector: query!,
        k: 1,
        efSearch: 150,
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('variant_50');
      expect(results[0].distance).toBeCloseTo(0, 5);
    });

    it('should find k nearest neighbors', async () => {
      const query = await index.getVector('variant_50');
      const results = await index.search({
        vector: query!,
        k: 10,
        efSearch: 150,
      });

      expect(results).toHaveLength(10);
      expect(results[0].id).toBe('variant_50');

      // Results should be ordered by distance
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].distance).toBeLessThanOrEqual(results[i + 1].distance);
      }
    });

    it('should respect efSearch parameter', async () => {
      const query = new Array(384).fill(0).map(() => Math.random());

      const resultsLow = await index.search({
        vector: query,
        k: 10,
        efSearch: 50,
      });

      const resultsHigh = await index.search({
        vector: query,
        k: 10,
        efSearch: 200,
      });

      expect(resultsLow).toHaveLength(10);
      expect(resultsHigh).toHaveLength(10);

      // Higher efSearch should find better (or equal) results
      expect(resultsHigh[9].distance).toBeLessThanOrEqual(resultsLow[9].distance);
    });

    it('should handle k > index size', async () => {
      const query = new Array(384).fill(0).map(() => Math.random());
      const results = await index.search({
        vector: query,
        k: 1000,
        efSearch: 150,
      });

      expect(results).toHaveLength(100); // Only 100 vectors in index
    });
  });

  describe('Distance Metrics', () => {
    it('should calculate cosine similarity correctly', () => {
      const v1 = [1, 0, 0, 0];
      const v2 = [1, 0, 0, 0];
      const distance = index.calculateDistance(v1, v2);

      expect(distance).toBeCloseTo(0); // Identical vectors
    });

    it('should calculate euclidean distance correctly', () => {
      const euclideanIndex = new HNSWIndex({
        ...config,
        distanceMetric: 'euclidean',
      });

      const v1 = [0, 0, 0, 0];
      const v2 = [3, 4, 0, 0];
      const distance = euclideanIndex.calculateDistance(v1, v2);

      expect(distance).toBeCloseTo(5); // 3-4-5 triangle
    });

    it('should calculate dot product distance correctly', () => {
      const dotIndex = new HNSWIndex({
        ...config,
        distanceMetric: 'dot',
      });

      const v1 = [1, 2, 3, 4];
      const v2 = [1, 0, 1, 0];
      const distance = dotIndex.calculateDistance(v1, v2);

      expect(distance).toBeCloseTo(-4); // 1*1 + 3*1 = 4, negated for distance
    });
  });

  describe('Metadata Filtering', () => {
    beforeEach(async () => {
      const vectors = Array.from({ length: 100 }, (_, i) => ({
        id: `variant_${i}`,
        vector: new Array(384).fill(0).map(() => Math.random()),
        metadata: {
          gene: i < 50 ? 'BRCA1' : 'TP53',
          clinicalSignificance: i % 3 === 0 ? 'pathogenic' : 'benign',
          gnomadAF: i / 1000,
        },
      }));
      await index.insertBatch(vectors);
    });

    it('should filter by exact match', async () => {
      const query = new Array(384).fill(0).map(() => Math.random());
      const results = await index.search({
        vector: query,
        k: 100,
        filter: { gene: 'BRCA1' },
      });

      expect(results.length).toBeLessThanOrEqual(50);
      expect(results.every((r) => r.metadata.gene === 'BRCA1')).toBe(true);
    });

    it('should filter by range', async () => {
      const query = new Array(384).fill(0).map(() => Math.random());
      const results = await index.search({
        vector: query,
        k: 100,
        filter: {
          gnomadAF: { $lt: 0.01 }, // Rare variants
        },
      });

      expect(results.every((r) => r.metadata.gnomadAF < 0.01)).toBe(true);
    });

    it('should combine multiple filters (AND)', async () => {
      const query = new Array(384).fill(0).map(() => Math.random());
      const results = await index.search({
        vector: query,
        k: 100,
        filter: {
          gene: 'BRCA1',
          clinicalSignificance: 'pathogenic',
        },
      });

      expect(
        results.every(
          (r) =>
            r.metadata.gene === 'BRCA1' &&
            r.metadata.clinicalSignificance === 'pathogenic'
        )
      ).toBe(true);
    });
  });

  describe('Index Persistence', () => {
    it('should save index to disk', async () => {
      const vectors = Array.from({ length: 100 }, (_, i) => ({
        id: `variant_${i}`,
        vector: new Array(384).fill(0).map(() => Math.random()),
      }));
      await index.insertBatch(vectors);

      const path = '/tmp/test_index.hnsw';
      await index.save(path);

      const fs = await import('fs/promises');
      const exists = await fs
        .access(path)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);
    });

    it('should load index from disk', async () => {
      const path = '/tmp/test_index_load.hnsw';
      const vectors = Array.from({ length: 100 }, (_, i) => ({
        id: `variant_${i}`,
        vector: new Array(384).fill(0).map(() => Math.random()),
      }));
      await index.insertBatch(vectors);
      await index.save(path);

      const loadedIndex = new HNSWIndex(config);
      await loadedIndex.load(path);

      expect(loadedIndex.size()).toBe(100);
      expect(loadedIndex.getDimensions()).toBe(384);
    });

    it('should maintain search accuracy after save/load', async () => {
      const path = '/tmp/test_index_accuracy.hnsw';
      const vectors = Array.from({ length: 100 }, (_, i) => ({
        id: `variant_${i}`,
        vector: new Array(384).fill(0).map(() => Math.random()),
      }));
      await index.insertBatch(vectors);

      const queryVector = await index.getVector('variant_50');
      const resultsBefore = await index.search({
        vector: queryVector!,
        k: 10,
      });

      await index.save(path);
      const loadedIndex = new HNSWIndex(config);
      await loadedIndex.load(path);

      const resultsAfter = await loadedIndex.search({
        vector: queryVector!,
        k: 10,
      });

      expect(resultsAfter).toHaveLength(resultsBefore.length);
      expect(resultsAfter[0].id).toBe(resultsBefore[0].id);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet query latency requirements (<1ms p95)', async () => {
      // Build large index
      const vectors = Array.from({ length: 10000 }, (_, i) => ({
        id: `variant_${i}`,
        vector: new Array(384).fill(0).map(() => Math.random()),
      }));
      await index.insertBatch(vectors);

      // Run 100 queries
      const queryTimes: number[] = [];
      for (let i = 0; i < 100; i++) {
        const query = new Array(384).fill(0).map(() => Math.random());
        const startTime = performance.now();
        await index.search({ vector: query, k: 10, efSearch: 150 });
        queryTimes.push(performance.now() - startTime);
      }

      // Calculate p95
      queryTimes.sort((a, b) => a - b);
      const p95 = queryTimes[Math.floor(queryTimes.length * 0.95)];

      expect(p95).toBeLessThan(1); // <1ms p95
    });

    it('should handle high insert throughput', async () => {
      const vectors = Array.from({ length: 50000 }, (_, i) => ({
        id: `variant_${i}`,
        vector: new Array(384).fill(0).map(() => Math.random()),
      }));

      const startTime = performance.now();
      await index.insertBatch(vectors, { batchSize: 1000 });
      const duration = (performance.now() - startTime) / 1000; // seconds

      const throughput = 50000 / duration;

      expect(throughput).toBeGreaterThan(10000); // >10K variants/sec
    });
  });

  describe('Memory Management', () => {
    it('should track memory usage', () => {
      const stats = index.getStats();

      expect(stats.memoryUsageBytes).toBeGreaterThan(0);
      expect(stats.vectorMemoryBytes).toBeGreaterThan(0);
      expect(stats.graphMemoryBytes).toBeGreaterThan(0);
    });

    it('should clean up on close', async () => {
      const vectors = Array.from({ length: 1000 }, (_, i) => ({
        id: `variant_${i}`,
        vector: new Array(384).fill(0).map(() => Math.random()),
      }));
      await index.insertBatch(vectors);

      const memoryBefore = process.memoryUsage().heapUsed;
      await index.close();

      // Force GC if available
      if (global.gc) {
        global.gc();
      }

      const memoryAfter = process.memoryUsage().heapUsed;

      // Memory should be released (with some tolerance)
      expect(memoryAfter).toBeLessThan(memoryBefore * 1.1);
    });
  });
});
