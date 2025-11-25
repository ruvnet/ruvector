/**
 * Explainable AI Module for Genomic Vector Analysis
 *
 * Implements SHAP values for variant prioritization, attention weights for transformer models,
 * feature importance for clinical decisions, and counterfactual explanations.
 */

// Type imports for documentation only
// GenomicVariant and VectorSearchResult are used in interface definitions

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface SHAPValue {
  feature: string;
  value: number;
  baseValue: number;
  shapValue: number;
  contribution: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  rank: number;
  category: 'genomic' | 'clinical' | 'demographic' | 'embedding';
}

export interface AttentionWeights {
  layer: number;
  head: number;
  tokenIndex: number;
  attentionScores: number[];
  topAttendedTokens: Array<{ index: number; token: string; score: number }>;
}

export interface CounterfactualExplanation {
  original: Record<string, any>;
  counterfactual: Record<string, any>;
  changes: Array<{
    feature: string;
    originalValue: any;
    counterfactualValue: any;
    impact: number;
  }>;
  distance: number;
  validity: number;
}

export interface ExplanationContext {
  variantId: string;
  prediction: string;
  confidence: number;
  referencePopulation?: string;
}

// ============================================================================
// SHAP Value Calculator for Variant Prioritization
// ============================================================================

export class SHAPExplainer {
  private backgroundSamples: Map<string, number[]>;
  private featureNames: string[];
  private baseValue: number;

  constructor(featureNames: string[]) {
    this.backgroundSamples = new Map();
    this.featureNames = featureNames;
    this.baseValue = 0;
  }

  /**
   * Fit explainer on background dataset
   */
  fit(variants: Array<{ features: Record<string, number>; priority: number }>): void {
    console.log(`Fitting SHAP explainer on ${variants.length} background samples`);

    // Store background samples
    for (const variant of variants) {
      const featureVector = this.featureNames.map(name => variant.features[name] || 0);
      this.backgroundSamples.set(
        JSON.stringify(variant.features),
        featureVector
      );
    }

    // Compute base value (average prediction)
    this.baseValue = variants.reduce((sum, v) => sum + v.priority, 0) / variants.length;

    console.log(`Base value: ${this.baseValue.toFixed(4)}`);
  }

  /**
   * Explain variant prioritization
   */
  explain(
    variant: { features: Record<string, number> },
    predictFunction: (features: Record<string, number>) => number
  ): SHAPValue[] {
    const shapValues: SHAPValue[] = [];
    const prediction = predictFunction(variant.features);

    // Compute SHAP value for each feature using Kernel SHAP approximation
    for (const feature of this.featureNames) {
      const shapValue = this.computeKernelSHAP(
        feature,
        variant.features,
        predictFunction
      );

      shapValues.push({
        feature,
        value: variant.features[feature] || 0,
        baseValue: this.baseValue,
        shapValue,
        contribution: shapValue / Math.abs(prediction - this.baseValue) || 0
      });
    }

    // Sort by absolute SHAP value
    shapValues.sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue));

    return shapValues;
  }

  /**
   * Compute Kernel SHAP value for feature
   */
  private computeKernelSHAP(
    feature: string,
    features: Record<string, number>,
    predictFunction: (features: Record<string, number>) => number
  ): number {
    const numSamples = Math.min(100, this.backgroundSamples.size);
    const backgroundArray = Array.from(this.backgroundSamples.keys()).slice(0, numSamples);

    let shapValue = 0;
    let weight = 0;

    // Sample coalitions
    for (let i = 0; i < numSamples; i++) {
      const background = JSON.parse(backgroundArray[i]);

      // Coalition with feature
      const withFeature = { ...background, [feature]: features[feature] };
      const predWith = predictFunction(withFeature);

      // Coalition without feature
      const predWithout = predictFunction(background);

      // Weighted contribution
      const coalitionWeight = this.shapleyKernelWeight(1, this.featureNames.length);
      shapValue += coalitionWeight * (predWith - predWithout);
      weight += coalitionWeight;
    }

    return weight > 0 ? shapValue / weight : 0;
  }

  /**
   * Shapley kernel weight
   */
  private shapleyKernelWeight(s: number, M: number): number {
    if (s === 0 || s === M) return 1000; // High weight for extreme coalitions
    return (M - 1) / (this.binomial(M, s) * s * (M - s));
  }

  /**
   * Binomial coefficient
   */
  private binomial(n: number, k: number): number {
    if (k === 0 || k === n) return 1;
    if (k === 1 || k === n - 1) return n;

    let result = 1;
    for (let i = 0; i < k; i++) {
      result *= (n - i) / (i + 1);
    }
    return Math.round(result);
  }

  /**
   * Generate waterfall plot data
   */
  generateWaterfallPlot(shapValues: SHAPValue[]): {
    features: string[];
    values: number[];
    cumulative: number[];
  } {
    const features = shapValues.map(s => s.feature);
    const values = shapValues.map(s => s.shapValue);
    const cumulative: number[] = [this.baseValue];

    for (const value of values) {
      cumulative.push(cumulative[cumulative.length - 1] + value);
    }

    return { features, values, cumulative };
  }

  /**
   * Generate force plot data
   */
  generateForcePlot(shapValues: SHAPValue[]): {
    baseValue: number;
    prediction: number;
    positiveContributions: SHAPValue[];
    negativeContributions: SHAPValue[];
  } {
    const prediction = this.baseValue + shapValues.reduce((sum, s) => sum + s.shapValue, 0);

    const positiveContributions = shapValues.filter(s => s.shapValue > 0);
    const negativeContributions = shapValues.filter(s => s.shapValue < 0);

    return {
      baseValue: this.baseValue,
      prediction,
      positiveContributions,
      negativeContributions
    };
  }
}

