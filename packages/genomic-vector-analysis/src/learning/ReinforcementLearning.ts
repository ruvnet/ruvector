/**
 * Reinforcement Learning Module for Genomic Vector Analysis
 *
 * Implements Q-Learning, Policy Gradient, and Multi-Armed Bandit algorithms
 * for query optimization, index tuning, and embedding model selection.
 */

import { EmbeddingModel } from '../types';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface RLConfig {
  learningRate: number;
  discountFactor: number;
  explorationRate: number;
  explorationDecay: number;
  minExplorationRate: number;
  replayBufferSize: number;
  batchSize: number;
  updateFrequency: number;
}

export interface State {
  queryComplexity: number;
  datasetSize: number;
  dimensionality: number;
  currentIndexParams: IndexParams;
  recentLatencies: number[];
}

export interface IndexParams {
  efSearch: number;
  M: number;
  efConstruction: number;
}

export interface Action {
  type: 'adjust_ef_search' | 'adjust_M' | 'adjust_ef_construction' | 'change_quantization';
  value: number | string;
}

export interface Experience {
  state: State;
  action: Action;
  reward: number;
  nextState: State;
  done: boolean;
  timestamp: number;
}

export interface QValue {
  state: string;
  action: string;
  value: number;
}

export interface PolicyGradientConfig {
  learningRate: number;
  gamma: number;
  entropy: number;
}

export interface BanditArm {
  model: EmbeddingModel;
  pulls: number;
  totalReward: number;
  meanReward: number;
  confidence: number;
}

// ============================================================================
// Q-Learning for Query Optimization
// ============================================================================

export class QLearningOptimizer {
  private config: RLConfig;
  private qTable: Map<string, Map<string, number>>;
  private replayBuffer: Experience[];
  private currentExplorationRate: number;
  private stepCount: number;

  constructor(config: Partial<RLConfig> = {}) {
    this.config = {
      learningRate: 0.1,
      discountFactor: 0.95,
      explorationRate: 1.0,
      explorationDecay: 0.995,
      minExplorationRate: 0.01,
      replayBufferSize: 10000,
      batchSize: 32,
      updateFrequency: 10,
      ...config
    };

    this.qTable = new Map();
    this.replayBuffer = [];
    this.currentExplorationRate = this.config.explorationRate;
    this.stepCount = 0;
  }

  /**
   * Select action using epsilon-greedy policy
   */
  selectAction(state: State): Action {
    if (Math.random() < this.currentExplorationRate) {
      return this.getRandomAction();
    }
    return this.getBestAction(state);
  }

  /**
   * Update Q-values based on experience
   */
  update(experience: Experience): void {
    this.replayBuffer.push(experience);
    if (this.replayBuffer.length > this.config.replayBufferSize) {
      this.replayBuffer.shift();
    }

    this.stepCount++;

    // Perform batch update
    if (this.stepCount % this.config.updateFrequency === 0) {
      this.batchUpdate();
    }

    // Decay exploration rate
    this.currentExplorationRate = Math.max(
      this.config.minExplorationRate,
      this.currentExplorationRate * this.config.explorationDecay
    );
  }

  /**
   * Batch update using experience replay
   */
  private batchUpdate(): void {
    const batchSize = Math.min(this.config.batchSize, this.replayBuffer.length);
    const batch = this.sampleExperiences(batchSize);

    for (const experience of batch) {
      const stateKey = this.serializeState(experience.state);
      const actionKey = this.serializeAction(experience.action);

      // Initialize Q-table entries if needed
      if (!this.qTable.has(stateKey)) {
        this.qTable.set(stateKey, new Map());
      }

      const stateActions = this.qTable.get(stateKey)!;
      const currentQ = stateActions.get(actionKey) || 0;

      // Calculate TD target
      let maxNextQ = 0;
      if (!experience.done) {
        const nextStateKey = this.serializeState(experience.nextState);
        const nextStateActions = this.qTable.get(nextStateKey);
        if (nextStateActions) {
          maxNextQ = Math.max(...Array.from(nextStateActions.values()));
        }
      }

      const tdTarget = experience.reward + this.config.discountFactor * maxNextQ;
      const newQ = currentQ + this.config.learningRate * (tdTarget - currentQ);

      stateActions.set(actionKey, newQ);
    }
  }

