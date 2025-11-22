# Agentic-Synth Performance Benchmark Suite - Summary

## 🎯 Quick Reference

**Location:** `/workspaces/ruvector/benchmarks/`

**Main Scripts:**
- `performance-test.mjs` - Complete benchmark suite
- `run-benchmarks.sh` - Automated runner with hooks integration
- `compare-results.mjs` - Historical comparison tool

**Package Commands:**
```bash
cd packages/agentic-synth
npm run benchmark         # Quick benchmark
npm run benchmark:run     # Full suite with hooks
npm run benchmark:compare # Compare results
```

## 📊 What Gets Benchmarked

### 1. **Generation Speed** ⚡
Tests data generation performance across different scales:
- **Small**: 1, 10 records
- **Medium**: 100 records
- **Large**: 1000 records (simple schemas only)
- **Metrics**: records/sec, ms/record, scaling efficiency

**Schemas Tested:**
- Simple (3 fields)
- Complex (nested objects, arrays)
- Time-series data
- Event streams

### 2. **Memory Usage** 💾
Monitors heap allocation during generation:
- Baseline heap capture
- Sampling during execution (100ms intervals)
- Heap delta calculation
- Peak memory tracking

**Thresholds:**
- ✅ Good: <50MB delta for 100 records
- ⚠️ Warning: 50-100MB delta
- ❌ Critical: >100MB delta

### 3. **Concurrency** 🔄
Tests parallel request handling:
- Concurrency levels: 1, 3, 5, 10
- Total throughput measurement
- Efficiency calculation vs linear speedup

**Target Efficiency:** >70% of linear speedup

### 4. **Caching Effectiveness** 💎
Evaluates context caching improvements:
- First request (cold cache)
- Second request (warm cache)
- Improvement percentage calculation

**Target:** >50% improvement with cache

### 5. **Bundle Size** 📦
Analyzes distribution files:
- ESM (index.js)
- CommonJS (index.cjs)
- Total bundle size
- Per-file breakdown

**Target:** <100KB total

### 6. **Startup Time** 🚀
Measures module initialization:
- ESM import() time
- CJS require() time

**Target:** <100ms for fast startup

### 7. **API Efficiency** 💰
Estimates token usage:
- Tokens per record
- Total tokens for batch
- Cost estimation

**Calculated from:** JSON size / 4 (approximate)

## 🏃 Running Benchmarks

### Quick Start
```bash
# Ensure API key is set
export GEMINI_API_KEY=your_key_here

# Build package first
cd /workspaces/ruvector/packages/agentic-synth
npm run build

# Run benchmarks
cd /workspaces/ruvector
bash benchmarks/run-benchmarks.sh
```

### Advanced Options
```bash
# With garbage collection exposed (better memory metrics)
node --expose-gc benchmarks/performance-test.mjs

# With increased heap size
node --max-old-space-size=4096 benchmarks/performance-test.mjs

# Direct execution
node benchmarks/performance-test.mjs
```

## 📁 Results Storage

### Local Files
Results saved to: `benchmarks/results/benchmark-{timestamp}.json`

**Format:**
```json
{
  "timestamp": "2025-11-22T20:15:00.000Z",
  "environment": {...},
  "benchmarks": {
    "startup": {...},
    "bundleSize": {...},
    "generationSpeed": {...},
    "concurrency": {...},
    "caching": {...},
    "modelComparison": {...},
    "dataTypes": {...}
  }
}
```

### Hooks Memory System
Stored in Claude Flow hooks with keys:
- `performance-benchmarks/latest` - Latest full results
- `performance-benchmarks/last-run-timestamp` - When last run
- `performance-benchmarks/environment` - System info

**Access:**
```bash
# List stored benchmarks
npx claude-flow@alpha hooks session-end --export-metrics true

# View latest (when hooks support memory retrieval)
# Check .swarm/memory.db for persistence
```

## 🔍 Bottleneck Detection

The suite automatically identifies:

### High Severity (P0)
- Memory leaks (>100MB delta)
- Poor scaling (<50% efficiency at scale)
- Score impact: -15 points

### Medium Severity (P1)
- Concurrency issues (<70% efficiency)
- Weak caching (<50% improvement)
- Score impact: -10 points

### Low Severity (P2)
- Slow startup (>100ms)
- Large bundles (>100KB)
- Score impact: -5 points

### Performance Score
**0-100 scale:**
- 80-100: ✅ Excellent
- 60-80: ⚠️ Good
- <60: ❌ Needs optimization

## 📈 Interpreting Results