// ============================================================================
// Attention Weights Analyzer for Transformer Models
// ============================================================================

export class AttentionAnalyzer {
  private numLayers: number;
  private numHeads: number;

  constructor(numLayers: number = 12, numHeads: number = 12) {
    this.numLayers = numLayers;
    this.numHeads = numHeads;
  }

  /**
   * Extract attention weights from transformer model
   */
  extractAttentionWeights(
    sequence: string,
    modelOutput: { attentionWeights: number[][][] }
  ): AttentionWeights[] {
    const tokens = this.tokenize(sequence);
    const weights: AttentionWeights[] = [];

    for (let layer = 0; layer < this.numLayers; layer++) {
      for (let head = 0; head < this.numHeads; head++) {
        for (let tokenIdx = 0; tokenIdx < tokens.length; tokenIdx++) {
          const attentionScores = modelOutput.attentionWeights[layer][head] || [];
          const topAttended = this.getTopAttendedTokens(
            attentionScores,
            tokens,
            5
          );

          weights.push({
            layer,
            head,
            tokenIndex: tokenIdx,
            attentionScores,
            topAttendedTokens: topAttended
          });
        }
      }
    }

    return weights;
  }

  /**
   * Analyze which genomic regions receive most attention
   */
  analyzeGenomicAttention(
    sequence: string,
    attentionWeights: AttentionWeights[]
  ): Array<{ position: number; region: string; avgAttention: number; importance: string }> {
    const tokens = this.tokenize(sequence);
    const positionAttention = new Map<number, number[]>();

    // Aggregate attention scores by position
    for (const weight of attentionWeights) {
      if (!positionAttention.has(weight.tokenIndex)) {
        positionAttention.set(weight.tokenIndex, []);
      }
      const avgScore = weight.attentionScores.reduce((a, b) => a + b, 0) /
        weight.attentionScores.length;
      positionAttention.get(weight.tokenIndex)!.push(avgScore);
    }

    // Compute average attention per position
    const results: Array<{ position: number; region: string; avgAttention: number; importance: string }> = [];

    for (const [position, scores] of positionAttention.entries()) {
      const avgAttention = scores.reduce((a, b) => a + b, 0) / scores.length;
      const region = tokens[position] || '';

      results.push({
        position,
        region,
        avgAttention,
        importance: this.categorizeImportance(avgAttention)
      });
    }

    results.sort((a, b) => b.avgAttention - a.avgAttention);
    return results;
  }

  /**
   * Visualize attention heatmap
   */
  generateAttentionHeatmap(
    attentionWeights: AttentionWeights[],
    layer: number,
    head: number
  ): number[][] {
    const filtered = attentionWeights.filter(w => w.layer === layer && w.head === head);
    const size = Math.max(...filtered.map(w => w.attentionScores.length));

    const heatmap: number[][] = Array(size).fill(0).map(() => Array(size).fill(0));

    for (const weight of filtered) {
      for (let i = 0; i < weight.attentionScores.length; i++) {
        heatmap[weight.tokenIndex][i] = weight.attentionScores[i];
      }
    }

    return heatmap;
  }

  /**
   * Tokenize sequence
   */
  private tokenize(sequence: string): string[] {
    // K-mer tokenization (k=6)
    const k = 6;
    const tokens: string[] = [];

    for (let i = 0; i <= sequence.length - k; i++) {
      tokens.push(sequence.substring(i, i + k));
    }

    return tokens;
  }

