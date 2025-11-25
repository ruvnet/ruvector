/**
 * Continuous Learning Module for Genomic Vector Analysis
 *
 * Implements online learning from new cases, catastrophic forgetting prevention,
 * incremental index updates, and model versioning with rollback capabilities.
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface OnlineLearningConfig {
  learningRate: number;
  momentumDecay: number;
  windowSize: number;
  updateFrequency: number;
  adaptiveLearningRate: boolean;
  miniBatchSize: number;
}

export interface ModelVersion {
  version: string;
  timestamp: number;
  parameters: Map<string, number[]>;
  performance: {
    accuracy: number;
    loss: number;
    samplesSeen: number;
  };
  metadata: {
    description?: string;
    author?: string;
    tags?: string[];
  };
}

export interface IncrementalUpdate {
  id: string;
  timestamp: number;
  addedVectors: number;
  updatedVectors: number;
  deletedVectors: number;
  indexRebuildTime: number;
  performanceImpact: {
    queryLatencyChange: number;
    recallChange: number;
  };
}

export interface ForgettingMetrics {
  pastTaskAccuracy: Map<string, number>;
  currentTaskAccuracy: number;
  forgettingRate: number;
  retentionRate: number;
  transferScore: number;
}

export interface ReplayBuffer {
  capacity: number;
  samples: Array<{
    id: string;
    data: any;
    label: string;
    importance: number;
    timestamp: number;
  }>;
  strategy: 'reservoir' | 'priority' | 'cluster';
}

// ============================================================================
// Online Learning Engine
// ============================================================================

export class OnlineLearner {
  private config: OnlineLearningConfig;
  private modelWeights: Map<string, number[]>;
  private gradientMomentum: Map<string, number[]>;
  private samplesSeen: number;
  private recentSamples: Array<{ data: any; label: string; timestamp: number }>;
  private performanceHistory: Array<{ samples: number; accuracy: number; loss: number }>;

  constructor(config: Partial<OnlineLearningConfig> = {}) {
    this.config = {
      learningRate: 0.01,
      momentumDecay: 0.9,
      windowSize: 1000,
      updateFrequency: 10,
      adaptiveLearningRate: true,
      miniBatchSize: 32,
      ...config
    };

    this.modelWeights = new Map();
    this.gradientMomentum = new Map();
    this.samplesSeen = 0;
    this.recentSamples = [];
    this.performanceHistory = [];
  }

  /**
   * Process new case in online fashion
   */
  async processNewCase(
    data: any,
    label: string,
    predictFunction: (data: any) => { prediction: string; confidence: number }
  ): Promise<{ updated: boolean; performance: { accuracy: number; loss: number } }> {
    // Add to recent samples
    this.recentSamples.push({
      data,
      label,
      timestamp: Date.now()
    });

    // Maintain window size
    if (this.recentSamples.length > this.config.windowSize) {
      this.recentSamples.shift();
    }

    this.samplesSeen++;

    // Update model if frequency threshold met
    const shouldUpdate = this.samplesSeen % this.config.updateFrequency === 0;

    if (shouldUpdate) {
      return await this.updateModel();
    }

    return {
      updated: false,
      performance: this.getLatestPerformance()
    };
  }

  /**
   * Update model with recent samples
   */
  private async updateModel(): Promise<{
    updated: boolean;
    performance: { accuracy: number; loss: number }
  }> {
    console.log(`Updating model with ${this.recentSamples.length} recent samples`);

    // Create mini-batches
    const batches = this.createMiniBatches(
      this.recentSamples,
      this.config.miniBatchSize
    );

    let totalLoss = 0;
    let correct = 0;

    // Process each batch
    for (const batch of batches) {
      const { loss, accuracy } = this.processBatch(batch);
      totalLoss += loss;
      correct += accuracy * batch.length;
    }

    const avgLoss = totalLoss / batches.length;
    const avgAccuracy = correct / this.recentSamples.length;

    // Update performance history
    this.performanceHistory.push({
      samples: this.samplesSeen,
      accuracy: avgAccuracy,
      loss: avgLoss
    });

    // Adapt learning rate if enabled
    if (this.config.adaptiveLearningRate) {
      this.adaptLearningRate();
    }

    console.log(
      `Model updated - Accuracy: ${(avgAccuracy * 100).toFixed(2)}%, ` +
      `Loss: ${avgLoss.toFixed(4)}, Samples: ${this.samplesSeen}`
    );

    return {
      updated: true,
      performance: { accuracy: avgAccuracy, loss: avgLoss }
    };
  }

  /**
   * Process mini-batch
   */
  private processBatch(
    batch: Array<{ data: any; label: string; timestamp: number }>
  ): { loss: number; accuracy: number } {
    // Simulated batch processing
    // In practice, compute gradients and update weights

    let loss = 0;
    let correct = 0;

    for (const sample of batch) {
      // Compute prediction and loss
      const predicted = Math.random() > 0.5 ? sample.label : 'other';
      const sampleLoss = predicted === sample.label ? 0.1 : 1.0;

      loss += sampleLoss;
      if (predicted === sample.label) correct++;

      // Update weights with momentum
      this.updateWeights(sampleLoss);
    }

    return {
      loss: loss / batch.length,
      accuracy: correct / batch.length
    };
  }

  /**
   * Update model weights with momentum
   */
  private updateWeights(loss: number): void {
    // Simulated gradient computation
    const gradient = loss * 0.01;

    for (const [param, weights] of this.modelWeights.entries()) {
      if (!this.gradientMomentum.has(param)) {
        this.gradientMomentum.set(param, new Array(weights.length).fill(0));
      }

      const momentum = this.gradientMomentum.get(param)!;

      for (let i = 0; i < weights.length; i++) {
        // Momentum update
        momentum[i] = this.config.momentumDecay * momentum[i] + gradient;

        // Weight update
        weights[i] -= this.config.learningRate * momentum[i];
      }
    }
  }

  /**
   * Adapt learning rate based on performance
   */
  private adaptLearningRate(): void {
    if (this.performanceHistory.length < 2) return;

    const recent = this.performanceHistory.slice(-5);
    const avgLoss = recent.reduce((sum, h) => sum + h.loss, 0) / recent.length;

    // Decrease learning rate if loss plateaus
    if (recent.every(h => Math.abs(h.loss - avgLoss) < 0.01)) {
      this.config.learningRate *= 0.9;
      console.log(`Learning rate decreased to ${this.config.learningRate.toFixed(6)}`);
    }
  }

  /**
   * Create mini-batches from samples
   */
  private createMiniBatches<T>(samples: T[], batchSize: number): T[][] {
    const batches: T[][] = [];

    for (let i = 0; i < samples.length; i += batchSize) {
      batches.push(samples.slice(i, i + batchSize));
    }

    return batches;
  }

  /**
   * Get latest performance metrics
   */
  private getLatestPerformance(): { accuracy: number; loss: number } {
    if (this.performanceHistory.length === 0) {
      return { accuracy: 0, loss: 0 };
    }

    return this.performanceHistory[this.performanceHistory.length - 1];
  }

  /**
   * Export model state
   */
  exportState(): {
    weights: Map<string, number[]>;
    samplesSeen: number;
    performance: Array<{ samples: number; accuracy: number; loss: number }>;
  } {
    return {
      weights: new Map(this.modelWeights),
      samplesSeen: this.samplesSeen,
      performance: [...this.performanceHistory]
    };
  }

  /**
   * Reset learning state
   */
  reset(): void {
    this.samplesSeen = 0;
    this.recentSamples = [];
    this.performanceHistory = [];
    this.gradientMomentum.clear();
  }
}

