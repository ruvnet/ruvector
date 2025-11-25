export interface HyperparameterSpace {
    efSearch: {
        min: number;
        max: number;
        type: 'int';
    };
    M: {
        min: number;
        max: number;
        type: 'int';
    };
    efConstruction: {
        min: number;
        max: number;
        type: 'int';
    };
    learningRate: {
        min: number;
        max: number;
        type: 'float';
        log: boolean;
    };
    batchSize: {
        min: number;
        max: number;
        type: 'int';
        power2: boolean;
    };
    embeddingDim: {
        min: number;
        max: number;
        type: 'int';
        multiple: number;
    };
    quantization: {
        values: string[];
        type: 'categorical';
    };
}
export interface HyperparameterConfig {
    efSearch?: number;
    M?: number;
    efConstruction?: number;
    learningRate?: number;
    batchSize?: number;
    embeddingDim?: number;
    quantization?: string;
    [key: string]: number | string | undefined;
}
export interface TrialResult {
    config: HyperparameterConfig;
    metrics: {
        accuracy: number;
        f1Score: number;
        queryLatency: number;
        memoryUsage: number;
        indexBuildTime: number;
    };
    score: number;
    trial: number;
    timestamp: number;
}
export interface AdaptiveEmbeddingConfig {
    minDim: number;
    maxDim: number;
    targetCompression: number;
    varianceThreshold: number;
    method: 'pca' | 'autoencoder' | 'svd';
}
export interface QuantizationStrategy {
    type: 'none' | 'scalar' | 'product' | 'binary';
    bits?: number;
    codebookSize?: number;
    adaptiveBits?: boolean;
}
export interface HNSWTuningConfig {
    dataset: {
        size: number;
        dimensionality: number;
        queryComplexity: number;
    };
    constraints: {
        maxMemory?: number;
        maxLatency?: number;
        minRecall?: number;
    };
}
export declare class BayesianOptimizer {
    private space;
    private trials;
    private acquisitionFunction;
    private explorationWeight;
    private bestTrial;
    constructor(space: HyperparameterSpace, acquisitionFunction?: 'ei' | 'ucb' | 'poi', explorationWeight?: number);
    optimize(objective: (config: HyperparameterConfig) => Promise<number>, nTrials?: number, randomTrials?: number): Promise<HyperparameterConfig>;
    private evaluateTrial;
    private selectNextConfig;
    private computeAcquisition;
    private predictPerformance;
    private expectedImprovement;
    private probabilityOfImprovement;
    private erf;
    private configDistance;
    private sampleRandom;
    getHistory(): TrialResult[];
    getBestTrial(): TrialResult | null;
}
export declare class AdaptiveEmbedding {
    private config;
    private originalDim;
    private reducedDim;
    private transformMatrix;
    constructor(config?: Partial<AdaptiveEmbeddingConfig>);
    learn(embeddings: number[][]): Promise<{
        reducedDim: number;
        compressionRatio: number;
    }>;
    private learnPCA;
    private learnSVD;
    private learnAutoencoder;
    private evaluateAutoencoder;
    transform(embedding: number[]): number[];
    private computeMean;
    private estimateEigenvalues;
    getStatistics(): {
        originalDim: number;
        reducedDim: number;
        compressionRatio: number;
        method: "pca" | "autoencoder" | "svd";
    };
}
export declare class DynamicQuantization {
    private strategies;
    private performanceHistory;
    constructor();
    private initializeStrategies;
    selectStrategy(workload: {
        dataSize: number;
        queryRate: number;
        memoryBudget: number;
        latencyBudget: number;
    }): QuantizationStrategy;
    adapt(currentStrategy: string, performance: {
        latency: number;
        accuracy: number;
        memory: number;
    }): QuantizationStrategy;
    getStatistics(): Record<string, any>;
}
export declare class HNSWAutotuner {
    private config;
    private tuningHistory;
    constructor(config: HNSWTuningConfig);
    tune(): Promise<{
        efSearch: number;
        M: number;
        efConstruction: number;
    }>;
    private estimateM;
    private estimateEfConstruction;
    private estimateEfSearch;
    private gridSearch;
    private evaluateParams;
    private computeScore;
    getHistory(): {
        params: {
            efSearch: number;
            M: number;
            efConstruction: number;
        };
        metrics: {
            recall: number;
            latency: number;
            memory: number;
        };
    }[];
}
//# sourceMappingURL=MetaLearning.d.ts.map