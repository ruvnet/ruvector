# ADR-003: Rust/WASM Integration for Performance

**Status**: Accepted
**Date**: 2025-11-23
**Deciders**: ruvector Architecture Team
**Technical Story**: Performance optimization strategy

## Context

Genomic vector analysis involves computationally intensive operations:

1. **K-mer hashing**: Process millions of k-mers per sequence
2. **Distance calculations**: Compute similarity for thousands of vector pairs
3. **Quantization**: Compress high-dimensional vectors
4. **Index operations**: HNSW graph traversal

JavaScript/TypeScript is convenient but can be 5-10x slower than compiled languages for numerical operations. We need a strategy to optimize performance-critical paths.

## Decision Drivers

- Performance (throughput, latency)
- Development velocity
- Deployment complexity
- Browser compatibility
- Memory efficiency
- Maintainability

## Options Considered

### Option 1: Pure TypeScript

Keep everything in TypeScript/JavaScript.

**Pros:**
- Simple development
- Easy debugging
- No build complexity
- Works everywhere

**Cons:**
- 5-10x slower for numerical ops
- Higher memory usage
- No SIMD optimizations
- Poor for large-scale processing

### Option 2: Native Node.js Addons (N-API)

Use C++/Rust compiled to native Node.js modules.

**Pros:**
- Maximum performance
- Direct memory access
- Native threading
- Well-established pattern

**Cons:**
- Platform-specific binaries
- Complex build process
- No browser support
- Difficult debugging

### Option 3: Rust + WebAssembly

Compile Rust to WASM for universal deployment.

**Pros:**
- Near-native performance (1.5-2x slower than native)
- Universal (browser + Node.js)
- Memory safe (Rust)
- SIMD support
- Single codebase

**Cons:**
- Additional build step
- Learning curve for Rust
- WASM overhead for small operations
- Debugging complexity

### Option 4: Hybrid Approach

TypeScript for API/logic + Rust/WASM for hot paths.

**Pros:**
- Best of both worlds
- Optimize only what matters
- Gradual migration possible
- Flexibility

**Cons:**
- Two languages to maintain
- FFI boundary overhead
- More complex architecture

## Decision

**Chosen Option: Option 4 - Hybrid TypeScript + Rust/WASM**

### Architecture

```
TypeScript (High-level API, Business Logic)
    │
    ├─► WASM (Performance-critical operations)
    │   ├─ K-mer hashing
    │   ├─ Distance calculations
    │   ├─ Quantization
    │   └─ Batch operations
    │
    └─► TypeScript (Everything else)
        ├─ Database management
        ├─ Plugin system
        ├─ API layer
        └─ Non-critical paths
```

## Rationale

### When to Use WASM

Use WASM for:
- ✅ Numerical computations (distance, similarity)
- ✅ Tight loops (k-mer extraction, batch processing)
- ✅ Memory-intensive operations (quantization)
- ✅ Algorithms with SIMD potential

Keep in TypeScript:
- ✅ API layer and interfaces
- ✅ Plugin management
- ✅ Business logic
- ✅ I/O operations
- ✅ Async orchestration

### Performance Expectations

| Operation | TypeScript | WASM | Speedup |
|-----------|------------|------|---------|
| K-mer hashing | 100ms | 20ms | 5x |
| Cosine similarity (1M pairs) | 500ms | 100ms | 5x |
| Product quantization | 200ms | 40ms | 5x |
| Vector normalization | 50ms | 15ms | 3.3x |

### Memory Considerations

WASM operates on a linear memory space, which:
- ✅ Reduces GC pressure in JavaScript
- ✅ Enables efficient typed arrays
- ✅ Allows zero-copy data sharing (with caution)
- ⚠️ Requires explicit memory management

## Implementation Details

### WASM Module Structure

```rust
// src-rust/src/lib.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct KmerEmbedder {
    k: usize,
    dimensions: usize,
}

#[wasm_bindgen]
impl KmerEmbedder {
    #[wasm_bindgen(constructor)]
    pub fn new(k: usize, dimensions: usize) -> KmerEmbedder {
        KmerEmbedder { k, dimensions }
    }

    pub fn embed(&self, sequence: &str) -> Vec<f32> {
        // Fast Rust implementation
        // 5x faster than TypeScript
    }
}
```

### TypeScript Integration

