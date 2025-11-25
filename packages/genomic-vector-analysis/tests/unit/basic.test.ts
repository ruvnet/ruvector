/**
 * Basic Functionality Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  VectorDatabase,
  KmerEmbedding,
  GenomicVectorDB,
} from '../../src';

describe('VectorDatabase', () => {
  let db: VectorDatabase;

  beforeEach(() => {
    db = new VectorDatabase({
      dimensions: 384,
      metric: 'cosine',
      indexType: 'flat',
      useWasm: false,
    });
  });

  it('should create a vector database', () => {
    expect(db).toBeDefined();
    const stats = db.getStats();
    expect(stats.dimensions).toBe(384);
    expect(stats.metric).toBe('cosine');
  });

  it('should add vectors', async () => {
    await db.add({
      id: 'test1',
      values: new Array(384).fill(0.1),
      metadata: { test: true },
    });

    const stats = db.getStats();
    expect(stats.totalVectors).toBe(1);
  });

  it('should retrieve vectors by id', async () => {
    const vector = new Array(384).fill(0.5);
    await db.add({
      id: 'retrieve-test',
      values: vector,
      metadata: { gene: 'BRCA1' },
    });

    const retrieved = db.get('retrieve-test');
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe('retrieve-test');
    expect(retrieved?.metadata?.gene).toBe('BRCA1');
  });

  it('should search for similar vectors', async () => {
    // Add some vectors
    await db.add({
      id: 'v1',
      values: new Array(384).fill(0.1),
    });
    await db.add({
      id: 'v2',
      values: new Array(384).fill(0.9),
    });

    // Search
    const query = new Array(384).fill(0.11);
    const results = await db.search(query, { k: 1 });

    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('id');
    expect(results[0]).toHaveProperty('score');
  });

  it('should delete vectors', async () => {
    await db.add({
      id: 'delete-me',
      values: new Array(384).fill(0.1),
    });

    const deleted = await db.delete('delete-me');
    expect(deleted).toBe(true);

    const retrieved = db.get('delete-me');
    expect(retrieved).toBeUndefined();
  });
});

describe('KmerEmbedding', () => {
  let embedder: KmerEmbedding;

  beforeEach(() => {
    embedder = new KmerEmbedding({
      model: 'kmer',
      dimensions: 384,
      kmerSize: 6,
    });
  });

  it('should create embedder', () => {
    expect(embedder).toBeDefined();
  });

  it('should embed DNA sequences', async () => {
    const result = await embedder.embed('ATCGATCGATCG');

    expect(result).toBeDefined();
    expect(result.vector).toBeDefined();
    expect(result.vector.length).toBe(384);
    expect(result.model).toBe('kmer');
    expect(result.inputLength).toBe(12);
  });

  it('should handle short sequences', async () => {
    const result = await embedder.embed('ATCG');

    expect(result).toBeDefined();
    expect(result.vector.length).toBe(384);
  });

  it('should normalize embeddings', async () => {
    const result = await embedder.embed('ATCGATCGATCG');
    const vector = Array.from(result.vector);

    // Check L2 norm is approximately 1
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    expect(norm).toBeCloseTo(1.0, 1);
  });
});

describe('GenomicVectorDB', () => {
  let genomicDB: GenomicVectorDB;

  beforeEach(() => {
    genomicDB = new GenomicVectorDB({
      database: {
        dimensions: 384,
        metric: 'cosine',
        indexType: 'flat',
        useWasm: false,
      },
      embeddings: {
        kmerSize: 6,
      },
    });
  });

  it('should create genomic database', () => {
    expect(genomicDB).toBeDefined();
    expect(genomicDB.db).toBeDefined();
    expect(genomicDB.embeddings).toBeDefined();
  });

  it('should add sequences', async () => {
    await genomicDB.addSequence('seq1', 'ATCGATCG', { gene: 'TEST' });

    const stats = genomicDB.db.getStats();
    expect(stats.totalVectors).toBe(1);
  });

  it('should search by sequence', async () => {
    await genomicDB.addSequence('seq1', 'ATCGATCGATCG', { gene: 'BRCA1' });
    await genomicDB.addSequence('seq2', 'GCTAGCTAGCTA', { gene: 'BRCA2' });

    const results = await genomicDB.searchBySequence('ATCGATCGATCG', 2);

    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].metadata?.gene).toBeDefined();
  });
});
