# ADR-002: Embedding Models Strategy

**Status**: Accepted
**Date**: 2025-11-23
**Deciders**: ruvector Architecture Team
**Technical Story**: Genomic data embedding strategy

## Context

Genomic data comes in multiple forms (DNA sequences, protein sequences, variants, phenotypes), each requiring different embedding strategies. We need to support:

1. **DNA/RNA sequences**: Variable length, ATCG alphabet
2. **Protein sequences**: Amino acid sequences
3. **Genomic variants**: Structured data (chr, pos, ref, alt)
4. **Clinical phenotypes**: Text descriptions, HPO terms
5. **Multi-modal cases**: Combinations of above

## Decision Drivers

- Embedding quality (semantic capture)
- Inference speed
- Model size (deployment considerations)
- Flexibility (domain adaptation)
- Browser compatibility
- Cost (computational and $)

## Options Considered

### Option 1: Single Universal Model

Use one large transformer model for all data types.

**Pros:**
- Simpler architecture
- Single model to maintain
- Potential for cross-domain learning

**Cons:**
- Large model size (>1GB)
- Slow inference
- May not excel at any specific task
- Difficult to deploy in browser

### Option 2: Multiple Specialized Models

Different models optimized for each data type.

**Pros:**
- Best quality for each domain
- Flexibility in model choice
- Can use lightweight models where appropriate
- Easy to swap/upgrade models

**Cons:**
- More complex architecture
- Multiple models to maintain
- Higher total model size
- Need model selection logic

### Option 3: K-mer Only (Simple)

Use only k-mer frequency-based embeddings.

**Pros:**
- Very fast (no neural network)
- Small memory footprint
- Deterministic, interpretable
- Browser-friendly

**Cons:**
- Lower quality embeddings
- No semantic understanding
- Fixed representation
- Limited for non-sequence data

## Decision

**Chosen Option: Option 2 - Multiple Specialized Models with Flexible Factory Pattern**

Implement a model factory that supports:
1. **K-mer** (default, fast, lightweight)
2. **DNA-BERT** (high-quality DNA embeddings)
3. **Nucleotide Transformer** (state-of-art sequence)
4. **ESM2** (protein sequences)
5. **ProtBERT** (protein sequences)
6. **Phenotype-BERT** (clinical text)
7. **Custom** (user-provided models)

## Rationale

### Model Selection Matrix

| Data Type | Primary Model | Fallback | Use Case |
|-----------|--------------|----------|----------|
| DNA/RNA sequences | DNA-BERT | K-mer | Variant analysis, conservation |
| Short sequences (<50bp) | K-mer | - | SNPs, indels, k-mer counting |
| Protein sequences | ESM2 | ProtBERT | Function prediction, structure |
| Clinical phenotypes | Phenotype-BERT | K-mer | Case similarity, diagnosis |
| Custom data | User model | K-mer | Domain-specific tasks |

### Why This Approach

1. **Performance Flexibility**: Use fast k-mer for real-time, BERT for quality
2. **Progressive Enhancement**: Start with k-mer, upgrade to BERT when needed
3. **Domain Expertise**: Leverage best models for each data type
4. **Future-Proof**: Easy to add new models (GPT-Genomics, Nucleotide-2, etc.)

## Implementation Details

### Embedding Factory

```typescript
class EmbeddingFactory {
  static create(config: EmbeddingConfig): IEmbedding {
    switch (config.model) {
      case 'kmer':
        return new KmerEmbedding(config);
      case 'dna-bert':
        return new DNABertEmbedding(config);
      case 'nucleotide-transformer':
        return new NucleotideTransformerEmbedding(config);
      case 'esm2':
        return new ESM2Embedding(config);
      case 'custom':
        return new CustomEmbedding(config);
      default:
        return new KmerEmbedding(config); // Safe default
    }
  }
}
```

### Model Specifications

#### 1. K-mer Embedding

```typescript
{
  model: 'kmer',
  dimensions: 64-1024,    // Configurable
  kmerSize: 6,            // Default, 4^6 = 4096 possible k-mers
  stride: 1,              // Sliding window
  method: 'frequency',    // or 'binary', 'tfidf'
  normalization: 'l2'
}
```

**Performance**: 1-5ms per sequence
**Quality**: Good for sequence similarity
**Memory**: <1MB
**Browser**: ✅ Yes

#### 2. DNA-BERT

```typescript
{
  model: 'dna-bert',
  dimensions: 768,
  maxLength: 512,         // Token limit
  stride: 256,            // For long sequences
  aggregation: 'mean',    // or 'cls', 'max'
  quantization: 'int8'    // For speed
}
```