```typescript
import * as wasm from '../wasm/genomic_vector_wasm';

export class KmerEmbedding {
  private wasmEmbedder?: any;

  async initialize() {
    try {
      this.wasmEmbedder = new wasm.KmerEmbedder(
        this.config.kmerSize,
        this.config.dimensions
      );
    } catch (error) {
      console.warn('WASM not available, using JS fallback');
    }
  }

  async embed(sequence: string): Promise<Float32Array> {
    if (this.wasmEmbedder) {
      // Use WASM (5x faster)
      return this.wasmEmbedder.embed(sequence);
    } else {
      // Fallback to JavaScript
      return this.embedJS(sequence);
    }
  }
}
```

### Build Process

```json
{
  "scripts": {
    "build:rust": "cd src-rust && wasm-pack build --target bundler",
    "build:ts": "tsup src/index.ts --format cjs,esm --dts",
    "build": "npm run build:rust && npm run build:ts"
  }
}
```

### Data Transfer Optimization

```rust
// Efficient data transfer between JS and WASM
#[wasm_bindgen]
pub fn batch_cosine_similarity(
    query: Vec<f32>,
    vectors: Vec<f32>,
    dim: usize
) -> Vec<f32> {
    // Process in WASM to avoid repeated boundary crossing
    let num_vectors = vectors.len() / dim;
    let mut results = Vec::with_capacity(num_vectors);

    for i in 0..num_vectors {
        let start = i * dim;
        let vector = &vectors[start..start + dim];
        results.push(cosine_similarity(&query, vector));
    }

    results // Single boundary crossing for results
}
```

## Consequences

### Positive

- ✅ 3-5x performance improvement for hot paths
- ✅ Universal deployment (browser + Node.js)
- ✅ Memory safety from Rust
- ✅ Graceful fallback to JavaScript
- ✅ Future-proof (WASM is evolving)

### Negative

- ❌ Additional build complexity
- ❌ Two languages to maintain
- ❌ Debugging across language boundary
- ❌ Learning curve for contributors
- ❌ Slightly larger bundle size

### Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| WASM build failures | Always include JS fallback |
| Browser compatibility | Feature detection, polyfills |
| Memory leaks | Careful ownership, automated tests |
| Performance regressions | Continuous benchmarking |
| Team skill gap | Documentation, training, code reviews |

## Validation

### Performance Benchmarks

```typescript
// Benchmark WASM vs JS
async function benchmark() {
  const sequences = generateTestSequences(1000);

  // WASM
  console.time('WASM');
  for (const seq of sequences) {
    await wasmEmbedder.embed(seq);
  }
  console.timeEnd('WASM');

  // JavaScript
  console.time('JS');
  for (const seq of sequences) {
    await jsEmbedder.embed(seq);
  }
  console.timeEnd('JS');
}
```

### Target Metrics

- [ ] K-mer embedding: >5x speedup
- [ ] Distance calculations: >4x speedup
- [ ] Quantization: >4x speedup
- [ ] Bundle size increase: <500KB
- [ ] Memory usage: Similar or better

### Browser Compatibility

| Browser | WASM Support | SIMD Support |
|---------|--------------|--------------|
| Chrome 90+ | ✅ | ✅ |
| Firefox 89+ | ✅ | ✅ |
| Safari 15+ | ✅ | ⚠️ Partial |
| Edge 91+ | ✅ | ✅ |
| Node.js 16+ | ✅ | ✅ |

## Future Enhancements

### Phase 2: SIMD Optimizations

```rust
#[cfg(target_arch = "wasm32")]
use std::arch::wasm32::*;

fn cosine_similarity_simd(a: &[f32], b: &[f32]) -> f32 {
    // Use SIMD for 2-4x additional speedup
    // Process 4 floats at a time
}
```

### Phase 3: Threading (WASM Threads)

```rust
use rayon::prelude::*;

pub fn batch_embed_parallel(sequences: Vec<String>) -> Vec<Vec<f32>> {
    sequences
        .par_iter()  // Parallel iterator
        .map(|seq| embed(seq))
        .collect()
}
```

### Phase 4: GPU Acceleration (WebGPU)

```rust
// Future: Use WebGPU for matrix operations
// Potential 10-100x speedup for large batches
```

## References

1. WebAssembly Official Docs: https://webassembly.org/
2. wasm-bindgen Guide: https://rustwasm.github.io/wasm-bindgen/
3. wasm-pack Documentation: https://rustwasm.github.io/wasm-pack/
4. Rust WASM Performance: https://rustwasm.github.io/book/
5. SIMD in WebAssembly: https://v8.dev/features/simd

## Status History

- 2025-11-23: Proposed and Accepted