  /**
   * Sample random experiences from replay buffer
   */
  private sampleExperiences(count: number): Experience[] {
    const sampled: Experience[] = [];
    const indices = new Set<number>();

    while (indices.size < count) {
      indices.add(Math.floor(Math.random() * this.replayBuffer.length));
    }

    for (const idx of indices) {
      sampled.push(this.replayBuffer[idx]);
    }

    return sampled;
  }

  /**
   * Get best action for given state
   */
  private getBestAction(state: State): Action {
    const stateKey = this.serializeState(state);
    const stateActions = this.qTable.get(stateKey);

    if (!stateActions || stateActions.size === 0) {
      return this.getRandomAction();
    }

    let bestAction: string | null = null;
    let bestValue = -Infinity;

    for (const [action, value] of stateActions.entries()) {
      if (value > bestValue) {
        bestValue = value;
        bestAction = action;
      }
    }

    return bestAction ? this.deserializeAction(bestAction) : this.getRandomAction();
  }

  /**
   * Get random action for exploration
   */
  private getRandomAction(): Action {
    const actionTypes: Action['type'][] = [
      'adjust_ef_search',
      'adjust_M',
      'adjust_ef_construction',
      'change_quantization'
    ];

    const type = actionTypes[Math.floor(Math.random() * actionTypes.length)];

    switch (type) {
      case 'adjust_ef_search':
        return { type, value: Math.floor(Math.random() * 200) + 50 };
      case 'adjust_M':
        return { type, value: Math.floor(Math.random() * 32) + 8 };
      case 'adjust_ef_construction':
        return { type, value: Math.floor(Math.random() * 300) + 100 };
      case 'change_quantization':
        return { type, value: ['none', 'scalar', 'product'][Math.floor(Math.random() * 3)] };
      default:
        return { type: 'adjust_ef_search', value: 100 };
    }
  }

  /**
   * Serialize state for Q-table key
   */
  private serializeState(state: State): string {
    return JSON.stringify({
      qc: Math.round(state.queryComplexity * 10) / 10,
      ds: Math.round(state.datasetSize / 1000),
      dim: state.dimensionality,
      ef: state.currentIndexParams.efSearch,
      m: state.currentIndexParams.M
    });
  }

  /**
   * Serialize action for Q-table key
   */
  private serializeAction(action: Action): string {
    return `${action.type}:${action.value}`;
  }

  /**
   * Deserialize action from string
   */
  private deserializeAction(actionStr: string): Action {
    const [type, valueStr] = actionStr.split(':');
    const value = isNaN(Number(valueStr)) ? valueStr : Number(valueStr);
    return { type: type as Action['type'], value };
  }

  /**
   * Get current Q-table statistics
   */
  getStatistics() {
    return {
      stateCount: this.qTable.size,
      totalQValues: Array.from(this.qTable.values()).reduce((sum, actions) => sum + actions.size, 0),
      replayBufferSize: this.replayBuffer.length,
      explorationRate: this.currentExplorationRate,
      stepCount: this.stepCount
    };
  }

  /**
   * Export Q-table for persistence
   */
  exportQTable(): QValue[] {
    const values: QValue[] = [];
    for (const [state, actions] of this.qTable.entries()) {
      for (const [action, value] of actions.entries()) {
        values.push({ state, action, value });
      }
    }
    return values;
  }

  /**
   * Import Q-table from saved values
   */
  importQTable(values: QValue[]): void {
    this.qTable.clear();
    for (const { state, action, value } of values) {
      if (!this.qTable.has(state)) {
        this.qTable.set(state, new Map());
      }
      this.qTable.get(state)!.set(action, value);
    }
  }
}

// ============================================================================
// Policy Gradient for Index Tuning
// ============================================================================

