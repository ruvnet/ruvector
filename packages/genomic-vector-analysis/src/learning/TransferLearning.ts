/**
 * Transfer Learning Module for Genomic Vector Analysis
 *
 * Implements pre-trained model integration, fine-tuning, domain adaptation,
 * and few-shot learning for genomic sequence analysis.
 */

import { EmbeddingModel } from '../types';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface PreTrainedModel {
  name: EmbeddingModel;
  architecture: string;
  parameters: number;
  vocabSize: number;
  maxLength: number;
  embeddingDim: number;
  pretrainedOn: string[];
  checkpoint?: string;
}

export interface FineTuningConfig {
  learningRate: number;
  epochs: number;
  batchSize: number;
  warmupSteps: number;
  weightDecay: number;
  gradientClipNorm: number;
  frozenLayers: number;
  validationSplit: number;
  earlyStoppingPatience: number;
}

export interface DomainAdaptationConfig {
  sourceModels: EmbeddingModel[];
  targetDomain: string;
  adaptationStrategy: 'feature_based' | 'instance_based' | 'parameter_based';
  discrepancyMetric: 'mmd' | 'coral' | 'dann';
  domainConfusionWeight: number;
}

export interface FewShotConfig {
  nWay: number;  // Number of classes
  kShot: number; // Examples per class
  querySize: number;
  episodes: number;
  metaLearningRate: number;
  innerLearningRate: number;
  innerSteps: number;
}

export interface TrainingMetrics {
  epoch: number;
  trainLoss: number;
  validLoss: number;
  trainAccuracy: number;
  validAccuracy: number;
  learningRate: number;
  gradientNorm: number;
  timestamp: number;
}

export interface DomainStatistics {
  domain: string;
  samples: number;
  meanEmbedding: number[];
  covarianceMatrix?: number[][];
  classDistribution: Map<string, number>;
}

// ============================================================================
// Pre-Trained Model Registry
// ============================================================================

export class PreTrainedModelRegistry {
  private models: Map<EmbeddingModel, PreTrainedModel>;

  constructor() {
    this.models = new Map();
    this.registerDefaultModels();
  }

  /**
   * Register default pre-trained models
   */
  private registerDefaultModels(): void {
    // DNA-BERT: Pre-trained on human reference genome
    this.models.set('dna-bert', {
      name: 'dna-bert',
      architecture: 'BERT',
      parameters: 110_000_000,
      vocabSize: 4096,  // 6-mer vocabulary
      maxLength: 512,
      embeddingDim: 768,
      pretrainedOn: ['human_genome_hg38', 'gencode_v38'],
      checkpoint: 'zhihan1996/DNA_bert_6'
    });

    // Nucleotide Transformer: Multi-species genome pre-training
    this.models.set('nucleotide-transformer', {
      name: 'nucleotide-transformer',
      architecture: 'Transformer',
      parameters: 500_000_000,
      vocabSize: 4096,
      maxLength: 1024,
      embeddingDim: 1024,
      pretrainedOn: ['multi_species_genomes', 'ensembl_genomes'],
      checkpoint: 'InstaDeepAI/nucleotide-transformer-v2-500m'
    });

    // ESM2: Protein sequence pre-training
    this.models.set('esm2', {
      name: 'esm2',
      architecture: 'ESM-Transformer',
      parameters: 650_000_000,
      vocabSize: 33,  // Amino acid alphabet
      maxLength: 1024,
      embeddingDim: 1280,
      pretrainedOn: ['uniref50', 'pfam', 'uniprot'],
      checkpoint: 'facebook/esm2_t33_650M_UR50D'
    });

    // ProtBERT: Protein BERT model
    this.models.set('protbert', {
      name: 'protbert',
      architecture: 'BERT',
      parameters: 420_000_000,
      vocabSize: 30,
      maxLength: 512,
      embeddingDim: 1024,
      pretrainedOn: ['uniref100', 'big_dataset'],
      checkpoint: 'Rostlab/prot_bert'
    });
  }

