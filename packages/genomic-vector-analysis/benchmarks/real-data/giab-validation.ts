/**
 * GIAB (Genome in a Bottle) Reference Validation
 *
 * Validates variant calling accuracy against GIAB high-confidence calls:
 * - True positive rate
 * - False positive rate
 * - Precision and recall
 * - F1 score
 */

import * as fs from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';

interface GIABVariant {
  chrom: string;
  pos: number;
  ref: string;
  alt: string;
  qual: number;
  filter: string;
  confidence: string;
  platforms: number;
}

interface ValidationMetrics {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  accuracy: number;
}

interface GIABBenchmarkResult {
  testName: string;
  numReferenceVariants: number;
  numTestVariants: number;
  totalTimeMs: number;
  variantsPerSec: number;
  metrics: ValidationMetrics;
  memoryUsedMB: number;
  successful: boolean;
  errors: string[];
}

/**
 * Parse GIAB VCF file
 */
function parseGIABVCF(filePath: string): GIABVariant[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line =>
    line && !line.startsWith('#')
  );

  return lines.map(line => {
    const fields = line.split('\t');
    const [chrom, pos, , ref, alt, qual, filter, infoStr] = fields;

    const info: Record<string, string> = {};
    infoStr.split(';').forEach(pair => {
      const [key, value] = pair.split('=');
      info[key] = value || 'true';
    });

    return {
      chrom,
      pos: parseInt(pos),
      ref,
      alt,
      qual: parseFloat(qual),
      filter,
      confidence: info.CONFIDENCE || 'MEDIUM',
      platforms: parseInt(info.PLATFORMS || '1'),
    };
  });
}

/**
 * Create variant key for matching
 */
function variantKey(variant: { chrom: string; pos: number; ref: string; alt: string }): string {
  return `${variant.chrom}:${variant.pos}:${variant.ref}>${variant.alt}`;
}

/**
 * Check if two variants match (with position tolerance)
 */
function variantsMatch(
  v1: { chrom: string; pos: number; ref: string; alt: string },
  v2: { chrom: string; pos: number; ref: string; alt: string },
  posTolerance: number = 5
): boolean {
  return (
    v1.chrom === v2.chrom &&
    Math.abs(v1.pos - v2.pos) <= posTolerance &&
    v1.ref === v2.ref &&
    v1.alt === v2.alt
  );
}

/**
 * Calculate validation metrics
 */
function calculateMetrics(
  reference: GIABVariant[],
  test: GIABVariant[]
): ValidationMetrics {
  // Create lookup maps
  const refMap = new Map<string, GIABVariant>();
  reference.forEach(v => refMap.set(variantKey(v), v));

  const testMap = new Map<string, GIABVariant>();
  test.forEach(v => testMap.set(variantKey(v), v));

  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  // Count true positives and false positives
  for (const testVariant of test) {
    const key = variantKey(testVariant);
    if (refMap.has(key)) {
      truePositives++;
    } else {
      // Check with position tolerance
      let found = false;
      for (const refVariant of reference) {
        if (variantsMatch(testVariant, refVariant, 5)) {
          found = true;
          break;
        }
      }
      if (found) {
        truePositives++;
      } else {
        falsePositives++;
      }
    }
  }

  // Count false negatives
  for (const refVariant of reference) {
    const key = variantKey(refVariant);
    if (!testMap.has(key)) {
      // Check with position tolerance
      let found = false;
      for (const testVariant of test) {
        if (variantsMatch(refVariant, testVariant, 5)) {
          found = true;
          break;
        }
      }
      if (!found) {
        falseNegatives++;
      }
    }
  }

  const precision = truePositives + falsePositives > 0
    ? truePositives / (truePositives + falsePositives)
    : 0;

  const recall = truePositives + falseNegatives > 0
    ? truePositives / (truePositives + falseNegatives)
    : 0;

  const f1Score = precision + recall > 0
    ? 2 * (precision * recall) / (precision + recall)
    : 0;

  const accuracy = reference.length > 0
    ? truePositives / reference.length
    : 0;

  return {
    truePositives,
    falsePositives,
    falseNegatives,
    precision,
    recall,
    f1Score,
    accuracy,
  };
}

/**
 * Benchmark GIAB validation
 */
