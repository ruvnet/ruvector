# Quick Reference - Genomic Vector Analysis API

**Fast lookup guide for common tasks and API methods**

## Installation & Setup

```bash
npm install @ruvector/genomic-vector-analysis
```

```typescript
import {
  GenomicVectorDB,
  VectorDatabase,
  KmerEmbedding,
  PatternRecognizer
} from '@ruvector/genomic-vector-analysis';
```

## Common Tasks

### 1. Initialize Database

```typescript
const db = new VectorDatabase({
  dimensions: 384,
  metric: 'cosine',
  indexType: 'hnsw'
});
```

### 2. Create Embeddings

```typescript
const embedder = new KmerEmbedding({
  kmerSize: 6,
  dimensions: 384
});

const result = await embedder.embed('ATCGATCG');
```

### 3. Add Vectors

```typescript
// Single
await db.add({
  id: 'variant-1',
  values: embedding,
  metadata: { gene: 'BRCA1' }
});

// Batch (faster)
await db.addBatch(vectors);
```

### 4. Search

```typescript
const results = await db.search(queryVector, {
  k: 10,
  threshold: 0.8
});
```

### 5. Pattern Recognition

```typescript
const recognizer = new PatternRecognizer(db);
await recognizer.trainFromCases(cases);
const prediction = await recognizer.predict(newCase);
```

## API Cheat Sheet

### VectorDatabase

| Method | Purpose | Complexity |
|--------|---------|------------|
| `add(vector)` | Add single vector | O(log n) |
| `addBatch(vectors)` | Add multiple (2-3x faster) | O(n log n) |
| `search(query, opts)` | Find similar vectors | O(log n) |
| `get(id)` | Get by ID | O(1) |
| `delete(id)` | Remove vector | O(log n) |
| `getStats()` | Database stats | O(1) |
| `clear()` | Remove all | O(1) |

### KmerEmbedding

| Method | Purpose | Performance |
|--------|---------|-------------|
| `embed(sequence)` | Embed single | ~1-2ms (JS) |
| `embedBatch(sequences)` | Embed multiple | 20-30% faster |
| `clearCache()` | Clear cache | O(1) |
| `getCacheStats()` | Cache stats | O(1) |

### PatternRecognizer

| Method | Purpose | Returns |
|--------|---------|---------|
| `trainFromCases(cases)` | Train model | LearningMetrics |
| `predict(case)` | Predict diagnosis | Prediction |
| `findMatchingPatterns(case)` | Find patterns | Pattern[] |
| `getPatterns()` | Get all patterns | Pattern[] |
| `clearPatterns()` | Clear patterns | void |

## Configuration Quick Reference

### VectorDatabase Config

```typescript
interface VectorDatabaseConfig {
  dimensions: number;          // Required
  metric?: 'cosine' | 'euclidean' | 'dot';
  quantization?: 'none' | 'scalar' | 'product' | 'binary';
  indexType?: 'hnsw' | 'ivf' | 'flat';
  M?: number;                  // HNSW: 8-64 (default: 16)
  efConstruction?: number;     // HNSW: 100-400 (default: 200)
  efSearch?: number;           // Search: 50-200 (default: 50)
  useWasm?: boolean;           // Enable WASM (default: true)
}
```

### EmbeddingConfig

```typescript
interface EmbeddingConfig {
  model: 'kmer' | 'dna-bert' | ...;
  dimensions?: number;         // Default: 384
  kmerSize?: number;          // 3-8 (default: 6)
  stride?: number;            // Default: 1
  normalization?: 'l2' | 'none';
  useCache?: boolean;         // Default: true
  batchSize?: number;         // Default: 32
}
```

### SearchOptions

```typescript
interface SearchOptions {
  k?: number;                 // Results to return (default: 10)
  threshold?: number;         // Min similarity (0-1)
  filters?: Record<string, any>;
  efSearch?: number;          // HNSW param (default: 50)
  rerank?: boolean;           // Exact distances (default: false)
}
```

## Performance Optimization

### Index Selection