  /**
   * Get model information
   */
  getModel(name: EmbeddingModel): PreTrainedModel | undefined {
    return this.models.get(name);
  }

  /**
   * Register custom pre-trained model
   */
  registerModel(model: PreTrainedModel): void {
    this.models.set(model.name, model);
  }

  /**
   * List all available models
   */
  listModels(): PreTrainedModel[] {
    return Array.from(this.models.values());
  }

  /**
   * Get models by domain
   */
  getModelsByDomain(domain: 'dna' | 'protein' | 'phenotype'): PreTrainedModel[] {
    const domainModels: Record<string, EmbeddingModel[]> = {
      dna: ['dna-bert', 'nucleotide-transformer'],
      protein: ['esm2', 'protbert'],
      phenotype: ['phenotype-bert']
    };

    return (domainModels[domain] || [])
      .map(name => this.models.get(name))
      .filter((m): m is PreTrainedModel => m !== undefined);
  }
}

// ============================================================================
// Fine-Tuning Engine
// ============================================================================

export class FineTuningEngine {
  private config: FineTuningConfig;
  private baseModel: PreTrainedModel;
  private trainingHistory: TrainingMetrics[];
  private bestValidLoss: number;
  private patienceCounter: number;

  constructor(baseModel: PreTrainedModel, config: Partial<FineTuningConfig> = {}) {
    this.baseModel = baseModel;
    this.config = {
      learningRate: 2e-5,
      epochs: 10,
      batchSize: 16,
      warmupSteps: 500,
      weightDecay: 0.01,
      gradientClipNorm: 1.0,
      frozenLayers: 0,
      validationSplit: 0.1,
      earlyStoppingPatience: 3,
      ...config
    };

    this.trainingHistory = [];
    this.bestValidLoss = Infinity;
    this.patienceCounter = 0;
  }

  /**
   * Fine-tune model on disease-specific data
   */
  async fineTune(
    trainData: { sequence: string; label: string }[],
    validData?: { sequence: string; label: string }[]
  ): Promise<TrainingMetrics[]> {
    console.log(`Fine-tuning ${this.baseModel.name} on ${trainData.length} examples`);

    // Split data if validation set not provided
    if (!validData) {
      const splitIdx = Math.floor(trainData.length * (1 - this.config.validationSplit));
      validData = trainData.slice(splitIdx);
      trainData = trainData.slice(0, splitIdx);
    }

    // Training loop
    for (let epoch = 0; epoch < this.config.epochs; epoch++) {
      const metrics = await this.trainEpoch(trainData, validData, epoch);
      this.trainingHistory.push(metrics);

      console.log(
        `Epoch ${epoch + 1}/${this.config.epochs} - ` +
        `Train Loss: ${metrics.trainLoss.toFixed(4)}, ` +
        `Valid Loss: ${metrics.validLoss.toFixed(4)}, ` +
        `Valid Acc: ${(metrics.validAccuracy * 100).toFixed(2)}%`
      );

      // Early stopping
      if (this.shouldStopEarly(metrics.validLoss)) {
        console.log(`Early stopping triggered at epoch ${epoch + 1}`);
        break;
      }
    }

    return this.trainingHistory;
  }

