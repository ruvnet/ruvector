/**
 * Training CLI
 *
 * Command-line interface for training the Dynamic Attention model
 * with configurable parameters and arguments.
 */

import { parseArgs } from 'node:util';
import type { TrainingConfig, PruningStrategy, OptimizerType, SchedulerType, LossType } from './config.js';
import {
  DEFAULT_TRAINING_CONFIG,
  FAST_TRAINING_CONFIG,
  PRODUCTION_TRAINING_CONFIG,
  COMPRESSION_TRAINING_CONFIG,
} from './config.js';

// ============================================================================
// CLI Argument Definition
// ============================================================================

export interface CLIArgs {
  // General
  config?: string;
  preset?: 'default' | 'fast' | 'production' | 'compression';
  seed?: number;
  device?: string;
  verbose?: boolean;
  help?: boolean;

  // Training
  epochs?: number;
  batchSize?: number;
  gradientAccumulation?: number;
  mixedPrecision?: boolean;

  // Optimizer
  optimizer?: OptimizerType;
  lr?: number;
  weightDecay?: number;
  momentum?: number;
  beta1?: number;
  beta2?: number;

  // Scheduler
  scheduler?: SchedulerType;
  warmupEpochs?: number;
  minLr?: number;

  // Loss
  loss?: LossType;
  labelSmoothing?: number;

  // Bounded Constraints
  clipNorm?: number;
  clipValue?: number;
  maxNorm?: number;
  l1Reg?: number;
  l2Reg?: number;

  // Pruning
  pruning?: PruningStrategy;
  targetSparsity?: number;
  pruneStart?: number;
  pruneEnd?: number;
  pruneFrequency?: number;

  // Data
  trainPath?: string;
  valPath?: string;
  valSplit?: number;
  numWorkers?: number;

  // Checkpointing
  checkpointDir?: string;
  checkpointFrequency?: number;
  keepBest?: number;

  // Early Stopping
  patience?: number;
  minDelta?: number;

  // Logging
  logFrequency?: number;
  tensorboard?: boolean;
  logDir?: string;

  // Distillation
  distillation?: boolean;
  teacherPath?: string;
  distillTemp?: number;
  distillAlpha?: number;

  // Output
  outputPath?: string;
  exportOnnx?: boolean;
}

// ============================================================================
// Argument Parser
// ============================================================================

const ARG_OPTIONS = {
  // General
  config: { type: 'string' as const, short: 'c', description: 'Path to JSON config file' },
  preset: { type: 'string' as const, short: 'p', description: 'Config preset: default, fast, production, compression' },
  seed: { type: 'string' as const, description: 'Random seed' },
  device: { type: 'string' as const, short: 'd', description: 'Device: cpu, cuda, mps' },
  verbose: { type: 'boolean' as const, short: 'v', description: 'Verbose output' },
  help: { type: 'boolean' as const, short: 'h', description: 'Show help' },

  // Training
  epochs: { type: 'string' as const, short: 'e', description: 'Number of epochs' },
  'batch-size': { type: 'string' as const, short: 'b', description: 'Batch size' },
  'gradient-accumulation': { type: 'string' as const, description: 'Gradient accumulation steps' },
  'mixed-precision': { type: 'boolean' as const, description: 'Enable mixed precision' },

  // Optimizer
  optimizer: { type: 'string' as const, short: 'o', description: 'Optimizer: sgd, adam, adamw' },
  lr: { type: 'string' as const, description: 'Learning rate' },
  'weight-decay': { type: 'string' as const, description: 'Weight decay' },
  momentum: { type: 'string' as const, description: 'Momentum (SGD)' },
  beta1: { type: 'string' as const, description: 'Adam beta1' },
  beta2: { type: 'string' as const, description: 'Adam beta2' },

  // Scheduler
  scheduler: { type: 'string' as const, short: 's', description: 'LR scheduler type' },
  'warmup-epochs': { type: 'string' as const, description: 'Warmup epochs' },
  'min-lr': { type: 'string' as const, description: 'Minimum learning rate' },

  // Loss
  loss: { type: 'string' as const, short: 'l', description: 'Loss function' },
  'label-smoothing': { type: 'string' as const, description: 'Label smoothing factor' },

  // Bounded Constraints
  'clip-norm': { type: 'string' as const, description: 'Gradient clip norm' },
  'clip-value': { type: 'string' as const, description: 'Gradient clip value' },
  'max-norm': { type: 'string' as const, description: 'Weight max norm constraint' },
  'l1-reg': { type: 'string' as const, description: 'L1 regularization' },
  'l2-reg': { type: 'string' as const, description: 'L2 regularization' },

  // Pruning
  pruning: { type: 'string' as const, description: 'Pruning strategy' },
  'target-sparsity': { type: 'string' as const, description: 'Target sparsity (0-1)' },
  'prune-start': { type: 'string' as const, description: 'Start pruning at epoch' },
  'prune-end': { type: 'string' as const, description: 'End pruning at epoch' },
  'prune-frequency': { type: 'string' as const, description: 'Pruning frequency' },

  // Data
  'train-path': { type: 'string' as const, description: 'Training data path' },
  'val-path': { type: 'string' as const, description: 'Validation data path' },
  'val-split': { type: 'string' as const, description: 'Validation split ratio' },
  'num-workers': { type: 'string' as const, description: 'Data loader workers' },

  // Checkpointing
  'checkpoint-dir': { type: 'string' as const, description: 'Checkpoint directory' },
  'checkpoint-frequency': { type: 'string' as const, description: 'Checkpoint frequency' },
  'keep-best': { type: 'string' as const, description: 'Keep N best checkpoints' },

  // Early Stopping
  patience: { type: 'string' as const, description: 'Early stopping patience' },
  'min-delta': { type: 'string' as const, description: 'Early stopping min delta' },

  // Logging
  'log-frequency': { type: 'string' as const, description: 'Log every N steps' },
  tensorboard: { type: 'boolean' as const, description: 'Enable TensorBoard' },
  'log-dir': { type: 'string' as const, description: 'Log directory' },

  // Distillation
  distillation: { type: 'boolean' as const, description: 'Enable knowledge distillation' },
  'teacher-path': { type: 'string' as const, description: 'Teacher model path' },
  'distill-temp': { type: 'string' as const, description: 'Distillation temperature' },
  'distill-alpha': { type: 'string' as const, description: 'Distillation loss weight' },

  // Output
  'output-path': { type: 'string' as const, description: 'Output model path' },
  'export-onnx': { type: 'boolean' as const, description: 'Export to ONNX' },
};