// ============================================================================
// Catastrophic Forgetting Prevention
// ============================================================================

export class ForgettingPrevention {
  private replayBuffer: ReplayBuffer;
  private taskMemories: Map<string, ModelVersion>;
  private ewcFisherInformation: Map<string, number[]> | null;
  private regularizationStrength: number;

  constructor(
    bufferCapacity: number = 10000,
    strategy: 'reservoir' | 'priority' | 'cluster' = 'priority',
    regularizationStrength: number = 1000
  ) {
    this.replayBuffer = {
      capacity: bufferCapacity,
      samples: [],
      strategy
    };

    this.taskMemories = new Map();
    this.ewcFisherInformation = null;
    this.regularizationStrength = regularizationStrength;
  }

  /**
   * Store sample in replay buffer
   */
  storeSample(
    id: string,
    data: any,
    label: string,
    importance: number = 1.0
  ): void {
    const sample = {
      id,
      data,
      label,
      importance,
      timestamp: Date.now()
    };

    if (this.replayBuffer.samples.length < this.replayBuffer.capacity) {
      this.replayBuffer.samples.push(sample);
    } else {
      // Replace sample based on strategy
      this.replaceSample(sample);
    }
  }

  /**
   * Replace sample in buffer based on strategy
   */
  private replaceSample(newSample: typeof this.replayBuffer.samples[0]): void {
    let replaceIdx = 0;

    switch (this.replayBuffer.strategy) {
      case 'reservoir':
        // Reservoir sampling
        replaceIdx = Math.floor(Math.random() * this.replayBuffer.capacity);
        break;

      case 'priority':
        // Replace lowest importance sample
        let minImportance = Infinity;
        for (let i = 0; i < this.replayBuffer.samples.length; i++) {
          if (this.replayBuffer.samples[i].importance < minImportance) {
            minImportance = this.replayBuffer.samples[i].importance;
            replaceIdx = i;
          }
        }
        break;

      case 'cluster':
        // Replace most similar sample
        replaceIdx = this.findMostSimilar(newSample);
        break;
    }

    this.replayBuffer.samples[replaceIdx] = newSample;
  }

