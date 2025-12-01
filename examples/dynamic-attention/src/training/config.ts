/**
 * Training Configuration Types
 *
 * Comprehensive configuration for training the Dynamic Attention pipeline
 * with bounded constraints, pruning, and optimization strategies.
 */

// ============================================================================
// Bounded Constraint Types
// ============================================================================

/**
 * Weight constraint types for bounded optimization
 */
export type WeightConstraintType =
  | 'none'
  | 'max_norm'      // Constrain L2 norm of weights
  | 'unit_norm'     // Normalize to unit norm
  | 'min_max'       // Clip to [min, max] range
  | 'non_negative'  // Ensure non-negative weights
  | 'spectral';     // Spectral normalization

/**
 * Weight constraint configuration
 */
export interface WeightConstraint {
  /** Constraint type */
  type: WeightConstraintType;
  /** Max norm value (for max_norm) */
  maxNorm?: number;
  /** Min value (for min_max) */
  minValue?: number;
  /** Max value (for min_max) */
  maxValue?: number;
  /** Apply per-row (true) or globally (false) */
  axis?: 'row' | 'column' | 'global';
}

/**
 * Gradient constraint configuration
 */
export interface GradientConstraint {
  /** Enable gradient clipping */
  clipGradients: boolean;
  /** Gradient norm clipping threshold */
  clipNorm?: number;
  /** Gradient value clipping (element-wise) */
  clipValue?: number;
  /** Enable gradient scaling for mixed precision */
  enableGradientScaling: boolean;
  /** Initial gradient scale */
  initialScale?: number;
}

/**
 * Bounded optimization configuration
 */
export interface BoundedOptimizationConfig {
  /** Weight constraints per layer */
  weightConstraints: {
    attention: WeightConstraint;
    fastgrnn: WeightConstraint;
    output: WeightConstraint;
  };
  /** Gradient constraints */
  gradientConstraints: GradientConstraint;
  /** L1 regularization strength */
  l1Regularization: number;
  /** L2 regularization strength */
  l2Regularization: number;
  /** Elastic net mixing ratio (0=L2, 1=L1) */
  elasticNetRatio: number;
}

// ============================================================================
// Pruning Types
// ============================================================================

/**
 * Pruning strategy types
 */
export type PruningStrategy =
  | 'none'
  | 'magnitude'          // Prune smallest magnitude weights
  | 'random'             // Random pruning
  | 'structured_channel' // Prune entire channels
  | 'structured_head'    // Prune attention heads
  | 'lottery_ticket'     // Iterative magnitude pruning
  | 'movement'           // Movement pruning (gradient-based)
  | 'sensitivity';       // Layer-wise sensitivity analysis

/**
 * Pruning schedule types
 */
export type PruningSchedule =
  | 'one_shot'           // Prune once at target sparsity
  | 'gradual'            // Gradually increase sparsity
  | 'cubic'              // Cubic sparsity schedule
  | 'exponential';       // Exponential decay to target

/**
 * Pruning configuration
 */
export interface PruningConfig {
  /** Pruning strategy */
  strategy: PruningStrategy;
  /** Target sparsity (0.0 to 1.0) */
  targetSparsity: number;
  /** Pruning schedule */
  schedule: PruningSchedule;
  /** Start pruning at this epoch */
  startEpoch: number;
  /** End pruning at this epoch (for gradual) */
  endEpoch: number;
  /** Pruning frequency (epochs between pruning steps) */
  frequency: number;
  /** Per-layer sparsity targets (optional override) */
  layerSparsity?: {
    attention?: number;
    fastgrnn?: number;
    output?: number;
  };
  /** Minimum weight magnitude to keep */
  minMagnitude?: number;
  /** Re-initialize pruned weights during recovery */
  enableRewinding: boolean;
  /** Epoch to rewind to for lottery ticket */
  rewindEpoch?: number;
}

// ============================================================================
// Optimizer Types
// ============================================================================

/**
 * Optimizer type
 */
export type OptimizerType =
  | 'sgd'
  | 'adam'
  | 'adamw'
  | 'rmsprop'
  | 'adagrad'
  | 'lamb'
  | 'sophia';

/**
 * Learning rate scheduler type
 */