```typescript
// < 10K vectors
{ indexType: 'flat' }

// < 10M vectors, high recall
{ indexType: 'hnsw', M: 32, efConstruction: 400 }

// > 10M vectors
{ indexType: 'ivf', nprobe: 10 }
```

### Quantization

```typescript
// No compression (best quality)
{ quantization: 'none' }  // 4 bytes/dim

// 4x compression (good quality)
{ quantization: 'scalar' }  // 1 byte/dim

// 32x compression (lower quality)
{ quantization: 'binary' }  // 0.125 bytes/dim
```

### Batch Operations

```typescript
// ✅ Good: Batch operations
await db.addBatch(vectors);
await embedder.embedBatch(sequences);

// ❌ Bad: Individual operations in loop
for (const v of vectors) {
  await db.add(v);  // Slow!
}
```

## Error Handling

```typescript
try {
  await db.add({
    id: 'variant',
    values: embedding,
    metadata: { ... }
  });
} catch (error) {
  if (error.message.includes('dimension mismatch')) {
    // Handle dimension error
  }
}
```

## Common Patterns

### Complete Workflow

```typescript
// 1. Initialize
const db = new VectorDatabase({ dimensions: 384 });
const embedder = new KmerEmbedding({ kmerSize: 6 });

// 2. Load data
const sequences = loadSequences();
const embeddings = await embedder.embedBatch(sequences);

await db.addBatch(
  embeddings.map((e, i) => ({
    id: `seq-${i}`,
    values: e.vector,
    metadata: { sequence: sequences[i] }
  }))
);

// 3. Search
const query = await embedder.embed('ATCGATCG');
const results = await db.search(query.vector, { k: 10 });

// 4. Process results
results.forEach(r => {
  console.log(`${r.id}: ${r.score.toFixed(3)}`);
});
```

### Plugin Usage

```typescript
import { PluginManager, createPlugin } from '@ruvector/genomic-vector-analysis';

const plugin = createPlugin({
  name: 'annotator',
  version: '1.0.0',
  async initialize(ctx) {
    console.log('Plugin ready');
  },
  hooks: {
    async afterSearch(results) {
      return results.map(r => ({
        ...r,
        annotated: true
      }));
    }
  }
});

const manager = new PluginManager({ db, embeddings });
await manager.register(plugin);
```

## Benchmarks

### Add Operations (100K vectors)

| Operation | Time | Throughput |
|-----------|------|------------|
| add() single | 12ms avg | 83 ops/sec |
| addBatch(100) | 4ms avg | 250 ops/sec |
| addBatch(1000) | 35ms avg | 285 ops/sec |

### Search Operations (100K vectors, k=10)

| efSearch | Time | Recall |
|----------|------|--------|
| 50 | 2.5ms | 90% |
| 100 | 4.8ms | 95% |
| 200 | 9.2ms | 99% |

### Embedding Operations

| Operation | Time (JS) | Time (WASM) |
|-----------|-----------|-------------|
| embed(1000bp) | 1.2ms | 0.15ms |
| embedBatch(100) | 110ms | 12ms |

## Type Imports

```typescript
import type {
  // Core
  Vector,
  VectorSearchResult,
  VectorDatabaseConfig,
  SearchOptions,

  // Genomic
  GenomicVariant,
  ClinicalCase,
  Phenotype,

  // Embeddings
  EmbeddingConfig,
  EmbeddingResult,
  EmbeddingModel,

  // Learning
  Pattern,
  LearningMetrics,
  TrainingExample,

  // Plugins
  Plugin,
  PluginHooks,
  PluginContext
} from '@ruvector/genomic-vector-analysis';
```

## Resources

- **Full API Docs**: /docs/api/index.html
- **API Guide**: /docs/API_DOCUMENTATION.md
- **Examples**: /examples/
- **GitHub**: https://github.com/ruvnet/ruvector
- **NPM**: https://npmjs.com/package/@ruvector/genomic-vector-analysis

---

**Version**: 1.0.0 | **License**: MIT
