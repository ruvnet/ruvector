/**
 * @ruvector/dynamic-attention-example
 *
 * Dynamic Attention: FastGRNN + Attention Integration
 *
 * This package demonstrates combining FastGRNN neural routing with
 * attention-enhanced feature extraction for intelligent query routing.
 *
 * @example
 * ```typescript
 * import { createPipeline, DynamicAttentionPipeline } from '@ruvector/dynamic-attention-example';
 *
 * const pipeline = createPipeline({
 *   dim: 384,
 *   numHeads: 8,
 *   attentionType: 'multi-head',
 *   enableSIMD: true,
 * });
 *
 * const result = await pipeline.process(
 *   { embedding: queryVector, context: [ctx1, ctx2] },
 *   candidates
 * );
 *
 * console.log(`Best: ${result.decisions[0].candidateId}`);
 * console.log(`Latency: ${result.metrics.totalLatencyUs}μs`);
 * ```
 */

// Core pipeline
export { DynamicAttentionPipeline, createPipeline } from './dynamic-attention.js';

// Types
export type {
  // Configuration
  DynamicAttentionConfig,
  AttentionType,
  SIMDLevel,
  // Input/Output
  QueryInput,
  RoutingCandidate,
  RoutingDecision,
  PipelineResult,
  PipelineMetrics,
  // Benchmarking
  BenchmarkResult,
  // SIMD
  SIMDCapabilities,
  SIMDHints,
  // Training
  TrainingSample,
  TrainingConfig,
  TrainingMetrics,
} from './types.js';

export { DEFAULT_CONFIG } from './types.js';

// SIMD utilities
export {
  detectSIMDCapabilities,
  getSIMDHints,
  dotProduct,
  vectorAddInPlace,
  vectorScaleInPlace,
  normalizeL2InPlace,
  softmaxInPlace,
  batchMatVec,
  createAlignedFloat32Array,
  copyToAligned,
  padForSIMD,
  hrTimeUs,
  measureTimeUs,
  warmUp,
} from './simd-utils.js';

// Training module
export {
  // Config types
  type TrainingConfig as FullTrainingConfig,
  type BoundedOptimizationConfig,
  type PruningConfig,
  type OptimizerConfig,
  type SchedulerConfig,
  type LossConfig,
  type WeightConstraint,
  type GradientConstraint,
  // Config presets
  DEFAULT_TRAINING_CONFIG,
  FAST_TRAINING_CONFIG,
  PRODUCTION_TRAINING_CONFIG,
  COMPRESSION_TRAINING_CONFIG,
  // Trainer
  Trainer,
  Tensor,
  PruningManager,
  SGDOptimizer,
  AdamOptimizer,
  LearningRateScheduler,
  applyWeightConstraint,
  applyGradientConstraint,
  computeLoss,
  // CLI
  parseCliArgs,
  buildConfigFromArgs,
  printHelp,
  formatConfig,
} from './training/index.js';

/**
 * Quick start function for common use cases
 */
export async function quickRoute(
  queryEmbedding: Float32Array,
  candidates: Array<{ id: string; embedding: Float32Array; successRate?: number }>,
  options?: {
    context?: Float32Array[];
    attentionType?: 'dot-product' | 'multi-head' | 'hyperbolic';
  }
) {
  const { createPipeline } = await import('./dynamic-attention.js');

  const pipeline = createPipeline({
    dim: queryEmbedding.length,
    attentionType: options?.attentionType ?? 'multi-head',
  });

  return pipeline.process(
    { embedding: queryEmbedding, context: options?.context },
    candidates
  );
}

/**
 * Version information
 */
export const VERSION = '1.0.0';

/**
 * Feature flags
 */
export const FEATURES = {
  ATTENTION_TYPES: [
    'dot-product',
    'multi-head',
    'hyperbolic',
    'flash',
    'linear',
    'local-global',
    'moe',
  ] as const,
  SIMD_LEVELS: ['none', 'sse4', 'avx2', 'avx512', 'neon'] as const,
  SUPPORTS_QUANTIZATION: true,
  SUPPORTS_TRAINING: true,
};