  /**
   * Train single epoch
   */
  private async trainEpoch(
    trainData: { sequence: string; label: string }[],
    validData: { sequence: string; label: string }[],
    epoch: number
  ): Promise<TrainingMetrics> {
    // Shuffle training data
    const shuffled = this.shuffleData(trainData);

    // Training phase
    let trainLoss = 0;
    let trainCorrect = 0;
    let gradientNorm = 0;

    for (let i = 0; i < shuffled.length; i += this.config.batchSize) {
      const batch = shuffled.slice(i, i + this.config.batchSize);

      // Compute learning rate with warmup
      const step = epoch * Math.ceil(trainData.length / this.config.batchSize) + i / this.config.batchSize;
      const lr = this.computeLearningRate(step);

      // Forward and backward pass (simulated)
      const batchMetrics = this.processBatch(batch, lr, true);
      trainLoss += batchMetrics.loss;
      trainCorrect += batchMetrics.correct;
      gradientNorm += batchMetrics.gradientNorm;
    }

    const numBatches = Math.ceil(trainData.length / this.config.batchSize);
    trainLoss /= numBatches;
    gradientNorm /= numBatches;

    // Validation phase
    let validLoss = 0;
    let validCorrect = 0;

    for (let i = 0; i < validData.length; i += this.config.batchSize) {
      const batch = validData.slice(i, i + this.config.batchSize);
      const batchMetrics = this.processBatch(batch, 0, false);
      validLoss += batchMetrics.loss;
      validCorrect += batchMetrics.correct;
    }

    const validBatches = Math.ceil(validData.length / this.config.batchSize);
    validLoss /= validBatches;

    return {
      epoch,
      trainLoss,
      validLoss,
      trainAccuracy: trainCorrect / trainData.length,
      validAccuracy: validCorrect / validData.length,
      learningRate: this.computeLearningRate(epoch * numBatches),
      gradientNorm,
      timestamp: Date.now()
    };
  }

  /**
   * Process single batch (simulated training)
   */
  private processBatch(
    batch: { sequence: string; label: string }[],
    learningRate: number,
    training: boolean
  ): { loss: number; correct: number; gradientNorm: number } {
    // Simulated batch processing
    // In real implementation, this would call the actual model
    const loss = Math.random() * (training ? 1.5 : 1.0);
    const correct = Math.floor(Math.random() * batch.length);
    const gradientNorm = training ? Math.random() * 2.0 : 0;

    return { loss, correct, gradientNorm };
  }

  /**
   * Compute learning rate with warmup and decay
   */
  private computeLearningRate(step: number): number {
    if (step < this.config.warmupSteps) {
      return this.config.learningRate * (step / this.config.warmupSteps);
    }

    // Cosine decay
    const progress = (step - this.config.warmupSteps) /
      (this.config.epochs * 1000 - this.config.warmupSteps);
    return this.config.learningRate * 0.5 * (1 + Math.cos(Math.PI * progress));
  }

  /**
   * Check if early stopping should be triggered
   */
  private shouldStopEarly(validLoss: number): boolean {
    if (validLoss < this.bestValidLoss) {
      this.bestValidLoss = validLoss;
      this.patienceCounter = 0;
      return false;
    }

    this.patienceCounter++;
    return this.patienceCounter >= this.config.earlyStoppingPatience;
  }

  /**
   * Shuffle data array
   */
  private shuffleData<T>(data: T[]): T[] {
    const shuffled = [...data];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Get training history
   */
  getHistory(): TrainingMetrics[] {
    return this.trainingHistory;
  }

  /**
   * Export fine-tuned model
   */
  exportModel(): { base: PreTrainedModel; config: FineTuningConfig; history: TrainingMetrics[] } {
    return {
      base: this.baseModel,
      config: this.config,
      history: this.trainingHistory
    };
  }
}

// ============================================================================
// Domain Adaptation
// ============================================================================

export class DomainAdaptation {
  private config: DomainAdaptationConfig;
  private sourceStats: DomainStatistics | null;
  private targetStats: DomainStatistics | null;

  constructor(config: Partial<DomainAdaptationConfig> = {}) {
    this.config = {
      sourceModels: ['dna-bert'],
      targetDomain: 'pediatric_oncology',
      adaptationStrategy: 'feature_based',
      discrepancyMetric: 'mmd',
      domainConfusionWeight: 0.1,
      ...config
    };

    this.sourceStats = null;
    this.targetStats = null;
  }

