import { EmbeddingModel } from '../types';
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
    nWay: number;
    kShot: number;
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
export declare class PreTrainedModelRegistry {
    private models;
    constructor();
    private registerDefaultModels;
    getModel(name: EmbeddingModel): PreTrainedModel | undefined;
    registerModel(model: PreTrainedModel): void;
    listModels(): PreTrainedModel[];
    getModelsByDomain(domain: 'dna' | 'protein' | 'phenotype'): PreTrainedModel[];
}
export declare class FineTuningEngine {
    private config;
    private baseModel;
    private trainingHistory;
    private bestValidLoss;
    private patienceCounter;
    constructor(baseModel: PreTrainedModel, config?: Partial<FineTuningConfig>);
    fineTune(trainData: {
        sequence: string;
        label: string;
    }[], validData?: {
        sequence: string;
        label: string;
    }[]): Promise<TrainingMetrics[]>;
    private trainEpoch;
    private processBatch;
    private computeLearningRate;
    private shouldStopEarly;
    private shuffleData;
    getHistory(): TrainingMetrics[];
    exportModel(): {
        base: PreTrainedModel;
        config: FineTuningConfig;
        history: TrainingMetrics[];
    };
}
export declare class DomainAdaptation {
    private config;
    private sourceStats;
    private targetStats;
    constructor(config?: Partial<DomainAdaptationConfig>);
    adapt(sourceData: {
        embedding: number[];
        label: string;
    }[], targetData: {
        embedding: number[];
        label: string;
    }[]): Promise<{
        transformedEmbeddings: number[][];
        discrepancy: number;
    }>;
    private featureBasedAdaptation;
    private instanceBasedAdaptation;
    private parameterBasedAdaptation;
    private alignFeatures;
    private computeImportanceWeights;
    private computeDiscrepancy;
    private maximumMeanDiscrepancy;
    private coralDistance;
    private domainClassificationError;
    private computeDomainStatistics;
    private computeMean;
    private computeVariance;
    private computeClassDistribution;
    private euclideanDistance;
    getStatistics(): {
        source: DomainStatistics | null;
        target: DomainStatistics | null;
        config: DomainAdaptationConfig;
    };
}
export declare class FewShotLearner {
    private config;
    private prototypes;
    private episodeHistory;
    constructor(config?: Partial<FewShotConfig>);
    metaTrain(data: {
        embedding: number[];
        disease: string;
    }[]): Promise<{
        accuracy: number;
        episodes: number;
    }>;
    private sampleEpisode;
    private trainEpisode;
    private classify;
    private computeCentroid;
    private euclideanDistance;
    private sampleWithoutReplacement;
    getStatistics(): {
        config: FewShotConfig;
        episodes: number;
        meanAccuracy: number;
        prototypes: string[];
    };
}
//# sourceMappingURL=TransferLearning.d.ts.map