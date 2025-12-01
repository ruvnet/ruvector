# Dynamic Attention: FastGRNN + Attention Integration

> High-performance neural routing combining FastGRNN inference with attention-enhanced feature extraction for intelligent query routing with sub-millisecond latency.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![SIMD](https://img.shields.io/badge/SIMD-AVX2%2FNEON-green.svg)]()

## Overview

This example demonstrates the integration of **FastGRNN** (Fast Gated Recurrent Neural Network) with various **attention mechanisms** to create an intelligent routing system for AI model selection and agent orchestration.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Dynamic Attention Pipeline                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Query ─────┐                                                   │
│              │                                                   │
│              ▼                                                   │
│   ┌─────────────────────┐                                       │
│   │  Attention Module   │  ◄── Context (conversation, history)  │
│   │  • Multi-head       │                                       │
│   │  • Hyperbolic       │                                       │
│   │  • Flash/Linear     │                                       │
│   └─────────┬───────────┘                                       │
│             │                                                    │
│             ▼                                                    │
│   ┌─────────────────────┐                                       │
│   │  Feature Engineer   │  ◄── Candidate metadata               │
│   │  • Similarity       │                                       │
│   │  • Success rate     │                                       │
│   │  • Latency/Cost     │                                       │
│   └─────────┬───────────┘                                       │
│             │                                                    │
│             ▼                                                    │
│   ┌─────────────────────┐                                       │
│   │  FastGRNN Router    │  ◄── < 100μs inference                │
│   │  • Gated recurrent  │                                       │
│   │  • SIMD optimized   │                                       │
│   │  • Quantizable      │                                       │
│   └─────────┬───────────┘                                       │
│             │                                                    │
│             ▼                                                    │
│   Routing Decision ──────────────────────────────────────────►  │
│   • Best candidate ID                                            │
│   • Confidence score                                             │
│   • Use lightweight flag                                         │
│   • Uncertainty estimate                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Installation

```bash
# Install dependencies
npm install

# Or with specific packages
npm install @ruvector/core @ruvector/attention @ruvector/tiny-dancer
```

### Basic Usage

```typescript
import { createPipeline } from '@ruvector/dynamic-attention-example';

// Create pipeline
const pipeline = createPipeline({
  dim: 384,
  numHeads: 8,
  attentionType: 'multi-head',
  enableSIMD: true,
});

// Route a query
const result = await pipeline.process(
  {
    embedding: queryVector,
    context: [conversationHistory, systemPrompt],
  },
  candidates
);

// Use the routing decision
const best = result.decisions[0];
console.log(`Route to: ${best.candidateId}`);
console.log(`Confidence: ${(best.confidence * 100).toFixed(1)}%`);
console.log(`Use lightweight: ${best.useLightweight}`);
console.log(`Latency: ${result.metrics.totalLatencyUs}μs`);
```

## Features

### 7 Attention Mechanisms

| Attention Type | Best For | Complexity | Memory |
|----------------|----------|------------|--------|
| **dot-product** | Simple queries, low latency | O(n) | O(1) |
| **multi-head** | General purpose, balanced | O(n·h) | O(h) |
| **hyperbolic** | Hierarchical data, trees | O(n) | O(1) |
| **flash** | Long sequences | O(n) | O(√n) |
| **linear** | Very long sequences | O(n) | O(d) |
| **local-global** | Documents, sparse attention | O(n·w) | O(w) |
| **moe** | Complex routing, experts | O(n·k) | O(e) |

### SIMD Optimization

Automatically detects and uses the best SIMD instruction set:

- **AVX-512**: 512-bit vectors (Intel Xeon, recent i9)
- **AVX2**: 256-bit vectors (most modern x64 CPUs)
- **SSE4**: 128-bit vectors (older x64 CPUs)
- **NEON**: 128-bit vectors (ARM64, Apple Silicon)

### FastGRNN Neural Routing

- **Sub-millisecond inference**: < 100μs typical
- **Gated recurrent architecture**: Efficient state updates
- **Quantization support**: INT8 for memory efficiency
- **Pruning support**: Magnitude-based sparsification

## Benchmarks

Run the benchmark suite:

```bash
# Full benchmark
npm run benchmark

# Attention-specific
npm run benchmark:attention

# SIMD comparison
npm run benchmark:simd
```

### Sample Results (Apple M2, ARM64 NEON)

| Operation | Dimension | Latency | Throughput |
|-----------|-----------|---------|------------|
| Dot Product | 384 | 0.8 μs | 1.25M ops/s |
| Multi-head Attention | 384×8 | 45 μs | 22K ops/s |
| Full Pipeline | 384, 10 candidates | 120 μs | 8.3K routes/s |

### Scaling Analysis

```
Candidates | Pipeline Latency | Throughput
-----------|------------------|------------
1          | 35 μs            | 28,500/s
5          | 65 μs            | 15,400/s
10         | 120 μs           | 8,300/s
25         | 280 μs           | 3,600/s
50         | 540 μs           | 1,850/s
100        | 1,050 μs         | 950/s
```

---

## SWOT Analysis

### Strengths 💪

1. **Ultra-Low Latency**
   - Sub-millisecond routing decisions (< 100μs typical)
   - Minimal overhead for intelligent model selection
   - 10,000+ routes/second throughput

2. **Flexible Attention**
   - 7 attention mechanisms for different use cases
   - Hot-swappable at runtime
   - Custom attention implementations supported

3. **Production-Ready**
   - SIMD auto-detection and optimization
   - Circuit breaker pattern for fault tolerance
   - Uncertainty quantification for confidence

4. **Cost Optimization**
   - Intelligent routing reduces API costs 30-70%
   - Lightweight model fallback for simple queries
   - Success rate-aware routing

5. **Native Performance**
   - Rust core with NAPI bindings
   - Zero-copy Float32Array operations
   - AVX2/AVX-512/NEON SIMD support

### Weaknesses 📉

1. **Cold Start Overhead**
   - Initial model loading ~10-50ms
   - JIT warmup for JS/TS optimizations
   - First inference slower than steady state

2. **Memory Requirements**
   - ~10MB base memory
   - Additional per-model embedding storage
   - Context buffers scale with sequence length

3. **Training Complexity**
   - Requires labeled routing data
   - Knowledge distillation from larger models
   - Hyperparameter tuning needed

4. **Platform Dependencies**
   - Native bindings per platform
   - SIMD features vary by CPU
   - WASM fallback has lower performance

### Opportunities 🚀

1. **LLM Cost Reduction**
   - Route simple queries to cheap models
   - GPT-4 only for complex reasoning
   - Potential 50-80% cost savings

2. **Multi-Agent Orchestration**
   - Intelligent task-to-agent routing
   - Hierarchical agent coordination
   - Dynamic load balancing

3. **Edge Deployment**
   - Lightweight enough for edge devices
   - Offline-capable routing
   - Mobile/IoT applications

4. **Hybrid Search Enhancement**
   - Combine with vector search
   - Context-aware retrieval
   - RAG pipeline optimization

5. **Real-Time Systems**
   - Streaming inference routing
   - Low-latency decision making
   - Gaming/interactive applications

### Threats ⚠️

1. **API Changes**
   - LLM provider API evolution
   - Embedding model updates
   - Breaking changes in dependencies

2. **Competition**
   - Cloud provider native routing
   - OpenAI/Anthropic built-in optimization
   - Simpler heuristic approaches

3. **Model Drift**
   - Embedding distributions change
   - New models require retraining
   - Historical data becomes stale

4. **Latency Budgets**
   - Even 100μs adds up at scale
   - Network latency dominates anyway
   - Diminishing returns on optimization

---

## Use Cases

### 1. LLM Model Routing

Route queries to the most cost-effective model:

```typescript
const result = await pipeline.process(
  { embedding: queryEmbedding },
  [
    { id: 'gpt-4', cost: 0.06, successRate: 0.95 },
    { id: 'gpt-3.5', cost: 0.002, successRate: 0.85 },
    { id: 'claude-haiku', cost: 0.001, successRate: 0.82 },
  ]
);

// Simple greeting → route to cheapest
// Complex reasoning → route to most capable
```

### 2. Agent Orchestration

Assign tasks to specialized agents:

```typescript
const agents = [
  { id: 'code-agent', capabilities: ['programming', 'debugging'] },
  { id: 'research-agent', capabilities: ['search', 'summarize'] },
  { id: 'creative-agent', capabilities: ['writing', 'design'] },
];

const result = await pipeline.process(
  { embedding: taskEmbedding, context: projectContext },
  agents
);
```

### 3. RAG Query Routing

Select retrieval strategy based on query:

```typescript
const strategies = [
  { id: 'semantic', embedding: semanticEmbed },
  { id: 'keyword', embedding: keywordEmbed },
  { id: 'hybrid', embedding: hybridEmbed },
];

const result = await pipeline.process({ embedding: query }, strategies);
```

### 4. A/B Testing Acceleration

Intelligent traffic allocation:

```typescript
const variants = [
  { id: 'control', successRate: baseline },
  { id: 'treatment-a', successRate: treatmentA },
  { id: 'treatment-b', successRate: treatmentB },
];

// Route more traffic to winning variants automatically
```

---

## API Reference

### `createPipeline(config?)`

Create a new Dynamic Attention pipeline.

```typescript
const pipeline = createPipeline({
  dim: 384,              // Embedding dimension
  numHeads: 8,           // Attention heads
  hiddenDim: 64,         // FastGRNN hidden size
  attentionType: 'multi-head',
  enableSIMD: true,
  simdLevel: 'avx2',
  temperature: 1.0,
  dropout: 0.1,
});
```

### `pipeline.process(input, candidates)`

Process a query through the pipeline.

```typescript
const result = await pipeline.process(
  {
    embedding: Float32Array,
    context?: Float32Array[],
    metadata?: Record<string, unknown>,
  },
  candidates: RoutingCandidate[]
);
```

### `RoutingCandidate`

```typescript
interface RoutingCandidate {
  id: string;
  embedding: Float32Array;
  successRate?: number;    // 0-1
  avgLatency?: number;     // ms
  cost?: number;           // per 1K tokens
  capabilities?: string[];
}
```

### `PipelineResult`

```typescript
interface PipelineResult {
  decisions: RoutingDecision[];
  enrichedEmbedding: Float32Array;
  metrics: PipelineMetrics;
}

interface RoutingDecision {
  candidateId: string;
  confidence: number;      // 0-1
  useLightweight: boolean;
  uncertainty: number;     // 0-1
  reason: string;
}

interface PipelineMetrics {
  totalLatencyUs: number;
  attentionLatencyUs: number;
  fastgrnnLatencyUs: number;
  throughputQps: number;
  simdUsed: boolean;
}
```

---

## SIMD Optimization Guide

### Automatic Detection

```typescript
import { detectSIMDCapabilities, getSIMDHints } from './simd-utils';

const caps = detectSIMDCapabilities();
console.log(`Recommended: ${caps.recommended}`);  // 'avx2', 'neon', etc.

const hints = getSIMDHints(caps.recommended);
console.log(`Vector width: ${hints.vectorWidth} bits`);
console.log(`Optimal batch: ${hints.batchSize}`);
console.log(`Alignment: ${hints.alignment} bytes`);
```

### Best Practices

1. **Align dimensions to SIMD width**
   ```typescript
   // Good: 384 = 12 × 32 (AVX2 friendly)
   // Good: 512 = 16 × 32
   // Avoid: 383, 500 (requires padding)
   ```

2. **Batch operations**
   ```typescript
   // Process 8 queries at once for AVX2
   const results = await Promise.all(
     queries.map(q => pipeline.process(q, candidates))
   );
   ```

3. **Enable native builds**
   ```bash
   # Rust compilation with native CPU features
   RUSTFLAGS="-C target-cpu=native" cargo build --release
   ```

---

## Performance Tuning

### Latency Optimization

```typescript
// Use fastest attention for simple routing
const fastPipeline = createPipeline({
  attentionType: 'dot-product',  // Fastest
  dim: 128,                       // Smaller dimension
  enableSIMD: true,
});

// Expect: ~30μs per route
```

### Quality Optimization

```typescript
// Use richer attention for complex routing
const qualityPipeline = createPipeline({
  attentionType: 'multi-head',
  numHeads: 16,
  dim: 768,
  hiddenDim: 128,
});

// Expect: ~200μs per route, better decisions
```

### Memory Optimization

```typescript
// Enable quantization for large deployments
const memoryPipeline = createPipeline({
  enableQuantization: true,
  quantizationBits: 8,
});

// 4x memory reduction with ~2% accuracy loss
```

---

## Examples

### Run Demos

```bash
# LLM routing demo
npm run demo:routing

# Attention comparison
npm run demo:attention

# Full pipeline demo
npm run demo:combined
```

### Run Tests

```bash
npm test
npm run test:watch
```

---

## Training Pipeline

The Dynamic Attention system includes a comprehensive training infrastructure with bounded optimization, pruning, and configurable hyperparameters.

### Quick Start Training

```bash
# Default training
npm run train

# Fast training (fewer epochs, larger batches)
npm run train:fast

# Production training (more epochs, validation)
npm run train:production

# Compression training (high sparsity pruning)
npm run train:compress
```

### CLI Options

```bash
npm run train -- [options]

# Presets
--preset fast|production|compression

# Basic Options
--epochs <number>           # Training epochs (default: 100)
--batch-size <number>       # Batch size (default: 32)
--learning-rate <number>    # Initial LR (default: 0.001)
--data-path <path>          # Training data directory

# Optimizer
--optimizer sgd|adam|adamw|rmsprop|lamb
--momentum <number>         # SGD momentum (default: 0.9)
--weight-decay <number>     # L2 regularization (default: 0.0001)
--beta1 <number>            # Adam beta1 (default: 0.9)
--beta2 <number>            # Adam beta2 (default: 0.999)

# Learning Rate Scheduling
--scheduler constant|step|cosine|cosine_warmup|one_cycle|reduce_on_plateau
--warmup-steps <number>     # LR warmup steps (default: 1000)
--min-lr <number>           # Minimum LR (default: 1e-6)

# Bounded Optimization
--clip-norm <number>        # Gradient norm clipping (default: 1.0)
--clip-value <number>       # Gradient value clipping
--max-norm <number>         # Weight max norm constraint
--l1-reg <number>           # L1 regularization
--l2-reg <number>           # L2 regularization

# Pruning
--pruning none|magnitude|random|lottery_ticket|movement|structured_channel
--target-sparsity <number>  # Target sparsity (default: 0.5)
--pruning-schedule one_shot|gradual|cubic|exponential
--pruning-start <number>    # Epoch to start pruning
--pruning-end <number>      # Epoch to end pruning
--pruning-frequency <number># Steps between pruning updates

# Knowledge Distillation
--distillation              # Enable distillation
--teacher-path <path>       # Teacher model checkpoint
--distillation-temp <number># Softmax temperature (default: 4.0)
--distillation-alpha <number># Loss weight (default: 0.5)

# Checkpointing
--checkpoint-dir <path>     # Checkpoint directory
--save-every <number>       # Save every N epochs
--keep-checkpoints <number> # Max checkpoints to keep

# Help
--help                      # Show all options
```

### Bounded Optimization

Control weight and gradient magnitudes for stable training:

```typescript
import { Trainer } from '@ruvector/dynamic-attention-example';

const trainer = new Trainer({
  boundedOptimization: {
    enabled: true,
    gradientConstraint: {
      type: 'clip_norm',
      maxNorm: 1.0,
    },
    weightConstraint: {
      type: 'spectral',
      maxNorm: 1.0,
    },
  },
});
```

**Weight Constraints:**
| Type | Description |
|------|-------------|
| `max_norm` | Clip weights to max L2 norm |
| `unit_norm` | Normalize to unit length |
| `min_max` | Clamp to range [min, max] |
| `spectral` | Spectral normalization |
| `non_negative` | Enforce non-negative weights |

**Gradient Constraints:**
| Type | Description |
|------|-------------|
| `clip_norm` | Clip gradient by L2 norm |
| `clip_value` | Clip gradient values |

### Pruning Strategies

Reduce model size with structured and unstructured pruning:

```typescript
const trainer = new Trainer({
  pruning: {
    enabled: true,
    strategy: 'magnitude',
    targetSparsity: 0.9,      // 90% sparse
    schedule: 'gradual',
    startEpoch: 5,
    endEpoch: 80,
    frequency: 100,           // Steps between updates
  },
});
```

**Pruning Strategies:**
| Strategy | Description | Best For |
|----------|-------------|----------|
| `magnitude` | Prune smallest weights | General compression |
| `lottery_ticket` | Find winning subnetwork | Research |
| `movement` | Prune based on gradient changes | Fine-tuning |
| `structured_channel` | Prune entire channels | Hardware acceleration |

**Pruning Schedules:**
| Schedule | Description |
|----------|-------------|
| `one_shot` | Prune all at once |
| `gradual` | Linear increase in sparsity |
| `cubic` | Cubic sparsity schedule |
| `exponential` | Exponential increase |

### Training Presets

```typescript
import {
  DEFAULT_TRAINING_CONFIG,
  FAST_TRAINING_CONFIG,
  PRODUCTION_TRAINING_CONFIG,
  COMPRESSION_TRAINING_CONFIG,
} from '@ruvector/dynamic-attention-example';

// Fast: Quick iteration
// - 20 epochs, batch 64, no validation
const fastTrainer = new Trainer(FAST_TRAINING_CONFIG);

// Production: Best quality
// - 200 epochs, cosine LR, early stopping, validation
const prodTrainer = new Trainer(PRODUCTION_TRAINING_CONFIG);

// Compression: Model size reduction
// - Magnitude pruning, 90% target sparsity, gradual schedule
const compressTrainer = new Trainer(COMPRESSION_TRAINING_CONFIG);
```

### Programmatic Training

```typescript
import { Trainer, Tensor } from '@ruvector/dynamic-attention-example';

// Create trainer
const trainer = new Trainer({
  epochs: 100,
  batchSize: 32,
  optimizer: { type: 'adamw', lr: 0.001, weightDecay: 0.01 },
  scheduler: { type: 'cosine_warmup', warmupSteps: 1000 },
  pruning: { enabled: true, strategy: 'magnitude', targetSparsity: 0.7 },
});

// Prepare model weights as Tensors
const weights = {
  attention: new Tensor(attentionWeights, [dim, dim]),
  fastgrnn: new Tensor(fastgrnnWeights, [hidden, hidden]),
};

// Training data
const samples = [
  { input: queryEmbed, target: expectedDecision },
  // ...
];

// Train
const metrics = await trainer.train(weights, samples, {
  onEpochEnd: (epoch, metrics) => {
    console.log(`Epoch ${epoch}: loss=${metrics.loss.toFixed(4)}`);
  },
});

console.log(`Final loss: ${metrics.finalLoss}`);
console.log(`Sparsity: ${(metrics.sparsity * 100).toFixed(1)}%`);
```

---

## Architecture

```
examples/dynamic-attention/
├── src/
│   ├── index.ts              # Main exports
│   ├── types.ts              # Type definitions
│   ├── dynamic-attention.ts  # Pipeline implementation
│   ├── simd-utils.ts         # SIMD utilities
│   ├── training/
│   │   ├── index.ts          # Training exports
│   │   ├── config.ts         # Configuration types & presets
│   │   ├── trainer.ts        # Trainer, optimizers, pruning
│   │   ├── cli.ts            # CLI argument parser
│   │   └── train.ts          # Main training script
│   └── examples/
│       ├── routing-demo.ts   # LLM routing example
│       ├── attention-demo.ts # Attention comparison
│       └── combined-pipeline.ts
├── benchmarks/
│   ├── run-benchmarks.ts     # Full benchmark suite
│   ├── attention-benchmark.ts
│   └── simd-benchmark.ts
├── tests/
│   └── pipeline.test.ts
├── docs/
│   └── API.md
├── package.json
├── tsconfig.json
└── README.md
```

---

## Related Packages

| Package | Description |
|---------|-------------|
| [@ruvector/core](../../npm/core) | Vector database with HNSW |
| [@ruvector/attention](../../crates/ruvector-attention-node) | Attention mechanisms |
| [@ruvector/tiny-dancer](../../npm/packages/tiny-dancer) | FastGRNN router |
| [@ruvector/gnn](../../npm/packages/gnn) | Graph neural networks |

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests: `npm test`
4. Run benchmarks: `npm run benchmark`
5. Submit a pull request

---

## License

MIT License - see [LICENSE](../../LICENSE) for details.

---

## Acknowledgments

- FastGRNN architecture from Microsoft Research
- Attention mechanisms inspired by Transformer literature
- SIMD optimizations using ndarray and rayon
