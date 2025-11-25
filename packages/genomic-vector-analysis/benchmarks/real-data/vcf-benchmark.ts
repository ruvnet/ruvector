/**
 * VCF Processing Benchmark
 *
 * Benchmarks real VCF file processing performance:
 * - Parsing speed
 * - Variant embedding generation
 * - Database insertion throughput
 * - Query latency
 * - Memory usage
 */

import * as fs from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';

interface VCFVariant {
  chrom: string;
  pos: number;
  ref: string;
  alt: string;
  qual: number;
  filter: string;
  info: Record<string, string>;
}

interface BenchmarkResult {
  testName: string;
  numVariants: number;
  totalTimeMs: number;
  variantsPerSec: number;
  avgLatencyMs: number;
  memoryUsedMB: number;
  successful: boolean;
  errors: string[];
}

/**
 * Parse VCF file
 */
function parseVCF(filePath: string): VCFVariant[] {
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
      info,
    };
  });
}

/**
 * Generate variant embedding (k-mer based)
 */
function generateVariantEmbedding(variant: VCFVariant, k: number = 6): number[] {
  const sequence = variant.ref + variant.alt;
  const kmers = new Set<string>();

  for (let i = 0; i <= sequence.length - k; i++) {
    kmers.add(sequence.slice(i, i + k));
  }

  // Simple hash-based embedding (384 dimensions)
  const embedding = new Array(384).fill(0);
  for (const kmer of kmers) {
    const hash = simpleHash(kmer);
    const idx = hash % 384;
    embedding[idx] += 1;
  }

  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / (magnitude || 1));
}

/**
 * Simple string hash function
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Benchmark VCF parsing
 */
export async function benchmarkVCFParsing(vcfPath: string): Promise<BenchmarkResult> {
  const startMem = process.memoryUsage().heapUsed;
  const startTime = performance.now();
  const errors: string[] = [];

  try {
    const variants = parseVCF(vcfPath);
    const endTime = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    const totalTimeMs = endTime - startTime;
    const memoryUsedMB = (endMem - startMem) / 1024 / 1024;

    return {
      testName: 'VCF Parsing',
      numVariants: variants.length,
      totalTimeMs,
      variantsPerSec: (variants.length / totalTimeMs) * 1000,
      avgLatencyMs: totalTimeMs / variants.length,
      memoryUsedMB,
      successful: true,
      errors,
    };
  } catch (error) {
    errors.push(`Parsing error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      testName: 'VCF Parsing',
      numVariants: 0,
      totalTimeMs: performance.now() - startTime,
      variantsPerSec: 0,
      avgLatencyMs: 0,
      memoryUsedMB: 0,
      successful: false,
      errors,
    };
  }
}

/**
 * Benchmark variant embedding generation
 */
export async function benchmarkEmbedding(vcfPath: string): Promise<BenchmarkResult> {
  const startMem = process.memoryUsage().heapUsed;
  const startTime = performance.now();
  const errors: string[] = [];

  try {
    const variants = parseVCF(vcfPath);
    const embeddings = variants.map(v => generateVariantEmbedding(v));

    const endTime = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    const totalTimeMs = endTime - startTime;
    const memoryUsedMB = (endMem - startMem) / 1024 / 1024;

    return {
      testName: 'Embedding Generation',
      numVariants: variants.length,
      totalTimeMs,
      variantsPerSec: (variants.length / totalTimeMs) * 1000,
      avgLatencyMs: totalTimeMs / variants.length,
      memoryUsedMB,
      successful: true,
      errors,
    };
  } catch (error) {
    errors.push(`Embedding error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      testName: 'Embedding Generation',
      numVariants: 0,
      totalTimeMs: performance.now() - startTime,
      variantsPerSec: 0,
      avgLatencyMs: 0,
      memoryUsedMB: 0,
      successful: false,
      errors,
    };
  }
}

/**
 * Benchmark end-to-end VCF processing
 */
export async function benchmarkEndToEnd(vcfPath: string): Promise<BenchmarkResult> {
  const startMem = process.memoryUsage().heapUsed;
  const startTime = performance.now();
  const errors: string[] = [];

  try {
    // Parse VCF
    const variants = parseVCF(vcfPath);

    // Generate embeddings
    const embeddings = variants.map(v => generateVariantEmbedding(v));

    // Simulate database operations (in-memory for benchmark)
    const database = new Map<string, { variant: VCFVariant; embedding: number[] }>();

    for (let i = 0; i < variants.length; i++) {
      const id = `${variants[i].chrom}:${variants[i].pos}:${variants[i].ref}>${variants[i].alt}`;
      database.set(id, { variant: variants[i], embedding: embeddings[i] });
    }

    // Simulate query operations
    const numQueries = Math.min(100, variants.length);
    const queryIndices = Array.from({ length: numQueries }, () =>
      Math.floor(Math.random() * variants.length)
    );

    for (const idx of queryIndices) {
      const queryEmbedding = embeddings[idx];
      // Simple cosine similarity search
      let bestMatch = { id: '', similarity: -1 };

      for (const [id, entry] of database.entries()) {
        const similarity = cosineSimilarity(queryEmbedding, entry.embedding);
        if (similarity > bestMatch.similarity) {
          bestMatch = { id, similarity };
        }
      }
    }

    const endTime = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    const totalTimeMs = endTime - startTime;
    const memoryUsedMB = (endMem - startMem) / 1024 / 1024;

    return {
      testName: 'End-to-End Processing',
      numVariants: variants.length,
      totalTimeMs,
      variantsPerSec: (variants.length / totalTimeMs) * 1000,
      avgLatencyMs: totalTimeMs / variants.length,
      memoryUsedMB,
      successful: true,
      errors,
    };
  } catch (error) {
    errors.push(`End-to-end error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      testName: 'End-to-End Processing',
      numVariants: 0,
      totalTimeMs: performance.now() - startTime,
      variantsPerSec: 0,
      avgLatencyMs: 0,
      memoryUsedMB: 0,
      successful: false,
      errors,
    };
  }
}

/**
 * Calculate cosine similarity
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Run all VCF benchmarks
 */
export async function runAllVCFBenchmarks(vcfDir: string): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];

  const vcfFiles = [
    { name: '1K variants', path: path.join(vcfDir, 'test_1k.vcf') },
    { name: '10K variants', path: path.join(vcfDir, 'test_10k.vcf') },
    { name: '100K variants', path: path.join(vcfDir, 'test_100k.vcf') },
  ];

  for (const vcf of vcfFiles) {
    if (!fs.existsSync(vcf.path)) {
      console.warn(`Skipping ${vcf.name}: file not found`);
      continue;
    }

    console.log(`\nBenchmarking ${vcf.name}...`);

    const parsingResult = await benchmarkVCFParsing(vcf.path);
    results.push(parsingResult);
    console.log(`  Parsing: ${parsingResult.variantsPerSec.toFixed(0)} variants/sec`);

    const embeddingResult = await benchmarkEmbedding(vcf.path);
    results.push(embeddingResult);
    console.log(`  Embedding: ${embeddingResult.variantsPerSec.toFixed(0)} variants/sec`);

    const endToEndResult = await benchmarkEndToEnd(vcf.path);
    results.push(endToEndResult);
    console.log(`  End-to-End: ${endToEndResult.variantsPerSec.toFixed(0)} variants/sec`);
  }

  return results;
}

// Export types
export type { VCFVariant, BenchmarkResult };
