#!/bin/bash

# Run Comprehensive Performance Benchmarks for agentic-synth
# Stores results in Claude Flow hooks memory system

set -e

echo "🚀 Starting Performance Benchmark Suite"
echo "========================================"
echo ""

# Check for API key
if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️  Warning: GEMINI_API_KEY not set"
    echo "Some benchmarks may fail without API access"
    echo ""
fi

# Ensure package is built
echo "📦 Building agentic-synth package..."
cd packages/agentic-synth
npm run build > /dev/null 2>&1
cd ../..
echo "✅ Build complete"
echo ""

# Store pre-benchmark info in hooks
echo "💾 Storing pre-benchmark metadata in hooks..."
npx claude-flow@alpha hooks memory store \
  --key "performance-benchmarks/last-run-timestamp" \
  --value "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --namespace "benchmarks" \
  2>/dev/null || echo "⚠️  Hooks storage unavailable"

npx claude-flow@alpha hooks memory store \
  --key "performance-benchmarks/environment" \
  --value "{\"node\":\"$NODE_VERSION\",\"platform\":\"$(uname -s)\",\"arch\":\"$(uname -m)\"}" \
  --namespace "benchmarks" \
  2>/dev/null || true

echo ""

# Run benchmarks
echo "🔬 Running benchmark suite..."
echo "This may take several minutes..."
echo ""

# Run with GC exposed for accurate memory metrics
if command -v node &> /dev/null; then
    node --expose-gc benchmarks/performance-test.mjs
else
    echo "❌ Node.js not found"
    exit 1
fi

# Check if results were generated
LATEST_RESULT=$(ls -t benchmarks/results/benchmark-*.json 2>/dev/null | head -1)

if [ -n "$LATEST_RESULT" ]; then
    echo ""
    echo "✅ Benchmark complete!"
    echo "📊 Results saved to: $LATEST_RESULT"
    echo ""

    # Display summary
    echo "📈 Quick Summary:"
    echo "================"

    # Extract key metrics using node
    node -e "
      const fs = require('fs');
      const results = JSON.parse(fs.readFileSync('$LATEST_RESULT', 'utf8'));

      console.log('Startup Time:');
      if (results.benchmarks.startup) {
        console.log('  - ESM Import:', results.benchmarks.startup.import + 'ms');
        console.log('  - CJS Require:', results.benchmarks.startup.require + 'ms');
      }

      console.log('\nBundle Size:');
      if (results.benchmarks.bundleSize?.total) {
        console.log('  - Total:', results.benchmarks.bundleSize.total.kb + ' KB');
      }

      console.log('\nGeneration Speed (Simple Schema):');
      if (results.benchmarks.generationSpeed?.simple) {
        const simple = results.benchmarks.generationSpeed.simple;
        Object.keys(simple).forEach(count => {
          const r = simple[count];
          if (r.success) {
            console.log('  - ' + count + ' records:', r.recordsPerSecond + ' rec/sec');
          }
        });
      }

      console.log('\nConcurrency:');
      if (results.benchmarks.concurrency) {
        Object.keys(results.benchmarks.concurrency).forEach(level => {
          const c = results.benchmarks.concurrency[level];
          if (c.success) {
            console.log('  - Level ' + level + ':', c.recordsPerSecond + ' rec/sec');
          }
        });
      }
    " 2>/dev/null || echo "Summary generation skipped"

    echo ""
    echo "📋 View full results:"
    echo "cat $LATEST_RESULT | jq ."
    echo ""

    # Store results in hooks
    echo "💾 Storing results in hooks memory..."
    RESULT_CONTENT=$(cat "$LATEST_RESULT" | tr -d '\n' | tr -d '\r')
    npx claude-flow@alpha hooks memory store \
      --key "performance-benchmarks/latest" \
      --value "$RESULT_CONTENT" \
      --namespace "benchmarks" \
      2>/dev/null && echo "✅ Results stored in hooks" || echo "⚠️  Hooks storage unavailable"

    # Store benchmark timestamp
    npx claude-flow@alpha hooks memory store \
      --key "performance-benchmarks/last-success" \
      --value "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      --namespace "benchmarks" \
      2>/dev/null || true

else
    echo "❌ No benchmark results generated"
    exit 1
fi

echo ""
echo "🎯 Benchmark suite complete!"
echo ""
echo "Next steps:"
echo "  - Review bottleneck analysis in output above"
echo "  - Check stored results: npx claude-flow@alpha hooks memory list --namespace benchmarks"
echo "  - Compare with historical data in benchmarks/results/"
echo ""