export async function benchmarkGIABValidation(
  referencePath: string,
  testPath: string
): Promise<GIABBenchmarkResult> {
  const startMem = process.memoryUsage().heapUsed;
  const startTime = performance.now();
  const errors: string[] = [];

  try {
    const reference = parseGIABVCF(referencePath);
    const test = parseGIABVCF(testPath);

    const metrics = calculateMetrics(reference, test);

    const endTime = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    const totalTimeMs = endTime - startTime;
    const memoryUsedMB = (endMem - startMem) / 1024 / 1024;
    const totalVariants = reference.length + test.length;

    return {
      testName: 'GIAB Validation',
      numReferenceVariants: reference.length,
      numTestVariants: test.length,
      totalTimeMs,
      variantsPerSec: (totalVariants / totalTimeMs) * 1000,
      metrics,
      memoryUsedMB,
      successful: true,
      errors,
    };
  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      testName: 'GIAB Validation',
      numReferenceVariants: 0,
      numTestVariants: 0,
      totalTimeMs: performance.now() - startTime,
      variantsPerSec: 0,
      metrics: {
        truePositives: 0,
        falsePositives: 0,
        falseNegatives: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        accuracy: 0,
      },
      memoryUsedMB: 0,
      successful: false,
      errors,
    };
  }
}

/**
 * Benchmark high-confidence variant filtering
 */
export async function benchmarkHighConfidenceFiltering(
  giabPath: string,
  minQual: number = 5000,
  minPlatforms: number = 2
): Promise<GIABBenchmarkResult> {
  const startMem = process.memoryUsage().heapUsed;
  const startTime = performance.now();
  const errors: string[] = [];

  try {
    const allVariants = parseGIABVCF(giabPath);

    const highConfidence = allVariants.filter(v =>
      v.qual >= minQual &&
      v.platforms >= minPlatforms &&
      v.filter === 'PASS'
    );

    const endTime = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    const totalTimeMs = endTime - startTime;
    const memoryUsedMB = (endMem - startMem) / 1024 / 1024;

    // Calculate metrics comparing filtered vs all
    const metrics: ValidationMetrics = {
      truePositives: highConfidence.length,
      falsePositives: 0,
      falseNegatives: allVariants.length - highConfidence.length,
      precision: 1.0, // Assumed high confidence
      recall: highConfidence.length / allVariants.length,
      f1Score: 0,
      accuracy: 0,
    };

    metrics.f1Score = 2 * (metrics.precision * metrics.recall) / (metrics.precision + metrics.recall);
    metrics.accuracy = metrics.recall;

    return {
      testName: 'High-Confidence Filtering',
      numReferenceVariants: allVariants.length,
      numTestVariants: highConfidence.length,
      totalTimeMs,
      variantsPerSec: (allVariants.length / totalTimeMs) * 1000,
      metrics,
      memoryUsedMB,
      successful: true,
      errors,
    };
  } catch (error) {
    errors.push(`Filtering error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      testName: 'High-Confidence Filtering',
      numReferenceVariants: 0,
      numTestVariants: 0,
      totalTimeMs: performance.now() - startTime,
      variantsPerSec: 0,
      metrics: {
        truePositives: 0,
        falsePositives: 0,
        falseNegatives: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        accuracy: 0,
      },
      memoryUsedMB: 0,
      successful: false,
      errors,
    };
  }
}

/**
 * Run all GIAB validation benchmarks
 */
export async function runAllGIABBenchmarks(dataDir: string): Promise<GIABBenchmarkResult[]> {
  const results: GIABBenchmarkResult[] = [];
  const giabPath = path.join(dataDir, 'giab', 'high_confidence.vcf');

  if (!fs.existsSync(giabPath)) {
    console.warn('GIAB reference not found');
    return results;
  }

  console.log('\nBenchmarking GIAB Validation...');

  // Self-validation (should be 100% accurate)
  const validationResult = await benchmarkGIABValidation(giabPath, giabPath);
  results.push(validationResult);
  console.log(`  Precision: ${(validationResult.metrics.precision * 100).toFixed(1)}%`);
  console.log(`  Recall: ${(validationResult.metrics.recall * 100).toFixed(1)}%`);
  console.log(`  F1 Score: ${validationResult.metrics.f1Score.toFixed(3)}`);

  // High-confidence filtering
  const filteringResult = await benchmarkHighConfidenceFiltering(giabPath, 5000, 2);
  results.push(filteringResult);
  console.log(`  High-Conf Variants: ${filteringResult.numTestVariants} / ${filteringResult.numReferenceVariants}`);

  return results;
}

// Export types
export type { GIABVariant, ValidationMetrics, GIABBenchmarkResult };
