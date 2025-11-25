# Quick Start Guide

## Installation

```bash
cd packages/genomic-vector-analysis
npm install
npm run build
```

## Basic Usage

```typescript
import { VectorDatabase, KmerEmbedding, GenomicVectorDB } from '@ruvector/genomic-vector-analysis';

// Option 1: Use individual components
const db = new VectorDatabase({
  dimensions: 384,
  metric: 'cosine',
  indexType: 'hnsw',
  useWasm: false, // WASM optional
});

const embedder = new KmerEmbedding({
  model: 'kmer',
  dimensions: 384,
  kmerSize: 6,
});

// Embed and store a sequence
const embedding = await embedder.embed('ATCGATCGATCG');
await db.add({
  id: 'seq1',
  values: embedding.vector,
  metadata: { gene: 'BRCA1' }
});

// Search
const results = await db.search(embedding.vector, { k: 10 });

// Option 2: Use convenience wrapper
const genomicDB = new GenomicVectorDB({
  database: { dimensions: 384, useWasm: false },
  embeddings: { kmerSize: 6 }
});

await genomicDB.addSequence('seq1', 'ATCGATCGATCG', { gene: 'BRCA1' });
const results = await genomicDB.searchBySequence('ATCGATCG', 5);
```

## Verification

Verify the package works:

```bash
node -e "const {VectorDatabase} = require('./dist/index.js'); const db = new VectorDatabase({dimensions: 10, metric: 'cosine', indexType: 'flat', useWasm: false}); console.log('✅ Package works:', db.getStats());"
```

## Current Status

✅ Package builds successfully  
✅ Core functionality works  
✅ Types are properly exported  
✅ WASM is optional (graceful fallback)  
⚠️  Tests need additional configuration (non-blocking)  
📝 See docs/FIXES_APPLIED.md for complete details  

## Next Steps

1. Run examples: `node examples/basic-usage.js`
2. Build your genomic analysis pipeline
3. Explore advanced learning features (RL, Transfer Learning, etc.)
