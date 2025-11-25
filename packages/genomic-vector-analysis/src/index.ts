/**
 * Genomic Vector Analysis - General-purpose genomic data analysis with advanced learning
 *
 * A comprehensive toolkit for genomic vector analysis including:
 * - High-performance vector database for genomic data
 * - Multiple embedding models (k-mer, transformer-based, pre-trained)
 * - Advanced learning capabilities (pattern recognition, RL, transfer learning)
 * - Multi-modal search (vector + keyword + metadata)
 * - Plugin architecture for extensibility
 * - Rust/WASM acceleration for performance-critical operations
 */

// Core exports
export { VectorDatabase } from './core/VectorDatabase';

// Embedding exports
export { KmerEmbedding } from './embeddings/KmerEmbedding';

// Pre-trained Models exports
export { PreTrainedModels, PreTrainedModel } from './models/PreTrainedModels';
export type { ModelMetadata, ModelData, ModelRegistryEntry } from './models/PreTrainedModels';

// Learning exports
export { PatternRecognizer } from './learning/PatternRecognizer';

// Advanced Learning - Reinforcement Learning
export {
  QLearningOptimizer,
  PolicyGradientOptimizer,
  MultiArmedBandit,
  ExperienceReplayBuffer
} from './learning/ReinforcementLearning';

// Advanced Learning - Transfer Learning
export {
  PreTrainedModelRegistry,
  FineTuningEngine,
  DomainAdaptation,
  FewShotLearner
} from './learning/TransferLearning';

// Advanced Learning - Federated Learning
export {
  FederatedLearningCoordinator,
  SecureAggregation,
  HomomorphicEncryption
} from './learning/FederatedLearning';

// Advanced Learning - Meta-Learning
export {
  BayesianOptimizer,
  AdaptiveEmbedding,
  DynamicQuantization,
  HNSWAutotuner
} from './learning/MetaLearning';

// Advanced Learning - Explainable AI
export {
  SHAPExplainer,
  AttentionAnalyzer,
  FeatureImportanceAnalyzer,
  CounterfactualGenerator
} from './learning/ExplainableAI';

// Advanced Learning - Continuous Learning
export {
  OnlineLearner,
  ForgettingPrevention,
  IncrementalIndexUpdater,
  ModelVersionManager
} from './learning/ContinuousLearning';

// Plugin exports
export { PluginManager, createPlugin } from './plugins/PluginManager';

// Import classes for convenience wrapper
import { VectorDatabase } from './core/VectorDatabase';
import { KmerEmbedding } from './embeddings/KmerEmbedding';
import { PatternRecognizer } from './learning/PatternRecognizer';
import { PluginManager } from './plugins/PluginManager';
import {
  QLearningOptimizer,
  PolicyGradientOptimizer,
  MultiArmedBandit,
  ExperienceReplayBuffer
} from './learning/ReinforcementLearning';
import {
  PreTrainedModelRegistry,
  FineTuningEngine,
  DomainAdaptation,
  FewShotLearner
} from './learning/TransferLearning';
import {
  FederatedLearningCoordinator,
  SecureAggregation,
  HomomorphicEncryption
} from './learning/FederatedLearning';
import {
  BayesianOptimizer,
  AdaptiveEmbedding,
  DynamicQuantization,
  HNSWAutotuner
} from './learning/MetaLearning';
import {
  SHAPExplainer,
  AttentionAnalyzer,
  FeatureImportanceAnalyzer,
  CounterfactualGenerator
} from './learning/ExplainableAI';
import {
  OnlineLearner,
  ForgettingPrevention,
  IncrementalIndexUpdater,
  ModelVersionManager
} from './learning/ContinuousLearning';

