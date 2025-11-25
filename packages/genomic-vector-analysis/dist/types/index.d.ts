import { z } from 'zod';
export declare const VectorMetricSchema: z.ZodEnum<["cosine", "euclidean", "hamming", "manhattan", "dot"]>;
export type VectorMetric = z.infer<typeof VectorMetricSchema>;
export declare const QuantizationSchema: z.ZodEnum<["none", "scalar", "product", "binary"]>;
export type Quantization = z.infer<typeof QuantizationSchema>;
export interface VectorDatabaseConfig {
    dimensions: number;
    metric?: VectorMetric;
    quantization?: Quantization;
    indexType?: 'hnsw' | 'ivf' | 'flat';
    efConstruction?: number;
    M?: number;
    nprobe?: number;
    useWasm?: boolean;
}
export interface Vector {
    id: string;
    values: Float32Array | number[];
    metadata?: Record<string, any>;
}
export interface VectorSearchResult {
    id: string;
    score: number;
    metadata?: Record<string, any>;
    vector?: Float32Array | number[];
}
export interface GenomicVariant {
    id: string;
    chromosome: string;
    position: number;
    reference: string;
    alternate: string;
    quality?: number;
    filter?: string;
    info?: Record<string, any>;
    genotype?: string;
    phenotypes?: string[];
}
export interface Gene {
    id: string;
    symbol: string;
    name: string;
    chromosome: string;
    start: number;
    end: number;
    strand: '+' | '-';
    biotype?: string;
    description?: string;
}
export interface Protein {
    id: string;
    name: string;
    sequence: string;
    geneId?: string;
    domains?: ProteinDomain[];
    functions?: string[];
}
export interface ProteinDomain {
    name: string;
    start: number;
    end: number;
    eValue?: number;
}
export interface Phenotype {
    id: string;
    name: string;
    description?: string;
    hpoId?: string;
    severity?: 'mild' | 'moderate' | 'severe';
    onset?: string;
}
export interface ClinicalCase {
    id: string;
    patientId?: string;
    variants: GenomicVariant[];
    phenotypes: Phenotype[];
    diagnosis?: string;
    outcome?: string;
    metadata?: Record<string, any>;
    timestamp?: Date;
}
export declare const EmbeddingModelSchema: z.ZodEnum<["kmer", "dna-bert", "nucleotide-transformer", "esm2", "protbert", "phenotype-bert", "custom"]>;
export type EmbeddingModel = z.infer<typeof EmbeddingModelSchema>;
export interface EmbeddingConfig {
    model: EmbeddingModel;
    dimensions?: number;
    kmerSize?: number;
    stride?: number;
    maxLength?: number;
    normalization?: 'l2' | 'none';
    useCache?: boolean;
    batchSize?: number;
}
export interface EmbeddingResult {
    vector: Float32Array | number[];
    model: EmbeddingModel;
    inputLength: number;
    processingTime?: number;
}
export interface LearningConfig {
    algorithm: 'q-learning' | 'sarsa' | 'dqn' | 'ppo' | 'pattern-recognition';
    learningRate?: number;
    discountFactor?: number;
    explorationRate?: number;
    batchSize?: number;
    epochs?: number;
    validationSplit?: number;
}
export interface TrainingExample {
    id: string;
    input: any;
    output?: any;
    reward?: number;
    metadata?: Record<string, any>;
}
export interface Pattern {
    id: string;
    name: string;
    description?: string;
    vectorRepresentation: Float32Array | number[];
    frequency: number;
    confidence: number;
    examples: string[];
    metadata?: Record<string, any>;
}
export interface LearningMetrics {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    loss?: number;
    epoch?: number;
    validationMetrics?: {
        accuracy?: number;
        loss?: number;
    };
}
export interface SearchQuery {
    vector?: Float32Array | number[];
    text?: string;
    filters?: Record<string, any>;
    k?: number;
    threshold?: number;
    includeMetadata?: boolean;
    includeVectors?: boolean;
}
export interface MultiModalQuery {
    vectorQuery?: Float32Array | number[];
    textQuery?: string;
    structuredFilters?: Record<string, any>;
    weights?: {
        vector?: number;
        text?: number;
        structured?: number;
    };
    k?: number;
}
export interface SearchOptions {
    k?: number;
    efSearch?: number;
    threshold?: number;
    filters?: Record<string, any>;
    rerank?: boolean;
    explain?: boolean;
}
export interface Plugin {
    name: string;
    version: string;
    description?: string;
    initialize: (context: PluginContext) => Promise<void>;
    hooks?: PluginHooks;
    api?: Record<string, Function>;
}
export interface PluginContext {
    db: any;
    embeddings: any;
    config: Record<string, any>;
    logger: Logger;
}
export interface PluginHooks {
    beforeEmbed?: (data: any) => Promise<any>;
    afterEmbed?: (result: EmbeddingResult) => Promise<EmbeddingResult>;
    beforeSearch?: (query: SearchQuery) => Promise<SearchQuery>;
    afterSearch?: (results: VectorSearchResult[]) => Promise<VectorSearchResult[]>;
    beforeTrain?: (examples: TrainingExample[]) => Promise<TrainingExample[]>;
    afterTrain?: (metrics: LearningMetrics) => Promise<LearningMetrics>;
}
export interface Logger {
    debug: (message: string, meta?: any) => void;
    info: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    error: (message: string, meta?: any) => void;
}
export interface StreamConfig {
    batchSize?: number;
    parallelism?: number;
    bufferSize?: number;
    backpressure?: boolean;
}
export interface StreamProcessor<T, R> {
    process: (item: T) => Promise<R>;
    onError?: (error: Error, item: T) => void;
    onComplete?: () => void;
}
export interface CacheConfig {
    enabled: boolean;
    maxSize?: number;
    ttl?: number;
    strategy?: 'lru' | 'lfu' | 'fifo';
}
export interface CacheEntry<T> {
    key: string;
    value: T;
    timestamp: number;
    hits: number;
    size?: number;
}
export interface BenchmarkConfig {
    dataset: string;
    operations: ('embed' | 'search' | 'train')[];
    iterations?: number;
    warmup?: number;
    outputFormat?: 'json' | 'csv' | 'console';
}
export interface BenchmarkResult {
    operation: string;
    samples: number;
    meanTime: number;
    medianTime: number;
    p95Time: number;
    p99Time: number;
    throughput: number;
    memoryUsage?: number;
}
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
export interface FederatedConfig {
    numInstitutions: number;
    rounds: number;
    clientFraction: number;
    localEpochs: number;
    localBatchSize: number;
    learningRate: number;
    aggregationStrategy: 'fedavg' | 'fedprox' | 'fedopt';
    privacyBudget?: number;
    clippingNorm?: number;
    noiseMultiplier?: number;
}
export interface Institution {
    id: string;
    name: string;
    dataSize: number;
    modelWeights: Map<string, number[]>;
    trustScore: number;
    lastUpdate: number;
}
export interface LocalUpdate {
    institutionId: string;
    weights: Map<string, number[]>;
    dataSize: number;
    loss: number;
    accuracy: number;
    round: number;
    timestamp: number;
    privacySpent?: number;
}
export interface GlobalModel {
    weights: Map<string, number[]>;
    round: number;
    participatingInstitutions: string[];
    aggregatedDataSize: number;
    globalLoss: number;
    globalAccuracy: number;
}
export interface PrivacyAccountant {
    epsilon: number;
    delta: number;
    steps: number;
    privacyBudgetRemaining: number;
}
export interface SecureAggregationConfig {
    threshold: number;
    noiseScale: number;
    dropoutTolerance: number;
}
export interface HomomorphicEncryptionConfig {
    keySize: number;
    plainModulus: number;
    polyModulusDegree: number;
}
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
    topAttendedTokens: Array<{
        index: number;
        token: string;
        score: number;
    }>;
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
export declare const schemas: {
    VectorMetric: z.ZodEnum<["cosine", "euclidean", "hamming", "manhattan", "dot"]>;
    Quantization: z.ZodEnum<["none", "scalar", "product", "binary"]>;
    EmbeddingModel: z.ZodEnum<["kmer", "dna-bert", "nucleotide-transformer", "esm2", "protbert", "phenotype-bert", "custom"]>;
};
//# sourceMappingURL=index.d.ts.map