/**
 * Parse command line arguments
 */
export function parseCliArgs(args: string[] = process.argv.slice(2)): CLIArgs {
  try {
    const { values } = parseArgs({
      args,
      options: ARG_OPTIONS,
      allowPositionals: true,
    });

    // Convert kebab-case to camelCase and parse numbers
    const result: CLIArgs = {};

    if (values.config) result.config = values.config as string;
    if (values.preset) result.preset = values.preset as CLIArgs['preset'];
    if (values.seed) result.seed = parseInt(values.seed as string);
    if (values.device) result.device = values.device as string;
    if (values.verbose) result.verbose = values.verbose;
    if (values.help) result.help = values.help;

    if (values.epochs) result.epochs = parseInt(values.epochs as string);
    if (values['batch-size']) result.batchSize = parseInt(values['batch-size'] as string);
    if (values['gradient-accumulation']) result.gradientAccumulation = parseInt(values['gradient-accumulation'] as string);
    if (values['mixed-precision']) result.mixedPrecision = values['mixed-precision'];

    if (values.optimizer) result.optimizer = values.optimizer as OptimizerType;
    if (values.lr) result.lr = parseFloat(values.lr as string);
    if (values['weight-decay']) result.weightDecay = parseFloat(values['weight-decay'] as string);
    if (values.momentum) result.momentum = parseFloat(values.momentum as string);
    if (values.beta1) result.beta1 = parseFloat(values.beta1 as string);
    if (values.beta2) result.beta2 = parseFloat(values.beta2 as string);

    if (values.scheduler) result.scheduler = values.scheduler as SchedulerType;
    if (values['warmup-epochs']) result.warmupEpochs = parseInt(values['warmup-epochs'] as string);
    if (values['min-lr']) result.minLr = parseFloat(values['min-lr'] as string);

    if (values.loss) result.loss = values.loss as LossType;
    if (values['label-smoothing']) result.labelSmoothing = parseFloat(values['label-smoothing'] as string);

    if (values['clip-norm']) result.clipNorm = parseFloat(values['clip-norm'] as string);
    if (values['clip-value']) result.clipValue = parseFloat(values['clip-value'] as string);
    if (values['max-norm']) result.maxNorm = parseFloat(values['max-norm'] as string);
    if (values['l1-reg']) result.l1Reg = parseFloat(values['l1-reg'] as string);
    if (values['l2-reg']) result.l2Reg = parseFloat(values['l2-reg'] as string);

    if (values.pruning) result.pruning = values.pruning as PruningStrategy;
    if (values['target-sparsity']) result.targetSparsity = parseFloat(values['target-sparsity'] as string);
    if (values['prune-start']) result.pruneStart = parseInt(values['prune-start'] as string);
    if (values['prune-end']) result.pruneEnd = parseInt(values['prune-end'] as string);
    if (values['prune-frequency']) result.pruneFrequency = parseInt(values['prune-frequency'] as string);

    if (values['train-path']) result.trainPath = values['train-path'] as string;
    if (values['val-path']) result.valPath = values['val-path'] as string;
    if (values['val-split']) result.valSplit = parseFloat(values['val-split'] as string);
    if (values['num-workers']) result.numWorkers = parseInt(values['num-workers'] as string);

    if (values['checkpoint-dir']) result.checkpointDir = values['checkpoint-dir'] as string;
    if (values['checkpoint-frequency']) result.checkpointFrequency = parseInt(values['checkpoint-frequency'] as string);
    if (values['keep-best']) result.keepBest = parseInt(values['keep-best'] as string);

    if (values.patience) result.patience = parseInt(values.patience as string);
    if (values['min-delta']) result.minDelta = parseFloat(values['min-delta'] as string);

    if (values['log-frequency']) result.logFrequency = parseInt(values['log-frequency'] as string);
    if (values.tensorboard) result.tensorboard = values.tensorboard;
    if (values['log-dir']) result.logDir = values['log-dir'] as string;

    if (values.distillation) result.distillation = values.distillation;
    if (values['teacher-path']) result.teacherPath = values['teacher-path'] as string;
    if (values['distill-temp']) result.distillTemp = parseFloat(values['distill-temp'] as string);
    if (values['distill-alpha']) result.distillAlpha = parseFloat(values['distill-alpha'] as string);

    if (values['output-path']) result.outputPath = values['output-path'] as string;
    if (values['export-onnx']) result.exportOnnx = values['export-onnx'];

    return result;
  } catch (error) {
    console.error('Error parsing arguments:', error);
    printHelp();
    process.exit(1);
  }
}

