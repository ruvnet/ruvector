/**
 * Basic Usage Example for Genomic Vector Analysis
 */

import {
  VectorDatabase,
  KmerEmbedding,
  GenomicVectorDB,
} from '../src';

async function basicExample() {
  console.log('=== Basic Genomic Vector Analysis Example ===\n');

  const db = new VectorDatabase({
    dimensions: 384,
    metric: 'cosine',
    indexType: 'hnsw',
    useWasm: false,
  });

  const embedder = new KmerEmbedding({
    model: 'kmer',
    dimensions: 384,
    kmerSize: 6,
  });

  const sequences = [
    { id: 'seq1', sequence: 'ATCGATCGATCGATCGATCG', gene: 'BRCA1' },
    { id: 'seq2', sequence: 'GCTAGCTAGCTAGCTAGCTA', gene: 'BRCA2' },
  ];

  for (const seq of sequences) {
    const embedding = await embedder.embed(seq.sequence);
    await db.add({
      id: seq.id,
      values: embedding.vector,
      metadata: { sequence: seq.sequence, gene: seq.gene },
    });
  }

  const queryEmbedding = await embedder.embed('ATCGATCGATCGATCGATCG');
  const results = await db.search(queryEmbedding.vector, { k: 3 });

  console.log('Search results:', results);
  console.log('Database stats:', db.getStats());
}

if (require.main === module) {
  basicExample().catch(console.error);
}

export { basicExample };