  /**
   * Get top attended tokens
   */
  private getTopAttendedTokens(
    scores: number[],
    tokens: string[],
    topK: number
  ): Array<{ index: number; token: string; score: number }> {
    const indexed = scores.map((score, index) => ({
      index,
      token: tokens[index] || '',
      score
    }));

    indexed.sort((a, b) => b.score - a.score);
    return indexed.slice(0, topK);
  }

  /**
   * Categorize importance level
   */
  private categorizeImportance(attention: number): string {
    if (attention > 0.1) return 'high';
    if (attention > 0.05) return 'medium';
    return 'low';
  }
}

// ============================================================================
// Feature Importance for Clinical Decisions
// ============================================================================

export class FeatureImportanceAnalyzer {
  private importanceScores: Map<string, number>;

  constructor() {
    this.importanceScores = new Map();
  }

  /**
   * Compute feature importance using permutation importance
   */
  computePermutationImportance(
    data: Array<{ features: Record<string, number>; label: string }>,
    predictFunction: (features: Record<string, number>) => string,
    nRepeats: number = 10
  ): FeatureImportance[] {
    console.log('Computing permutation importance...');

    // Baseline accuracy
    const baselineAccuracy = this.evaluateAccuracy(data, predictFunction);

    const featureNames = Object.keys(data[0].features);
    const importances: FeatureImportance[] = [];

    for (const feature of featureNames) {
      let totalDrop = 0;

      for (let repeat = 0; repeat < nRepeats; repeat++) {
        // Permute feature
        const permuted = this.permuteFeature(data, feature);
        const permutedAccuracy = this.evaluateAccuracy(permuted, predictFunction);

        totalDrop += baselineAccuracy - permutedAccuracy;
      }

      const importance = totalDrop / nRepeats;
      this.importanceScores.set(feature, importance);
    }

    // Create ranked feature importance list
    for (const [feature, importance] of this.importanceScores.entries()) {
      importances.push({
        feature,
        importance,
        rank: 0,
        category: this.categorizeFeature(feature)
      });
    }

    // Assign ranks
    importances.sort((a, b) => b.importance - a.importance);
    importances.forEach((fi, index) => {
      fi.rank = index + 1;
    });

    return importances;
  }

  /**
   * Compute LIME-style local feature importance
   */
  computeLocalImportance(
    instance: Record<string, number>,
    predictFunction: (features: Record<string, number>) => number,
    nSamples: number = 1000
  ): FeatureImportance[] {
    // Generate local perturbations
    const perturbations = this.generatePerturbations(instance, nSamples);

    // Compute predictions
    const predictions = perturbations.map(p => predictFunction(p.features));

    // Fit linear model
    const weights = this.fitLinearModel(perturbations, predictions);

    // Convert to feature importance
    const importances: FeatureImportance[] = [];
    for (const [feature, weight] of weights.entries()) {
      importances.push({
        feature,
        importance: Math.abs(weight),
        rank: 0,
        category: this.categorizeFeature(feature)
      });
    }

    importances.sort((a, b) => b.importance - a.importance);
    importances.forEach((fi, index) => {
      fi.rank = index + 1;
    });

    return importances;
  }

  /**
   * Evaluate accuracy
   */
  private evaluateAccuracy(
    data: Array<{ features: Record<string, number>; label: string }>,
    predictFunction: (features: Record<string, number>) => string
  ): number {
    let correct = 0;

    for (const sample of data) {
      if (predictFunction(sample.features) === sample.label) {
        correct++;
      }
    }

    return correct / data.length;
  }

  /**
   * Permute feature values
   */
  private permuteFeature(
    data: Array<{ features: Record<string, number>; label: string }>,
    feature: string
  ): Array<{ features: Record<string, number>; label: string }> {
    const values = data.map(d => d.features[feature]);

    // Fisher-Yates shuffle
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }

