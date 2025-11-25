import type {
  Pattern,
  LearningMetrics,
  ClinicalCase,
} from '../types';
import { VectorDatabase } from '../core/VectorDatabase';

/**
 * Pattern recognition system for genomic data
 * Learns patterns from historical cases and improves over time
 */
export class PatternRecognizer {
  private db: VectorDatabase;
  private patterns: Map<string, Pattern>;
  private learningRate: number;
  private minConfidence: number;
  private minFrequency: number;

  constructor(
    db: VectorDatabase,
    options: {
      learningRate?: number;
      minConfidence?: number;
      minFrequency?: number;
    } = {}
  ) {
    this.db = db;
    this.patterns = new Map();
    this.learningRate = options.learningRate ?? 0.01;
    this.minConfidence = options.minConfidence ?? 0.7;
    this.minFrequency = options.minFrequency ?? 3;
  }

  /**
   * Train pattern recognizer from historical cases
   */
  async trainFromCases(cases: ClinicalCase[]): Promise<LearningMetrics> {
    let correctPredictions = 0;
    let totalPredictions = 0;

    // Extract patterns from cases
    const extractedPatterns = await this.extractPatterns(cases);

    // Validate patterns against known outcomes
    for (const clinicalCase of cases) {
      if (!clinicalCase.diagnosis) continue;

      // Find similar patterns
      const matchingPatterns = await this.findMatchingPatterns(clinicalCase);

      if (matchingPatterns.length > 0) {
        const predictedDiagnosis = matchingPatterns[0].metadata?.diagnosis;
        if (predictedDiagnosis === clinicalCase.diagnosis) {
          correctPredictions++;
        }
        totalPredictions++;
      }
    }

    // Update pattern confidence based on validation
    this.updatePatternConfidence(correctPredictions, totalPredictions);

    // Store high-confidence patterns
    for (const pattern of extractedPatterns) {
      if (
        pattern.confidence >= this.minConfidence &&
        pattern.frequency >= this.minFrequency
      ) {
        this.patterns.set(pattern.id, pattern);
      }
    }

    const accuracy = totalPredictions > 0
      ? correctPredictions / totalPredictions
      : 0;

    return {
      accuracy,
      precision: accuracy, // Simplified
      recall: accuracy,
      f1Score: accuracy,
      loss: 1 - accuracy,
      epoch: 1,
    };
  }

  /**
   * Extract patterns from clinical cases
   */
  private async extractPatterns(cases: ClinicalCase[]): Promise<Pattern[]> {
    const patterns: Pattern[] = [];
    const patternMap = new Map<string, {
      cases: ClinicalCase[];
      count: number;
    }>();

    // Group cases by diagnosis
    for (const clinicalCase of cases) {
      if (!clinicalCase.diagnosis) continue;

      const key = this.generatePatternKey(clinicalCase);
      const existing = patternMap.get(key);

      if (existing) {
        existing.cases.push(clinicalCase);
        existing.count++;
      } else {
        patternMap.set(key, {
          cases: [clinicalCase],
          count: 1,
        });
      }
    }

    // Create pattern objects
    for (const [key, data] of patternMap) {
      const pattern = await this.createPattern(key, data.cases, data.count);
      patterns.push(pattern);
    }

    return patterns;
  }

  /**
   * Generate a unique key for pattern grouping
   */
  private generatePatternKey(clinicalCase: ClinicalCase): string {
    // Combine diagnosis with top phenotypes
    const phenotypes = clinicalCase.phenotypes
      .slice(0, 3)
      .map(p => p.id)
      .sort()
      .join('-');

    return `${clinicalCase.diagnosis}:${phenotypes}`;
  }

  /**
   * Create a pattern from grouped cases
   */
  private async createPattern(
    key: string,
    cases: ClinicalCase[],
    frequency: number
  ): Promise<Pattern> {
    // Calculate centroid vector from all case vectors
    const vectors = await Promise.all(
      cases.map(c => this.getCaseVector(c))
    );

    const centroid = this.calculateCentroid(vectors);

    // Extract common characteristics
    const diagnosis = cases[0].diagnosis || 'unknown';
    const phenotypeIds = this.findCommonPhenotypes(cases);

    return {
      id: key,
      name: `Pattern: ${diagnosis}`,
      description: `Recurring pattern for ${diagnosis} with ${frequency} occurrences`,
      vectorRepresentation: centroid,
      frequency,
      confidence: this.calculateInitialConfidence(frequency, cases.length),
      examples: cases.slice(0, 5).map(c => c.id),
      metadata: {
        diagnosis,
        phenotypes: phenotypeIds,
        casesCount: cases.length,
      },
    };
  }