export type SchedulerType =
  | 'constant'
  | 'step'
  | 'exponential'
  | 'cosine'
  | 'cosine_warmup'
  | 'linear_warmup'
  | 'one_cycle'
  | 'reduce_on_plateau';

/**
 * Optimizer configuration
 */
export interface OptimizerConfig {
  /** Optimizer type */
  type: OptimizerType;
  /** Base learning rate */
  learningRate: number;
  /** Weight decay (for adamw) */
  weightDecay: number;
  /** Momentum (for sgd, rmsprop) */
  momentum?: number;
  /** Beta1 (for adam) */
  beta1?: number;
  /** Beta2 (for adam) */
  beta2?: number;
  /** Epsilon for numerical stability */
  epsilon?: number;
  /** Nesterov momentum (for sgd) */
  nesterov?: boolean;
}

/**
 * Learning rate scheduler configuration
 */
export interface SchedulerConfig {
  /** Scheduler type */
  type: SchedulerType;
  /** Warmup epochs */
  warmupEpochs: number;
  /** Step size (for step scheduler) */
  stepSize?: number;
  /** Gamma decay factor */
  gamma?: number;
  /** Minimum learning rate */
  minLr: number;
  /** Maximum learning rate (for one_cycle) */
  maxLr?: number;
  /** Patience for plateau scheduler */
  patience?: number;
  /** T_max for cosine annealing */
  tMax?: number;
}

// ============================================================================
// Loss Function Types
// ============================================================================

/**
 * Loss function type
 */
export type LossType =
  | 'cross_entropy'
  | 'bce'                // Binary cross entropy
  | 'mse'
  | 'huber'
  | 'focal'              // Focal loss for imbalanced data
  | 'contrastive'        // InfoNCE contrastive loss
  | 'triplet'
  | 'ranking';           // Pairwise ranking loss

/**
 * Loss function configuration
 */
export interface LossConfig {
  /** Primary loss type */
  type: LossType;
  /** Label smoothing factor */
  labelSmoothing: number;
  /** Focal loss gamma */
  focalGamma?: number;
  /** Margin for triplet/contrastive loss */
  margin?: number;
  /** Temperature for contrastive loss */
  temperature?: number;
  /** Auxiliary losses and their weights */
  auxiliaryLosses?: {
    type: LossType;
    weight: number;
  }[];
}

// ============================================================================
// Data Configuration
// ============================================================================

/**
 * Data augmentation configuration
 */
export interface AugmentationConfig {
  /** Add Gaussian noise to embeddings */
  gaussianNoise: boolean;
  /** Noise standard deviation */
  noiseStd: number;
  /** Random dropout on context */
  contextDropout: number;
  /** Randomly mask candidates */
  candidateMasking: number;
  /** Mixup alpha (0 to disable) */
  mixupAlpha: number;
}

/**
 * Data loading configuration
 */
export interface DataConfig {
  /** Training data path */
  trainPath: string;
  /** Validation data path */
  valPath?: string;
  /** Test data path */
  testPath?: string;
  /** Batch size */
  batchSize: number;
  /** Shuffle training data */
  shuffle: boolean;
  /** Number of data loader workers */
  numWorkers: number;
  /** Pin memory for GPU */
  pinMemory: boolean;
  /** Validation split ratio (if no val path) */
  valSplit: number;
  /** Augmentation configuration */
  augmentation: AugmentationConfig;
}

// ============================================================================
// Training Configuration
// ============================================================================

/**
 * Checkpoint configuration
 */
export interface CheckpointConfig {
  /** Save checkpoints */
  enabled: boolean;
  /** Checkpoint directory */
  dir: string;
  /** Save frequency (epochs) */
  frequency: number;
  /** Keep only best N checkpoints */
  keepBest: number;
  /** Monitor metric for best model */
  monitorMetric: string;
  /** Whether higher is better */
  modeMax: boolean;
  /** Save optimizer state */
  saveOptimizer: boolean;
}

/**
 * Early stopping configuration
 */
