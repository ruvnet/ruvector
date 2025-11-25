/**
 * End-to-End Pipeline Benchmark
 *
 * Comprehensive benchmark of complete genomic analysis pipeline:
 * - VCF ingestion → Embedding → Database → Query → Classification
 * - Multi-modal queries (phenotype + variants)
 * - Clinical decision support simulation
 * - Real-time NICU diagnostic workflow
 */

import * as fs from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';
import type { BenchmarkResult } from './vcf-benchmark';
import type { ClinVarBenchmarkResult } from './clinvar-benchmark';
import type { PhenotypeBenchmarkResult } from './phenotype-benchmark';

interface PipelineStage {
  name: string;
  durationMs: number;
  throughput: number;
  memoryDeltaMB: number;
  successful: boolean;
}

interface EndToEndResult {
  testName: string;
  totalDurationMs: number;
  stages: PipelineStage[];
  overallThroughput: number;
  peakMemoryMB: number;
  successful: boolean;
  errors: string[];
}

interface ClinicalCase {
  patientId: string;
  urgency: 'Critical' | 'Standard';
  phenotypes: string[];
  variants: number;
  processingTimeMs: number;
  diagnosis: string;
  confidence: number;
}

/**
 * Simulate VCF ingestion stage
 */
async function stageVCFIngestion(vcfPath: string): Promise<PipelineStage> {
  const startMem = process.memoryUsage().heapUsed;
  const startTime = performance.now();

  try {
    // Read and parse VCF
    const content = fs.readFileSync(vcfPath, 'utf-8');
    const lines = content.split('\n').filter(l => l && !l.startsWith('#'));
    const variantCount = lines.length;

    const endTime = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    return {
      name: 'VCF Ingestion',
      durationMs: endTime - startTime,
      throughput: (variantCount / (endTime - startTime)) * 1000,
      memoryDeltaMB: (endMem - startMem) / 1024 / 1024,
      successful: true,
    };
  } catch (error) {
    return {
      name: 'VCF Ingestion',
      durationMs: performance.now() - startTime,
      throughput: 0,
      memoryDeltaMB: 0,
      successful: false,
    };
  }
}

/**
 * Simulate embedding generation stage
 */
async function stageEmbeddingGeneration(numVariants: number): Promise<PipelineStage> {
  const startMem = process.memoryUsage().heapUsed;
  const startTime = performance.now();

  try {
    // Simulate k-mer embedding generation
    const embeddings: number[][] = [];
    for (let i = 0; i < numVariants; i++) {
      const embedding = new Array(384).fill(0).map(() => Math.random());
      embeddings.push(embedding);
    }

    const endTime = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    return {
      name: 'Embedding Generation',
      durationMs: endTime - startTime,
      throughput: (numVariants / (endTime - startTime)) * 1000,
      memoryDeltaMB: (endMem - startMem) / 1024 / 1024,
      successful: true,
    };
  } catch (error) {
    return {
      name: 'Embedding Generation',
      durationMs: performance.now() - startTime,
      throughput: 0,
      memoryDeltaMB: 0,
      successful: false,
    };
  }
}

/**
 * Simulate database indexing stage
 */
async function stageDatabaseIndexing(numVariants: number): Promise<PipelineStage> {
  const startMem = process.memoryUsage().heapUsed;
  const startTime = performance.now();

  try {
    // Simulate HNSW index construction
    const index = new Map<string, number[]>();
    for (let i = 0; i < numVariants; i++) {
      const embedding = new Array(384).fill(0).map(() => Math.random());
      index.set(`variant_${i}`, embedding);
    }

    const endTime = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    return {
      name: 'Database Indexing',
      durationMs: endTime - startTime,
      throughput: (numVariants / (endTime - startTime)) * 1000,
      memoryDeltaMB: (endMem - startMem) / 1024 / 1024,
      successful: true,
    };
  } catch (error) {
    return {
      name: 'Database Indexing',
      durationMs: performance.now() - startTime,
      throughput: 0,
      memoryDeltaMB: 0,
      successful: false,
    };
  }
}

/**
 * Simulate query processing stage
 */
