/**
 * Main Benchmark Runner
 *
 * Orchestrates all empirical benchmarks and generates comprehensive reports
 */

import * as path from 'path';
import { generateAllTestData } from '../../test-data/generate-test-data';
import { runAllVCFBenchmarks } from './vcf-benchmark';
import { runAllClinVarBenchmarks } from './clinvar-benchmark';
import { runAllPhenotypeBenchmarks } from './phenotype-benchmark';
import { runAllGIABBenchmarks } from './giab-validation';
import { runAllEndToEndBenchmarks } from './end-to-end-benchmark';
import {
  generateHTMLReport,
  generateJSONReport,
  generateMarkdownSummary,
} from './report-generator';

interface BenchmarkConfig {
  dataDir: string;
  outputDir: string;
  generateData: boolean;
  runVCF: boolean;
  runClinVar: boolean;
  runPhenotype: boolean;
  runGIAB: boolean;
  runEndToEnd: boolean;
  verbose: boolean;
}

const DEFAULT_CONFIG: BenchmarkConfig = {
  dataDir: path.join(__dirname, '../../test-data'),
  outputDir: path.join(__dirname, '../../test-results'),
  generateData: true,
  runVCF: true,
  runClinVar: true,
  runPhenotype: true,
  runGIAB: true,
  runEndToEnd: true,
  verbose: true,
};

/**
 * Main benchmark orchestrator
 */
export async function runEmpiricalBenchmarks(
  config: Partial<BenchmarkConfig> = {}
): Promise<void> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Genomic Vector Analysis - Empirical Benchmark Suite     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  try {
    // Step 1: Generate test data if needed
    if (finalConfig.generateData) {
      console.log('📊 Generating realistic test datasets...\n');
      await generateAllTestData();
      console.log('\n✓ Test data generation completed\n');
    }

    // Collect all results
    const allResults: any[] = [];

    // Step 2: Run VCF benchmarks
    if (finalConfig.runVCF) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('  VCF Processing Benchmarks');
      console.log('═══════════════════════════════════════════════════════════');

      const vcfResults = await runAllVCFBenchmarks(
        path.join(finalConfig.dataDir, 'vcf')
      );
      allResults.push(...vcfResults);
    }

    // Step 3: Run ClinVar benchmarks
    if (finalConfig.runClinVar) {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('  ClinVar Classification Benchmarks');
      console.log('═══════════════════════════════════════════════════════════');

      const clinvarResults = await runAllClinVarBenchmarks(finalConfig.dataDir);
      allResults.push(...clinvarResults);
    }

    // Step 4: Run phenotype benchmarks
    if (finalConfig.runPhenotype) {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('  HPO Phenotype Analysis Benchmarks');
      console.log('═══════════════════════════════════════════════════════════');

      const phenotypeResults = await runAllPhenotypeBenchmarks(finalConfig.dataDir);
      allResults.push(...phenotypeResults);
    }

    // Step 5: Run GIAB validation
    if (finalConfig.runGIAB) {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('  GIAB Reference Validation');
      console.log('═══════════════════════════════════════════════════════════');

      const giabResults = await runAllGIABBenchmarks(finalConfig.dataDir);
      allResults.push(...giabResults);
    }

    // Step 6: Run end-to-end benchmarks
    if (finalConfig.runEndToEnd) {
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('  End-to-End Pipeline Benchmarks');
      console.log('═══════════════════════════════════════════════════════════');

      const e2eResults = await runAllEndToEndBenchmarks(finalConfig.dataDir);
      allResults.push(...e2eResults);
    }

    // Step 7: Generate reports
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  Generating Reports');
    console.log('═══════════════════════════════════════════════════════════');

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];

    const htmlPath = path.join(
      finalConfig.outputDir,
      `benchmark-report-${timestamp}.html`
    );
    const jsonPath = path.join(
      finalConfig.outputDir,
      `benchmark-results-${timestamp}.json`
    );
    const mdPath = path.join(
      finalConfig.outputDir,
      `benchmark-summary-${timestamp}.md`
    );

    generateHTMLReport(allResults, htmlPath);
    generateJSONReport(allResults, jsonPath);
    generateMarkdownSummary(allResults, mdPath);

    // Step 8: Display summary
    const endTime = Date.now();
    const totalDuration = (endTime - startTime) / 1000;

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    Benchmark Complete                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`\n✓ Total benchmarks run: ${allResults.length}`);
    console.log(`✓ Total duration: ${totalDuration.toFixed(2)}s`);
    console.log(`✓ Reports generated:`);
    console.log(`  - HTML: ${htmlPath}`);
    console.log(`  - JSON: ${jsonPath}`);
    console.log(`  - MD:   ${mdPath}`);

    // Performance validation
    console.log('\n📊 Performance Validation:');
    validatePerformanceClaims(allResults);

  } catch (error) {
    console.error('\n❌ Benchmark failed:', error);
    throw error;
  }
}

