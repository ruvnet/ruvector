import { EmbeddingModel } from '../types';
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
export declare class QLearningOptimizer {
    private config;
    private qTable;
    private replayBuffer;
    private currentExplorationRate;
    private stepCount;
    constructor(config?: Partial<RLConfig>);
    selectAction(state: State): Action;
    update(experience: Experience): void;
    private batchUpdate;
    private sampleExperiences;
    private getBestAction;
    private getRandomAction;
    private serializeState;
    private serializeAction;
    private deserializeAction;
    getStatistics(): {
        stateCount: number;
        totalQValues: number;
        replayBufferSize: number;
        explorationRate: number;
        stepCount: number;
    };
    exportQTable(): QValue[];
    importQTable(values: QValue[]): void;
}
export declare class PolicyGradientOptimizer {
    private config;
    private policy;
    private trajectory;
    private baselineValue;
    constructor(config?: Partial<PolicyGradientConfig>);
    sampleAction(state: State): Action;
    updatePolicy(experience: Experience): void;
    private performPolicyUpdate;
    private calculateReturns;
    private updatePolicyParams;
    private applyEntropyRegularization;
    private calculateEntropy;
    private getActionProbabilities;
    private softmax;
    private getAllPossibleActions;
    private serializeState;
    private serializeAction;
    private deserializeAction;
    private getRandomAction;
}
export declare class MultiArmedBandit {
    private arms;
    private totalPulls;
    private ucbConstant;
    constructor(models: EmbeddingModel[], ucbConstant?: number);
    selectModel(): EmbeddingModel;
    updateReward(model: EmbeddingModel, reward: number): void;
    private calculateUCB;
    selectModelThompson(): EmbeddingModel;
    private betaSample;
    private normalSample;
    getStatistics(): Record<string, any>;
    private calculateRegret;
    reset(): void;
}
export declare class ExperienceReplayBuffer {
    private buffer;
    private maxSize;
    private prioritized;
    private priorities;
    constructor(maxSize?: number, prioritized?: boolean);
    add(experience: Experience, priority?: number): void;
    sample(batchSize: number): Experience[];
    private uniformSample;
    private prioritizedSample;
    updatePriority(index: number, priority: number): void;
    size(): number;
    clear(): void;
}
//# sourceMappingURL=ReinforcementLearning.d.ts.map