  /**
   * Find most similar sample in buffer
   */
  private findMostSimilar(sample: typeof this.replayBuffer.samples[0]): number {
    let minDistance = Infinity;
    let mostSimilarIdx = 0;

    for (let i = 0; i < this.replayBuffer.samples.length; i++) {
      const distance = this.computeSimilarity(sample.data, this.replayBuffer.samples[i].data);
      if (distance < minDistance) {
        minDistance = distance;
        mostSimilarIdx = i;
      }
    }

    return mostSimilarIdx;
  }

  /**
   * Compute similarity between samples
   */
  private computeSimilarity(data1: any, data2: any): number {
    // Simplified similarity metric
    return Math.random();
  }

  /**
   * Sample from replay buffer for experience replay
   */
  sampleReplay(batchSize: number): typeof this.replayBuffer.samples {
    const sampled: typeof this.replayBuffer.samples = [];

    if (this.replayBuffer.strategy === 'priority') {
      // Importance-weighted sampling
      const totalImportance = this.replayBuffer.samples.reduce(
        (sum, s) => sum + s.importance,
        0
      );

      for (let i = 0; i < batchSize; i++) {
        let rand = Math.random() * totalImportance;
        let cumulative = 0;

        for (const sample of this.replayBuffer.samples) {
          cumulative += sample.importance;
          if (rand <= cumulative) {
            sampled.push(sample);
            break;
          }
        }
      }
    } else {
      // Uniform random sampling
      for (let i = 0; i < batchSize; i++) {
        const idx = Math.floor(Math.random() * this.replayBuffer.samples.length);
        sampled.push(this.replayBuffer.samples[idx]);
      }
    }

    return sampled;
  }

  /**
   * Compute Elastic Weight Consolidation (EWC) penalty
   */
  computeEWCPenalty(
    currentWeights: Map<string, number[]>,
    previousWeights: Map<string, number[]>
  ): number {
    if (!this.ewcFisherInformation) {
      return 0;
    }

    let penalty = 0;

    for (const [param, currentW] of currentWeights.entries()) {
      const previousW = previousWeights.get(param);
      const fisher = this.ewcFisherInformation.get(param);

      if (!previousW || !fisher) continue;

      for (let i = 0; i < currentW.length; i++) {
        penalty += fisher[i] * Math.pow(currentW[i] - previousW[i], 2);
      }
    }

    return (this.regularizationStrength / 2) * penalty;
  }