export class PolicyGradientOptimizer {
  private config: PolicyGradientConfig;
  private policy: Map<string, Map<string, number>>;
  private trajectory: Experience[];
  private baselineValue: number;

  constructor(config: Partial<PolicyGradientConfig> = {}) {
    this.config = {
      learningRate: 0.01,
      gamma: 0.99,
      entropy: 0.01,
      ...config
    };

    this.policy = new Map();
    this.trajectory = [];
    this.baselineValue = 0;
  }

  /**
   * Sample action from policy distribution
   */
  sampleAction(state: State): Action {
    const stateKey = this.serializeState(state);
    const actionProbs = this.getActionProbabilities(stateKey);

    // Sample from categorical distribution
    const rand = Math.random();
    let cumProb = 0;

    for (const [action, prob] of actionProbs.entries()) {
      cumProb += prob;
      if (rand <= cumProb) {
        return this.deserializeAction(action);
      }
    }

    // Fallback to random action
    return this.getRandomAction();
  }

  /**
   * Update policy using REINFORCE algorithm
   */
  updatePolicy(experience: Experience): void {
    this.trajectory.push(experience);

    // Update at episode end
    if (experience.done) {
      this.performPolicyUpdate();
      this.trajectory = [];
    }
  }

  /**
   * Perform policy gradient update on complete trajectory
   */
  private performPolicyUpdate(): void {
    // Calculate returns (discounted cumulative rewards)
    const returns = this.calculateReturns();

    // Update baseline (moving average of returns)
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    this.baselineValue = 0.9 * this.baselineValue + 0.1 * meanReturn;

    // Update policy parameters
    for (let t = 0; t < this.trajectory.length; t++) {
      const { state, action } = this.trajectory[t];
      const advantage = returns[t] - this.baselineValue;

      this.updatePolicyParams(state, action, advantage);
    }
  }

  /**
   * Calculate discounted returns for trajectory
   */
  private calculateReturns(): number[] {
    const returns: number[] = [];
    let G = 0;

    for (let t = this.trajectory.length - 1; t >= 0; t--) {
      G = this.trajectory[t].reward + this.config.gamma * G;
      returns.unshift(G);
    }

    return returns;
  }

  /**
   * Update policy parameters for state-action pair
   */
  private updatePolicyParams(state: State, action: Action, advantage: number): void {
    const stateKey = this.serializeState(state);
    const actionKey = this.serializeAction(action);

    if (!this.policy.has(stateKey)) {
      this.policy.set(stateKey, new Map());
    }

    const statePolicy = this.policy.get(stateKey)!;
    const currentLogit = statePolicy.get(actionKey) || 0;

    // Gradient ascent with entropy regularization
    const newLogit = currentLogit + this.config.learningRate * advantage;
    statePolicy.set(actionKey, newLogit);

    // Apply entropy regularization
    this.applyEntropyRegularization(stateKey);
  }

  /**
   * Apply entropy regularization to encourage exploration
   */
  private applyEntropyRegularization(stateKey: string): void {
    const statePolicy = this.policy.get(stateKey);
    if (!statePolicy) return;

    const logits = Array.from(statePolicy.values());
    const entropy = this.calculateEntropy(logits);

    // Adjust logits to maintain minimum entropy
    if (entropy < this.config.entropy) {
      for (const [action, logit] of statePolicy.entries()) {
        statePolicy.set(action, logit * 0.95);
      }
    }
  }

  /**
   * Calculate entropy of policy distribution
   */
  private calculateEntropy(logits: number[]): number {
    const probs = this.softmax(logits);
    let entropy = 0;

    for (const p of probs) {
      if (p > 0) {
        entropy -= p * Math.log(p);
      }
    }

    return entropy;
  }

