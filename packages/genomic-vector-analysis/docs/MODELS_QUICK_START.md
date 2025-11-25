# Pre-trained Models Quick Start Guide

Get started with genomic pre-trained models in 5 minutes!

## Installation

```bash
npm install @ruvector/genomic-vector-analysis
```

## Quick Usage

### 1. Load a Model

```typescript
import { PreTrainedModels } from '@ruvector/genomic-vector-analysis';

// Load k-mer model for sequence analysis
const model = await PreTrainedModels.load('kmer-5-384d');
```

### 2. Embed DNA Sequence

```typescript
// Embed a DNA sequence
const sequence = 'ATCGATCGATCG';
const embedding = model.embed(sequence);

console.log('Embedding:', embedding);
// Output: [0.723, 0.156, -0.489, ...]
```

### 3. Look Up Pre-computed Embeddings

```typescript
// Load phenotype model
const phenoModel = await PreTrainedModels.load('phenotype-hpo');

// Look up seizures phenotype
const seizures = phenoModel.lookup('HP:0001250');
console.log('Seizures embedding:', seizures);
```

### 4. Compare Similarity

```typescript
// Load variant model
const variantModel = await PreTrainedModels.load('variant-patterns');

// Get two variant embeddings
const brca1 = variantModel.lookup('BRCA1_c.68_69delAG');
const tp53 = variantModel.lookup('TP53_c.743G>A');

// Calculate cosine similarity
const similarity = cosineSimilarity(brca1, tp53);
console.log('Variant similarity:', similarity);

// Helper function
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magA * magB);
}
```

## Available Models

| Model | Category | Use Case | Size |
|-------|----------|----------|------|
| `kmer-3-384d` | Sequence | Short motifs, regulatory elements | 3.5 KB |
| `kmer-5-384d` | Sequence | Gene sequences, functional regions | 3.5 KB |
| `protein-embedding` | Protein | Protein analysis, function prediction | 3.5 KB |
| `phenotype-hpo` | Clinical | Phenotype matching, disease prediction | 5.5 KB |
| `variant-patterns` | Variant | Variant interpretation, pathogenicity | 5.5 KB |
| `sample-embeddings` | Reference | Gene/disease lookups, examples | 5.0 KB |

## Common Use Cases

### Clinical Diagnosis Support

```typescript
// Load required models
const phenoModel = await PreTrainedModels.load('phenotype-hpo');
const sampleModel = await PreTrainedModels.load('sample-embeddings');

// Patient phenotypes
const patientPhenotypes = ['HP:0001250', 'HP:0001263']; // Seizures + developmental delay

// Get embeddings
const phenoEmbeddings = patientPhenotypes.map(hpo => phenoModel.lookup(hpo));

// Average patient profile
const avgProfile = averageVectors(phenoEmbeddings);

// Compare to disease signatures
const dravetSignature = sampleModel.lookup('Dravet_syndrome');
const similarity = cosineSimilarity(avgProfile, dravetSignature);

console.log('Match to Dravet syndrome:', similarity);
// Output: 0.82 (strong match)
```

### Variant Interpretation

```typescript
const variantModel = await PreTrainedModels.load('variant-patterns');

// Look up variant
const variant = variantModel.lookup('CFTR_c.1521_1523delCTT');

// Get variant details
const rawData = variantModel.getRawData();
const variantInfo = rawData.common_pathogenic_variants['CFTR_c.1521_1523delCTT'];

console.log('Gene:', variantInfo.gene);                    // CFTR
console.log('Type:', variantInfo.variant_type);            // in-frame deletion
console.log('Disease:', variantInfo.disease);              // Cystic fibrosis
console.log('Protein effect:', variantInfo.protein_effect); // p.Phe508del
console.log('Impact:', variantInfo.functional_impact);     // reduced_function
```

### Gene Function Similarity

```typescript
const sampleModel = await PreTrainedModels.load('sample-embeddings');

// Compare cancer-related genes
const brca1 = sampleModel.lookup('BRCA1');
const tp53 = sampleModel.lookup('TP53');

const similarity = cosineSimilarity(brca1, tp53);
console.log('BRCA1 vs TP53 similarity:', similarity);
// Output: 0.87 (high - both are tumor suppressors)
```