/**
 * Build training config from CLI args
 */
export function buildConfigFromArgs(args: CLIArgs): TrainingConfig {
  // Start with base config
  let config: TrainingConfig = { ...DEFAULT_TRAINING_CONFIG };

  // Apply preset if specified
  if (args.preset) {
    switch (args.preset) {
      case 'fast':
        config = { ...config, ...FAST_TRAINING_CONFIG };
        break;
      case 'production':
        config = { ...config, ...PRODUCTION_TRAINING_CONFIG };
        break;
      case 'compression':
        config = { ...config, ...COMPRESSION_TRAINING_CONFIG };
        break;
    }
  }

  // Apply individual overrides
  if (args.seed !== undefined) config.seed = args.seed;
  if (args.device !== undefined) config.device = args.device;
  if (args.epochs !== undefined) config.epochs = args.epochs;
  if (args.batchSize !== undefined) config.data.batchSize = args.batchSize;
  if (args.gradientAccumulation !== undefined) config.gradientAccumulation = args.gradientAccumulation;
  if (args.mixedPrecision !== undefined) config.mixedPrecision = args.mixedPrecision;

  // Optimizer
  if (args.optimizer !== undefined) config.optimizer.type = args.optimizer;
  if (args.lr !== undefined) config.optimizer.learningRate = args.lr;
  if (args.weightDecay !== undefined) config.optimizer.weightDecay = args.weightDecay;
  if (args.momentum !== undefined) config.optimizer.momentum = args.momentum;
  if (args.beta1 !== undefined) config.optimizer.beta1 = args.beta1;
  if (args.beta2 !== undefined) config.optimizer.beta2 = args.beta2;

  // Scheduler
  if (args.scheduler !== undefined) config.scheduler.type = args.scheduler;
  if (args.warmupEpochs !== undefined) config.scheduler.warmupEpochs = args.warmupEpochs;
  if (args.minLr !== undefined) config.scheduler.minLr = args.minLr;

  // Loss
  if (args.loss !== undefined) config.loss.type = args.loss;
  if (args.labelSmoothing !== undefined) config.loss.labelSmoothing = args.labelSmoothing;

  // Bounded constraints
  if (args.clipNorm !== undefined) config.bounded.gradientConstraints.clipNorm = args.clipNorm;
  if (args.clipValue !== undefined) config.bounded.gradientConstraints.clipValue = args.clipValue;
  if (args.maxNorm !== undefined) {
    config.bounded.weightConstraints.attention.maxNorm = args.maxNorm;
    config.bounded.weightConstraints.fastgrnn.maxNorm = args.maxNorm;
  }
  if (args.l1Reg !== undefined) config.bounded.l1Regularization = args.l1Reg;
  if (args.l2Reg !== undefined) config.bounded.l2Regularization = args.l2Reg;

  // Pruning
  if (args.pruning !== undefined) config.pruning.strategy = args.pruning;
  if (args.targetSparsity !== undefined) config.pruning.targetSparsity = args.targetSparsity;
  if (args.pruneStart !== undefined) config.pruning.startEpoch = args.pruneStart;
  if (args.pruneEnd !== undefined) config.pruning.endEpoch = args.pruneEnd;
  if (args.pruneFrequency !== undefined) config.pruning.frequency = args.pruneFrequency;

  // Data
  if (args.trainPath !== undefined) config.data.trainPath = args.trainPath;
  if (args.valPath !== undefined) config.data.valPath = args.valPath;
  if (args.valSplit !== undefined) config.data.valSplit = args.valSplit;
  if (args.numWorkers !== undefined) config.data.numWorkers = args.numWorkers;

  // Checkpointing
  if (args.checkpointDir !== undefined) config.checkpoint.dir = args.checkpointDir;
  if (args.checkpointFrequency !== undefined) config.checkpoint.frequency = args.checkpointFrequency;
  if (args.keepBest !== undefined) config.checkpoint.keepBest = args.keepBest;

  // Early stopping
  if (args.patience !== undefined) config.earlyStopping.patience = args.patience;
  if (args.minDelta !== undefined) config.earlyStopping.minDelta = args.minDelta;

  // Logging
  if (args.logFrequency !== undefined) config.logging.frequency = args.logFrequency;
  if (args.tensorboard !== undefined) config.logging.tensorboard = args.tensorboard;
  if (args.logDir !== undefined) config.logging.logDir = args.logDir;

  // Distillation
  if (args.distillation && args.teacherPath) {
    config.distillation = {
      enabled: true,
      teacherModelPath: args.teacherPath,
      temperature: args.distillTemp ?? 4.0,
      alpha: args.distillAlpha ?? 0.5,
    };
  }

  return config;
}

