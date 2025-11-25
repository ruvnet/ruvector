/**
 * ClinVar Variant Classification Benchmark
 *
 * Benchmarks classification of pathogenic variants:
 * - Variant lookup performance
 * - Clinical significance matching
 * - Gene association queries
 * - Batch processing throughput
 */

import * as fs from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';

interface ClinVarVariant {
  id: string;
  chrom: string;
  pos: number;
  ref: string;
  alt: string;
  gene: string;
  significance: string;
  condition: string;
  reviewStatus: string;
  lastEvaluated: string;
}

interface ClassificationResult {
  variantId: string;
  matches: ClinVarVariant[];
  significance: string;
  confidence: number;
  processingTimeMs: number;
}

interface ClinVarBenchmarkResult {
  testName: string;
  numVariants: number;
  totalTimeMs: number;
  variantsPerSec: number;
  avgLatencyMs: number;
  accuracyRate: number;
  memoryUsedMB: number;
  pathogenicFound: number;
  uncertainFound: number;
  benignFound: number;
  successful: boolean;
  errors: string[];
}

/**
 * Load ClinVar variants database
 */
function loadClinVarDatabase(filePath: string): ClinVarVariant[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Create variant signature for matching
 */
function createVariantSignature(chrom: string, pos: number, ref: string, alt: string): string {
  return `${chrom}:${pos}:${ref}>${alt}`;
}

/**
 * Classify variant against ClinVar database
 */
function classifyVariant(
  variant: { chrom: string; pos: number; ref: string; alt: string },
  database: ClinVarVariant[]
): ClassificationResult {
  const startTime = performance.now();
  const signature = createVariantSignature(variant.chrom, variant.pos, variant.ref, variant.alt);

  // Exact match
  const exactMatches = database.filter(cv =>
    cv.chrom === variant.chrom &&
    cv.pos === variant.pos &&
    cv.ref === variant.ref &&
    cv.alt === variant.alt
  );

  // Position-based matches (for validation)
  const positionMatches = database.filter(cv =>
    cv.chrom === variant.chrom &&
    Math.abs(cv.pos - variant.pos) < 10
  );

  const matches = exactMatches.length > 0 ? exactMatches : positionMatches;

  // Determine significance and confidence
  let significance = 'Unknown';
  let confidence = 0;

  if (matches.length > 0) {
    // Use most common significance
    const significanceCounts: Record<string, number> = {};
    matches.forEach(m => {
      significanceCounts[m.significance] = (significanceCounts[m.significance] || 0) + 1;
    });

    const entries = Object.entries(significanceCounts);
    entries.sort((a, b) => b[1] - a[1]);
    significance = entries[0][0];
    confidence = entries[0][1] / matches.length;
  }

  const processingTimeMs = performance.now() - startTime;

  return {
    variantId: signature,
    matches,
    significance,
    confidence,
    processingTimeMs,
  };
}

/**
 * Benchmark ClinVar variant classification
 */
export async function benchmarkClinVarClassification(
  variantsPath: string,
  clinvarPath: string
): Promise<ClinVarBenchmarkResult> {
  const startMem = process.memoryUsage().heapUsed;
  const startTime = performance.now();
  const errors: string[] = [];

  try {
    // Load databases
    const clinvarDb = loadClinVarDatabase(clinvarPath);
    const testVariants = loadClinVarDatabase(variantsPath); // Using same format for test

    let pathogenicFound = 0;
    let uncertainFound = 0;
    let benignFound = 0;
    let correctClassifications = 0;

    const results: ClassificationResult[] = [];

    // Classify each variant
    for (const variant of testVariants) {
      const result = classifyVariant(variant, clinvarDb);
      results.push(result);

      // Count significance types
      if (result.significance.includes('athogenic')) pathogenicFound++;
      else if (result.significance.includes('ncertain')) uncertainFound++;
      else if (result.significance.includes('enign')) benignFound++;

      // Check accuracy (if we know the true label)
      if (result.matches.length > 0 && result.significance === variant.significance) {
        correctClassifications++;
      }
    }

    const endTime = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    const totalTimeMs = endTime - startTime;
    const memoryUsedMB = (endMem - startMem) / 1024 / 1024;
    const accuracyRate = testVariants.length > 0 ? correctClassifications / testVariants.length : 0;

    return {
      testName: 'ClinVar Classification',
      numVariants: testVariants.length,
      totalTimeMs,
      variantsPerSec: (testVariants.length / totalTimeMs) * 1000,
      avgLatencyMs: totalTimeMs / testVariants.length,
      accuracyRate,
      memoryUsedMB,
      pathogenicFound,
      uncertainFound,
      benignFound,
      successful: true,
      errors,
    };
  } catch (error) {
    errors.push(`Classification error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      testName: 'ClinVar Classification',
      numVariants: 0,
      totalTimeMs: performance.now() - startTime,
      variantsPerSec: 0,
      avgLatencyMs: 0,
      accuracyRate: 0,
      memoryUsedMB: 0,
      pathogenicFound: 0,
      uncertainFound: 0,
      benignFound: 0,
      successful: false,
      errors,
    };
  }
}

/**
 * Benchmark gene-based variant lookup
 */
export async function benchmarkGeneVariantLookup(
  clinvarPath: string,
  targetGenes: string[]
): Promise<ClinVarBenchmarkResult> {
  const startMem = process.memoryUsage().heapUsed;
  const startTime = performance.now();
  const errors: string[] = [];

  try {
    const clinvarDb = loadClinVarDatabase(clinvarPath);

    let pathogenicFound = 0;
    let uncertainFound = 0;
    let benignFound = 0;

    const geneVariants: Record<string, ClinVarVariant[]> = {};

    for (const gene of targetGenes) {
      const variants = clinvarDb.filter(v => v.gene === gene);
      geneVariants[gene] = variants;

      // Count by significance
      variants.forEach(v => {
        if (v.significance.includes('athogenic')) pathogenicFound++;
        else if (v.significance.includes('ncertain')) uncertainFound++;
        else if (v.significance.includes('enign')) benignFound++;
      });
    }

    const endTime = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    const totalVariants = Object.values(geneVariants).reduce((sum, vars) => sum + vars.length, 0);
    const totalTimeMs = endTime - startTime;
    const memoryUsedMB = (endMem - startMem) / 1024 / 1024;

    return {
      testName: 'Gene Variant Lookup',
      numVariants: totalVariants,
      totalTimeMs,
      variantsPerSec: (totalVariants / totalTimeMs) * 1000,
      avgLatencyMs: totalTimeMs / targetGenes.length,
      accuracyRate: 1.0, // N/A for lookup
      memoryUsedMB,
      pathogenicFound,
      uncertainFound,
      benignFound,
      successful: true,
      errors,
    };
  } catch (error) {
    errors.push(`Lookup error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      testName: 'Gene Variant Lookup',
      numVariants: 0,
      totalTimeMs: performance.now() - startTime,
      variantsPerSec: 0,
      avgLatencyMs: 0,
      accuracyRate: 0,
      memoryUsedMB: 0,
      pathogenicFound: 0,
      uncertainFound: 0,
      benignFound: 0,
      successful: false,
      errors,
    };
  }
}

/**
 * Run all ClinVar benchmarks
 */
export async function runAllClinVarBenchmarks(dataDir: string): Promise<ClinVarBenchmarkResult[]> {
  const results: ClinVarBenchmarkResult[] = [];
  const clinvarPath = path.join(dataDir, 'clinvar', 'pathogenic_variants.json');

  if (!fs.existsSync(clinvarPath)) {
    console.warn('ClinVar database not found');
    return results;
  }

  console.log('\nBenchmarking ClinVar Classification...');

  // Classification benchmark
  const classificationResult = await benchmarkClinVarClassification(clinvarPath, clinvarPath);
  results.push(classificationResult);
  console.log(`  Classified: ${classificationResult.variantsPerSec.toFixed(0)} variants/sec`);
  console.log(`  Accuracy: ${(classificationResult.accuracyRate * 100).toFixed(1)}%`);
  console.log(`  Pathogenic: ${classificationResult.pathogenicFound}`);

  // Gene lookup benchmark
  const targetGenes = ['BRCA1', 'BRCA2', 'TP53', 'CFTR', 'DMD'];
  const lookupResult = await benchmarkGeneVariantLookup(clinvarPath, targetGenes);
  results.push(lookupResult);
  console.log(`  Gene Lookup: ${lookupResult.variantsPerSec.toFixed(0)} variants/sec`);

  return results;
}

// Export types
export type { ClinVarVariant, ClassificationResult, ClinVarBenchmarkResult };
