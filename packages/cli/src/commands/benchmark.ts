import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import { GenomicVectorDB } from '@ruvector/genomic-vector-analysis';
import { ProgressTracker } from '../utils/progress';
import { OutputFormatter } from '../utils/formatters';

export async function benchmarkCommand(options: {
  dataset?: string;
  operations: string;
  iterations: string;
  format: string;
  report?: string;
}) {
  console.log(chalk.blue.bold('🚀 Starting Performance Benchmarks'));
  console.log();

  try {
    const operations = options.operations.split(',');
    const iterations = parseInt(options.iterations);
    const results = [];

    // Initialize database
    const db = new GenomicVectorDB();

    // Test sequences
    const testSequences = [
      'ATCGATCGATCGATCG',
      'GCTAGCTAGCTAGCTA',
      'TTAATTAATTAATTAA',
      'CGCGCGCGCGCGCGCG',
    ];

    // Benchmark embedding
    if (operations.includes('embed')) {
      const progress = new ProgressTracker('Embedding Benchmark');
      progress.start(iterations);

      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const seq = testSequences[i % testSequences.length];
        const start = Date.now();
        await db.embeddings.embed(seq);
        times.push(Date.now() - start);
        progress.update(i + 1);
      }

      progress.stop();

      results.push({
        operation: 'Embedding',
        samples: iterations,
        mean: average(times),
        median: median(times),
        p95: percentile(times, 95),
        p99: percentile(times, 99),
        throughput: ((iterations / (times.reduce((a, b) => a + b, 0) / 1000)) || 0).toFixed(2),
      });
      console.log();
    }

    // Benchmark search
    if (operations.includes('search')) {
      const setupSpinner = ora('Setting up search benchmark...').start();

      // First, add some vectors
      for (const seq of testSequences) {
        await db.addSequence(`seq-${seq.substring(0, 8)}`, seq);
      }
      setupSpinner.succeed('Search benchmark setup complete');

      const progress = new ProgressTracker('Search Benchmark');
      progress.start(iterations);

      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const seq = testSequences[i % testSequences.length];
        const start = Date.now();
        await db.searchBySequence(seq, 5);
        times.push(Date.now() - start);
        progress.update(i + 1);
      }

      progress.stop();

      results.push({
        operation: 'Search',
        samples: iterations,
        mean: average(times),
        median: median(times),
        p95: percentile(times, 95),
        p99: percentile(times, 99),
        throughput: ((iterations / (times.reduce((a, b) => a + b, 0) / 1000)) || 0).toFixed(2),
      });
      console.log();
    }

    console.log(chalk.green('✓ All benchmarks completed!'));

    // Display results
    console.log();
    console.log(chalk.blue.bold('📊 Benchmark Results:'));
    console.log(chalk.gray('━'.repeat(80)));

    if (options.format === 'json') {
      console.log(JSON.stringify(results, null, 2));
    } else {
      const tableData = [
        [
          chalk.bold('Operation'),
          chalk.bold('Samples'),
          chalk.bold('Mean (ms)'),
          chalk.bold('Median (ms)'),
          chalk.bold('P95 (ms)'),
          chalk.bold('P99 (ms)'),
          chalk.bold('Throughput (ops/s)'),
        ],
        ...results.map(r => [
          r.operation,
          r.samples.toString(),
          r.mean.toFixed(2),
          r.median.toFixed(2),
          r.p95.toFixed(2),
          r.p99.toFixed(2),
          r.throughput,
        ]),
      ];

      console.log(table(tableData));
    }

    // Generate HTML report if requested
    if (options.report === 'html') {
      await OutputFormatter.format(results, {
        format: 'html',
        output: 'benchmark-report.html',
        title: 'Genomic Vector Analysis - Performance Benchmark Report',
      });
    }

  } catch (error) {
    console.error(chalk.red('✗ Benchmark failed'));
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  }
}

function average(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[index];
}
