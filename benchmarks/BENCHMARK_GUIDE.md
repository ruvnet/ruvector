# Performance Benchmarking Suite

Comprehensive performance testing for `@ruvector/agentic-synth` package.

## Overview

This benchmark suite measures:

1. **Generation Speed**: Time to generate varying record counts (1, 10, 100, 1000)
2. **Memory Usage**: Heap monitoring during generation
3. **Concurrency**: Parallel generation request handling
4. **Caching**: Context caching effectiveness
5. **Bundle Size**: Distribution file sizes
6. **Startup Time**: Module load/import times
7. **API Efficiency**: Estimated tokens per record

## Running Benchmarks

### Quick Start

```bash
# Run full benchmark suite
cd /workspaces/ruvector
node benchmarks/performance-test.mjs
```

### Prerequisites

```bash
# Ensure package is built
cd packages/agentic-synth
npm run build

# Set API key
export GEMINI_API_KEY=your_key_here
```

### Advanced Usage

```bash
# Run with garbage collection exposed (more accurate memory metrics)
node --expose-gc benchmarks/performance-test.mjs

# Run with increased heap size for large tests
node --max-old-space-size=4096 benchmarks/performance-test.mjs
```

## Benchmark Tests

### 1. Startup Time
Measures module initialization performance:
- CJS require() time
- ESM import() time
- Threshold: <100ms for fast startup

### 2. Bundle Size
Analyzes distribution files:
- index.js (ESM)
- index.cjs (CommonJS)
- Total bundle size
- Target: <100KB total

### 3. Generation Speed
Tests data generation performance:
- Simple schemas (3 fields)
- Complex schemas (nested objects, arrays)
- Counts: 1, 10, 100, 1000 records
- Metrics: records/sec, ms/record

### 4. Concurrency
Evaluates parallel request handling:
- Concurrency levels: 1, 3, 5, 10
- Total throughput
- Request latency
- Scalability efficiency

### 5. Caching
Measures cache effectiveness:
- First request (cold cache)
- Second request (warm cache)
- Improvement percentage
- Target: >50% improvement

### 6. Model Comparison
Compares different AI models:
- Gemini 2.0 Flash
- Gemini Experimental
- Speed differences
- Quality considerations

### 7. Data Type Comparison
Tests different data types:
- Structured JSON
- Time-series data
- Event streams
- Complexity scaling

## Results Storage

Results are automatically:
- Saved to `benchmarks/results/benchmark-{timestamp}.json`
- Stored in Claude Flow hooks memory system
- Available for historical comparison

## Bottleneck Analysis

The suite automatically identifies:
- Performance bottlenecks
- Optimization opportunities
- Expected improvements
- Severity ratings

### Performance Score

Overall score (0-100) based on:
- High severity issues: -15 points
- Medium severity: -10 points
- Low severity: -5 points

Scores:
- 80-100: Excellent
- 60-80: Good
- <60: Needs optimization

## Interpreting Results

### Generation Speed
- **Good**: >100 records/sec for simple schemas
- **Excellent**: >500 records/sec for simple schemas
- **Scaling**: Should maintain >50% efficiency at 100x scale

### Memory Usage
- **Good**: <50MB heap delta for 100 records
- **Concerning**: >100MB heap delta
- **Critical**: >500MB heap delta

### Concurrency
- **Efficient**: >70% of linear speedup
- **Suboptimal**: 50-70% efficiency
- **Bottlenecked**: <50% efficiency

### Caching
- **Effective**: >70% improvement
- **Moderate**: 30-70% improvement
- **Ineffective**: <30% improvement

## Common Optimizations

Based on bottleneck analysis, common fixes:

1. **Slow Startup**: Lazy load dependencies
2. **Large Bundles**: Tree shaking, code splitting
3. **Memory Issues**: Streaming, pagination
4. **Poor Concurrency**: Reduce lock contention
5. **Weak Caching**: Better cache keys, pre-warming

## CI/CD Integration

Add to your workflow:

```yaml
- name: Performance Benchmarks
  run: |
    npm run build
    node benchmarks/performance-test.mjs
  env:
    GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
```

## Historical Tracking

Compare results over time:

```bash
# List all benchmark results
ls -lh benchmarks/results/

# Compare two runs
diff benchmarks/results/benchmark-2024-01-01.json \
     benchmarks/results/benchmark-2024-01-02.json
```

## License

MIT - See main package LICENSE