/**
 * Print help message
 */
export function printHelp(): void {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║        Dynamic Attention Training CLI                         ║
╚═══════════════════════════════════════════════════════════════╝

Usage: npx tsx train.ts [options]

PRESETS:
  -p, --preset <name>          Config preset: default, fast, production, compression

GENERAL:
  -c, --config <path>          Load config from JSON file
  --seed <n>                   Random seed (default: 42)
  -d, --device <name>          Device: cpu, cuda, mps (default: cpu)
  -v, --verbose                Verbose output
  -h, --help                   Show this help

TRAINING:
  -e, --epochs <n>             Number of epochs (default: 100)
  -b, --batch-size <n>         Batch size (default: 32)
  --gradient-accumulation <n>  Gradient accumulation steps (default: 1)
  --mixed-precision            Enable mixed precision training

OPTIMIZER:
  -o, --optimizer <type>       Optimizer: sgd, adam, adamw (default: adamw)
  --lr <f>                     Learning rate (default: 1e-3)
  --weight-decay <f>           Weight decay (default: 1e-2)
  --momentum <f>               Momentum for SGD (default: 0.9)
  --beta1 <f>                  Adam beta1 (default: 0.9)
  --beta2 <f>                  Adam beta2 (default: 0.999)

SCHEDULER:
  -s, --scheduler <type>       Scheduler: constant, step, cosine, cosine_warmup,
                               linear_warmup, one_cycle, reduce_on_plateau
  --warmup-epochs <n>          Warmup epochs (default: 5)
  --min-lr <f>                 Minimum learning rate (default: 1e-6)

LOSS:
  -l, --loss <type>            Loss: cross_entropy, bce, mse, huber, focal
  --label-smoothing <f>        Label smoothing factor (default: 0.1)

BOUNDED CONSTRAINTS:
  --clip-norm <f>              Gradient norm clipping (default: 1.0)
  --clip-value <f>             Gradient value clipping
  --max-norm <f>               Weight max norm constraint (default: 3.0)
  --l1-reg <f>                 L1 regularization (default: 0)
  --l2-reg <f>                 L2 regularization (default: 1e-4)

PRUNING:
  --pruning <strategy>         Strategy: none, magnitude, random, lottery_ticket,
                               movement, structured_channel, structured_head
  --target-sparsity <f>        Target sparsity 0-1 (default: 0)
  --prune-start <n>            Start pruning at epoch (default: 10)
  --prune-end <n>              End pruning at epoch (default: 80)
  --prune-frequency <n>        Epochs between pruning (default: 5)

DATA:
  --train-path <path>          Training data path
  --val-path <path>            Validation data path
  --val-split <f>              Validation split ratio (default: 0.1)
  --num-workers <n>            Data loader workers (default: 4)

CHECKPOINTING:
  --checkpoint-dir <path>      Checkpoint directory (default: ./checkpoints)
  --checkpoint-frequency <n>   Save every N epochs (default: 5)
  --keep-best <n>              Keep N best checkpoints (default: 3)

EARLY STOPPING:
  --patience <n>               Early stopping patience (default: 10)
  --min-delta <f>              Min improvement threshold (default: 1e-4)

LOGGING:
  --log-frequency <n>          Log every N steps (default: 100)
  --tensorboard                Enable TensorBoard logging
  --log-dir <path>             Log directory (default: ./logs)

KNOWLEDGE DISTILLATION:
  --distillation               Enable knowledge distillation
  --teacher-path <path>        Path to teacher model
  --distill-temp <f>           Distillation temperature (default: 4.0)
  --distill-alpha <f>          Distillation loss weight (default: 0.5)

OUTPUT:
  --output-path <path>         Output model path
  --export-onnx                Export to ONNX format

EXAMPLES:
  # Quick training with defaults
  npx tsx train.ts --train-path ./data/train.jsonl

  # Fast preset for experiments
  npx tsx train.ts -p fast -e 10 --lr 0.01

  # Production training with pruning
  npx tsx train.ts -p production --pruning magnitude --target-sparsity 0.5

  # Compression-focused training
  npx tsx train.ts -p compression --target-sparsity 0.9 --l1-reg 1e-4

  # Custom config with overrides
  npx tsx train.ts -c config.json --lr 5e-4 --epochs 50
`);
}

/**
 * Format config for display
 */
export function formatConfig(config: TrainingConfig): string {
  return `
Training Configuration:
═══════════════════════════════════════════════════════════════

General:
  Epochs:              ${config.epochs}
  Seed:                ${config.seed}
  Device:              ${config.device}
  Mixed Precision:     ${config.mixedPrecision}
  Grad Accumulation:   ${config.gradientAccumulation}

Optimizer (${config.optimizer.type}):
  Learning Rate:       ${config.optimizer.learningRate}
  Weight Decay:        ${config.optimizer.weightDecay}
  ${config.optimizer.type === 'sgd' ? `Momentum:            ${config.optimizer.momentum}` : ''}
  ${config.optimizer.type.includes('adam') ? `Beta1/Beta2:         ${config.optimizer.beta1}/${config.optimizer.beta2}` : ''}

Scheduler (${config.scheduler.type}):
  Warmup Epochs:       ${config.scheduler.warmupEpochs}
  Min LR:              ${config.scheduler.minLr}

Loss (${config.loss.type}):
  Label Smoothing:     ${config.loss.labelSmoothing}

Bounded Constraints:
  Gradient Clip Norm:  ${config.bounded.gradientConstraints.clipNorm ?? 'disabled'}
  Weight Max Norm:     ${config.bounded.weightConstraints.attention.maxNorm ?? 'disabled'}
  L1 Regularization:   ${config.bounded.l1Regularization}
  L2 Regularization:   ${config.bounded.l2Regularization}

Pruning (${config.pruning.strategy}):
  Target Sparsity:     ${(config.pruning.targetSparsity * 100).toFixed(1)}%
  Schedule:            ${config.pruning.schedule}
  Start/End Epoch:     ${config.pruning.startEpoch}/${config.pruning.endEpoch}
  Frequency:           Every ${config.pruning.frequency} epochs

Data:
  Train Path:          ${config.data.trainPath}
  Val Path:            ${config.data.valPath || `${(config.data.valSplit * 100).toFixed(0)}% of train`}
  Batch Size:          ${config.data.batchSize}
  Workers:             ${config.data.numWorkers}

Early Stopping:
  Enabled:             ${config.earlyStopping.enabled}
  Patience:            ${config.earlyStopping.patience}

Checkpointing:
  Directory:           ${config.checkpoint.dir}
  Frequency:           Every ${config.checkpoint.frequency} epochs
  Keep Best:           ${config.checkpoint.keepBest}

${config.distillation?.enabled ? `
Knowledge Distillation:
  Teacher:             ${config.distillation.teacherModelPath}
  Temperature:         ${config.distillation.temperature}
  Alpha:               ${config.distillation.alpha}
` : ''}
═══════════════════════════════════════════════════════════════
`;
}