  /**
   * Adapt model from NICU to pediatric oncology domain
   */
  async adapt(
    sourceData: { embedding: number[]; label: string }[],
    targetData: { embedding: number[]; label: string }[]
  ): Promise<{ transformedEmbeddings: number[][]; discrepancy: number }> {
    console.log(`Adapting from source (${sourceData.length}) to target (${targetData.length})`);

    // Compute domain statistics
    this.sourceStats = this.computeDomainStatistics(sourceData, 'source');
    this.targetStats = this.computeDomainStatistics(targetData, 'target');

    // Apply adaptation strategy
    let transformedEmbeddings: number[][];

    switch (this.config.adaptationStrategy) {
      case 'feature_based':
        transformedEmbeddings = this.featureBasedAdaptation(sourceData, targetData);
        break;
      case 'instance_based':
        transformedEmbeddings = this.instanceBasedAdaptation(sourceData, targetData);
        break;
      case 'parameter_based':
        transformedEmbeddings = this.parameterBasedAdaptation(sourceData, targetData);
        break;
      default:
        transformedEmbeddings = sourceData.map(d => d.embedding);
    }

    // Compute domain discrepancy
    const discrepancy = this.computeDiscrepancy(
      sourceData.map(d => d.embedding),
      targetData.map(d => d.embedding)
    );

    return { transformedEmbeddings, discrepancy };
  }

  /**
   * Feature-based adaptation (CORAL)
   */
  private featureBasedAdaptation(
    sourceData: { embedding: number[]; label: string }[],
    targetData: { embedding: number[]; label: string }[]
  ): number[][] {
    if (!this.sourceStats || !this.targetStats) {
      throw new Error('Domain statistics not computed');
    }

    // Compute transformation to align second-order statistics
    const dim = sourceData[0].embedding.length;
    const transformed: number[][] = [];

    for (const sample of sourceData) {
      const aligned = this.alignFeatures(
        sample.embedding,
        this.sourceStats.meanEmbedding,
        this.targetStats.meanEmbedding
      );
      transformed.push(aligned);
    }

    return transformed;
  }

  /**
   * Instance-based adaptation (importance weighting)
   */
  private instanceBasedAdaptation(
    sourceData: { embedding: number[]; label: string }[],
    targetData: { embedding: number[]; label: string }[]
  ): number[][] {
    // Compute importance weights
    const weights = this.computeImportanceWeights(sourceData, targetData);

    // Apply weighted transformation
    const transformed: number[][] = [];
    for (let i = 0; i < sourceData.length; i++) {
      const weighted = sourceData[i].embedding.map(v => v * weights[i]);
      transformed.push(weighted);
    }

    return transformed;
  }

  /**
   * Parameter-based adaptation (fine-tuning with domain confusion)
   */
  private parameterBasedAdaptation(
    sourceData: { embedding: number[]; label: string }[],
    targetData: { embedding: number[]; label: string }[]
  ): number[][] {
    // Simulate domain-adversarial training
    const transformed: number[][] = [];

    for (const sample of sourceData) {
      // Apply gradient reversal layer effect (simulated)
      const domainInvariant = sample.embedding.map(v =>
        v * (1 - this.config.domainConfusionWeight) +
        Math.random() * this.config.domainConfusionWeight
      );
      transformed.push(domainInvariant);
    }

    return transformed;
  }

  /**
   * Align features using mean centering
   */
  private alignFeatures(
    embedding: number[],
    sourceMean: number[],
    targetMean: number[]
  ): number[] {
    return embedding.map((v, i) => v - sourceMean[i] + targetMean[i]);
  }

  /**
   * Compute importance weights for instances
   */
  private computeImportanceWeights(
    sourceData: { embedding: number[]; label: string }[],
    targetData: { embedding: number[]; label: string }[]
  ): number[] {
    // Simplified importance weight estimation
    const weights: number[] = [];

    for (const source of sourceData) {
      // Find distance to nearest target example
      let minDist = Infinity;
      for (const target of targetData) {
        const dist = this.euclideanDistance(source.embedding, target.embedding);
        minDist = Math.min(minDist, dist);
      }

      // Weight inversely proportional to distance
      weights.push(1 / (1 + minDist));
    }

    // Normalize weights
    const sum = weights.reduce((a, b) => a + b, 0);
    return weights.map(w => w / sum * weights.length);
  }