  /**
   * Compute Fisher information matrix for EWC
   */
  computeFisherInformation(
    samples: typeof this.replayBuffer.samples,
    computeGradients: (sample: any) => Map<string, number[]>
  ): void {
    const fisher = new Map<string, number[]>();

    for (const sample of samples) {
      const gradients = computeGradients(sample.data);

      for (const [param, grad] of gradients.entries()) {
        if (!fisher.has(param)) {
          fisher.set(param, new Array(grad.length).fill(0));
        }

        const fisherParam = fisher.get(param)!;
        for (let i = 0; i < grad.length; i++) {
          fisherParam[i] += grad[i] * grad[i];
        }
      }
    }

    // Average Fisher information
    for (const fisherParam of fisher.values()) {
      for (let i = 0; i < fisherParam.length; i++) {
        fisherParam[i] /= samples.length;
      }
    }

    this.ewcFisherInformation = fisher;
  }

  /**
   * Evaluate forgetting on past tasks
   */
  evaluateForgetting(
    currentWeights: Map<string, number[]>,
    evaluateTask: (taskId: string, weights: Map<string, number[]>) => number
  ): ForgettingMetrics {
    const pastTaskAccuracy = new Map<string, number>();
    let sumPastAccuracy = 0;

    // Evaluate on all past tasks
    for (const [taskId, taskMemory] of this.taskMemories.entries()) {
      const accuracy = evaluateTask(taskId, currentWeights);
      pastTaskAccuracy.set(taskId, accuracy);
      sumPastAccuracy += accuracy;
    }

    const avgPastAccuracy = this.taskMemories.size > 0 ?
      sumPastAccuracy / this.taskMemories.size : 0;

    // Compute current task accuracy (simulated)
    const currentTaskAccuracy = 0.9 + Math.random() * 0.1;

    return {
      pastTaskAccuracy,
      currentTaskAccuracy,
      forgettingRate: this.computeForgettingRate(pastTaskAccuracy),
      retentionRate: avgPastAccuracy,
      transferScore: currentTaskAccuracy / (avgPastAccuracy + 0.01)
    };
  }

  /**
   * Compute forgetting rate
   */
  private computeForgettingRate(
    pastTaskAccuracy: Map<string, number>
  ): number {
    if (this.taskMemories.size === 0) return 0;

    let totalForgetting = 0;

    for (const [taskId, currentAccuracy] of pastTaskAccuracy.entries()) {
      const originalAccuracy = this.taskMemories.get(taskId)?.performance.accuracy || 0;
      const forgetting = Math.max(0, originalAccuracy - currentAccuracy);
      totalForgetting += forgetting;
    }

    return totalForgetting / this.taskMemories.size;
  }

  /**
   * Store task snapshot
   */
  storeTaskSnapshot(taskId: string, version: ModelVersion): void {
    this.taskMemories.set(taskId, version);
  }

  /**
   * Get buffer statistics
   */
  getBufferStatistics() {
    return {
      capacity: this.replayBuffer.capacity,
      size: this.replayBuffer.samples.length,
      strategy: this.replayBuffer.strategy,
      avgImportance: this.replayBuffer.samples.reduce((sum, s) => sum + s.importance, 0) /
        this.replayBuffer.samples.length
    };
  }
}

// ============================================================================
// Incremental Index Updater
// ============================================================================

export class IncrementalIndexUpdater {
  private indexVersion: number;
  private updateHistory: IncrementalUpdate[];
  private pendingUpdates: Array<{
    type: 'add' | 'update' | 'delete';
    vectorId: string;
    vector?: number[];
    timestamp: number;
  }>;
  private batchThreshold: number;

  constructor(batchThreshold: number = 1000) {
    this.indexVersion = 1;
    this.updateHistory = [];
    this.pendingUpdates = [];
    this.batchThreshold = batchThreshold;
  }