  /**
   * Get action probabilities for state
   */
  private getActionProbabilities(stateKey: string): Map<string, number> {
    const statePolicy = this.policy.get(stateKey);
    const probs = new Map<string, number>();

    if (!statePolicy || statePolicy.size === 0) {
      // Uniform distribution for unknown states
      const actions = this.getAllPossibleActions();
      const uniformProb = 1.0 / actions.length;
      for (const action of actions) {
        probs.set(this.serializeAction(action), uniformProb);
      }
      return probs;
    }

    const logits = Array.from(statePolicy.values());
    const probValues = this.softmax(logits);
    const actions = Array.from(statePolicy.keys());

    for (let i = 0; i < actions.length; i++) {
      probs.set(actions[i], probValues[i]);
    }

    return probs;
  }

  /**
   * Softmax function for converting logits to probabilities
   */
  private softmax(logits: number[]): number[] {
    const max = Math.max(...logits);
    const exps = logits.map(l => Math.exp(l - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / sum);
  }

  /**
   * Get all possible actions
   */
  private getAllPossibleActions(): Action[] {
    return [
      { type: 'adjust_ef_search', value: 100 },
      { type: 'adjust_M', value: 16 },
      { type: 'adjust_ef_construction', value: 200 }
    ];
  }

  private serializeState(state: State): string {
    return JSON.stringify({
      qc: state.queryComplexity,
      ds: state.datasetSize,
      dim: state.dimensionality
    });
  }

  private serializeAction(action: Action): string {
    return `${action.type}:${action.value}`;
  }

  private deserializeAction(actionStr: string): Action {
    const [type, valueStr] = actionStr.split(':');
    const value = isNaN(Number(valueStr)) ? valueStr : Number(valueStr);
    return { type: type as Action['type'], value };
  }

  private getRandomAction(): Action {
    const actions = this.getAllPossibleActions();
    return actions[Math.floor(Math.random() * actions.length)];
  }
}

// ============================================================================
// Multi-Armed Bandit for Embedding Model Selection
// ============================================================================

export class MultiArmedBandit {
  private arms: Map<EmbeddingModel, BanditArm>;
  private totalPulls: number;
  private ucbConstant: number;

  constructor(models: EmbeddingModel[], ucbConstant: number = 2.0) {
    this.arms = new Map();
    this.totalPulls = 0;
    this.ucbConstant = ucbConstant;

    // Initialize arms
    for (const model of models) {
      this.arms.set(model, {
        model,
        pulls: 0,
        totalReward: 0,
        meanReward: 0,
        confidence: Infinity
      });
    }
  }

  /**
   * Select model using Upper Confidence Bound (UCB1)
   */
  selectModel(): EmbeddingModel {
    // If any arm hasn't been pulled, pull it
    for (const arm of this.arms.values()) {
      if (arm.pulls === 0) {
        return arm.model;
      }
    }

    // Select arm with highest UCB
    let bestModel: EmbeddingModel | null = null;
    let bestUCB = -Infinity;

    for (const arm of this.arms.values()) {
      const ucb = this.calculateUCB(arm);
      if (ucb > bestUCB) {
        bestUCB = ucb;
        bestModel = arm.model;
      }
    }

    return bestModel || 'kmer';
  }

  /**
   * Update arm statistics after observation
   */
  updateReward(model: EmbeddingModel, reward: number): void {
    const arm = this.arms.get(model);
    if (!arm) return;

    arm.pulls++;
    arm.totalReward += reward;
    arm.meanReward = arm.totalReward / arm.pulls;
    this.totalPulls++;

    // Update confidence bound
    arm.confidence = this.calculateUCB(arm);
  }

  /**
   * Calculate Upper Confidence Bound for arm
   */
  private calculateUCB(arm: BanditArm): number {
    if (arm.pulls === 0) return Infinity;

    const exploration = Math.sqrt(
      (this.ucbConstant * Math.log(this.totalPulls)) / arm.pulls
    );

    return arm.meanReward + exploration;
  }

  /**
   * Get Thompson Sampling selection
   */
  selectModelThompson(): EmbeddingModel {
    let bestModel: EmbeddingModel | null = null;
    let bestSample = -Infinity;

    for (const arm of this.arms.values()) {
      // Beta distribution sampling
      const alpha = arm.totalReward + 1;
      const beta = arm.pulls - arm.totalReward + 1;
      const sample = this.betaSample(alpha, beta);

      if (sample > bestSample) {
        bestSample = sample;
        bestModel = arm.model;
      }
    }

    return bestModel || 'kmer';
  }