export interface EarlyStoppingConfig {
  /** Enable early stopping */
  enabled: boolean;
  /** Patience (epochs without improvement) */
  patience: number;
  /** Minimum delta for improvement */
  minDelta: number;
  /** Monitor metric */
  monitorMetric: string;
  /** Whether higher is better */
  modeMax: boolean;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  /** Log frequency (steps) */
  frequency: number;
  /** Enable TensorBoard logging */
  tensorboard: boolean;
  /** TensorBoard log directory */
  logDir: string;
  /** Log histograms */
  logHistograms: boolean;
  /** Log gradient norms */
  logGradients: boolean;
  /** Enable wandb logging */
  wandb: boolean;
  /** Wandb project name */
  wandbProject?: string;
}

/**
 * Complete training configuration
 */
export interface TrainingConfig {
  /** Number of training epochs */
  epochs: number;
  /** Random seed */
  seed: number;
  /** Device (cpu, cuda, mps) */
  device: string;
  /** Enable mixed precision training */
  mixedPrecision: boolean;
  /** Gradient accumulation steps */
  gradientAccumulation: number;
  /** Optimizer configuration */
  optimizer: OptimizerConfig;
  /** Scheduler configuration */
  scheduler: SchedulerConfig;
  /** Loss configuration */
  loss: LossConfig;
  /** Data configuration */
  data: DataConfig;
  /** Bounded optimization configuration */
  bounded: BoundedOptimizationConfig;
  /** Pruning configuration */
  pruning: PruningConfig;
  /** Checkpoint configuration */
  checkpoint: CheckpointConfig;
  /** Early stopping configuration */
  earlyStopping: EarlyStoppingConfig;
  /** Logging configuration */
  logging: LoggingConfig;
  /** Knowledge distillation */
  distillation?: {
    enabled: boolean;
    teacherModelPath: string;
    temperature: number;
    alpha: number;  // Weight for distillation loss
  };
}

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_WEIGHT_CONSTRAINT: WeightConstraint = {
  type: 'max_norm',
  maxNorm: 3.0,
  axis: 'row',
};

export const DEFAULT_GRADIENT_CONSTRAINT: GradientConstraint = {
  clipGradients: true,
  clipNorm: 1.0,
  clipValue: undefined,
  enableGradientScaling: false,
};

export const DEFAULT_BOUNDED_CONFIG: BoundedOptimizationConfig = {
  weightConstraints: {
    attention: { type: 'max_norm', maxNorm: 3.0, axis: 'row' },
    fastgrnn: { type: 'max_norm', maxNorm: 5.0, axis: 'row' },
    output: { type: 'none' },
  },
  gradientConstraints: DEFAULT_GRADIENT_CONSTRAINT,
  l1Regularization: 0.0,
  l2Regularization: 1e-4,
  elasticNetRatio: 0.0,
};

export const DEFAULT_PRUNING_CONFIG: PruningConfig = {
  strategy: 'none',
  targetSparsity: 0.0,
  schedule: 'gradual',
  startEpoch: 10,
  endEpoch: 80,
  frequency: 5,
  enableRewinding: false,
};

export const DEFAULT_OPTIMIZER_CONFIG: OptimizerConfig = {
  type: 'adamw',
  learningRate: 1e-3,
  weightDecay: 1e-2,
  beta1: 0.9,
  beta2: 0.999,
  epsilon: 1e-8,
};

export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  type: 'cosine_warmup',
  warmupEpochs: 5,
  minLr: 1e-6,
  gamma: 0.1,
};

export const DEFAULT_LOSS_CONFIG: LossConfig = {
  type: 'cross_entropy',
  labelSmoothing: 0.1,
};

export const DEFAULT_AUGMENTATION_CONFIG: AugmentationConfig = {
  gaussianNoise: true,
  noiseStd: 0.01,
  contextDropout: 0.1,
  candidateMasking: 0.0,
  mixupAlpha: 0.0,
};

export const DEFAULT_DATA_CONFIG: DataConfig = {
  trainPath: './data/train.jsonl',
  batchSize: 32,
  shuffle: true,
  numWorkers: 4,
  pinMemory: true,
  valSplit: 0.1,
  augmentation: DEFAULT_AUGMENTATION_CONFIG,
};

export const DEFAULT_CHECKPOINT_CONFIG: CheckpointConfig = {
  enabled: true,
  dir: './checkpoints',
  frequency: 5,
  keepBest: 3,
  monitorMetric: 'val_accuracy',
  modeMax: true,
  saveOptimizer: true,
};