    // Create permuted dataset
    return data.map((d, i) => ({
      features: { ...d.features, [feature]: values[i] },
      label: d.label
    }));
  }

  /**
   * Generate perturbations around instance
   */
  private generatePerturbations(
    instance: Record<string, number>,
    nSamples: number
  ): Array<{ features: Record<string, number>; distance: number }> {
    const perturbations: Array<{ features: Record<string, number>; distance: number }> = [];

    for (let i = 0; i < nSamples; i++) {
      const perturbed: Record<string, number> = {};
      let distance = 0;

      for (const [feature, value] of Object.entries(instance)) {
        // Add Gaussian noise
        const noise = this.gaussianNoise(0, 0.1 * Math.abs(value));
        perturbed[feature] = value + noise;
        distance += noise * noise;
      }

      perturbations.push({
        features: perturbed,
        distance: Math.sqrt(distance)
      });
    }

    return perturbations;
  }

  /**
   * Fit linear model using ridge regression
   */
  private fitLinearModel(
    samples: Array<{ features: Record<string, number>; distance: number }>,
    predictions: number[]
  ): Map<string, number> {
    const weights = new Map<string, number>();
    const features = Object.keys(samples[0].features);

    // Simplified ridge regression
    for (const feature of features) {
      let numerator = 0;
      let denominator = 0;

      for (let i = 0; i < samples.length; i++) {
        const kernelWeight = Math.exp(-samples[i].distance);
        numerator += kernelWeight * samples[i].features[feature] * predictions[i];
        denominator += kernelWeight * samples[i].features[feature] ** 2;
      }

      weights.set(feature, denominator > 0 ? numerator / denominator : 0);
    }

    return weights;
  }

  /**
   * Gaussian noise
   */
  private gaussianNoise(mean: number, stddev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + stddev * z0;
  }

  /**
   * Categorize feature type
   */
  private categorizeFeature(feature: string): 'genomic' | 'clinical' | 'demographic' | 'embedding' {
    if (feature.includes('variant') || feature.includes('gene') || feature.includes('mutation')) {
      return 'genomic';
    } else if (feature.includes('phenotype') || feature.includes('diagnosis')) {
      return 'clinical';
    } else if (feature.includes('age') || feature.includes('sex')) {
      return 'demographic';
    } else {
      return 'embedding';
    }
  }
}

// ============================================================================
// Counterfactual Explanation Generator
// ============================================================================

export class CounterfactualGenerator {
  private featureRanges: Map<string, { min: number; max: number }>;

  constructor() {
    this.featureRanges = new Map();
  }

  /**
   * Learn feature ranges from data
   */
  learn(data: Array<Record<string, number>>): void {
    const features = Object.keys(data[0]);

    for (const feature of features) {
      const values = data.map(d => d[feature]);
      this.featureRanges.set(feature, {
        min: Math.min(...values),
        max: Math.max(...values)
      });
    }
  }

  /**
   * Generate counterfactual explanation
   */
  generate(
    original: Record<string, any>,
    targetPrediction: string,
    predictFunction: (features: Record<string, any>) => string,
    maxIterations: number = 1000
  ): CounterfactualExplanation | null {
    let counterfactual = { ...original };
    let bestCounterfactual = { ...original };
    let bestDistance = Infinity;

    for (let iter = 0; iter < maxIterations; iter++) {
      // Randomly modify features
      const feature = this.selectFeatureToModify(original);
      counterfactual = this.modifyFeature(counterfactual, feature);

      // Check if prediction changed
      const prediction = predictFunction(counterfactual);

      if (prediction === targetPrediction) {
        const distance = this.computeDistance(original, counterfactual);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestCounterfactual = { ...counterfactual };
        }
      }
    }

    if (bestDistance < Infinity) {
      return this.createExplanation(original, bestCounterfactual, bestDistance);
    }

    return null;
  }

  /**
   * Select feature to modify
   */
  private selectFeatureToModify(instance: Record<string, any>): string {
    const features = Object.keys(instance);
    return features[Math.floor(Math.random() * features.length)];
  }

  /**
   * Modify feature value
   */
  private modifyFeature(
    instance: Record<string, any>,
    feature: string
  ): Record<string, any> {
    const modified = { ...instance };
    const range = this.featureRanges.get(feature);

    if (range) {
      // Random value within learned range
      modified[feature] = range.min + Math.random() * (range.max - range.min);
    } else {
      // Small perturbation
      modified[feature] *= (1 + (Math.random() - 0.5) * 0.1);
    }

    return modified;
  }

  /**
   * Compute distance between instances
   */
  private computeDistance(
    original: Record<string, any>,
    counterfactual: Record<string, any>
  ): number {
    let distance = 0;

    for (const feature of Object.keys(original)) {
      const diff = Number(original[feature]) - Number(counterfactual[feature]);
      distance += diff * diff;
    }

    return Math.sqrt(distance);
  }

  /**
   * Create counterfactual explanation
   */
  private createExplanation(
    original: Record<string, any>,
    counterfactual: Record<string, any>,
    distance: number
  ): CounterfactualExplanation {
    const changes: Array<{
      feature: string;
      originalValue: any;
      counterfactualValue: any;
      impact: number;
    }> = [];

    for (const feature of Object.keys(original)) {
      if (original[feature] !== counterfactual[feature]) {
        const impact = Math.abs(
          Number(original[feature]) - Number(counterfactual[feature])
        );

        changes.push({
          feature,
          originalValue: original[feature],
          counterfactualValue: counterfactual[feature],
          impact
        });
      }
    }

    changes.sort((a, b) => b.impact - a.impact);

    return {
      original,
      counterfactual,
      changes,
      distance,
      validity: 1.0 // Placeholder for validity score
    };
  }
}
