# 🚀 Agentic-Synth Performance Benchmark Suite

> Comprehensive performance testing for synthetic data generation

[![Performance](https://img.shields.io/badge/performance-benchmarked-green.svg)](benchmarks/)
[![Memory Safe](https://img.shields.io/badge/memory-monitored-blue.svg)](benchmarks/)
[![Hooks Integration](https://img.shields.io/badge/hooks-integrated-purple.svg)](benchmarks/)

## Quick Start

```bash
# 1. Set API key
export GEMINI_API_KEY=your_key_here

# 2. Run benchmarks
cd /workspaces/ruvector
bash benchmarks/run-benchmarks.sh
```

## What Gets Benchmarked

| Category | Metrics | Target |
|----------|---------|--------|
| ⚡ **Generation Speed** | records/sec, ms/record | >100 rec/sec |
| 💾 **Memory Usage** | heap delta, peak memory | <50MB for 100 |
| 🔄 **Concurrency** | parallel efficiency | >70% |
| 💎 **Caching** | hit rate, improvement | >50% faster |
| 📦 **Bundle Size** | total KB | <100KB |
| 🚀 **Startup Time** | import/require ms | <100ms |
| 💰 **API Efficiency** | tokens/record | Optimized |

## Features

✅ **7 Comprehensive Benchmarks**
- Generation speed (1, 10, 100, 1000 records)
- Memory profiling with heap sampling
- Concurrency testing (1-10 parallel)
- Cache effectiveness analysis
- Bundle size tracking
- Startup performance
- Token efficiency

✅ **Automatic Bottleneck Detection**
- Memory leaks (>100MB delta)
- Poor scaling (<50% efficiency)
- Concurrency issues (<70%)
- Cache problems (<50% improvement)
- Severity classification (High/Medium/Low)

✅ **Smart Analysis**
- Performance scoring (0-100)
- Root cause identification
- Optimization suggestions
- Expected improvements

✅ **Hooks Integration**
- Results stored in Claude Flow memory
- Historical comparison
- Session persistence

## Documentation

📖 **[INDEX.md](INDEX.md)** - Start here for overview
📊 **[BENCHMARK_SUMMARY.md](BENCHMARK_SUMMARY.md)** - Quick reference
📚 **[BENCHMARK_GUIDE.md](BENCHMARK_GUIDE.md)** - Detailed guide
🔍 **[BOTTLENECK_ANALYSIS.md](BOTTLENECK_ANALYSIS.md)** - Troubleshooting
📋 **[IMPLEMENTATION_REPORT.md](IMPLEMENTATION_REPORT.md)** - Technical details

## Scripts

### performance-test.mjs
Main benchmark suite (915 lines)
```bash
node benchmarks/performance-test.mjs
```

### run-benchmarks.sh
Automated runner (140 lines)
```bash
bash benchmarks/run-benchmarks.sh
```

### compare-results.mjs
Result comparison (292 lines)
```bash
node benchmarks/compare-results.mjs
```

## Example Output

```
🚀 Starting Comprehensive Performance Benchmarking Suite
========================================

📦 Benchmark 1: Startup Time
════════════════════════════════════════
✓ CJS require: 45.23ms
✓ ESM import: 52.34ms

📊 Benchmark 2: Bundle Size
════════════════════════════════════════
✓ index.js: 38.27 KB
✓ index.cjs: 40.68 KB
✓ Total bundle size: 78.95 KB

⚡ Benchmark 3: Generation Speed - Simple Schema
════════════════════════════════════════
Generating 100 records...
✓ Duration: 1234.56ms
✓ Records/sec: 81.00
✓ Avg time/record: 12.35ms
✓ Heap used: 45.23 MB (Δ 12.34 MB)
✓ Est. tokens: 2500 (~25/record)

🔍 Bottleneck Analysis
════════════════════════════════════════
✅ No significant bottlenecks identified!

🎯 Overall Performance Score: 85/100
```

## Results Storage

**Local:** `benchmarks/results/benchmark-{timestamp}.json`

**Hooks Memory:**
- `performance-benchmarks/latest` - Full results
- `performance-benchmarks/last-run-timestamp` - Run time
- `performance-benchmarks/environment` - System info

## Package Integration

```bash
cd packages/agentic-synth

# Quick benchmark
npm run benchmark

# Full suite with hooks
npm run benchmark:run

# Compare results
npm run benchmark:compare
```

## Performance Targets

| Metric | Good | Excellent |
|--------|------|-----------|
| Generation (100 simple) | >100/s | >500/s |
| Memory (100 records) | <50MB | <25MB |
| Concurrency efficiency | >70% | >85% |
| Cache improvement | >50% | >80% |
| Startup time | <100ms | <50ms |
| Bundle size | <100KB | <50KB |
| Overall score | >70 | >85 |

## Bottleneck Severity

| Level | Impact | Examples |
|-------|--------|----------|
| 🔴 **High** | -15 pts | Memory leaks, poor scaling |
| 🟡 **Medium** | -10 pts | Concurrency, caching issues |
| 🟢 **Low** | -5 pts | Startup time, bundle size |

## CI/CD Integration

```yaml
# .github/workflows/benchmark.yml
- name: Performance Benchmarks
  run: bash benchmarks/run-benchmarks.sh
  env:
    GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
```

## Troubleshooting

**No results generated?**
- Check GEMINI_API_KEY is set
- Ensure package is built: `npm run build`
- Review error output

**Out of memory?**
- Use: `node --max-old-space-size=4096`
- Reduce test counts in script

**Hooks unavailable?**
- Normal if not configured
- Results still saved locally

## Contributing

When adding benchmarks:
1. Follow existing patterns
2. Include memory tracking
3. Add bottleneck detection
4. Update documentation
5. Test with various data types

## License

MIT - See main package LICENSE

---

**Version:** 1.0.0
**Last Updated:** 2025-11-22
**Status:** ✅ Production Ready