  /**
   * Sample from Beta distribution (simplified)
   */
  private betaSample(alpha: number, beta: number): number {
    // Simplified beta sampling using normal approximation
    const mean = alpha / (alpha + beta);
    const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
    return mean + Math.sqrt(variance) * this.normalSample();
  }

  /**
   * Sample from standard normal distribution
   */
  private normalSample(): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * Get statistics for all arms
   */
  getStatistics() {
    const stats: Record<string, any> = {
      totalPulls: this.totalPulls,
      arms: {}
    };

    for (const [model, arm] of this.arms.entries()) {
      stats.arms[model] = {
        pulls: arm.pulls,
        meanReward: arm.meanReward,
        confidence: arm.confidence,
        regret: this.calculateRegret(arm)
      };
    }

    return stats;
  }

  /**
   * Calculate regret for arm
   */
  private calculateRegret(arm: BanditArm): number {
    const bestMean = Math.max(...Array.from(this.arms.values()).map(a => a.meanReward));
    return (bestMean - arm.meanReward) * arm.pulls;
  }

  /**
   * Reset all arm statistics
   */
  reset(): void {
    for (const arm of this.arms.values()) {
      arm.pulls = 0;
      arm.totalReward = 0;
      arm.meanReward = 0;
      arm.confidence = Infinity;
    }
    this.totalPulls = 0;
  }
}

// ============================================================================
// Experience Replay Buffer
// ============================================================================

export class ExperienceReplayBuffer {
  private buffer: Experience[];
  private maxSize: number;
  private prioritized: boolean;
  private priorities: number[];

  constructor(maxSize: number = 10000, prioritized: boolean = false) {
    this.buffer = [];
    this.maxSize = maxSize;
    this.prioritized = prioritized;
    this.priorities = [];
  }

  /**
   * Add experience to buffer
   */
  add(experience: Experience, priority: number = 1.0): void {
    if (this.buffer.length >= this.maxSize) {
      this.buffer.shift();
      if (this.prioritized) {
        this.priorities.shift();
      }
    }

    this.buffer.push(experience);
    if (this.prioritized) {
      this.priorities.push(priority);
    }
  }

  /**
   * Sample batch of experiences
   */
  sample(batchSize: number): Experience[] {
    if (this.buffer.length === 0) return [];

    const size = Math.min(batchSize, this.buffer.length);

    if (!this.prioritized) {
      return this.uniformSample(size);
    } else {
      return this.prioritizedSample(size);
    }
  }

  /**
   * Uniform random sampling
   */
  private uniformSample(size: number): Experience[] {
    const sampled: Experience[] = [];
    const indices = new Set<number>();

    while (indices.size < size && indices.size < this.buffer.length) {
      indices.add(Math.floor(Math.random() * this.buffer.length));
    }

    for (const idx of indices) {
      sampled.push(this.buffer[idx]);
    }

    return sampled;
  }

  /**
   * Prioritized experience replay sampling
   */
  private prioritizedSample(size: number): Experience[] {
    const sampled: Experience[] = [];
    const totalPriority = this.priorities.reduce((a, b) => a + b, 0);

    for (let i = 0; i < size; i++) {
      let rand = Math.random() * totalPriority;
      let cumProb = 0;

      for (let j = 0; j < this.buffer.length; j++) {
        cumProb += this.priorities[j];
        if (rand <= cumProb) {
          sampled.push(this.buffer[j]);
          break;
        }
      }
    }

    return sampled;
  }

  /**
   * Update priority for experience
   */
  updatePriority(index: number, priority: number): void {
    if (this.prioritized && index >= 0 && index < this.priorities.length) {
      this.priorities[index] = priority;
    }
  }

  /**
   * Get buffer size
   */
  size(): number {
    return this.buffer.length;
  }

  /**
   * Clear buffer
   */
  clear(): void {
    this.buffer = [];
    this.priorities = [];
  }
}