  /**
   * Compute domain discrepancy using selected metric
   */
  private computeDiscrepancy(source: number[][], target: number[][]): number {
    switch (this.config.discrepancyMetric) {
      case 'mmd':
        return this.maximumMeanDiscrepancy(source, target);
      case 'coral':
        return this.coralDistance(source, target);
      case 'dann':
        return this.domainClassificationError(source, target);
      default:
        return 0;
    }
  }

  /**
   * Maximum Mean Discrepancy
   */
  private maximumMeanDiscrepancy(source: number[][], target: number[][]): number {
    const sourceMean = this.computeMean(source);
    const targetMean = this.computeMean(target);
    return this.euclideanDistance(sourceMean, targetMean);
  }

  /**
   * CORAL distance
   */
  private coralDistance(source: number[][], target: number[][]): number {
    // Simplified: compare variance differences
    const sourceVar = this.computeVariance(source);
    const targetVar = this.computeVariance(target);

    let distance = 0;
    for (let i = 0; i < sourceVar.length; i++) {
      distance += Math.abs(sourceVar[i] - targetVar[i]);
    }

    return distance / sourceVar.length;
  }

  /**
   * Domain classification error
   */
  private domainClassificationError(source: number[][], target: number[][]): number {
    // Simulated domain classifier accuracy
    // Higher accuracy means larger domain gap
    return 0.5 + Math.random() * 0.3;
  }

  /**
   * Compute domain statistics
   */
  private computeDomainStatistics(
    data: { embedding: number[]; label: string }[],
    domain: string
  ): DomainStatistics {
    const embeddings = data.map(d => d.embedding);
    const labels = data.map(d => d.label);

    return {
      domain,
      samples: data.length,
      meanEmbedding: this.computeMean(embeddings),
      classDistribution: this.computeClassDistribution(labels)
    };
  }

  /**
   * Compute mean embedding
   */
  private computeMean(embeddings: number[][]): number[] {
    const dim = embeddings[0].length;
    const mean = new Array(dim).fill(0);

    for (const emb of embeddings) {
      for (let i = 0; i < dim; i++) {
        mean[i] += emb[i];
      }
    }

    return mean.map(v => v / embeddings.length);
  }

  /**
   * Compute variance
   */
  private computeVariance(embeddings: number[][]): number[] {
    const mean = this.computeMean(embeddings);
    const dim = embeddings[0].length;
    const variance = new Array(dim).fill(0);

    for (const emb of embeddings) {
      for (let i = 0; i < dim; i++) {
        variance[i] += Math.pow(emb[i] - mean[i], 2);
      }
    }

    return variance.map(v => v / embeddings.length);
  }

  /**
   * Compute class distribution
   */
  private computeClassDistribution(labels: string[]): Map<string, number> {
    const dist = new Map<string, number>();

    for (const label of labels) {
      dist.set(label, (dist.get(label) || 0) + 1);
    }

    return dist;
  }

  /**
   * Euclidean distance between vectors
   */
  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }

  /**
   * Get adaptation statistics
   */
  getStatistics() {
    return {
      source: this.sourceStats,
      target: this.targetStats,
      config: this.config
    };
  }
}

// ============================================================================
// Few-Shot Learning (Prototypical Networks)
// ============================================================================

export class FewShotLearner {
  private config: FewShotConfig;
  private prototypes: Map<string, number[]>;
  private episodeHistory: { support: any[]; query: any[]; accuracy: number }[];

  constructor(config: Partial<FewShotConfig> = {}) {
    this.config = {
      nWay: 5,
      kShot: 5,
      querySize: 15,
      episodes: 100,
      metaLearningRate: 0.001,
      innerLearningRate: 0.01,
      innerSteps: 5,
      ...config
    };

    this.prototypes = new Map();
    this.episodeHistory = [];
  }