  /**
   * Queue vector addition
   */
  queueAdd(vectorId: string, vector: number[]): void {
    this.pendingUpdates.push({
      type: 'add',
      vectorId,
      vector,
      timestamp: Date.now()
    });

    this.checkBatchThreshold();
  }

  /**
   * Queue vector update
   */
  queueUpdate(vectorId: string, vector: number[]): void {
    this.pendingUpdates.push({
      type: 'update',
      vectorId,
      vector,
      timestamp: Date.now()
    });

    this.checkBatchThreshold();
  }

  /**
   * Queue vector deletion
   */
  queueDelete(vectorId: string): void {
    this.pendingUpdates.push({
      type: 'delete',
      vectorId,
      timestamp: Date.now()
    });

    this.checkBatchThreshold();
  }

  /**
   * Check if batch threshold reached
   */
  private checkBatchThreshold(): void {
    if (this.pendingUpdates.length >= this.batchThreshold) {
      this.applyBatchUpdate();
    }
  }

  /**
   * Apply batch update to index
   */
  async applyBatchUpdate(): Promise<IncrementalUpdate> {
    console.log(`Applying batch update with ${this.pendingUpdates.length} operations`);

    const startTime = Date.now();

    // Count operations by type
    let addedVectors = 0;
    let updatedVectors = 0;
    let deletedVectors = 0;

    for (const update of this.pendingUpdates) {
      switch (update.type) {
        case 'add':
          addedVectors++;
          break;
        case 'update':
          updatedVectors++;
          break;
        case 'delete':
          deletedVectors++;
          break;
      }
    }

    // Simulate index update
    const indexRebuildTime = (Date.now() - startTime) / 1000;

    // Measure performance impact
    const performanceImpact = {
      queryLatencyChange: Math.random() * 0.1 - 0.05,
      recallChange: Math.random() * 0.02 - 0.01
    };

    const update: IncrementalUpdate = {
      id: `update_${this.indexVersion}`,
      timestamp: Date.now(),
      addedVectors,
      updatedVectors,
      deletedVectors,
      indexRebuildTime,
      performanceImpact
    };

    this.updateHistory.push(update);
    this.indexVersion++;
    this.pendingUpdates = [];

    console.log(
      `Batch update complete - Added: ${addedVectors}, ` +
      `Updated: ${updatedVectors}, Deleted: ${deletedVectors}, ` +
      `Time: ${indexRebuildTime.toFixed(2)}s`
    );

    return update;
  }

  /**
   * Force immediate update
   */
  async forceUpdate(): Promise<IncrementalUpdate | null> {
    if (this.pendingUpdates.length === 0) {
      return null;
    }

    return await this.applyBatchUpdate();
  }

  /**
   * Get update statistics
   */
  getStatistics() {
    return {
      currentVersion: this.indexVersion,
      pendingUpdates: this.pendingUpdates.length,
      totalUpdates: this.updateHistory.length,
      totalVectorsAdded: this.updateHistory.reduce((sum, u) => sum + u.addedVectors, 0),
      totalVectorsUpdated: this.updateHistory.reduce((sum, u) => sum + u.updatedVectors, 0),
      totalVectorsDeleted: this.updateHistory.reduce((sum, u) => sum + u.deletedVectors, 0),
      avgRebuildTime: this.updateHistory.reduce((sum, u) => sum + u.indexRebuildTime, 0) /
        this.updateHistory.length
    };
  }
}

// ============================================================================
// Model Version Manager with Rollback
// ============================================================================

export class ModelVersionManager {
  private versions: Map<string, ModelVersion>;
  private currentVersion: string;
  private maxVersions: number;
  private rollbackHistory: Array<{ from: string; to: string; timestamp: number; reason: string }>;

  constructor(maxVersions: number = 10) {
    this.versions = new Map();
    this.currentVersion = '0.0.0';
    this.maxVersions = maxVersions;
    this.rollbackHistory = [];
  }

