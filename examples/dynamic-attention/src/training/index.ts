/**
 * Training Module Exports
 *
 * Complete training infrastructure for Dynamic Attention
 */

// Configuration
export * from './config.js';

// Training components
export {
  Trainer,
  Tensor,
  PruningManager,
  SGDOptimizer,
  AdamOptimizer,
  LearningRateScheduler,
  applyWeightConstraint,
  applyGradientConstraint,
  computeLoss,
  type Optimizer,
  type TrainingMetrics,
} from './trainer.js';

// CLI
export {
  parseCliArgs,
  buildConfigFromArgs,
  printHelp,
  formatConfig,
  type CLIArgs,
} from './cli.js';