### Generation Speed
```
Simple Schema (10 records):
✓ Duration: 1234.56ms
✓ Records/sec: 8.10
✓ Avg time/record: 123.46ms
✓ Heap used: 45.23 MB (Δ 12.34 MB)
✓ Est. tokens: 500 (~50/record)
```

**Analysis:**
- Good: >100 rec/sec for simple schemas
- Excellent: >500 rec/sec
- Scaling: Should maintain >50% at 100x

### Memory Usage
```
Heap used: 45.23 MB (Δ 12.34 MB)
```

**Analysis:**
- ✅ Δ <50MB: Good memory management
- ⚠️ Δ 50-100MB: Monitor closely
- ❌ Δ >100MB: Memory leak likely

### Concurrency
```
Concurrency 10:
✓ Duration: 2345.67ms
✓ Total records: 100
✓ Records/sec: 42.64
✓ Avg request time: 234.57ms
```

**Analysis:**
- Calculate efficiency: (actual speedup / expected speedup) × 100
- Target: >70% efficiency
- <50%: Significant bottleneck

### Caching
```
WITH cache:
✓ First request: 1000.00ms
✓ Second request: 150.00ms
✓ Cache improvement: 85.0%
```

**Analysis:**
- >70%: Highly effective
- 30-70%: Moderate benefit
- <30%: Investigate cache keys

## 🔧 Common Optimizations

Based on bottleneck findings:

| Issue | Fix | Impact |
|-------|-----|--------|
| Slow scaling | Batch processing, pagination | 2-3x for large batches |
| Memory leak | Streaming, cleanup | 50-70% reduction |
| Poor concurrency | Reduce contention, workers | Up to 90% efficiency |
| Weak cache | Better keys, pre-warming | 70-90% effectiveness |
| Slow startup | Lazy loading, dynamic imports | 30-50% faster |
| Large bundle | Tree shaking, code splitting | 20-40% smaller |

## 📊 Comparing Results

### Manual Comparison
```bash
# Compare two most recent runs
node benchmarks/compare-results.mjs

# Compare specific files
node benchmarks/compare-results.mjs \
  benchmarks/results/benchmark-2024-01-01.json \
  benchmarks/results/benchmark-2024-01-02.json
```

**Output:**
- Color-coded changes (green=improvement, red=regression)
- Percentage changes
- Overall summary score

### Historical Tracking
```bash
# List all results
ls -lht benchmarks/results/

# View specific result
cat benchmarks/results/benchmark-latest.json | jq .

# Extract specific metric
cat benchmarks/results/benchmark-latest.json | \
  jq '.benchmarks.generationSpeed.simple["100"].recordsPerSecond'
```

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: Performance Benchmarks

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Dependencies
        run: |
          cd packages/agentic-synth
          npm ci

      - name: Build Package
        run: |
          cd packages/agentic-synth
          npm run build

      - name: Run Benchmarks
        run: bash benchmarks/run-benchmarks.sh
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path: benchmarks/results/
```

## 📚 Additional Resources

- **BENCHMARK_GUIDE.md** - Detailed usage instructions
- **BOTTLENECK_ANALYSIS.md** - In-depth bottleneck patterns
- **performance-test.mjs** - Source code with inline documentation

## 🆘 Troubleshooting

### "No benchmark results generated"
- Check GEMINI_API_KEY is set
- Ensure package is built (`npm run build`)
- Check for errors in output

### "Module not found"
- Run from `/workspaces/ruvector` directory
- Build package first: `cd packages/agentic-synth && npm run build`

### "Hooks storage unavailable"
- Normal if hooks not configured
- Results still saved to `benchmarks/results/`

### "Out of memory"
- Increase heap: `node --max-old-space-size=4096`
- Reduce test counts in script

## 🎯 Performance Goals

**Target Metrics for agentic-synth:**

| Metric | Target | Excellent |
|--------|--------|-----------|
| Generation (simple, 100 rec) | >100/sec | >500/sec |
| Memory (100 records) | <50MB Δ | <25MB Δ |
| Concurrency efficiency | >70% | >85% |
| Cache improvement | >50% | >80% |
| Startup time | <100ms | <50ms |
| Bundle size | <100KB | <50KB |
| Overall score | >70 | >85 |

## 🏆 Success Criteria

- ✅ All benchmarks complete without errors
- ✅ Performance score >70
- ✅ No high-severity bottlenecks
- ✅ Results stored successfully
- ✅ Memory usage within limits
- ✅ Scaling maintains >50% efficiency

---

**Last Updated:** 2025-11-22
**Version:** 1.0.0
**Maintainer:** Performance Analysis Team