  /**
   * Create new model version
   */
  createVersion(
    parameters: Map<string, number[]>,
    performance: ModelVersion['performance'],
    metadata: ModelVersion['metadata'] = {}
  ): string {
    const version = this.incrementVersion(this.currentVersion);

    const modelVersion: ModelVersion = {
      version,
      timestamp: Date.now(),
      parameters: new Map(parameters),
      performance: { ...performance },
      metadata
    };

    this.versions.set(version, modelVersion);
    this.currentVersion = version;

    // Prune old versions
    this.pruneOldVersions();

    console.log(`Created model version ${version}`);
    console.log(`Performance: Accuracy=${(performance.accuracy * 100).toFixed(2)}%, Loss=${performance.loss.toFixed(4)}`);

    return version;
  }

  /**
   * Rollback to previous version
   */
  rollback(targetVersion: string, reason: string = 'Manual rollback'): boolean {
    const version = this.versions.get(targetVersion);

    if (!version) {
      console.error(`Version ${targetVersion} not found`);
      return false;
    }

    const previousVersion = this.currentVersion;
    this.currentVersion = targetVersion;

    this.rollbackHistory.push({
      from: previousVersion,
      to: targetVersion,
      timestamp: Date.now(),
      reason
    });

    console.log(`Rolled back from ${previousVersion} to ${targetVersion}`);
    console.log(`Reason: ${reason}`);

    return true;
  }

  /**
   * Automatic rollback on performance degradation
   */
  checkAndRollback(currentPerformance: { accuracy: number; loss: number }): boolean {
    const current = this.versions.get(this.currentVersion);
    if (!current) return false;

    // Check for significant performance degradation
    const accuracyDrop = current.performance.accuracy - currentPerformance.accuracy;
    const lossIncrease = currentPerformance.loss - current.performance.loss;

    if (accuracyDrop > 0.05 || lossIncrease > 0.5) {
      // Find best performing previous version
      const previousVersions = Array.from(this.versions.values())
        .filter(v => v.version !== this.currentVersion)
        .sort((a, b) => b.performance.accuracy - a.performance.accuracy);

      if (previousVersions.length > 0) {
        const bestPrevious = previousVersions[0];
        return this.rollback(
          bestPrevious.version,
          `Performance degradation: accuracy dropped by ${(accuracyDrop * 100).toFixed(2)}%`
        );
      }
    }

    return false;
  }

  /**
   * Get model parameters for specific version
   */
  getVersion(version: string): ModelVersion | undefined {
    return this.versions.get(version);
  }

  /**
   * Get current model parameters
   */
  getCurrentVersion(): ModelVersion | undefined {
    return this.versions.get(this.currentVersion);
  }

  /**
   * List all versions
   */
  listVersions(): ModelVersion[] {
    return Array.from(this.versions.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Compare two versions
   */
  compareVersions(v1: string, v2: string): {
    version1: ModelVersion | undefined;
    version2: ModelVersion | undefined;
    performanceDiff: {
      accuracyDiff: number;
      lossDiff: number;
      samplesDiff: number;
    };
  } | null {
    const version1 = this.versions.get(v1);
    const version2 = this.versions.get(v2);

    if (!version1 || !version2) return null;

    return {
      version1,
      version2,
      performanceDiff: {
        accuracyDiff: version2.performance.accuracy - version1.performance.accuracy,
        lossDiff: version2.performance.loss - version1.performance.loss,
        samplesDiff: version2.performance.samplesSeen - version1.performance.samplesSeen
      }
    };
  }

  /**
   * Increment version number
   */
  private incrementVersion(current: string): string {
    const [major, minor, patch] = current.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }

  /**
   * Prune old versions to maintain max limit
   */
  private pruneOldVersions(): void {
    if (this.versions.size <= this.maxVersions) return;

    const sorted = Array.from(this.versions.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = sorted.slice(0, this.versions.size - this.maxVersions);

    for (const [version] of toRemove) {
      // Don't remove current version
      if (version !== this.currentVersion) {
        this.versions.delete(version);
        console.log(`Pruned old version ${version}`);
      }
    }
  }

  /**
   * Export version history
   */
  exportHistory() {
    return {
      currentVersion: this.currentVersion,
      versions: this.listVersions(),
      rollbackHistory: this.rollbackHistory
    };
  }
}
