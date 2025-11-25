/**
 * HPO Phenotype Matching Benchmark
 *
 * Benchmarks phenotype-based similarity search:
 * - HPO term matching performance
 * - Patient phenotype profile similarity
 * - Gene-phenotype association lookup
 * - Diagnostic prediction accuracy
 */

import * as fs from 'fs';
import * as path from 'path';
import { performance } from 'perf_hooks';

interface HPOTerm {
  id: string;
  name: string;
  category: string;
}

interface PatientProfile {
  id: string;
  gestationalAge: number;
  birthWeight: number;
  phenotypes: HPOTerm[];
  variants: Array<{
    chrom: string;
    pos: number;
    ref: string;
    alt: string;
    gene: string;
  }>;
  diagnosis: string;
  urgency: string;
}

interface PhenotypeSimilarity {
  patientId: string;
  matchId: string;
  similarity: number;
  sharedPhenotypes: HPOTerm[];
  processingTimeMs: number;
}

interface PhenotypeBenchmarkResult {
  testName: string;
  numPatients: number;
  totalTimeMs: number;
  patientsPerSec: number;
  avgLatencyMs: number;
  avgSimilarity: number;
  memoryUsedMB: number;
  topMatchAccuracy: number;
  successful: boolean;
  errors: string[];
}

/**
 * Load HPO dataset
 */
