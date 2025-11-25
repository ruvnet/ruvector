# ADR-001: Vector Database Choice

**Status**: Accepted
**Date**: 2025-11-23
**Deciders**: ruvector Architecture Team
**Technical Story**: Core vector database implementation

## Context

We need a high-performance vector database for storing and searching genomic embeddings. Key requirements:

1. **Scale**: Handle 1M-10M+ vectors
2. **Latency**: <100ms search @ p99
3. **Accuracy**: >95% recall@10
4. **Flexibility**: Support multiple distance metrics
5. **Extensibility**: Plugin architecture
6. **Deployment**: Works in Node.js and browsers

## Decision Drivers

- Performance (latency, throughput)
- Accuracy (recall, precision)
- Memory efficiency
- Ease of integration
- License compatibility
- Community support

## Options Considered

### Option 1: Use Existing Vector Database (Pinecone, Weaviate, Milvus)

**Pros:**
- Battle-tested, production-ready
- Managed services available
- Advanced features (sharding, replication)
- Good documentation

**Cons:**
- External dependency / vendor lock-in
- Network latency for cloud services
- Cost for managed services
- Limited customization
- Not browser-compatible

### Option 2: Build Custom with HNSW + WASM

**Pros:**
- Full control over implementation
- Optimized for genomic data
- Browser and Node.js compatible
- No external dependencies
- Zero cost
- Can optimize for specific use cases

**Cons:**
- Higher development effort
- Need to maintain index implementation
- Potential for bugs in complex algorithms
- Need to implement advanced features ourselves

### Option 3: Use FAISS Library

**Pros:**
- Industry-standard from Meta
- Excellent performance
- Multiple index types
- GPU support
- Well-documented

**Cons:**
- C++ dependency, complex to integrate
- No native JavaScript/WASM support
- Requires Node.js addons (not browser-compatible)
- Heavy dependency

## Decision

**Chosen Option: Option 2 - Build Custom with HNSW + WASM**

We will implement a custom vector database using:
- **HNSW** (Hierarchical Navigable Small World) for indexing
- **Rust/WASM** for performance-critical operations
- **TypeScript** for API and business logic
- **Multiple index types**: HNSW, IVF, Flat (brute-force)

## Rationale

1. **Universal Compatibility**: Works in Node.js and browsers without external services
2. **Performance**: WASM provides near-native performance for distance calculations
3. **Flexibility**: Can optimize specifically for genomic data patterns
4. **No Lock-in**: Complete control over data and algorithms
5. **Cost**: Zero external service costs
6. **Innovation**: Can experiment with genomic-specific optimizations

### HNSW Algorithm Choice

HNSW provides:
- **Search**: O(log N) complexity
- **Recall**: >95% with proper parameters
- **Memory**: Linear in number of vectors
- **Insertions**: Efficient incremental updates

## Implementation Details

### Core Components

```typescript
class VectorDatabase {
  // HNSW parameters
  M: number;                  // Number of connections per layer
  efConstruction: number;     // Size of dynamic candidate list
  efSearch: number;           // Search beam width

  // Storage
  vectors: Map<string, Vector>;
  index: HNSWIndex;

  // WASM acceleration
  wasm: {
    cosineSimilarity(a, b): number;
    euclideanDistance(a, b): number;
    quantize(vector): Uint8Array;
  };
}
```

### Metrics Supported

- **Cosine Similarity**: Best for normalized embeddings
- **Euclidean Distance**: For absolute distances
- **Hamming Distance**: For binary vectors
- **Manhattan Distance**: For sparse vectors (future)
- **Dot Product**: For non-normalized vectors

### Quantization Methods

- **Scalar Quantization**: 4x memory reduction
- **Product Quantization**: 8-32x memory reduction
- **Binary Quantization**: 32x memory reduction

## Consequences

### Positive

- ✅ Universal deployment (browser + Node.js + edge)
- ✅ No external dependencies or costs
- ✅ Optimized for genomic use cases
- ✅ Complete control and flexibility
- ✅ Can iterate rapidly on improvements

### Negative

- ❌ Need to maintain index implementation
- ❌ Less battle-tested than commercial solutions
- ❌ No built-in sharding/replication (need to build)
- ❌ Higher initial development effort

### Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Index bugs | Comprehensive unit tests, property-based testing |
| Performance issues | Benchmark against FAISS, use profiling |
| Memory leaks | Regular memory profiling, automated testing |
| Scalability limits | Design for horizontal scaling from start |

## Validation

### Success Metrics

- [ ] Search latency <100ms @ 1M vectors (p99)
- [ ] Recall >95% @ k=10
- [ ] Memory usage <8GB for 1M vectors (384-dim)
- [ ] Throughput >100 searches/sec
- [ ] Browser compatibility verified

### Benchmark Plan

```typescript
// Compare against baseline
const benchmarks = [
  { vectors: 1000, dimensions: 384 },
  { vectors: 10000, dimensions: 384 },
  { vectors: 100000, dimensions: 384 },
  { vectors: 1000000, dimensions: 384 },
];

// Metrics to measure
// - Build time
// - Search latency (p50, p95, p99)
// - Recall @ k=1,10,100
// - Memory usage
```

## Alternatives for Future

If custom implementation doesn't meet requirements:

1. **Hybrid Approach**: Use FAISS for server, custom for browser
2. **Managed Service**: Integrate Pinecone/Weaviate as plugin
3. **Distributed**: Build on top of existing graph databases

## References

1. Malkov, Y. A., & Yashunin, D. A. (2018). Efficient and robust approximate nearest neighbor search using hierarchical navigable small world graphs.
2. Johnson, J., Douze, M., & Jégou, H. (2019). Billion-scale similarity search with GPUs. IEEE Transactions on Big Data.
3. https://github.com/nmslib/hnswlib
4. https://www.pinecone.io/learn/hnsw/

## Status History

- 2025-11-23: Proposed and Accepted