async function stageQueryProcessing(numQueries: number): Promise<PipelineStage> {
  const startMem = process.memoryUsage().heapUsed;
  const startTime = performance.now();

  try {
    // Simulate vector similarity searches
    const results = [];
    for (let i = 0; i < numQueries; i++) {
      const queryVector = new Array(384).fill(0).map(() => Math.random());

      // Simulate k-NN search
      const matches = [];
      for (let j = 0; j < 10; j++) {
        matches.push({
          id: `match_${j}`,
          score: Math.random(),
        });
      }
      results.push(matches);
    }

    const endTime = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    return {
      name: 'Query Processing',
      durationMs: endTime - startTime,
      throughput: (numQueries / (endTime - startTime)) * 1000,
      memoryDeltaMB: (endMem - startMem) / 1024 / 1024,
      successful: true,
    };
  } catch (error) {
    return {
      name: 'Query Processing',
      durationMs: performance.now() - startTime,
      throughput: 0,
      memoryDeltaMB: 0,
      successful: false,
    };
  }
}

/**
 * Simulate clinical classification stage
 */
async function stageClinicalClassification(numVariants: number): Promise<PipelineStage> {
  const startMem = process.memoryUsage().heapUsed;
  const startTime = performance.now();

  try {
    // Simulate pathogenicity classification
    const classifications = [];
    for (let i = 0; i < numVariants; i++) {
      const score = Math.random();
      const significance = score > 0.7 ? 'Pathogenic' :
                          score > 0.5 ? 'Likely pathogenic' :
                          score > 0.3 ? 'Uncertain' :
                          'Likely benign';
      classifications.push({ variant: i, significance, score });
    }

    const endTime = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    return {
      name: 'Clinical Classification',
      durationMs: endTime - startTime,
      throughput: (numVariants / (endTime - startTime)) * 1000,
      memoryDeltaMB: (endMem - startMem) / 1024 / 1024,
      successful: true,
    };
  } catch (error) {
    return {
      name: 'Clinical Classification',
      durationMs: performance.now() - startTime,
      throughput: 0,
      memoryDeltaMB: 0,
      successful: false,
    };
  }
}

/**
 * Run complete end-to-end pipeline
 */