  /**
   * Get or create vector representation for a clinical case
   */
  private async getCaseVector(clinicalCase: ClinicalCase): Promise<number[]> {
    // Simplified: create a vector from phenotype features
    // In production, use proper embedding model
    const dimensions = 384; // Match common embedding size
    const vector = new Array(dimensions).fill(0);

    // Encode phenotypes
    for (const phenotype of clinicalCase.phenotypes) {
      const hash = this.hashString(phenotype.id);
      const idx = hash % dimensions;
      vector[idx] += 1;
    }

    // Encode variant features
    for (const variant of clinicalCase.variants) {
      const hash = this.hashString(`${variant.chromosome}:${variant.position}`);
      const idx = hash % dimensions;
      vector[idx] += 0.5;
    }

    // Normalize
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => norm > 0 ? val / norm : val);
  }

  /**
   * Calculate centroid from multiple vectors
   */
  private calculateCentroid(vectors: number[][]): Float32Array {
    if (vectors.length === 0) {
      return new Float32Array(384);
    }

    const dimensions = vectors[0].length;
    const centroid = new Array(dimensions).fill(0);

    for (const vector of vectors) {
      for (let i = 0; i < dimensions; i++) {
        centroid[i] += vector[i];
      }
    }

    // Average
    for (let i = 0; i < dimensions; i++) {
      centroid[i] /= vectors.length;
    }

    return new Float32Array(centroid);
  }

  /**
   * Find phenotypes common across cases
   */
  private findCommonPhenotypes(cases: ClinicalCase[]): string[] {
    const phenotypeCounts = new Map<string, number>();

    for (const clinicalCase of cases) {
      for (const phenotype of clinicalCase.phenotypes) {
        phenotypeCounts.set(
          phenotype.id,
          (phenotypeCounts.get(phenotype.id) || 0) + 1
        );
      }
    }

    // Return phenotypes that appear in >50% of cases
    const threshold = cases.length * 0.5;
    return Array.from(phenotypeCounts.entries())
      .filter(([_, count]) => count >= threshold)
      .map(([id, _]) => id);
  }

  /**
   * Calculate initial confidence based on frequency
   */
  private calculateInitialConfidence(frequency: number, total: number): number {
    // Higher frequency = higher initial confidence
    return Math.min(0.5 + (frequency / total) * 0.5, 0.95);
  }

  /**
   * Update pattern confidence based on validation results
   */
  private updatePatternConfidence(correct: number, total: number): void {
    const validationAccuracy = total > 0 ? correct / total : 0;

    for (const pattern of this.patterns.values()) {
      // Adjust confidence using gradient descent
      const adjustment = this.learningRate * (validationAccuracy - pattern.confidence);
      pattern.confidence = Math.max(0, Math.min(1, pattern.confidence + adjustment));
    }
  }

  /**
   * Find patterns matching a clinical case
   */
  async findMatchingPatterns(
    clinicalCase: ClinicalCase,
    k: number = 5
  ): Promise<Pattern[]> {
    const caseVector = await this.getCaseVector(clinicalCase);

    // Search for similar patterns in vector database
    const results = await this.db.search(caseVector, {
      k,
      threshold: this.minConfidence,
    });

    // Map results to patterns
    const patterns: Pattern[] = [];
    for (const result of results) {
      const pattern = this.patterns.get(result.id);
      if (pattern) {
        patterns.push({
          ...pattern,
          metadata: {
            ...pattern.metadata,
            similarity: result.score,
          },
        });
      }
    }

    return patterns;
  }

  /**
   * Predict diagnosis for a new case
   */
  async predict(clinicalCase: ClinicalCase): Promise<{
    diagnosis: string;
    confidence: number;
    supportingPatterns: Pattern[];
  }> {
    const matchingPatterns = await this.findMatchingPatterns(clinicalCase, 3);

    if (matchingPatterns.length === 0) {
      return {
        diagnosis: 'unknown',
        confidence: 0,
        supportingPatterns: [],
      };
    }

    // Use top pattern for prediction
    const topPattern = matchingPatterns[0];
    const diagnosis = topPattern.metadata?.diagnosis || 'unknown';
    const confidence = topPattern.confidence * (topPattern.metadata?.similarity || 0);

    return {
      diagnosis,
      confidence,
      supportingPatterns: matchingPatterns,
    };
  }

  /**
   * Get all learned patterns
   */
  getPatterns(): Pattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get pattern by ID
   */
  getPattern(id: string): Pattern | undefined {
    return this.patterns.get(id);
  }

  /**
   * Clear all patterns
   */
  clearPatterns(): void {
    this.patterns.clear();
  }

  /**
   * Hash string to integer
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
