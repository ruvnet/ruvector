# Performance Benchmark Suite - Index

## 📂 Directory Structure

```
benchmarks/
├── INDEX.md                    # This file
├── BENCHMARK_SUMMARY.md        # Quick reference guide
├── BENCHMARK_GUIDE.md          # Detailed usage instructions
├── BOTTLENECK_ANALYSIS.md      # Bottleneck patterns & solutions
├── performance-test.mjs        # Main benchmark suite (executable)
├── run-benchmarks.sh           # Automated runner with hooks
├── compare-results.mjs         # Result comparison tool
├── .gitignore                  # Git ignore rules
└── results/                    # Benchmark results (timestamped)
    ├── .gitkeep
    └── benchmark-*.json        # Individual run results
```

## 🚀 Quick Start

```bash
# 1. Set API key
export GEMINI_API_KEY=your_key_here

# 2. Build package
cd /workspaces/ruvector/packages/agentic-synth
npm run build

# 3. Run benchmarks
cd /workspaces/ruvector
bash benchmarks/run-benchmarks.sh
```

## 📖 Documentation Files

### BENCHMARK_SUMMARY.md
**Purpose:** Quick reference and overview  
**Contains:**
- What gets benchmarked
- How to run tests
- Interpreting results
- Performance goals

### BENCHMARK_GUIDE.md
**Purpose:** Detailed usage instructions  
**Contains:**
- Prerequisites
- Benchmark test descriptions
- Results storage
- CI/CD integration
- Historical tracking

### BOTTLENECK_ANALYSIS.md
**Purpose:** Troubleshooting and optimization  
**Contains:**
- Common bottleneck patterns
- Detection methods
- Root cause analysis
- Solutions and improvements
- Priority matrix

## 🛠️ Executable Scripts

### performance-test.mjs
**Main benchmark suite**

```bash
# Direct execution
node benchmarks/performance-test.mjs

# With GC exposed (better memory metrics)
node --expose-gc benchmarks/performance-test.mjs

# With increased heap
node --max-old-space-size=4096 benchmarks/performance-test.mjs
```

**Features:**
- 7 comprehensive benchmarks
- Memory tracking with sampling
- Automatic bottleneck detection
- JSON result output
- Performance scoring

### run-benchmarks.sh
**Automated runner with hooks integration**

```bash
bash benchmarks/run-benchmarks.sh
```

**Features:**
- Auto-builds package
- Runs with --expose-gc
- Stores in hooks memory
- Displays summary
- Error handling

### compare-results.mjs
**Result comparison tool**

```bash
# Compare two most recent
node benchmarks/compare-results.mjs

# Compare specific files
node benchmarks/compare-results.mjs \
  results/benchmark-old.json \
  results/benchmark-new.json
```

**Features:**
- Side-by-side comparison
- Color-coded changes
- Improvement/regression detection
- Overall summary score

## 📊 Benchmark Categories

1. **Startup Time** 📦
   - CJS require() time
   - ESM import() time

2. **Bundle Size** 📊
   - Individual file sizes
   - Total bundle size

3. **Generation Speed** ⚡
   - Simple schemas (1, 10, 100, 1000 records)
   - Complex schemas (1, 10, 100 records)
   - Different data types

4. **Concurrency** 🔄
   - Parallel requests (1, 3, 5, 10)
   - Throughput measurement
   - Efficiency calculation

5. **Caching** 💾
   - Cold cache performance
   - Warm cache performance
   - Improvement percentage

6. **Model Comparison** 🔬
   - Gemini 2.0 Flash
   - Gemini Experimental

7. **Data Types** 📋
   - Structured JSON
   - Time-series
   - Events
   - Complexity comparison

## 📈 Results Format

### Location
`benchmarks/results/benchmark-{ISO-timestamp}.json`

### Structure
```json
{
  "timestamp": "2025-11-22T20:15:00.000Z",
  "environment": {
    "node": "v18.x.x",
    "platform": "linux",
    "arch": "x64",
    "cpus": 8,
    "memory": "16.00 GB"
  },
  "benchmarks": {
    "startup": {...},
    "bundleSize": {...},
    "generationSpeed": {
      "simple": {...},
      "complex": {...}
    },
    "concurrency": {...},
    "caching": {...},
    "modelComparison": {...},
    "dataTypes": {...}
  }
}
```

## 🎯 Performance Targets

| Metric | Target | Excellent |
|--------|--------|-----------|
| Simple 100 rec/sec | >100 | >500 |
| Memory (100 rec) | <50MB | <25MB |
| Concurrency eff. | >70% | >85% |
| Cache improvement | >50% | >80% |
| Startup time | <100ms | <50ms |
| Bundle size | <100KB | <50KB |
| Overall score | >70 | >85 |

## 🔍 Bottleneck Severity

| Severity | Issues | Score Impact |
|----------|--------|--------------|
| High | Memory leaks, poor scaling | -15 pts |
| Medium | Concurrency, caching | -10 pts |
| Low | Startup, bundle size | -5 pts |

## 📦 Package Integration

Add to `packages/agentic-synth/package.json`:

```json
{
  "scripts": {
    "benchmark": "node ../../benchmarks/performance-test.mjs",
    "benchmark:run": "bash ../../benchmarks/run-benchmarks.sh",
    "benchmark:compare": "node ../../benchmarks/compare-results.mjs"
  }
}
```

## 💾 Hooks Integration

Results automatically stored in Claude Flow hooks:

**Keys:**
- `performance-benchmarks/latest` - Full results
- `performance-benchmarks/last-run-timestamp` - Run time
- `performance-benchmarks/environment` - System info
- `performance-benchmarks/last-success` - Success timestamp

**Namespace:** `benchmarks`

## 🔄 Workflow

1. **Build** → `npm run build`
2. **Benchmark** → `bash run-benchmarks.sh`
3. **Review** → Check console output
4. **Analyze** → Review JSON results
5. **Compare** → `node compare-results.mjs`
6. **Optimize** → Based on bottlenecks
7. **Re-test** → Verify improvements

## 🆘 Getting Help

1. Check **BENCHMARK_SUMMARY.md** for overview
2. Read **BENCHMARK_GUIDE.md** for details
3. Review **BOTTLENECK_ANALYSIS.md** for fixes
4. Check result JSON files
5. Open issue with benchmark data

## 📚 Additional Resources

- [Node.js Performance Guide](https://nodejs.org/en/docs/guides/)
- [V8 Optimization Tips](https://v8.dev/blog/performance-tips)
- [Memory Profiling](https://nodejs.org/en/docs/guides/simple-profiling/)

---

**Version:** 1.0.0  
**Last Updated:** 2025-11-22  
**Maintainer:** Performance Analysis Team