export const DEFAULT_EARLY_STOPPING_CONFIG: EarlyStoppingConfig = {
  enabled: true,
  patience: 10,
  minDelta: 1e-4,
  monitorMetric: 'val_loss',
  modeMax: false,
};

export const DEFAULT_LOGGING_CONFIG: LoggingConfig = {
  frequency: 100,
  tensorboard: true,
  logDir: './logs',
  logHistograms: false,
  logGradients: true,
  wandb: false,
};

export const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  epochs: 100,
  seed: 42,
  device: 'cpu',
  mixedPrecision: false,
  gradientAccumulation: 1,
  optimizer: DEFAULT_OPTIMIZER_CONFIG,
  scheduler: DEFAULT_SCHEDULER_CONFIG,
  loss: DEFAULT_LOSS_CONFIG,
  data: DEFAULT_DATA_CONFIG,
  bounded: DEFAULT_BOUNDED_CONFIG,
  pruning: DEFAULT_PRUNING_CONFIG,
  checkpoint: DEFAULT_CHECKPOINT_CONFIG,
  earlyStopping: DEFAULT_EARLY_STOPPING_CONFIG,
  logging: DEFAULT_LOGGING_CONFIG,
};

// ============================================================================
// Configuration Presets
// ============================================================================

/**
 * Fast training preset (quick experiments)
 */
export const FAST_TRAINING_CONFIG: Partial<TrainingConfig> = {
  epochs: 20,
  data: {
    ...DEFAULT_DATA_CONFIG,
    batchSize: 64,
  },
  optimizer: {
    ...DEFAULT_OPTIMIZER_CONFIG,
    learningRate: 3e-3,
  },
  scheduler: {
    ...DEFAULT_SCHEDULER_CONFIG,
    type: 'constant',
    warmupEpochs: 0,
  },
  pruning: {
    ...DEFAULT_PRUNING_CONFIG,
    strategy: 'none',
  },
  checkpoint: {
    ...DEFAULT_CHECKPOINT_CONFIG,
    frequency: 10,
  },
};

/**
 * Production training preset (high quality)
 */
export const PRODUCTION_TRAINING_CONFIG: Partial<TrainingConfig> = {
  epochs: 200,
  mixedPrecision: true,
  gradientAccumulation: 4,
  data: {
    ...DEFAULT_DATA_CONFIG,
    batchSize: 16,
    augmentation: {
      ...DEFAULT_AUGMENTATION_CONFIG,
      mixupAlpha: 0.2,
    },
  },
  optimizer: {
    ...DEFAULT_OPTIMIZER_CONFIG,
    learningRate: 1e-4,
    weightDecay: 5e-2,
  },
  scheduler: {
    ...DEFAULT_SCHEDULER_CONFIG,
    type: 'cosine_warmup',
    warmupEpochs: 10,
    minLr: 1e-7,
  },
  bounded: {
    ...DEFAULT_BOUNDED_CONFIG,
    gradientConstraints: {
      ...DEFAULT_GRADIENT_CONSTRAINT,
      clipNorm: 0.5,
    },
    l2Regularization: 1e-3,
  },
  pruning: {
    ...DEFAULT_PRUNING_CONFIG,
    strategy: 'magnitude',
    targetSparsity: 0.5,
    schedule: 'cubic',
    startEpoch: 30,
    endEpoch: 150,
  },
  earlyStopping: {
    ...DEFAULT_EARLY_STOPPING_CONFIG,
    patience: 20,
  },
};

/**
 * Compression-focused preset (small model)
 */
export const COMPRESSION_TRAINING_CONFIG: Partial<TrainingConfig> = {
  epochs: 150,
  pruning: {
    strategy: 'lottery_ticket',
    targetSparsity: 0.9,
    schedule: 'cubic',
    startEpoch: 10,
    endEpoch: 100,
    frequency: 5,
    enableRewinding: true,
    rewindEpoch: 5,
  },
  bounded: {
    ...DEFAULT_BOUNDED_CONFIG,
    l1Regularization: 1e-4,
    elasticNetRatio: 0.5,
  },
};