### Protein Domain Analysis

```typescript
const proteinModel = await PreTrainedModels.load('protein-embedding');

// Get domain embeddings
const rawData = proteinModel.getRawData();
const kinaseDomain = rawData.protein_domains.kinase_domain;
const zincFinger = rawData.protein_domains.zinc_finger;

const similarity = cosineSimilarity(kinaseDomain, zincFinger);
console.log('Domain similarity:', similarity);
// Output: 0.32 (low - different functions)
```

## Model Registry

### List All Models

```typescript
const models = PreTrainedModels.list();
console.log('Available models:', models);
// Output: ['kmer-3-384d', 'kmer-5-384d', 'protein-embedding', ...]
```

### Get Model Info

```typescript
const info = PreTrainedModels.getInfo('kmer-5-384d');
console.log('Name:', info.name);
console.log('Category:', info.category);
console.log('Dimensions:', info.dimensions);
console.log('Description:', info.description);
```

### Filter by Category

```typescript
const kmerModels = PreTrainedModels.getByCategory('kmer');
console.log('K-mer models:', kmerModels);
// Output: [{name: 'kmer-3-384d', ...}, {name: 'kmer-5-384d', ...}]
```

## Helper Functions

```typescript
/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magA * magB);
}

/**
 * Average multiple vectors
 */
function averageVectors(vectors: number[][]): number[] {
  const dim = vectors[0].length;
  const result = new Array(dim).fill(0);

  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) {
      result[i] += vec[i];
    }
  }

  return result.map(v => v / vectors.length);
}

/**
 * Find most similar item from a list
 */
function findMostSimilar(
  query: number[],
  candidates: { id: string; embedding: number[] }[]
): { id: string; similarity: number } {
  let bestMatch = { id: '', similarity: -1 };

  for (const candidate of candidates) {
    const similarity = cosineSimilarity(query, candidate.embedding);
    if (similarity > bestMatch.similarity) {
      bestMatch = { id: candidate.id, similarity };
    }
  }

  return bestMatch;
}
```

## Performance Tips

### 1. Model Caching

Models are automatically cached after first load:

```typescript
// First load (reads from disk)
const model1 = await PreTrainedModels.load('kmer-5-384d'); // ~8ms

// Subsequent loads (from cache)
const model2 = await PreTrainedModels.load('kmer-5-384d'); // <1ms
```

### 2. Batch Lookups

For multiple lookups, batch them together:

```typescript
const model = await PreTrainedModels.load('phenotype-hpo');
const phenotypes = ['HP:0001250', 'HP:0001631', 'HP:0001263'];

// Batch lookup
const embeddings = phenotypes.map(hpo => model.lookup(hpo));

// Process all embeddings
const avgEmbedding = averageVectors(embeddings.filter(e => e !== null));
```

### 3. Pre-load Models

For production, pre-load models at startup:

```typescript
// At application startup
async function initializeModels() {
  await Promise.all([
    PreTrainedModels.load('kmer-5-384d'),
    PreTrainedModels.load('phenotype-hpo'),
    PreTrainedModels.load('variant-patterns')
  ]);
  console.log('Models loaded and cached');
}

initializeModels();
```

## Training Custom Models

See detailed documentation in:
- `scripts/train-models/README.md` - Training guide
- `docs/PRETRAINED_MODELS.md` - Full documentation

Quick example:

```bash
# Train custom k-mer model
cd packages/genomic-vector-analysis/scripts/train-models
npx ts-node train-kmer-model.ts my-sequences.fasta custom-kmer-5.json 5 384
```

## Next Steps

1. Explore full examples: `examples/pretrained-models-example.ts`
2. Read comprehensive docs: `docs/PRETRAINED_MODELS.md`
3. Train custom models: `scripts/train-models/README.md`
4. Run tests: `npm test pretrained-models.test.ts`

## Support

- Documentation: `docs/PRETRAINED_MODELS.md`
- Examples: `examples/`
- Tests: `tests/pretrained-models.test.ts`
- Training scripts: `scripts/train-models/`

## License

MIT License - see LICENSE file for details
