#!/usr/bin/env node
/**
 * Comprehensive Performance Benchmarking Suite for agentic-synth
 *
 * Benchmarks:
 * 1. Generation Speed (10, 100, 1000 records)
 * 2. Memory Usage (heap monitoring)
 * 3. Concurrency (parallel requests)
 * 4. Caching Effectiveness
 * 5. Bundle Size
 * 6. Startup Time
 * 7. API Efficiency (tokens/record)
 *
 * Models: Gemini 2.5 Flash vs Pro
 * Data Types: Simple vs Complex schemas
 * Counts: 1, 10, 100, 1000
 */

import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color output utilities
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'bright');
  console.log('='.repeat(80));
}

// Benchmark results storage
const results = {
  timestamp: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cpus: require('os').cpus().length,
    memory: (require('os').totalmem() / 1024 / 1024 / 1024).toFixed(2) + ' GB'
  },
  benchmarks: {}
};

// Test schemas
const schemas = {
  simple: {
    name: 'Simple User Schema',
    schema: {
      name: 'string',
      age: 'number',
      email: 'string'
    },
    complexity: 'low'
  },
  complex: {
    name: 'Complex E-commerce Schema',
    schema: {
      id: 'uuid',
      user: {
        name: 'string',
        email: 'string',
        address: {
          street: 'string',
          city: 'string',
          country: 'string',
          postal_code: 'string'
        }
      },
      order: {
        items: 'array',
        total: 'number',
        currency: 'string',
        status: ['pending', 'processing', 'shipped', 'delivered'],
        timestamps: {
          created: 'timestamp',
          updated: 'timestamp'
        }
      },
      metadata: {
        source: 'string',
        tags: 'array'
      }
    },
    complexity: 'high'
  },
  timeseries: {
    name: 'Time Series Data',
    type: 'timeseries',
    interval: 3600,
    complexity: 'medium'
  },
  events: {
    name: 'Event Stream',
    type: 'events',
    complexity: 'medium'
  }
};

// Memory tracking utilities
class MemoryTracker {
  constructor() {
    this.baseline = null;
    this.samples = [];
  }

  captureBaseline() {
    if (global.gc) global.gc();
    this.baseline = process.memoryUsage();
  }

  sample() {
    const current = process.memoryUsage();
    this.samples.push({
      timestamp: Date.now(),
      heapUsed: current.heapUsed,
      heapTotal: current.heapTotal,
      external: current.external,
      rss: current.rss
    });
  }

  getStats() {
    if (this.samples.length === 0) return null;

    const heapUsed = this.samples.map(s => s.heapUsed);
    const heapTotal = this.samples.map(s => s.heapTotal);
    const rss = this.samples.map(s => s.rss);

    return {
      baseline: this.baseline,
      samples: this.samples.length,
      heapUsed: {
        min: Math.min(...heapUsed),
        max: Math.max(...heapUsed),
        avg: heapUsed.reduce((a, b) => a + b, 0) / heapUsed.length,
        delta: this.baseline ? Math.max(...heapUsed) - this.baseline.heapUsed : 0
      },
      heapTotal: {
        min: Math.min(...heapTotal),
        max: Math.max(...heapTotal),
        avg: heapTotal.reduce((a, b) => a + b, 0) / heapTotal.length
      },
      rss: {
        min: Math.min(...rss),
        max: Math.max(...rss),
        avg: rss.reduce((a, b) => a + b, 0) / rss.length
      }
    };
  }

  reset() {
    this.samples = [];
  }
}

// Performance timer
class Timer {
  constructor() {
    this.start = null;
    this.end = null;
  }

  begin() {
    this.start = performance.now();
  }

  stop() {
    this.end = performance.now();
    return this.duration();
  }

  duration() {
    if (!this.start || !this.end) return null;
    return this.end - this.start;
  }
}