// Type exports
export type {
  // Vector Database
  VectorDatabaseConfig,
  Vector,
  VectorSearchResult,
  SearchOptions,
  VectorMetric,
  Quantization,

  // Genomic Data
  GenomicVariant,
  Gene,
  Protein,
  ProteinDomain,
  Phenotype,
  ClinicalCase,

  // Embeddings
  EmbeddingConfig,
  EmbeddingModel,
  EmbeddingResult,

  // Learning
  LearningConfig,
  TrainingExample,
  Pattern,
  LearningMetrics,

  // Reinforcement Learning Types
  RLConfig,
  State,
  IndexParams,
  Action,
  Experience,
  QValue,
  PolicyGradientConfig,
  BanditArm,

  // Transfer Learning Types
  PreTrainedModel,
  FineTuningConfig,
  DomainAdaptationConfig,
  FewShotConfig,
  TrainingMetrics,
  DomainStatistics,

  // Federated Learning Types
  FederatedConfig,
  Institution,
  LocalUpdate,
  GlobalModel,
  PrivacyAccountant,
  SecureAggregationConfig,
  HomomorphicEncryptionConfig,

  // Meta-Learning Types
  HyperparameterSpace,
  HyperparameterConfig,
  TrialResult,
  AdaptiveEmbeddingConfig,
  QuantizationStrategy,
  HNSWTuningConfig,

  // Explainable AI Types
  SHAPValue,
  FeatureImportance,
  AttentionWeights,
  CounterfactualExplanation,
  ExplanationContext,

  // Continuous Learning Types
  OnlineLearningConfig,
  ModelVersion,
  IncrementalUpdate,
  ForgettingMetrics,
  ReplayBuffer,

  // Search
  SearchQuery,
  MultiModalQuery,

  // Plugins
  Plugin,
  PluginContext,
  PluginHooks,
  Logger,

  // Streaming
  StreamConfig,
  StreamProcessor,

  // Cache
  CacheConfig,
  CacheEntry,

  // Benchmarks
  BenchmarkConfig,
  BenchmarkResult,
} from './types';

// Re-export schemas for validation
export { schemas } from './types';

/**
 * Main GenomicVectorDB class - convenience wrapper
 */
export class GenomicVectorDB {
  public db: VectorDatabase;
  public embeddings: KmerEmbedding;
  public learning: PatternRecognizer;
  public plugins: PluginManager;

  constructor(config: {
    database?: any;
    embeddings?: any;
    plugins?: any;
  } = {}) {
    // Initialize core components
    this.db = new VectorDatabase(config.database || {
      dimensions: 384,
      metric: 'cosine',
      quantization: 'none',
      indexType: 'hnsw',
    });

    this.embeddings = new KmerEmbedding(config.embeddings || {
      model: 'kmer',
      dimensions: 384,
      kmerSize: 6,
    });

    this.learning = new PatternRecognizer(this.db);

    this.plugins = new PluginManager({
      db: this.db,
      embeddings: this.embeddings,
      config: config.plugins || {},
    });
  }

  /**
   * Convenience method: Add and embed a sequence
   */
  async addSequence(id: string, sequence: string, metadata?: any): Promise<void> {
    const embedding = await this.embeddings.embed(sequence);
    await this.db.add({
      id,
      values: embedding.vector,
      metadata: {
        ...metadata,
        sequence,
        inputLength: embedding.inputLength,
      },
    });
  }

  /**
   * Convenience method: Search by sequence
   */
  async searchBySequence(sequence: string, k: number = 10): Promise<any[]> {
    const embedding = await this.embeddings.embed(sequence);
    return this.db.search(embedding.vector, { k });
  }

  /**
   * Convenience method: Search by text query
   */
  async searchByText(query: string, k: number = 10): Promise<any[]> {
    // In a full implementation, this would use a text embedding model
    // For now, we'll use k-mer embedding as a fallback
    const embedding = await this.embeddings.embed(query);
    return this.db.search(embedding.vector, { k });
  }
}

/**
 * Convenience re-exports for common use cases
 */
// All classes are already exported above, users can import them directly

/**
 * Version information
 */
export const VERSION = '1.0.0';