export async function benchmarkEndToEndPipeline(
  vcfPath: string,
  numQueries: number = 100
): Promise<EndToEndResult> {
  const startTime = performance.now();
  const errors: string[] = [];
  const stages: PipelineStage[] = [];

  try {
    // Stage 1: VCF Ingestion
    const ingestionStage = await stageVCFIngestion(vcfPath);
    stages.push(ingestionStage);

    if (!ingestionStage.successful) {
      throw new Error('VCF ingestion failed');
    }

    // Estimate variant count from file
    const content = fs.readFileSync(vcfPath, 'utf-8');
    const variantCount = content.split('\n').filter(l => l && !l.startsWith('#')).length;

    // Stage 2: Embedding Generation
    const embeddingStage = await stageEmbeddingGeneration(variantCount);
    stages.push(embeddingStage);

    // Stage 3: Database Indexing
    const indexingStage = await stageDatabaseIndexing(variantCount);
    stages.push(indexingStage);

    // Stage 4: Query Processing
    const queryStage = await stageQueryProcessing(numQueries);
    stages.push(queryStage);

    // Stage 5: Clinical Classification
    const classificationStage = await stageClinicalClassification(variantCount);
    stages.push(classificationStage);

    const endTime = performance.now();
    const totalDurationMs = endTime - startTime;
    const peakMemoryMB = Math.max(...stages.map(s => s.memoryDeltaMB));
    const overallThroughput = (variantCount / totalDurationMs) * 1000;

    return {
      testName: 'End-to-End Pipeline',
      totalDurationMs,
      stages,
      overallThroughput,
      peakMemoryMB,
      successful: stages.every(s => s.successful),
      errors,
    };
  } catch (error) {
    errors.push(`Pipeline error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      testName: 'End-to-End Pipeline',
      totalDurationMs: performance.now() - startTime,
      stages,
      overallThroughput: 0,
      peakMemoryMB: 0,
      successful: false,
      errors,
    };
  }
}

/**
 * Benchmark real-time NICU workflow
 */
export async function benchmarkNICUWorkflow(
  patientsPath: string
): Promise<EndToEndResult> {
  const startTime = performance.now();
  const errors: string[] = [];
  const stages: PipelineStage[] = [];

  try {
    const startMem = process.memoryUsage().heapUsed;

    // Load patient cases
    const content = fs.readFileSync(patientsPath, 'utf-8');
    const patients = JSON.parse(content);

    // Process each patient case
    const cases: ClinicalCase[] = [];

    for (const patient of patients) {
      const caseStartTime = performance.now();

      // Simulate phenotype analysis
      const phenotypeScore = Math.random();

      // Simulate variant analysis
      const variantScore = Math.random();

      // Combined diagnostic score
      const confidence = (phenotypeScore + variantScore) / 2;
      const diagnosis = confidence > 0.7 ? 'Confirmed genetic disorder' : 'Under investigation';

      cases.push({
        patientId: patient.id,
        urgency: patient.urgency,
        phenotypes: patient.phenotypes.map((p: any) => p.id),
        variants: patient.variants.length,
        processingTimeMs: performance.now() - caseStartTime,
        diagnosis,
        confidence,
      });
    }

    const endMem = process.memoryUsage().heapUsed;
    const totalDurationMs = performance.now() - startTime;

    // Categorize by urgency
    const criticalCases = cases.filter(c => c.urgency === 'Critical');
    const standardCases = cases.filter(c => c.urgency === 'Standard');

    stages.push({
      name: 'Critical Cases',
      durationMs: criticalCases.reduce((sum, c) => sum + c.processingTimeMs, 0),
      throughput: criticalCases.length / (totalDurationMs / 1000),
      memoryDeltaMB: (endMem - startMem) / 1024 / 1024 / 2,
      successful: true,
    });

    stages.push({
      name: 'Standard Cases',
      durationMs: standardCases.reduce((sum, c) => sum + c.processingTimeMs, 0),
      throughput: standardCases.length / (totalDurationMs / 1000),
      memoryDeltaMB: (endMem - startMem) / 1024 / 1024 / 2,
      successful: true,
    });

    return {
      testName: 'NICU Workflow',
      totalDurationMs,
      stages,
      overallThroughput: (cases.length / totalDurationMs) * 1000,
      peakMemoryMB: (endMem - startMem) / 1024 / 1024,
      successful: true,
      errors,
    };
  } catch (error) {
    errors.push(`NICU workflow error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      testName: 'NICU Workflow',
      totalDurationMs: performance.now() - startTime,
      stages,
      overallThroughput: 0,
      peakMemoryMB: 0,
      successful: false,
      errors,
    };
  }
}

/**
 * Run all end-to-end benchmarks
 */
export async function runAllEndToEndBenchmarks(dataDir: string): Promise<EndToEndResult[]> {
  const results: EndToEndResult[] = [];

  console.log('\nBenchmarking End-to-End Pipelines...');

  // Test with different VCF sizes
  const vcfSizes = ['1k', '10k'];
  for (const size of vcfSizes) {
    const vcfPath = path.join(dataDir, 'vcf', `test_${size}.vcf`);
    if (fs.existsSync(vcfPath)) {
      const result = await benchmarkEndToEndPipeline(vcfPath, 100);
      results.push(result);
      console.log(`  ${size} Pipeline: ${result.overallThroughput.toFixed(0)} variants/sec`);
      console.log(`    Total time: ${result.totalDurationMs.toFixed(0)}ms`);
    }
  }

  // NICU workflow
  const patientsPath = path.join(dataDir, 'patients', 'nicu_cases.json');
  if (fs.existsSync(patientsPath)) {
    const nicuResult = await benchmarkNICUWorkflow(patientsPath);
    results.push(nicuResult);
    console.log(`  NICU Workflow: ${nicuResult.overallThroughput.toFixed(2)} cases/sec`);
  }

  return results;
}

// Export types
export type { PipelineStage, EndToEndResult, ClinicalCase };