**Performance**: 50-150ms per sequence
**Quality**: Excellent, captures context
**Memory**: ~500MB
**Browser**: ⚠️ With quantization

#### 3. ESM2 (Proteins)

```typescript
{
  model: 'esm2',
  variant: 'esm2-t33-650M',  // or 't36-3B', 't6-8M'
  dimensions: 1280,
  maxLength: 1024,
  aggregation: 'mean'
}
```

**Performance**: 100-500ms per sequence
**Quality**: State-of-art for proteins
**Memory**: 650MB-3GB (variant dependent)
**Browser**: ❌ Too large

### Lazy Loading Strategy

```typescript
class DNABertEmbedding {
  private model: any = null;

  async initialize() {
    if (!this.model) {
      // Load model only when first used
      this.model = await loadDNABert();
    }
  }

  async embed(sequence: string) {
    await this.initialize();
    return this.model.encode(sequence);
  }
}
```

### Caching Strategy

```typescript
class CachedEmbedding {
  private cache: LRUCache<string, Float32Array>;

  async embed(sequence: string) {
    const cached = this.cache.get(sequence);
    if (cached) return cached;

    const embedding = await this.baseEmbed(sequence);
    this.cache.set(sequence, embedding);
    return embedding;
  }
}
```

## Consequences

### Positive

- ✅ Best quality for each data type
- ✅ Fast k-mer for quick prototyping
- ✅ Easy to add new models
- ✅ Users can choose quality vs. speed
- ✅ Plugin architecture enables custom models

### Negative

- ❌ Complex model management
- ❌ Large total download size (if using all models)
- ❌ Need to maintain multiple model integrations
- ❌ Model versioning complexity

### Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Model obsolescence | Abstract interfaces, easy swapping |
| Breaking API changes | Version pinning, compatibility layer |
| Large bundle size | Lazy loading, optional dependencies |
| Slow cold start | Model caching, warm-up strategies |

## Validation

### Quality Benchmarks

```typescript
// Evaluate embedding quality
const benchmarks = [
  {
    task: 'variant-similarity',
    dataset: 'clinvar-pathogenic-pairs',
    metric: 'spearman-correlation',
    target: 0.7
  },
  {
    task: 'phenotype-matching',
    dataset: 'hpo-similarity',
    metric: 'recall@10',
    target: 0.85
  },
  {
    task: 'protein-function',
    dataset: 'swiss-prot',
    metric: 'accuracy',
    target: 0.80
  }
];
```

### Speed Benchmarks

| Model | Sequence Length | Latency (p50) | Latency (p99) |
|-------|----------------|---------------|---------------|
| K-mer | 100bp | 2ms | 5ms |
| K-mer | 10,000bp | 50ms | 100ms |
| DNA-BERT | 100bp | 80ms | 150ms |
| DNA-BERT | 512bp | 120ms | 200ms |
| ESM2-650M | 200aa | 200ms | 400ms |

## Future Enhancements

### Phase 2: Hybrid Embeddings

Combine multiple embedding types:

```typescript
const embedding = await hybridEmbed({
  sequence: 'ATCG...',
  methods: [
    { model: 'kmer', weight: 0.3 },
    { model: 'dna-bert', weight: 0.7 }
  ],
  aggregation: 'concat' // or 'weighted-sum'
});
```

### Phase 3: Fine-tuning

Enable domain-specific fine-tuning:

```typescript
const model = await loadModel('dna-bert');
await model.fineTune({
  dataset: 'nicu-variants.jsonl',
  epochs: 10,
  learningRate: 1e-5,
  validationSplit: 0.2
});
```

### Phase 4: Multi-modal Embeddings

Combine sequence + structure + function:

```typescript
const embedding = await multiModalEmbed({
  sequence: 'ATCG...',
  structure: '((...))',  // Secondary structure
  annotations: {
    conservation: 0.95,
    function: 'ion channel'
  }
});
```

## References

1. Ji, Y., et al. (2021). DNABERT: pre-trained Bidirectional Encoder Representations from Transformers model for DNA-language in genome. Bioinformatics.
2. Dalla-Torre, H., et al. (2023). The Nucleotide Transformer: Building and Evaluating Robust Foundation Models for Human Genomics. bioRxiv.
3. Lin, Z., et al. (2023). Evolutionary-scale prediction of atomic-level protein structure with a language model. Science.
4. Elnaggar, A., et al. (2021). ProtTrans: Towards Cracking the Language of Life's Code Through Self-Supervised Deep Learning and High Performance Computing. TPAMI.

## Status History

- 2025-11-23: Proposed and Accepted
