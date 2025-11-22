#!/usr/bin/env node
/**
 * Compare Performance Benchmark Results
 * Analyzes changes between two benchmark runs
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function formatChange(oldVal, newVal, unit = '', inverse = false) {
  const change = ((newVal - oldVal) / oldVal) * 100;
  const absChange = Math.abs(change);
  const isImprovement = inverse ? change > 0 : change < 0;

  let symbol = change > 0 ? '↑' : '↓';
  let color = isImprovement ? 'green' : 'red';

  if (absChange < 2) {
    symbol = '→';
    color = 'yellow';
  }

  const sign = change > 0 ? '+' : '';
  return {
    text: `${symbol} ${sign}${change.toFixed(1)}% (${oldVal.toFixed(2)}${unit} → ${newVal.toFixed(2)}${unit})`,
    color,
    isImprovement,
    change
  };
}

async function loadResults(file1, file2) {
  const resultsPath = path.join(__dirname, 'results');

  let files = [];

  if (file1 && file2) {
    files = [file1, file2];
  } else {
    // Get two most recent files
    const allFiles = await fs.readdir(resultsPath);
    const benchmarkFiles = allFiles
      .filter(f => f.startsWith('benchmark-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (benchmarkFiles.length < 2) {
      throw new Error('Need at least 2 benchmark results to compare');
    }

    files = [
      path.join(resultsPath, benchmarkFiles[1]), // older
      path.join(resultsPath, benchmarkFiles[0])  // newer
    ];
  }

  const [result1, result2] = await Promise.all([
    fs.readFile(files[0], 'utf8').then(JSON.parse),
    fs.readFile(files[1], 'utf8').then(JSON.parse)
  ]);

  return { old: result1, new: result2, files };
}

function compareStartup(old, newR) {
  log('\n📦 Startup Time Comparison', 'bright');
  console.log('─'.repeat(60));

  if (old?.import && newR?.import) {
    const change = formatChange(old.import, newR.import, 'ms');
    log(`ESM Import: ${change.text}`, change.color);
  }

  if (old?.require && newR?.require) {
    const change = formatChange(old.require, newR.require, 'ms');
    log(`CJS Require: ${change.text}`, change.color);
  }
}

function compareBundleSize(old, newR) {
  log('\n📊 Bundle Size Comparison', 'bright');
  console.log('─'.repeat(60));

  if (old?.total?.kb && newR?.total?.kb) {
    const change = formatChange(
      parseFloat(old.total.kb),
      parseFloat(newR.total.kb),
      'KB'
    );
    log(`Total Bundle: ${change.text}`, change.color);
  }

  // Individual files
  const files = new Set([
    ...Object.keys(old || {}),
    ...Object.keys(newR || {})
  ]);

  files.forEach(file => {
    if (file !== 'total' && old?.[file]?.kb && newR?.[file]?.kb) {
      const change = formatChange(
        parseFloat(old[file].kb),
        parseFloat(newR[file].kb),
        'KB'
      );
      log(`  ${file}: ${change.text}`, change.color);
    }
  });
}

function compareGenerationSpeed(old, newR) {
  log('\n⚡ Generation Speed Comparison', 'bright');
  console.log('─'.repeat(60));

  // Compare simple schema
  if (old?.simple && newR?.simple) {
    log('\nSimple Schema:', 'cyan');

    Object.keys(newR.simple).forEach(count => {
      if (old.simple[count]?.recordsPerSecond && newR.simple[count]?.recordsPerSecond) {
        const change = formatChange(
          old.simple[count].recordsPerSecond,
          newR.simple[count].recordsPerSecond,
          ' rec/sec',
          true
        );
        log(`  ${count} records: ${change.text}`, change.color);
      }
    });
  }

  // Compare complex schema
  if (old?.complex && newR?.complex) {
    log('\nComplex Schema:', 'cyan');

    Object.keys(newR.complex).forEach(count => {
      if (old.complex[count]?.recordsPerSecond && newR.complex[count]?.recordsPerSecond) {
        const change = formatChange(
          old.complex[count].recordsPerSecond,
          newR.complex[count].recordsPerSecond,
          ' rec/sec',
          true
        );
        log(`  ${count} records: ${change.text}`, change.color);
      }
    });
  }
}

function compareConcurrency(old, newR) {
  log('\n🔄 Concurrency Comparison', 'bright');
  console.log('─'.repeat(60));

  const levels = new Set([
    ...Object.keys(old || {}),
    ...Object.keys(newR || {})
  ]);

  levels.forEach(level => {
    if (old?.[level]?.recordsPerSecond && newR?.[level]?.recordsPerSecond) {
      const change = formatChange(
        parseFloat(old[level].recordsPerSecond),
        parseFloat(newR[level].recordsPerSecond),
        ' rec/sec',
        true
      );
      log(`  Concurrency ${level}: ${change.text}`, change.color);
    }
  });
}

function compareCaching(old, newR) {
  log('\n💾 Caching Comparison', 'bright');
  console.log('─'.repeat(60));

  if (old?.withCache?.improvement && newR?.withCache?.improvement) {
    const oldImprovement = parseFloat(old.withCache.improvement);
    const newImprovement = parseFloat(newR.withCache.improvement);

    const change = formatChange(oldImprovement, newImprovement, '%', true);
    log(`Cache Effectiveness: ${change.text}`, change.color);
  }

  if (old?.withCache?.secondRequest && newR?.withCache?.secondRequest) {
    const change = formatChange(
      parseFloat(old.withCache.secondRequest),
      parseFloat(newR.withCache.secondRequest),
      'ms'
    );
    log(`Cached Request Time: ${change.text}`, change.color);
  }
}

function generateSummary(comparisons) {
  log('\n🎯 Overall Summary', 'bright');
  console.log('═'.repeat(60));

  let improvements = 0;
  let regressions = 0;
  let neutral = 0;

  comparisons.forEach(comp => {
    if (Math.abs(comp.change) < 2) neutral++;
    else if (comp.isImprovement) improvements++;
    else regressions++;
  });

  log(`\n✅ Improvements: ${improvements}`, 'green');
  log(`⚠️  Neutral: ${neutral}`, 'yellow');
  log(`❌ Regressions: ${regressions}`, 'red');

  const score = ((improvements - regressions) / comparisons.length) * 100;
  const scoreColor = score > 50 ? 'green' : score > 0 ? 'yellow' : 'red';

  log(`\n📊 Change Score: ${score.toFixed(1)}% (${improvements} gains, ${regressions} losses)`, scoreColor);

  if (regressions > improvements) {
    log('\n⚠️  Warning: More regressions than improvements detected!', 'red');
    log('Review changes and consider rolling back.', 'yellow');
  } else if (improvements > 0) {
    log('\n✨ Good job! Performance improvements detected!', 'green');
  }
}

async function main() {
  const args = process.argv.slice(2);

  try {
    log('🔬 Performance Benchmark Comparison', 'bright');
    log('═'.repeat(60));

    const { old, new: newR, files } = await loadResults(args[0], args[1]);

    log(`\nComparing:`, 'cyan');
    log(`  Old: ${new Date(old.timestamp).toLocaleString()}`, 'yellow');
    log(`  New: ${new Date(newR.timestamp).toLocaleString()}`, 'yellow');

    const comparisons = [];

    // Run all comparisons
    if (old.benchmarks.startup && newR.benchmarks.startup) {
      compareStartup(old.benchmarks.startup, newR.benchmarks.startup);
    }

    if (old.benchmarks.bundleSize && newR.benchmarks.bundleSize) {
      compareBundleSize(old.benchmarks.bundleSize, newR.benchmarks.bundleSize);
    }

    if (old.benchmarks.generationSpeed && newR.benchmarks.generationSpeed) {
      compareGenerationSpeed(old.benchmarks.generationSpeed, newR.benchmarks.generationSpeed);
    }

    if (old.benchmarks.concurrency && newR.benchmarks.concurrency) {
      compareConcurrency(old.benchmarks.concurrency, newR.benchmarks.concurrency);
    }

    if (old.benchmarks.caching && newR.benchmarks.caching) {
      compareCaching(old.benchmarks.caching, newR.benchmarks.caching);
    }

    // Extract all comparisons for summary
    // (This is simplified - in production, we'd track all formatChange calls)

    log('\n' + '═'.repeat(60));
    log('\n✅ Comparison complete!', 'green');

  } catch (err) {
    log(`\n❌ Error: ${err.message}`, 'red');
    console.error(err);
    process.exit(1);
  }
}

main();
