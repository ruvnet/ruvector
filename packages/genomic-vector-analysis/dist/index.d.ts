export { VectorDatabase } from './core/VectorDatabase';
export { KmerEmbedding } from './embeddings/KmerEmbedding';
export { PatternRecognizer } from './learning/PatternRecognizer';
export { QLearningOptimizer, PolicyGradientOptimizer, MultiArmedBandit, ExperienceReplayBuffer } from './learning/ReinforcementLearning';
export { PreTrainedModelRegistry, FineTuningEngine, DomainAdaptation, FewShotLearner } from './learning/TransferLearning';
export { FederatedLearningCoordinator, SecureAggregation, HomomorphicEncryption } from './learning/FederatedLearning';
export { BayesianOptimizer, AdaptiveEmbedding, DynamicQuantization, HNSWAutotuner } from './learning/MetaLearning';
export { SHAPExplainer, AttentionAnalyzer, FeatureImportanceAnalyzer, CounterfactualGenerator } from './learning/ExplainableAI';
export { OnlineLearner, ForgettingPrevention, IncrementalIndexUpdater, ModelVersionManager } from './learning/ContinuousLearning';
export { PluginManager, createPlugin } from './plugins/PluginManager';
import { VectorDatabase } from './core/VectorDatabase';
import { KmerEmbedding } from './embeddings/KmerEmbedding';
import { PatternRecognizer } from './learning/PatternRecognizer';
import { PluginManager } from './plugins/PluginManager';
export type { VectorDatabaseConfig, Vector, VectorSearchResult, SearchOptions, VectorMetric, Quantization, GenomicVariant, Gene, Protein, ProteinDomain, Phenotype, ClinicalCase, EmbeddingConfig, EmbeddingModel, EmbeddingResult, LearningConfig, TrainingExample, Pattern, LearningMetrics, RLConfig, State, IndexParams, Action, Experience, QValue, PolicyGradientConfig, BanditArm, PreTrainedModel, FineTuningConfig, DomainAdaptationConfig, FewShotConfig, TrainingMetrics, DomainStatistics, FederatedConfig, Institution, LocalUpdate, GlobalModel, PrivacyAccountant, SecureAggregationConfig, HomomorphicEncryptionConfig, HyperparameterSpace, HyperparameterConfig, TrialResult, AdaptiveEmbeddingConfig, QuantizationStrategy, HNSWTuningConfig, SHAPValue, FeatureImportance, AttentionWeights, CounterfactualExplanation, ExplanationContext, OnlineLearningConfig, ModelVersion, IncrementalUpdate, ForgettingMetrics, ReplayBuffer, SearchQuery, MultiModalQuery, Plugin, PluginContext, PluginHooks, Logger, StreamConfig, StreamProcessor, CacheConfig, CacheEntry, BenchmarkConfig, BenchmarkResult, } from './types';
export { schemas } from './types';
export declare class GenomicVectorDB {
    db: VectorDatabase;
    embeddings: KmerEmbedding;
    learning: PatternRecognizer;
    plugins: PluginManager;
    constructor(config?: {
        database?: any;
        embeddings?: any;
        plugins?: any;
    });
    addSequence(id: string, sequence: string, metadata?: any): Promise<void>;
    searchBySequence(sequence: string, k?: number): Promise<any[]>;
    searchByText(query: string, k?: number): Promise<any[]>;
}
export declare const VERSION = "1.0.0";
//# sourceMappingURL=index.d.ts.map