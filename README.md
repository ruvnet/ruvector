# RuVector

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![npm](https://img.shields.io/npm/v/ruvector.svg)](https://www.npmjs.com/package/ruvector)
[![Rust](https://img.shields.io/badge/rust-1.77%2B-orange.svg)](https://www.rust-lang.org)

**A vector database that learns.** Combines vector search, graph queries, and neural networks in one package.

```bash
npx ruvector
```

## Why RuVector?

Most vector databases just store and retrieve. RuVector does more:

| Capability | Description |
|------------|-------------|
| **Vector Search** | HNSW index with <0.5ms latency, 95%+ recall |
| **Graph Database** | Neo4j-compatible Cypher queries |
| **Hyperedges** | N-ary relationships (connect 3+ nodes) |
| **GNN Layers** | Index topology becomes a trainable neural network |
| **Tensor Compression** | 2-32x memory reduction (f32→f16→PQ8→PQ4→Binary) |
| **Differentiable Search** | Soft attention k-NN with gradient flow |
| **WASM/Browser** | Full client-side support |

## Quick Start

```bash
# Install globally
npm install -g ruvector

# Or run directly
npx ruvector

# Or add to project
npm install ruvector
```

```javascript
const ruvector = require('ruvector');

// Vector search
const db = new ruvector.VectorDB(128); // 128 dimensions
db.insert('doc1', embedding1);
db.insert('doc2', embedding2);
const results = db.search(queryEmbedding, 10); // top 10

// Graph queries (Cypher)
db.execute("CREATE (a:Person {name: 'Alice'})-[:KNOWS]->(b:Person {name: 'Bob'})");
db.execute("MATCH (p:Person)-[:KNOWS]->(friend) RETURN friend.name");

// GNN-enhanced search
const layer = new ruvector.GNNLayer(128, 256, 4); // input, hidden, heads
const enhanced = layer.forward(query, neighbors, weights);

// Compression (2-32x memory savings)
const compressed = ruvector.compress(embedding, 0.3); // access frequency
```

## Comparison

| Feature | RuVector | Pinecone | Qdrant | Milvus | ChromaDB |
|---------|----------|----------|--------|--------|----------|
| **Latency (p50)** | <0.5ms | ~2ms | ~1ms | ~5ms | ~50ms |
| **Memory (1M vec)** | 200MB* | 2GB | 1.5GB | 1GB | 3GB |
| **Graph Queries** | ✅ Cypher | ❌ | ❌ | ❌ | ❌ |
| **Hyperedges** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Self-Learning (GNN)** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Auto-Compression** | ✅ 2-32x | ❌ | ❌ | ✅ | ❌ |
| **Browser/WASM** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Differentiable** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Open Source** | ✅ MIT | ❌ | ✅ | ✅ | ✅ |

*With PQ8 compression

## How GNN Learning Works

```
Traditional:  Query → Index → Results (static)

RuVector:     Query → Index → GNN → Results
                       ↑              │
                       └── learns ────┘
```

The GNN layer treats HNSW neighbors as a graph, applying attention-based message passing. Frequently-used paths get reinforced, improving accuracy over time.

## Compression Tiers

| Tier | Access Freq | Format | Ratio | Use |
|------|-------------|--------|-------|-----|
| Hot | >80% | f32 | 1x | Active |
| Warm | 40-80% | f16 | 2x | Recent |
| Cool | 10-40% | PQ8 | 8x | Older |
| Cold | 1-10% | PQ4 | 16x | Archive |
| Frozen | <1% | Binary | 32x | Rare |

## Installation

```bash
# Node.js
npm install ruvector

# Browser/WASM
npm install ruvector-wasm

# Rust
cargo add ruvector-core ruvector-graph ruvector-gnn
```

## Use Cases

**RAG** — Retrieve context for LLMs with graph-aware ranking
**Recommendations** — User→Item→Similar paths via Cypher
**Knowledge Graphs** — Entities + embeddings + relationships
**Fraud Detection** — Pattern matching on transaction graphs
**Semantic Search** — Sub-millisecond similarity with compression

## Documentation

- [Getting Started](./docs/guide/GETTING_STARTED.md)
- [Cypher Reference](./docs/api/CYPHER_REFERENCE.md)
- [GNN Architecture](./docs/gnn-layer-implementation.md)
- [API Reference](./docs/api/)

## License

MIT — free for commercial use.

---

<div align="center">

**[GitHub](https://github.com/ruvnet/ruvector)** • **[npm](https://npmjs.com/package/ruvector)** • **[Docs](./docs/)**

*Vector search that gets smarter.*

</div>