function loadHPODataset(filePath: string): {
  terms: HPOTerm[];
  associations: any[];
} {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Load patient profiles
 */
function loadPatientProfiles(filePath: string): PatientProfile[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Calculate Jaccard similarity between two phenotype sets
 */
function calculateJaccardSimilarity(phenotypes1: HPOTerm[], phenotypes2: HPOTerm[]): number {
  const set1 = new Set(phenotypes1.map(p => p.id));
  const set2 = new Set(phenotypes2.map(p => p.id));

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Calculate semantic similarity using category matching
 */
function calculateSemanticSimilarity(phenotypes1: HPOTerm[], phenotypes2: HPOTerm[]): number {
  const categories1 = phenotypes1.map(p => p.category);
  const categories2 = phenotypes2.map(p => p.category);

  const categorySet1 = new Set(categories1);
  const categorySet2 = new Set(categories2);

  const intersection = new Set([...categorySet1].filter(x => categorySet2.has(x)));
  const union = new Set([...categorySet1, ...categorySet2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Find similar patients based on phenotype
 */
function findSimilarPatients(
  patient: PatientProfile,
  database: PatientProfile[],
  k: number = 5
): PhenotypeSimilarity[] {
  const startTime = performance.now();

  const similarities = database
    .filter(p => p.id !== patient.id)
    .map(candidate => {
      const jaccardSim = calculateJaccardSimilarity(patient.phenotypes, candidate.phenotypes);
      const semanticSim = calculateSemanticSimilarity(patient.phenotypes, candidate.phenotypes);
      const similarity = (jaccardSim * 0.6 + semanticSim * 0.4); // Weighted combination

      const sharedPhenotypes = patient.phenotypes.filter(p1 =>
        candidate.phenotypes.some(p2 => p2.id === p1.id)
      );

      return {
        patientId: patient.id,
        matchId: candidate.id,
        similarity,
        sharedPhenotypes,
        processingTimeMs: 0,
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);

  const processingTimeMs = performance.now() - startTime;

  // Update processing time for all results
  similarities.forEach(s => s.processingTimeMs = processingTimeMs / similarities.length);

  return similarities;
}

/**
 * Benchmark phenotype matching
 */
export async function benchmarkPhenotypeMatching(
  patientsPath: string,
  k: number = 5
): Promise<PhenotypeBenchmarkResult> {
  const startMem = process.memoryUsage().heapUsed;
  const startTime = performance.now();
  const errors: string[] = [];

  try {
    const patients = loadPatientProfiles(patientsPath);

    let totalSimilarity = 0;
    let totalComparisons = 0;
    let correctTopMatches = 0;

    // For each patient, find similar patients
    for (const patient of patients) {
      const similar = findSimilarPatients(patient, patients, k);

      similar.forEach(s => {
        totalSimilarity += s.similarity;
        totalComparisons++;
      });

      // Check if top match shares diagnosis (for accuracy)
      if (similar.length > 0) {
        const topMatch = patients.find(p => p.id === similar[0].matchId);
        if (topMatch && topMatch.diagnosis === patient.diagnosis) {
          correctTopMatches++;
        }
      }
    }

    const endTime = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    const totalTimeMs = endTime - startTime;
    const memoryUsedMB = (endMem - startMem) / 1024 / 1024;
    const avgSimilarity = totalComparisons > 0 ? totalSimilarity / totalComparisons : 0;
    const topMatchAccuracy = patients.length > 0 ? correctTopMatches / patients.length : 0;

    return {
      testName: 'Phenotype Matching',
      numPatients: patients.length,
      totalTimeMs,
      patientsPerSec: (patients.length / totalTimeMs) * 1000,
      avgLatencyMs: totalTimeMs / patients.length,
      avgSimilarity,
      memoryUsedMB,
      topMatchAccuracy,
      successful: true,
      errors,
    };
  } catch (error) {
    errors.push(`Matching error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      testName: 'Phenotype Matching',
      numPatients: 0,
      totalTimeMs: performance.now() - startTime,
      patientsPerSec: 0,
      avgLatencyMs: 0,
      avgSimilarity: 0,
      memoryUsedMB: 0,
      topMatchAccuracy: 0,
      successful: false,
      errors,
    };
  }
}

/**
 * Benchmark HPO term lookup
 */
export async function benchmarkHPOTermLookup(
  hpoPath: string,
  numQueries: number = 100
): Promise<PhenotypeBenchmarkResult> {
  const startMem = process.memoryUsage().heapUsed;
  const startTime = performance.now();
  const errors: string[] = [];

  try {
    const hpoData = loadHPODataset(hpoPath);
    const { terms, associations } = hpoData;

    // Random HPO term queries
    const queries = Array.from({ length: numQueries }, () =>
      terms[Math.floor(Math.random() * terms.length)]
    );

    let totalResults = 0;

    for (const query of queries) {
      // Find gene associations for this HPO term
      const geneAssociations = associations.filter(a => a.hpoId === query.id);
      totalResults += geneAssociations.length;

      // Find similar terms in same category
      const similarTerms = terms.filter(t =>
        t.category === query.category && t.id !== query.id
      );
      totalResults += similarTerms.length;
    }

    const endTime = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    const totalTimeMs = endTime - startTime;
    const memoryUsedMB = (endMem - startMem) / 1024 / 1024;

    return {
      testName: 'HPO Term Lookup',
      numPatients: numQueries,
      totalTimeMs,
      patientsPerSec: (numQueries / totalTimeMs) * 1000,
      avgLatencyMs: totalTimeMs / numQueries,
      avgSimilarity: totalResults / numQueries,
      memoryUsedMB,
      topMatchAccuracy: 1.0, // N/A for lookup
      successful: true,
      errors,
    };
  } catch (error) {
    errors.push(`Lookup error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      testName: 'HPO Term Lookup',
      numPatients: 0,
      totalTimeMs: performance.now() - startTime,
      patientsPerSec: 0,
      avgLatencyMs: 0,
      avgSimilarity: 0,
      memoryUsedMB: 0,
      topMatchAccuracy: 0,
      successful: false,
      errors,
    };
  }
}

/**
 * Benchmark diagnostic prediction
 */
export async function benchmarkDiagnosticPrediction(
  patientsPath: string
): Promise<PhenotypeBenchmarkResult> {
  const startMem = process.memoryUsage().heapUsed;
  const startTime = performance.now();
  const errors: string[] = [];

  try {
    const patients = loadPatientProfiles(patientsPath);

    // Split into training (80%) and test (20%)
    const shuffled = [...patients].sort(() => Math.random() - 0.5);
    const splitPoint = Math.floor(shuffled.length * 0.8);
    const training = shuffled.slice(0, splitPoint);
    const test = shuffled.slice(splitPoint);

    let correctPredictions = 0;

    // For each test patient, predict diagnosis based on similar training patients
    for (const testPatient of test) {
      const similar = findSimilarPatients(testPatient, training, 3);

      if (similar.length > 0) {
        // Most common diagnosis among similar patients
        const diagnosisCounts: Record<string, number> = {};
        for (const match of similar) {
          const matchPatient = training.find(p => p.id === match.matchId);
          if (matchPatient) {
            diagnosisCounts[matchPatient.diagnosis] =
              (diagnosisCounts[matchPatient.diagnosis] || 0) + 1;
          }
        }

        const entries = Object.entries(diagnosisCounts);
        entries.sort((a, b) => b[1] - a[1]);
        const predictedDiagnosis = entries[0][0];

        if (predictedDiagnosis === testPatient.diagnosis) {
          correctPredictions++;
        }
      }
    }

    const endTime = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    const totalTimeMs = endTime - startTime;
    const memoryUsedMB = (endMem - startMem) / 1024 / 1024;
    const accuracy = test.length > 0 ? correctPredictions / test.length : 0;

    return {
      testName: 'Diagnostic Prediction',
      numPatients: test.length,
      totalTimeMs,
      patientsPerSec: (test.length / totalTimeMs) * 1000,
      avgLatencyMs: totalTimeMs / test.length,
      avgSimilarity: 0, // N/A
      memoryUsedMB,
      topMatchAccuracy: accuracy,
      successful: true,
      errors,
    };
  } catch (error) {
    errors.push(`Prediction error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      testName: 'Diagnostic Prediction',
      numPatients: 0,
      totalTimeMs: performance.now() - startTime,
      patientsPerSec: 0,
      avgLatencyMs: 0,
      avgSimilarity: 0,
      memoryUsedMB: 0,
      topMatchAccuracy: 0,
      successful: false,
      errors,
    };
  }
}

/**
 * Run all phenotype benchmarks
 */
export async function runAllPhenotypeBenchmarks(dataDir: string): Promise<PhenotypeBenchmarkResult[]> {
  const results: PhenotypeBenchmarkResult[] = [];

  const patientsPath = path.join(dataDir, 'patients', 'nicu_cases.json');
  const hpoPath = path.join(dataDir, 'hpo', 'phenotype_dataset.json');

  console.log('\nBenchmarking Phenotype Analysis...');

  if (fs.existsSync(patientsPath)) {
    const matchingResult = await benchmarkPhenotypeMatching(patientsPath, 5);
    results.push(matchingResult);
    console.log(`  Matching: ${matchingResult.patientsPerSec.toFixed(0)} patients/sec`);
    console.log(`  Avg Similarity: ${matchingResult.avgSimilarity.toFixed(3)}`);

    const predictionResult = await benchmarkDiagnosticPrediction(patientsPath);
    results.push(predictionResult);
    console.log(`  Prediction Accuracy: ${(predictionResult.topMatchAccuracy * 100).toFixed(1)}%`);
  }

  if (fs.existsSync(hpoPath)) {
    const lookupResult = await benchmarkHPOTermLookup(hpoPath, 100);
    results.push(lookupResult);
    console.log(`  HPO Lookup: ${lookupResult.patientsPerSec.toFixed(0)} queries/sec`);
  }

  return results;
}

// Export types
export type { HPOTerm, PatientProfile, PhenotypeSimilarity, PhenotypeBenchmarkResult };