// Benchmark 1: Startup Time
async function benchmarkStartupTime() {
  logSection('📦 Benchmark 1: Startup Time');

  const results = {};

  // Measure require time (CJS)
  const requireTimer = new Timer();
  requireTimer.begin();
  try {
    const require = createRequire(import.meta.url);
    require('../packages/agentic-synth/dist/index.cjs');
    results.require = requireTimer.stop();
    log(`✓ CJS require: ${results.require.toFixed(2)}ms`, 'green');
  } catch (err) {
    log(`✗ CJS require failed: ${err.message}`, 'red');
    results.require = null;
  }

  // Measure import time (ESM)
  const importTimer = new Timer();
  importTimer.begin();
  try {
    await import('../packages/agentic-synth/dist/index.js');
    results.import = importTimer.stop();
    log(`✓ ESM import: ${results.import.toFixed(2)}ms`, 'green');
  } catch (err) {
    log(`✗ ESM import failed: ${err.message}`, 'red');
    results.import = null;
  }

  return results;
}

// Benchmark 2: Bundle Size
async function benchmarkBundleSize() {
  logSection('📊 Benchmark 2: Bundle Size');

  const distPath = path.join(__dirname, '../packages/agentic-synth/dist');
  const results = {};

  try {
    const files = await fs.readdir(distPath);

    for (const file of files) {
      if (file.endsWith('.js') || file.endsWith('.cjs')) {
        const filePath = path.join(distPath, file);
        const stats = await fs.stat(filePath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        results[file] = {
          bytes: stats.size,
          kb: parseFloat(sizeKB),
          mb: (stats.size / 1024 / 1024).toFixed(3)
        };
        log(`✓ ${file}: ${sizeKB} KB`, 'green');
      }
    }

    // Calculate total
    const totalBytes = Object.values(results).reduce((sum, r) => sum + r.bytes, 0);
    results.total = {
      bytes: totalBytes,
      kb: (totalBytes / 1024).toFixed(2),
      mb: (totalBytes / 1024 / 1024).toFixed(3)
    };
    log(`\n✓ Total bundle size: ${results.total.kb} KB`, 'cyan');

  } catch (err) {
    log(`✗ Bundle size check failed: ${err.message}`, 'red');
  }

  return results;
}

// Benchmark 3: Generation Speed
async function benchmarkGenerationSpeed(synth, model, schema, counts = [1, 10, 100]) {
  logSection(`⚡ Benchmark 3: Generation Speed - ${model} - ${schema.name}`);

  const results = {};

  for (const count of counts) {
    log(`\nGenerating ${count} records...`, 'blue');
    const timer = new Timer();
    const memTracker = new MemoryTracker();

    memTracker.captureBaseline();

    // Sample memory during generation
    const memoryInterval = setInterval(() => memTracker.sample(), 100);

    try {
      timer.begin();

      const options = {
        count,
        schema: schema.schema || {},
        description: schema.name,
        format: 'json'
      };

      let result;
      if (schema.type === 'timeseries') {
        result = await synth.generateTimeSeries({ ...options, interval: schema.interval });
      } else if (schema.type === 'events') {
        result = await synth.generateEvents(options);
      } else {
        result = await synth.generateStructured(options);
      }

      const duration = timer.stop();
      clearInterval(memoryInterval);

      const memStats = memTracker.getStats();

      // Calculate metrics
      const recordsPerSecond = (count / (duration / 1000)).toFixed(2);
      const avgTimePerRecord = (duration / count).toFixed(2);

      results[count] = {
        count,
        duration: duration.toFixed(2),
        recordsPerSecond: parseFloat(recordsPerSecond),
        avgTimePerRecord: parseFloat(avgTimePerRecord),
        memory: {
          heapUsedMB: (memStats.heapUsed.max / 1024 / 1024).toFixed(2),
          heapDeltaMB: (memStats.heapUsed.delta / 1024 / 1024).toFixed(2),
          avgHeapMB: (memStats.heapUsed.avg / 1024 / 1024).toFixed(2)
        },
        recordsGenerated: result.data ? result.data.length : 0,
        success: true
      };

      log(`✓ Duration: ${duration.toFixed(2)}ms`, 'green');
      log(`✓ Records/sec: ${recordsPerSecond}`, 'green');
      log(`✓ Avg time/record: ${avgTimePerRecord}ms`, 'green');
      log(`✓ Heap used: ${results[count].memory.heapUsedMB} MB (Δ ${results[count].memory.heapDeltaMB} MB)`, 'cyan');

      // Estimate token usage (approximate)
      const avgRecordSize = JSON.stringify(result.data[0] || {}).length;
      const estimatedTokens = Math.ceil((avgRecordSize * count) / 4);
      results[count].estimatedTokens = estimatedTokens;
      results[count].tokensPerRecord = (estimatedTokens / count).toFixed(2);
      log(`✓ Est. tokens: ${estimatedTokens} (~${results[count].tokensPerRecord}/record)`, 'yellow');

    } catch (err) {
      clearInterval(memoryInterval);
      log(`✗ Failed: ${err.message}`, 'red');
      results[count] = {
        count,
        error: err.message,
        success: false
      };
    }

    // Cool down between tests
    if (count < counts[counts.length - 1]) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return results;
}

// Benchmark 4: Concurrency
async function benchmarkConcurrency(synth, concurrencyLevels = [1, 3, 5, 10]) {
  logSection('🔄 Benchmark 4: Concurrency');

  const results = {};

  for (const level of concurrencyLevels) {
    log(`\nTesting ${level} concurrent requests...`, 'blue');
    const timer = new Timer();
    const memTracker = new MemoryTracker();

    memTracker.captureBaseline();

    try {
      timer.begin();

      // Create concurrent requests
      const requests = Array(level).fill(null).map(() =>
        synth.generateStructured({
          count: 10,
          schema: schemas.simple.schema,
          description: 'Simple concurrent test'
        })
      );

      const allResults = await Promise.all(requests);
      const duration = timer.stop();

      const totalRecords = allResults.reduce((sum, r) => sum + (r.data?.length || 0), 0);

      results[level] = {
        concurrency: level,
        duration: duration.toFixed(2),
        totalRecords,
        recordsPerSecond: (totalRecords / (duration / 1000)).toFixed(2),
        avgRequestTime: (duration / level).toFixed(2),
        success: true
      };

      log(`✓ Duration: ${duration.toFixed(2)}ms`, 'green');
      log(`✓ Total records: ${totalRecords}`, 'green');
      log(`✓ Records/sec: ${results[level].recordsPerSecond}`, 'green');
      log(`✓ Avg request time: ${results[level].avgRequestTime}ms`, 'cyan');

    } catch (err) {
      log(`✗ Failed: ${err.message}`, 'red');
      results[level] = {
        concurrency: level,
        error: err.message,
        success: false
      };
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
}

// Benchmark 5: Caching Effectiveness
async function benchmarkCaching(synth) {
  logSection('💾 Benchmark 5: Caching Effectiveness');

  const results = {
    withoutCache: {},
    withCache: {}
  };

  const testSchema = schemas.simple;
  const count = 50;

  // Test WITHOUT cache
  log('\nTesting WITHOUT cache...', 'blue');
  synth.configure({ cacheStrategy: 'none' });

  const timer1 = new Timer();
  timer1.begin();

  try {
    const result1 = await synth.generateStructured({
      count,
      schema: testSchema.schema,
      description: testSchema.name
    });

    const duration1 = timer1.stop();

    // Second request (should be same speed)
    timer1.begin();
    const result2 = await synth.generateStructured({
      count,
      schema: testSchema.schema,
      description: testSchema.name
    });
    const duration2 = timer1.stop();

    results.withoutCache = {
      firstRequest: duration1.toFixed(2),
      secondRequest: duration2.toFixed(2),
      avgDuration: ((duration1 + duration2) / 2).toFixed(2)
    };

    log(`✓ First request: ${duration1.toFixed(2)}ms`, 'green');
    log(`✓ Second request: ${duration2.toFixed(2)}ms`, 'green');

  } catch (err) {
    log(`✗ Failed: ${err.message}`, 'red');
  }

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test WITH cache
  log('\nTesting WITH cache...', 'blue');
  synth.configure({ cacheStrategy: 'memory', cacheTTL: 3600 });

  const timer2 = new Timer();
  timer2.begin();

  try {
    const result1 = await synth.generateStructured({
      count,
      schema: testSchema.schema,
      description: testSchema.name
    });

    const duration1 = timer2.stop();

    // Second request (should be faster with cache)
    timer2.begin();
    const result2 = await synth.generateStructured({
      count,
      schema: testSchema.schema,
      description: testSchema.name
    });
    const duration2 = timer2.stop();

    results.withCache = {
      firstRequest: duration1.toFixed(2),
      secondRequest: duration2.toFixed(2),
      avgDuration: ((duration1 + duration2) / 2).toFixed(2),
      improvement: ((1 - duration2 / duration1) * 100).toFixed(2) + '%'
    };

    log(`✓ First request: ${duration1.toFixed(2)}ms`, 'green');
    log(`✓ Second request: ${duration2.toFixed(2)}ms`, 'green');
    log(`✓ Cache improvement: ${results.withCache.improvement}`, 'cyan');

  } catch (err) {
    log(`✗ Failed: ${err.message}`, 'red');
  }

  return results;
}

// Model comparison
async function compareModels() {
  logSection('🔬 Benchmark 6: Model Comparison');

  const models = [
    { name: 'gemini-2.0-flash-exp', provider: 'gemini' },
    { name: 'gemini-exp-1206', provider: 'gemini' }
  ];

  const results = {};

  for (const modelConfig of models) {
    log(`\nTesting ${modelConfig.name}...`, 'blue');

    try {
      const { AgenticSynth } = await import('../packages/agentic-synth/dist/index.js');
      const synth = new AgenticSynth({
        provider: modelConfig.provider,
        model: modelConfig.name,
        apiKey: process.env.GEMINI_API_KEY
      });

      const timer = new Timer();
      timer.begin();

      const result = await synth.generateStructured({
        count: 20,
        schema: schemas.simple.schema,
        description: schemas.simple.name
      });

      const duration = timer.stop();

      results[modelConfig.name] = {
        model: modelConfig.name,
        provider: modelConfig.provider,
        duration: duration.toFixed(2),
        recordsPerSecond: (20 / (duration / 1000)).toFixed(2),
        success: result.data && result.data.length > 0
      };

      log(`✓ Duration: ${duration.toFixed(2)}ms`, 'green');
      log(`✓ Records/sec: ${results[modelConfig.name].recordsPerSecond}`, 'green');

    } catch (err) {
      log(`✗ Failed: ${err.message}`, 'red');
      results[modelConfig.name] = {
        model: modelConfig.name,
        error: err.message,
        success: false
      };
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
}

// Benchmark 7: Data Type Comparison
async function benchmarkDataTypes(synth) {
  logSection('📋 Benchmark 7: Data Type Comparison');

  const results = {};

  for (const [key, schema] of Object.entries(schemas)) {
    log(`\nTesting ${schema.name} (${schema.complexity} complexity)...`, 'blue');

    const timer = new Timer();
    timer.begin();

    try {
      let result;
      const count = 25;

      if (schema.type === 'timeseries') {
        result = await synth.generateTimeSeries({
          count,
          interval: schema.interval,
          description: schema.name
        });
      } else if (schema.type === 'events') {
        result = await synth.generateEvents({
          count,
          description: schema.name
        });
      } else {
        result = await synth.generateStructured({
          count,
          schema: schema.schema,
          description: schema.name
        });
      }

      const duration = timer.stop();

      results[key] = {
        name: schema.name,
        type: schema.type || 'structured',
        complexity: schema.complexity,
        count,
        duration: duration.toFixed(2),
        recordsPerSecond: (count / (duration / 1000)).toFixed(2),
        avgTimePerRecord: (duration / count).toFixed(2),
        success: true
      };

      log(`✓ Duration: ${duration.toFixed(2)}ms`, 'green');
      log(`✓ Avg time/record: ${results[key].avgTimePerRecord}ms`, 'green');
      log(`✓ Complexity: ${schema.complexity}`, 'cyan');

    } catch (err) {
      log(`✗ Failed: ${err.message}`, 'red');
      results[key] = {
        name: schema.name,
        error: err.message,
        success: false
      };
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
}

// Main benchmark runner
async function runBenchmarks() {
  log('\n🚀 Starting Comprehensive Performance Benchmarking Suite', 'bright');
  log(`📅 ${new Date().toLocaleString()}`, 'cyan');

  try {
    // Initialize AgenticSynth
    const { AgenticSynth } = await import('../packages/agentic-synth/dist/index.js');
    const synth = new AgenticSynth({
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp',
      apiKey: process.env.GEMINI_API_KEY,
      cacheStrategy: 'memory'
    });

    // Run all benchmarks
    results.benchmarks.startup = await benchmarkStartupTime();
    results.benchmarks.bundleSize = await benchmarkBundleSize();
    results.benchmarks.generationSpeed = {};

    // Test simple schema
    results.benchmarks.generationSpeed.simple = await benchmarkGenerationSpeed(
      synth,
      'gemini-2.0-flash-exp',
      schemas.simple,
      [1, 10, 100, 1000]
    );

    // Test complex schema
    results.benchmarks.generationSpeed.complex = await benchmarkGenerationSpeed(
      synth,
      'gemini-2.0-flash-exp',
      schemas.complex,
      [1, 10, 100]
    );

    results.benchmarks.concurrency = await benchmarkConcurrency(synth);
    results.benchmarks.caching = await benchmarkCaching(synth);
    results.benchmarks.modelComparison = await compareModels();
    results.benchmarks.dataTypes = await benchmarkDataTypes(synth);

    // Generate summary
    logSection('📊 Benchmark Summary');
    console.log(JSON.stringify(results, null, 2));

    // Save results
    const resultsPath = path.join(__dirname, '../benchmarks/results');
    await fs.mkdir(resultsPath, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsFile = path.join(resultsPath, `benchmark-${timestamp}.json`);
    await fs.writeFile(resultsFile, JSON.stringify(results, null, 2));

    log(`\n✅ Results saved to: ${resultsFile}`, 'green');

    // Store in hooks memory
    try {
      execSync(
        `npx claude-flow@alpha hooks memory store --key "performance-benchmarks/latest" --value '${JSON.stringify(results)}' --namespace "benchmarks"`,
        { stdio: 'inherit' }
      );
      log('✅ Results stored in hooks memory system', 'green');
    } catch (err) {
      log(`⚠️  Could not store in hooks memory: ${err.message}`, 'yellow');
    }

    // Identify bottlenecks
    logSection('🔍 Bottleneck Analysis');
    analyzeBottlenecks(results);

  } catch (err) {
    log(`\n❌ Benchmark failed: ${err.message}`, 'red');
    console.error(err);
    process.exit(1);
  }
}

// Analyze bottlenecks and optimization opportunities
function analyzeBottlenecks(results) {
  const bottlenecks = [];
  const optimizations = [];

  // Check startup time
  if (results.benchmarks.startup) {
    const { require: reqTime, import: impTime } = results.benchmarks.startup;
    if (impTime > 100) {
      bottlenecks.push({
        area: 'Startup Time',
        issue: `ESM import time is ${impTime}ms (>100ms threshold)`,
        severity: 'medium',
        impact: 'Slow initial load times'
      });
      optimizations.push({
        area: 'Startup Time',
        suggestion: 'Consider lazy loading non-critical modules',
        expectedImprovement: '30-50% reduction in startup time'
      });
    }
  }

  // Check bundle size
  if (results.benchmarks.bundleSize?.total) {
    const totalKB = parseFloat(results.benchmarks.bundleSize.total.kb);
    if (totalKB > 100) {
      bottlenecks.push({
        area: 'Bundle Size',
        issue: `Total bundle size is ${totalKB}KB (>100KB threshold)`,
        severity: 'low',
        impact: 'Larger download size, slower loading'
      });
      optimizations.push({
        area: 'Bundle Size',
        suggestion: 'Implement code splitting and tree shaking',
        expectedImprovement: '20-40% size reduction'
      });
    }
  }

  // Check generation speed scaling
  if (results.benchmarks.generationSpeed?.simple) {
    const speeds = results.benchmarks.generationSpeed.simple;
    const counts = Object.keys(speeds).map(Number).sort((a, b) => a - b);

    if (counts.length >= 2) {
      const small = speeds[counts[0]];
      const large = speeds[counts[counts.length - 1]];

      if (small.success && large.success) {
        const scalingFactor = large.recordsPerSecond / small.recordsPerSecond;

        if (scalingFactor < 0.5) {
          bottlenecks.push({
            area: 'Generation Speed Scaling',
            issue: `Performance degrades ${((1 - scalingFactor) * 100).toFixed(0)}% with larger batches`,
            severity: 'high',
            impact: 'Poor scalability for large datasets'
          });
          optimizations.push({
            area: 'Generation Speed',
            suggestion: 'Implement batch processing and pagination',
            expectedImprovement: '2-3x improvement for large batches'
          });
        }
      }
    }
  }

  // Check memory usage
  if (results.benchmarks.generationSpeed?.complex) {
    const complexResults = results.benchmarks.generationSpeed.complex;

    for (const [count, result] of Object.entries(complexResults)) {
      if (result.success && result.memory) {
        const heapDelta = parseFloat(result.memory.heapDeltaMB);

        if (heapDelta > 100) {
          bottlenecks.push({
            area: 'Memory Usage',
            issue: `Heap delta of ${heapDelta}MB for ${count} complex records`,
            severity: 'high',
            impact: 'Risk of memory issues with large datasets'
          });
          optimizations.push({
            area: 'Memory Management',
            suggestion: 'Implement streaming and memory pooling',
            expectedImprovement: '50-70% memory reduction'
          });
          break;
        }
      }
    }
  }

  // Check concurrency efficiency
  if (results.benchmarks.concurrency) {
    const concResults = results.benchmarks.concurrency;
    const levels = Object.keys(concResults).map(Number).sort((a, b) => a - b);

    if (levels.length >= 2) {
      const low = concResults[levels[0]];
      const high = concResults[levels[levels.length - 1]];

      if (low.success && high.success) {
        const expectedSpeedup = levels[levels.length - 1] / levels[0];
        const actualSpeedup = parseFloat(high.recordsPerSecond) / parseFloat(low.recordsPerSecond);
        const efficiency = (actualSpeedup / expectedSpeedup) * 100;

        if (efficiency < 70) {
          bottlenecks.push({
            area: 'Concurrency',
            issue: `Concurrency efficiency is ${efficiency.toFixed(0)}% (expected >70%)`,
            severity: 'medium',
            impact: 'Suboptimal parallel processing'
          });
          optimizations.push({
            area: 'Concurrency',
            suggestion: 'Optimize async operations and reduce lock contention',
            expectedImprovement: 'Up to 90% concurrency efficiency'
          });
        }
      }
    }
  }

  // Check caching effectiveness
  if (results.benchmarks.caching?.withCache) {
    const improvement = parseFloat(results.benchmarks.caching.withCache.improvement);

    if (improvement < 50) {
      bottlenecks.push({
        area: 'Caching',
        issue: `Cache only improves performance by ${improvement}% (expected >50%)`,
        severity: 'medium',
        impact: 'Limited benefit from caching layer'
      });
      optimizations.push({
        area: 'Caching Strategy',
        suggestion: 'Implement smarter cache keys and pre-warming',
        expectedImprovement: '70-90% cache hit improvement'
      });
    }
  }

  // Output analysis
  if (bottlenecks.length > 0) {
    log('\n⚠️  Identified Bottlenecks:', 'yellow');
    bottlenecks.forEach((b, i) => {
      console.log(`\n${i + 1}. ${b.area} [${b.severity.toUpperCase()}]`);
      log(`   Issue: ${b.issue}`, 'yellow');
      log(`   Impact: ${b.impact}`, 'cyan');
    });
  } else {
    log('\n✅ No significant bottlenecks identified!', 'green');
  }

  if (optimizations.length > 0) {
    log('\n💡 Optimization Opportunities:', 'cyan');
    optimizations.forEach((o, i) => {
      console.log(`\n${i + 1}. ${o.area}`);
      log(`   Suggestion: ${o.suggestion}`, 'cyan');
      log(`   Expected: ${o.expectedImprovement}`, 'green');
    });
  }

  // Overall performance score
  const score = calculatePerformanceScore(results, bottlenecks);
  log(`\n🎯 Overall Performance Score: ${score}/100`, score > 80 ? 'green' : score > 60 ? 'yellow' : 'red');
}

function calculatePerformanceScore(results, bottlenecks) {
  let score = 100;

  // Deduct for bottlenecks
  bottlenecks.forEach(b => {
    switch (b.severity) {
      case 'high':
        score -= 15;
        break;
      case 'medium':
        score -= 10;
        break;
      case 'low':
        score -= 5;
        break;
    }
  });

  return Math.max(0, score);
}

// Run benchmarks
runBenchmarks().catch(err => {
  log(`\n❌ Fatal error: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});