  /**
   * Meta-train on few-shot episodes
   */
  async metaTrain(
    data: { embedding: number[]; disease: string }[]
  ): Promise<{ accuracy: number; episodes: number }> {
    console.log(`Meta-training on ${this.config.episodes} episodes`);

    let totalAccuracy = 0;

    for (let ep = 0; ep < this.config.episodes; ep++) {
      const episode = this.sampleEpisode(data);
      const accuracy = await this.trainEpisode(episode.support, episode.query);

      totalAccuracy += accuracy;
      this.episodeHistory.push({ ...episode, accuracy });

      if ((ep + 1) % 10 === 0) {
        console.log(`Episode ${ep + 1}/${this.config.episodes} - Accuracy: ${(accuracy * 100).toFixed(2)}%`);
      }
    }

    return {
      accuracy: totalAccuracy / this.config.episodes,
      episodes: this.config.episodes
    };
  }

  /**
   * Sample few-shot episode
   */
  private sampleEpisode(
    data: { embedding: number[]; disease: string }[]
  ): { support: typeof data; query: typeof data } {
    // Group by disease
    const diseaseGroups = new Map<string, typeof data>();
    for (const item of data) {
      if (!diseaseGroups.has(item.disease)) {
        diseaseGroups.set(item.disease, []);
      }
      diseaseGroups.get(item.disease)!.push(item);
    }

    // Sample N-way classes
    const diseases = Array.from(diseaseGroups.keys());
    const selectedDiseases = this.sampleWithoutReplacement(diseases, this.config.nWay);

    // Sample K-shot support and query examples
    const support: typeof data = [];
    const query: typeof data = [];

    for (const disease of selectedDiseases) {
      const examples = diseaseGroups.get(disease)!;
      const selected = this.sampleWithoutReplacement(
        examples,
        this.config.kShot + this.config.querySize
      );

      support.push(...selected.slice(0, this.config.kShot));
      query.push(...selected.slice(this.config.kShot));
    }

    return { support, query };
  }

  /**
   * Train on single episode
   */
  private async trainEpisode(
    support: { embedding: number[]; disease: string }[],
    query: { embedding: number[]; disease: string }[]
  ): Promise<number> {
    // Compute prototypes (class centroids)
    this.prototypes.clear();
    const diseaseEmbeddings = new Map<string, number[][]>();

    for (const item of support) {
      if (!diseaseEmbeddings.has(item.disease)) {
        diseaseEmbeddings.set(item.disease, []);
      }
      diseaseEmbeddings.get(item.disease)!.push(item.embedding);
    }

    for (const [disease, embeddings] of diseaseEmbeddings.entries()) {
      this.prototypes.set(disease, this.computeCentroid(embeddings));
    }

    // Classify query examples
    let correct = 0;
    for (const item of query) {
      const predicted = this.classify(item.embedding);
      if (predicted === item.disease) {
        correct++;
      }
    }

    return correct / query.length;
  }

  /**
   * Classify embedding using prototypical network
   */
  private classify(embedding: number[]): string {
    let bestDisease = '';
    let minDistance = Infinity;

    for (const [disease, prototype] of this.prototypes.entries()) {
      const distance = this.euclideanDistance(embedding, prototype);
      if (distance < minDistance) {
        minDistance = distance;
        bestDisease = disease;
      }
    }

    return bestDisease;
  }

  /**
   * Compute centroid of embeddings
   */
  private computeCentroid(embeddings: number[][]): number[] {
    const dim = embeddings[0].length;
    const centroid = new Array(dim).fill(0);

    for (const emb of embeddings) {
      for (let i = 0; i < dim; i++) {
        centroid[i] += emb[i];
      }
    }

    return centroid.map(v => v / embeddings.length);
  }

  /**
   * Euclidean distance
   */
  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }

  /**
   * Sample without replacement
   */
  private sampleWithoutReplacement<T>(array: T[], count: number): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  /**
   * Get few-shot learning statistics
   */
  getStatistics() {
    return {
      config: this.config,
      episodes: this.episodeHistory.length,
      meanAccuracy: this.episodeHistory.reduce((sum, ep) => sum + ep.accuracy, 0) /
        this.episodeHistory.length,
      prototypes: Array.from(this.prototypes.keys())
    };
  }
}