/**
 * Validate performance claims
 */
function validatePerformanceClaims(results: any[]): void {
  const TARGET_THROUGHPUT = 50000; // 50K variants/sec claimed

  const vcfResults = results.filter(r =>
    r.testName && r.testName.includes('VCF')
  );

  if (vcfResults.length === 0) {
    console.log('⚠ No VCF results to validate');
    return;
  }

  const avgThroughput = vcfResults.reduce((sum, r) => {
    if ('variantsPerSec' in r) return sum + r.variantsPerSec;
    return sum;
  }, 0) / vcfResults.length;

  const percentOfTarget = (avgThroughput / TARGET_THROUGHPUT) * 100;

  console.log(`  Target: ${TARGET_THROUGHPUT.toLocaleString()} variants/sec`);
  console.log(`  Actual: ${avgThroughput.toFixed(0)} variants/sec`);
  console.log(`  Achievement: ${percentOfTarget.toFixed(1)}% of target`);

  if (percentOfTarget >= 80) {
    console.log('  ✓ PASS: Performance meets expectations');
  } else if (percentOfTarget >= 50) {
    console.log('  ⚠ WARNING: Performance below target but acceptable');
  } else {
    console.log('  ✗ FAIL: Performance significantly below target');
  }

  // Memory validation
  const maxMemoryTarget = 2000; // 2GB max
  const peakMemory = Math.max(...results.map(r => {
    if ('memoryUsedMB' in r) return r.memoryUsedMB;
    if ('peakMemoryMB' in r) return r.peakMemoryMB;
    return 0;
  }));

  console.log(`\n  Peak Memory: ${peakMemory.toFixed(0)} MB`);
  console.log(`  Target: < ${maxMemoryTarget} MB`);

  if (peakMemory < maxMemoryTarget) {
    console.log('  ✓ PASS: Memory usage within limits');
  } else {
    console.log('  ⚠ WARNING: Memory usage exceeds target');
  }
}

/**
 * Run quick benchmark (subset of tests)
 */
export async function runQuickBenchmark(): Promise<void> {
  console.log('Running quick benchmark (subset of tests)...\n');

  await runEmpiricalBenchmarks({
    generateData: false, // Assume data exists
    runVCF: true,
    runClinVar: false,
    runPhenotype: false,
    runGIAB: false,
    runEndToEnd: true,
  });
}

/**
 * Run full benchmark suite
 */
export async function runFullBenchmark(): Promise<void> {
  console.log('Running full benchmark suite...\n');

  await runEmpiricalBenchmarks({
    generateData: true,
    runVCF: true,
    runClinVar: true,
    runPhenotype: true,
    runGIAB: true,
    runEndToEnd: true,
  });
}

// CLI support
if (require.main === module) {
  const args = process.argv.slice(2);
  const mode = args[0] || 'full';

  if (mode === 'quick') {
    runQuickBenchmark().catch(console.error);
  } else {
    runFullBenchmark().catch(console.error);
  }
}

// Re-export for library usage
export * from './vcf-benchmark';
export * from './clinvar-benchmark';
export * from './phenotype-benchmark';
export * from './giab-validation';
export * from './end-to-end-benchmark';
export * from './report-generator';
