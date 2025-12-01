/**
 * Training Pipeline
 *
 * Complete training infrastructure for the Dynamic Attention model
 * with bounded constraints, pruning, and comprehensive optimization.
 */

import type {
  TrainingConfig,
  WeightConstraint,
  GradientConstraint,
  PruningConfig,
  OptimizerConfig,
  SchedulerConfig,
  LossConfig,
} from './config.js';
import { DEFAULT_TRAINING_CONFIG } from './config.js';
import { hrTimeUs } from '../simd-utils.js';

// ============================================================================
// Tensor Utilities
// ============================================================================

/**
 * Simple tensor representation for training
 */
export class Tensor {
  data: Float32Array;
  shape: number[];
  grad?: Float32Array;
  requiresGrad: boolean;

  constructor(data: Float32Array | number[], shape: number[], requiresGrad = false) {
    this.data = data instanceof Float32Array ? data : new Float32Array(data);
    this.shape = shape;
    this.requiresGrad = requiresGrad;
    if (requiresGrad) {
      this.grad = new Float32Array(this.data.length);
    }
  }

  static zeros(shape: number[], requiresGrad = false): Tensor {
    const size = shape.reduce((a, b) => a * b, 1);
    return new Tensor(new Float32Array(size), shape, requiresGrad);
  }

  static randn(shape: number[], requiresGrad = false, scale = 1.0): Tensor {
    const size = shape.reduce((a, b) => a * b, 1);
    const data = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      // Box-Muller transform
      const u1 = Math.random();
      const u2 = Math.random();
      data[i] = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * scale;
    }
    return new Tensor(data, shape, requiresGrad);
  }

  zeroGrad(): void {
    if (this.grad) {
      this.grad.fill(0);
    }
  }

  clone(): Tensor {
    const t = new Tensor(new Float32Array(this.data), [...this.shape], this.requiresGrad);
    if (this.grad) {
      t.grad = new Float32Array(this.grad);
    }
    return t;
  }

  /** L2 norm */
  norm(): number {
    let sum = 0;
    for (let i = 0; i < this.data.length; i++) {
      sum += this.data[i] * this.data[i];
    }
    return Math.sqrt(sum);
  }

  /** L1 norm */
  l1Norm(): number {
    let sum = 0;
    for (let i = 0; i < this.data.length; i++) {
      sum += Math.abs(this.data[i]);
    }
    return sum;
  }

  /** Count non-zero elements */
  nnz(): number {
    let count = 0;
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i] !== 0) count++;
    }
    return count;
  }

  /** Sparsity ratio */
  sparsity(): number {
    return 1 - this.nnz() / this.data.length;
  }
}

// ============================================================================
// Weight Constraints
// ============================================================================

/**
 * Apply weight constraints to a tensor
 */
export function applyWeightConstraint(tensor: Tensor, constraint: WeightConstraint): void {
  const { type, maxNorm, minValue, maxValue, axis } = constraint;

  switch (type) {
    case 'none':
      break;

    case 'max_norm':
      applyMaxNormConstraint(tensor, maxNorm ?? 3.0, axis ?? 'row');
      break;

    case 'unit_norm':
      applyUnitNormConstraint(tensor, axis ?? 'row');
      break;

    case 'min_max':
      applyMinMaxConstraint(tensor, minValue ?? -1, maxValue ?? 1);
      break;

    case 'non_negative':
      applyNonNegativeConstraint(tensor);
      break;

    case 'spectral':
      applySpectralNormConstraint(tensor);
      break;
  }
}

function applyMaxNormConstraint(tensor: Tensor, maxNorm: number, axis: 'row' | 'column' | 'global'): void {
  if (axis === 'global') {
    const norm = tensor.norm();
    if (norm > maxNorm) {
      const scale = maxNorm / norm;
      for (let i = 0; i < tensor.data.length; i++) {
        tensor.data[i] *= scale;
      }
    }
  } else if (axis === 'row' && tensor.shape.length === 2) {
    const [rows, cols] = tensor.shape;
    for (let r = 0; r < rows; r++) {
      let norm = 0;
      for (let c = 0; c < cols; c++) {
        const val = tensor.data[r * cols + c];
        norm += val * val;
      }
      norm = Math.sqrt(norm);
      if (norm > maxNorm) {
        const scale = maxNorm / norm;
        for (let c = 0; c < cols; c++) {
          tensor.data[r * cols + c] *= scale;
        }
      }
    }
  }
}

function applyUnitNormConstraint(tensor: Tensor, axis: 'row' | 'column' | 'global'): void {
  if (axis === 'global') {
    const norm = tensor.norm();
    if (norm > 1e-10) {
      for (let i = 0; i < tensor.data.length; i++) {
        tensor.data[i] /= norm;
      }
    }
  } else if (axis === 'row' && tensor.shape.length === 2) {
    const [rows, cols] = tensor.shape;
    for (let r = 0; r < rows; r++) {
      let norm = 0;
      for (let c = 0; c < cols; c++) {
        const val = tensor.data[r * cols + c];
        norm += val * val;
      }
      norm = Math.sqrt(norm);
      if (norm > 1e-10) {
        for (let c = 0; c < cols; c++) {
          tensor.data[r * cols + c] /= norm;
        }
      }
    }
  }
}

function applyMinMaxConstraint(tensor: Tensor, min: number, max: number): void {
  for (let i = 0; i < tensor.data.length; i++) {
    tensor.data[i] = Math.max(min, Math.min(max, tensor.data[i]));
  }
}

function applyNonNegativeConstraint(tensor: Tensor): void {
  for (let i = 0; i < tensor.data.length; i++) {
    tensor.data[i] = Math.max(0, tensor.data[i]);
  }
}

function applySpectralNormConstraint(tensor: Tensor): void {
  if (tensor.shape.length !== 2) return;

  // Power iteration for spectral norm approximation
  const [rows, cols] = tensor.shape;
  const u = new Float32Array(rows).fill(1 / Math.sqrt(rows));
  const v = new Float32Array(cols);

  // 1 iteration for efficiency
  for (let iter = 0; iter < 1; iter++) {
    // v = W^T u / ||W^T u||
    v.fill(0);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        v[c] += tensor.data[r * cols + c] * u[r];
      }
    }
    let vNorm = 0;
    for (let c = 0; c < cols; c++) vNorm += v[c] * v[c];
    vNorm = Math.sqrt(vNorm);
    if (vNorm > 1e-10) {
      for (let c = 0; c < cols; c++) v[c] /= vNorm;
    }

    // u = W v / ||W v||
    u.fill(0);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        u[r] += tensor.data[r * cols + c] * v[c];
      }
    }
    let uNorm = 0;
    for (let r = 0; r < rows; r++) uNorm += u[r] * u[r];
    uNorm = Math.sqrt(uNorm);
    if (uNorm > 1e-10) {
      for (let r = 0; r < rows; r++) u[r] /= uNorm;
    }
  }

  // Compute spectral norm σ = u^T W v
  let sigma = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      sigma += u[r] * tensor.data[r * cols + c] * v[c];
    }
  }

  // Normalize if > 1
  if (sigma > 1) {
    for (let i = 0; i < tensor.data.length; i++) {
      tensor.data[i] /= sigma;
    }
  }
}

// ============================================================================
// Gradient Constraints
// ============================================================================

/**
 * Apply gradient constraints (clipping)
 */
export function applyGradientConstraint(
  tensors: Tensor[],
  constraint: GradientConstraint
): number {
  if (!constraint.clipGradients) return 0;

  // Compute global gradient norm
  let totalNorm = 0;
  for (const t of tensors) {
    if (t.grad) {
      for (let i = 0; i < t.grad.length; i++) {
        totalNorm += t.grad[i] * t.grad[i];
      }
    }
  }
  totalNorm = Math.sqrt(totalNorm);

  // Clip by norm
  if (constraint.clipNorm && totalNorm > constraint.clipNorm) {
    const scale = constraint.clipNorm / totalNorm;
    for (const t of tensors) {
      if (t.grad) {
        for (let i = 0; i < t.grad.length; i++) {
          t.grad[i] *= scale;
        }
      }
    }
  }

  // Clip by value
  if (constraint.clipValue) {
    const clipVal = constraint.clipValue;
    for (const t of tensors) {
      if (t.grad) {
        for (let i = 0; i < t.grad.length; i++) {
          t.grad[i] = Math.max(-clipVal, Math.min(clipVal, t.grad[i]));
        }
      }
    }
  }

  return totalNorm;
}

// ============================================================================
// Pruning
// ============================================================================

/**
 * Pruning manager
 */
export class PruningManager {
  private config: PruningConfig;
  private masks: Map<string, Float32Array> = new Map();
  private initialWeights: Map<string, Float32Array> = new Map();

  constructor(config: PruningConfig) {
    this.config = config;
  }

  /**
   * Initialize pruning for a tensor
   */
  register(name: string, tensor: Tensor): void {
    // Store initial weights for rewinding
    if (this.config.enableRewinding) {
      this.initialWeights.set(name, new Float32Array(tensor.data));
    }

    // Initialize mask (all ones = no pruning)
    this.masks.set(name, new Float32Array(tensor.data.length).fill(1));
  }

  /**
   * Get current target sparsity based on schedule
   */
  getCurrentSparsity(epoch: number): number {
    const { targetSparsity, startEpoch, endEpoch, schedule } = this.config;

    if (epoch < startEpoch) return 0;
    if (epoch >= endEpoch) return targetSparsity;

    const progress = (epoch - startEpoch) / (endEpoch - startEpoch);

    switch (schedule) {
      case 'one_shot':
        return epoch >= startEpoch ? targetSparsity : 0;

      case 'gradual':
        return targetSparsity * progress;

      case 'cubic':
        // Cubic sparsity schedule (slower start, faster end)
        return targetSparsity * (1 - Math.pow(1 - progress, 3));

      case 'exponential':
        // Exponential approach to target
        return targetSparsity * (1 - Math.exp(-3 * progress));

      default:
        return targetSparsity * progress;
    }
  }

  /**
   * Should prune at this epoch?
   */
  shouldPrune(epoch: number): boolean {
    if (this.config.strategy === 'none') return false;
    if (epoch < this.config.startEpoch) return false;
    if (epoch > this.config.endEpoch) return false;
    return (epoch - this.config.startEpoch) % this.config.frequency === 0;
  }

  /**
   * Prune a tensor to target sparsity
   */
  prune(name: string, tensor: Tensor, epoch: number): void {
    const targetSparsity = this.getCurrentSparsity(epoch);
    const layerSparsity = this.config.layerSparsity?.[name as keyof typeof this.config.layerSparsity];
    const sparsity = layerSparsity ?? targetSparsity;

    if (sparsity <= 0) return;

    let mask = this.masks.get(name);
    if (!mask) {
      mask = new Float32Array(tensor.data.length).fill(1);
      this.masks.set(name, mask);
    }

    switch (this.config.strategy) {
      case 'magnitude':
        this.magnitudePrune(tensor, mask, sparsity);
        break;

      case 'random':
        this.randomPrune(tensor, mask, sparsity);
        break;

      case 'lottery_ticket':
        this.lotteryTicketPrune(name, tensor, mask, sparsity);
        break;

      case 'movement':
        this.movementPrune(tensor, mask, sparsity);
        break;

      default:
        this.magnitudePrune(tensor, mask, sparsity);
    }

    // Apply mask
    this.applyMask(tensor, mask);
  }

  /**
   * Magnitude-based pruning: remove smallest weights
   */
  private magnitudePrune(tensor: Tensor, mask: Float32Array, sparsity: number): void {
    // Get magnitudes of non-masked weights
    const magnitudes: Array<{ index: number; value: number }> = [];
    for (let i = 0; i < tensor.data.length; i++) {
      if (mask[i] > 0) {
        magnitudes.push({ index: i, value: Math.abs(tensor.data[i]) });
      }
    }

    // Sort by magnitude (ascending)
    magnitudes.sort((a, b) => a.value - b.value);

    // Calculate how many to prune
    const currentNnz = magnitudes.length;
    const targetNnz = Math.round(tensor.data.length * (1 - sparsity));
    const toPrune = currentNnz - targetNnz;

    // Prune smallest
    for (let i = 0; i < Math.max(0, toPrune); i++) {
      mask[magnitudes[i].index] = 0;
    }
  }

  /**
   * Random pruning
   */
  private randomPrune(tensor: Tensor, mask: Float32Array, sparsity: number): void {
    const targetNnz = Math.round(tensor.data.length * (1 - sparsity));
    let currentNnz = 0;
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] > 0) currentNnz++;
    }

    const toPrune = currentNnz - targetNnz;
    let pruned = 0;

    for (let i = 0; i < mask.length && pruned < toPrune; i++) {
      if (mask[i] > 0 && Math.random() < toPrune / (mask.length - i)) {
        mask[i] = 0;
        pruned++;
      }
    }
  }

  /**
   * Lottery ticket pruning with rewinding
   */
  private lotteryTicketPrune(
    name: string,
    tensor: Tensor,
    mask: Float32Array,
    sparsity: number
  ): void {
    // Standard magnitude pruning
    this.magnitudePrune(tensor, mask, sparsity);

    // Rewind to initial weights (masked)
    if (this.config.enableRewinding) {
      const initial = this.initialWeights.get(name);
      if (initial) {
        for (let i = 0; i < tensor.data.length; i++) {
          if (mask[i] > 0) {
            tensor.data[i] = initial[i];
          }
        }
      }
    }
  }

  /**
   * Movement pruning: prune based on gradient direction
   */
  private movementPrune(tensor: Tensor, mask: Float32Array, sparsity: number): void {
    if (!tensor.grad) {
      // Fall back to magnitude if no gradients
      this.magnitudePrune(tensor, mask, sparsity);
      return;
    }

    // Movement score = weight * gradient (weights moving toward zero)
    const movements: Array<{ index: number; value: number }> = [];
    for (let i = 0; i < tensor.data.length; i++) {
      if (mask[i] > 0) {
        const movement = -tensor.data[i] * tensor.grad[i];
        movements.push({ index: i, value: movement });
      }
    }

    // Sort by movement (ascending = moving toward zero)
    movements.sort((a, b) => a.value - b.value);

    const currentNnz = movements.length;
    const targetNnz = Math.round(tensor.data.length * (1 - sparsity));
    const toPrune = currentNnz - targetNnz;

    for (let i = 0; i < Math.max(0, toPrune); i++) {
      mask[movements[i].index] = 0;
    }
  }

  /**
   * Apply mask to tensor
   */
  private applyMask(tensor: Tensor, mask: Float32Array): void {
    for (let i = 0; i < tensor.data.length; i++) {
      tensor.data[i] *= mask[i];
    }
  }

  /**
   * Get mask for a tensor
   */
  getMask(name: string): Float32Array | undefined {
    return this.masks.get(name);
  }

  /**
   * Get pruning statistics
   */
  getStats(): { [name: string]: { sparsity: number; nnz: number; total: number } } {
    const stats: { [name: string]: { sparsity: number; nnz: number; total: number } } = {};

    for (const [name, mask] of this.masks) {
      let nnz = 0;
      for (let i = 0; i < mask.length; i++) {
        if (mask[i] > 0) nnz++;
      }
      stats[name] = {
        sparsity: 1 - nnz / mask.length,
        nnz,
        total: mask.length,
      };
    }

    return stats;
  }
}

// ============================================================================
// Optimizers
// ============================================================================

/**
 * Base optimizer interface
 */
export interface Optimizer {
  step(tensors: Tensor[]): void;
  zeroGrad(tensors: Tensor[]): void;
  getLr(): number;
  setLr(lr: number): void;
  getState(): Map<Tensor, any>;
}

/**
 * SGD optimizer
 */
export class SGDOptimizer implements Optimizer {
  private lr: number;
  private momentum: number;
  private nesterov: boolean;
  private velocities: Map<Tensor, Float32Array> = new Map();

  constructor(config: OptimizerConfig) {
    this.lr = config.learningRate;
    this.momentum = config.momentum ?? 0;
    this.nesterov = config.nesterov ?? false;
  }

  step(tensors: Tensor[]): void {
    for (const t of tensors) {
      if (!t.grad) continue;

      let velocity = this.velocities.get(t);
      if (!velocity) {
        velocity = new Float32Array(t.data.length);
        this.velocities.set(t, velocity);
      }

      for (let i = 0; i < t.data.length; i++) {
        velocity[i] = this.momentum * velocity[i] + t.grad[i];

        if (this.nesterov) {
          t.data[i] -= this.lr * (t.grad[i] + this.momentum * velocity[i]);
        } else {
          t.data[i] -= this.lr * velocity[i];
        }
      }
    }
  }

  zeroGrad(tensors: Tensor[]): void {
    for (const t of tensors) {
      t.zeroGrad();
    }
  }

  getLr(): number { return this.lr; }
  setLr(lr: number): void { this.lr = lr; }
  getState(): Map<Tensor, any> { return this.velocities; }
}

/**
 * Adam optimizer
 */
export class AdamOptimizer implements Optimizer {
  private lr: number;
  private beta1: number;
  private beta2: number;
  private epsilon: number;
  private weightDecay: number;
  private step_t: number = 0;
  private m: Map<Tensor, Float32Array> = new Map();
  private v: Map<Tensor, Float32Array> = new Map();

  constructor(config: OptimizerConfig) {
    this.lr = config.learningRate;
    this.beta1 = config.beta1 ?? 0.9;
    this.beta2 = config.beta2 ?? 0.999;
    this.epsilon = config.epsilon ?? 1e-8;
    this.weightDecay = config.weightDecay ?? 0;
  }

  step(tensors: Tensor[]): void {
    this.step_t++;

    const biasCorrection1 = 1 - Math.pow(this.beta1, this.step_t);
    const biasCorrection2 = 1 - Math.pow(this.beta2, this.step_t);

    for (const t of tensors) {
      if (!t.grad) continue;

      let m = this.m.get(t);
      let v = this.v.get(t);

      if (!m) {
        m = new Float32Array(t.data.length);
        this.m.set(t, m);
      }
      if (!v) {
        v = new Float32Array(t.data.length);
        this.v.set(t, v);
      }

      for (let i = 0; i < t.data.length; i++) {
        const grad = t.grad[i];

        // Update biased first moment estimate
        m[i] = this.beta1 * m[i] + (1 - this.beta1) * grad;

        // Update biased second moment estimate
        v[i] = this.beta2 * v[i] + (1 - this.beta2) * grad * grad;

        // Compute bias-corrected estimates
        const mHat = m[i] / biasCorrection1;
        const vHat = v[i] / biasCorrection2;

        // Update weights
        t.data[i] -= this.lr * mHat / (Math.sqrt(vHat) + this.epsilon);

        // Weight decay (AdamW style)
        if (this.weightDecay > 0) {
          t.data[i] -= this.lr * this.weightDecay * t.data[i];
        }
      }
    }
  }

  zeroGrad(tensors: Tensor[]): void {
    for (const t of tensors) {
      t.zeroGrad();
    }
  }

  getLr(): number { return this.lr; }
  setLr(lr: number): void { this.lr = lr; }
  getState(): Map<Tensor, any> {
    return new Map([...this.m, ...this.v]);
  }
}

// ============================================================================
// Learning Rate Schedulers
// ============================================================================

/**
 * Learning rate scheduler
 */
export class LearningRateScheduler {
  private config: SchedulerConfig;
  private baseLr: number;
  private currentLr: number;
  private epoch: number = 0;
  private bestMetric: number = Infinity;
  private badEpochs: number = 0;

  constructor(baseLr: number, config: SchedulerConfig) {
    this.baseLr = baseLr;
    this.currentLr = baseLr;
    this.config = config;
  }

  /**
   * Step the scheduler (call after each epoch)
   */
  step(epoch: number, metric?: number): number {
    this.epoch = epoch;

    // Warmup phase
    if (epoch < this.config.warmupEpochs) {
      this.currentLr = this.baseLr * (epoch + 1) / this.config.warmupEpochs;
      return this.currentLr;
    }

    const effectiveEpoch = epoch - this.config.warmupEpochs;

    switch (this.config.type) {
      case 'constant':
        this.currentLr = this.baseLr;
        break;

      case 'step':
        this.currentLr = this.baseLr * Math.pow(
          this.config.gamma ?? 0.1,
          Math.floor(effectiveEpoch / (this.config.stepSize ?? 30))
        );
        break;

      case 'exponential':
        this.currentLr = this.baseLr * Math.pow(this.config.gamma ?? 0.95, effectiveEpoch);
        break;

      case 'cosine':
      case 'cosine_warmup':
        const tMax = this.config.tMax ?? 100;
        this.currentLr = this.config.minLr + (this.baseLr - this.config.minLr) *
          (1 + Math.cos(Math.PI * effectiveEpoch / tMax)) / 2;
        break;

      case 'linear_warmup':
        this.currentLr = Math.max(
          this.config.minLr,
          this.baseLr * (1 - effectiveEpoch / (this.config.tMax ?? 100))
        );
        break;

      case 'one_cycle':
        const maxLr = this.config.maxLr ?? this.baseLr * 10;
        const total = this.config.tMax ?? 100;
        const pct = effectiveEpoch / total;

        if (pct < 0.3) {
          // Ramp up
          this.currentLr = this.baseLr + (maxLr - this.baseLr) * (pct / 0.3);
        } else {
          // Anneal down
          this.currentLr = maxLr - (maxLr - this.config.minLr) * ((pct - 0.3) / 0.7);
        }
        break;

      case 'reduce_on_plateau':
        if (metric !== undefined) {
          if (metric < this.bestMetric - (this.config.minDelta ?? 1e-4)) {
            this.bestMetric = metric;
            this.badEpochs = 0;
          } else {
            this.badEpochs++;
            if (this.badEpochs >= (this.config.patience ?? 10)) {
              this.currentLr = Math.max(
                this.config.minLr,
                this.currentLr * (this.config.gamma ?? 0.1)
              );
              this.badEpochs = 0;
            }
          }
        }
        break;
    }

    return Math.max(this.config.minLr, this.currentLr);
  }

  getLr(): number {
    return this.currentLr;
  }
}

// ============================================================================
// Loss Functions
// ============================================================================

/**
 * Compute loss and gradients
 */
export function computeLoss(
  predictions: Tensor,
  targets: Tensor,
  config: LossConfig
): { loss: number; gradients: Float32Array } {
  const n = predictions.data.length;
  const gradients = new Float32Array(n);
  let loss = 0;

  switch (config.type) {
    case 'cross_entropy':
      // Softmax cross entropy
      const probs = softmax(predictions.data);
      for (let i = 0; i < n; i++) {
        const p = Math.max(1e-10, probs[i]);
        const t = targets.data[i];

        // Label smoothing
        const smoothT = t * (1 - config.labelSmoothing) + config.labelSmoothing / n;

        loss -= smoothT * Math.log(p);
        gradients[i] = probs[i] - smoothT;
      }
      break;

    case 'bce':
      // Binary cross entropy
      for (let i = 0; i < n; i++) {
        const p = sigmoid(predictions.data[i]);
        const t = targets.data[i];
        loss -= t * Math.log(Math.max(1e-10, p)) + (1 - t) * Math.log(Math.max(1e-10, 1 - p));
        gradients[i] = p - t;
      }
      loss /= n;
      break;

    case 'mse':
      for (let i = 0; i < n; i++) {
        const diff = predictions.data[i] - targets.data[i];
        loss += diff * diff;
        gradients[i] = 2 * diff / n;
      }
      loss /= n;
      break;

    case 'huber':
      const delta = 1.0;
      for (let i = 0; i < n; i++) {
        const diff = predictions.data[i] - targets.data[i];
        const absDiff = Math.abs(diff);
        if (absDiff <= delta) {
          loss += 0.5 * diff * diff;
          gradients[i] = diff / n;
        } else {
          loss += delta * (absDiff - 0.5 * delta);
          gradients[i] = delta * Math.sign(diff) / n;
        }
      }
      loss /= n;
      break;

    case 'focal':
      const gamma = config.focalGamma ?? 2.0;
      const probs2 = softmax(predictions.data);
      for (let i = 0; i < n; i++) {
        const p = Math.max(1e-10, probs2[i]);
        const t = targets.data[i];
        const focal = Math.pow(1 - p, gamma);
        loss -= focal * t * Math.log(p);
        gradients[i] = focal * (gamma * p * Math.log(p) + p - 1) * t;
      }
      break;

    default:
      throw new Error(`Unknown loss type: ${config.type}`);
  }

  return { loss, gradients };
}

function softmax(x: Float32Array): Float32Array {
  const result = new Float32Array(x.length);
  let max = x[0];
  for (let i = 1; i < x.length; i++) {
    if (x[i] > max) max = x[i];
  }
  let sum = 0;
  for (let i = 0; i < x.length; i++) {
    result[i] = Math.exp(x[i] - max);
    sum += result[i];
  }
  for (let i = 0; i < x.length; i++) {
    result[i] /= sum;
  }
  return result;
}

function sigmoid(x: number): number {
  if (x > 0) {
    return 1 / (1 + Math.exp(-x));
  } else {
    const exp = Math.exp(x);
    return exp / (1 + exp);
  }
}

// ============================================================================
// Training Metrics
// ============================================================================

export interface TrainingMetrics {
  epoch: number;
  trainLoss: number;
  valLoss: number;
  trainAccuracy: number;
  valAccuracy: number;
  learningRate: number;
  gradientNorm: number;
  sparsity: number;
  epochTimeMs: number;
}

// ============================================================================
// Trainer Class
// ============================================================================

/**
 * Main trainer class
 */
export class Trainer {
  private config: TrainingConfig;
  private optimizer: Optimizer;
  private scheduler: LearningRateScheduler;
  private pruningManager: PruningManager;
  private parameters: Tensor[] = [];
  private bestValLoss: number = Infinity;
  private earlyStopCounter: number = 0;
  private history: TrainingMetrics[] = [];

  constructor(config: Partial<TrainingConfig> = {}) {
    this.config = { ...DEFAULT_TRAINING_CONFIG, ...config };

    // Create optimizer
    this.optimizer = this.config.optimizer.type === 'adam' || this.config.optimizer.type === 'adamw'
      ? new AdamOptimizer(this.config.optimizer)
      : new SGDOptimizer(this.config.optimizer);

    // Create scheduler
    this.scheduler = new LearningRateScheduler(
      this.config.optimizer.learningRate,
      this.config.scheduler
    );

    // Create pruning manager
    this.pruningManager = new PruningManager(this.config.pruning);

    // Set random seed
    // Note: JavaScript doesn't have seedable random, but we can document this
  }

  /**
   * Register parameters for training
   */
  registerParameters(params: { [name: string]: Tensor }): void {
    for (const [name, tensor] of Object.entries(params)) {
      this.parameters.push(tensor);
      this.pruningManager.register(name, tensor);
    }
  }

  /**
   * Train for one epoch
   */
  async trainEpoch(
    epoch: number,
    trainData: Array<{ input: Tensor; target: Tensor }>,
    valData?: Array<{ input: Tensor; target: Tensor }>
  ): Promise<TrainingMetrics> {
    const startTime = hrTimeUs();

    let trainLoss = 0;
    let trainCorrect = 0;
    let totalTrain = 0;

    // Training loop
    for (let i = 0; i < trainData.length; i += this.config.data.batchSize) {
      const batch = trainData.slice(i, i + this.config.data.batchSize);

      // Zero gradients
      this.optimizer.zeroGrad(this.parameters);

      // Forward pass (simplified - in real impl would use model)
      for (const sample of batch) {
        const { loss, gradients } = computeLoss(sample.input, sample.target, this.config.loss);
        trainLoss += loss;

        // Accumulate gradients
        if (sample.input.grad) {
          for (let j = 0; j < gradients.length; j++) {
            sample.input.grad[j] += gradients[j] / batch.length;
          }
        }

        // Accuracy (argmax comparison)
        const predIdx = argmax(sample.input.data);
        const targetIdx = argmax(sample.target.data);
        if (predIdx === targetIdx) trainCorrect++;
        totalTrain++;
      }

      // Apply gradient constraints
      const gradNorm = applyGradientConstraint(
        this.parameters,
        this.config.bounded.gradientConstraints
      );

      // Add regularization gradients
      this.addRegularizationGradients();

      // Optimizer step
      this.optimizer.step(this.parameters);

      // Apply weight constraints
      this.applyWeightConstraints();
    }

    trainLoss /= trainData.length;
    const trainAccuracy = trainCorrect / totalTrain;

    // Validation
    let valLoss = 0;
    let valCorrect = 0;
    let totalVal = 0;

    if (valData && valData.length > 0) {
      for (const sample of valData) {
        const { loss } = computeLoss(sample.input, sample.target, this.config.loss);
        valLoss += loss;

        const predIdx = argmax(sample.input.data);
        const targetIdx = argmax(sample.target.data);
        if (predIdx === targetIdx) valCorrect++;
        totalVal++;
      }
      valLoss /= valData.length;
    }

    const valAccuracy = totalVal > 0 ? valCorrect / totalVal : 0;

    // Update learning rate
    const lr = this.scheduler.step(epoch, valLoss);
    this.optimizer.setLr(lr);

    // Pruning
    if (this.pruningManager.shouldPrune(epoch)) {
      let idx = 0;
      for (const param of this.parameters) {
        this.pruningManager.prune(`param_${idx}`, param, epoch);
        idx++;
      }
    }

    // Calculate sparsity
    const pruningStats = this.pruningManager.getStats();
    const totalSparsity = Object.values(pruningStats).reduce(
      (sum, s) => sum + s.sparsity * s.total, 0
    ) / Object.values(pruningStats).reduce((sum, s) => sum + s.total, 0) || 0;

    // Gradient norm for logging
    let gradNorm = 0;
    for (const p of this.parameters) {
      if (p.grad) {
        for (let i = 0; i < p.grad.length; i++) {
          gradNorm += p.grad[i] * p.grad[i];
        }
      }
    }
    gradNorm = Math.sqrt(gradNorm);

    const epochTimeMs = (hrTimeUs() - startTime) / 1000;

    const metrics: TrainingMetrics = {
      epoch,
      trainLoss,
      valLoss,
      trainAccuracy,
      valAccuracy,
      learningRate: lr,
      gradientNorm: gradNorm,
      sparsity: totalSparsity,
      epochTimeMs,
    };

    this.history.push(metrics);

    // Early stopping check
    if (this.config.earlyStopping.enabled) {
      if (valLoss < this.bestValLoss - this.config.earlyStopping.minDelta) {
        this.bestValLoss = valLoss;
        this.earlyStopCounter = 0;
      } else {
        this.earlyStopCounter++;
      }
    }

    return metrics;
  }

  /**
   * Add regularization gradients
   */
  private addRegularizationGradients(): void {
    const { l1Regularization, l2Regularization, elasticNetRatio } = this.config.bounded;

    if (l1Regularization <= 0 && l2Regularization <= 0) return;

    for (const param of this.parameters) {
      if (!param.grad) continue;

      for (let i = 0; i < param.data.length; i++) {
        const w = param.data[i];

        // L1 gradient (subgradient)
        if (l1Regularization > 0) {
          const l1Scale = l1Regularization * elasticNetRatio;
          param.grad[i] += l1Scale * Math.sign(w);
        }

        // L2 gradient
        if (l2Regularization > 0) {
          const l2Scale = l2Regularization * (1 - elasticNetRatio);
          param.grad[i] += 2 * l2Scale * w;
        }
      }
    }
  }

  /**
   * Apply weight constraints after optimizer step
   */
  private applyWeightConstraints(): void {
    const constraints = this.config.bounded.weightConstraints;

    // Apply to all parameters (simplified)
    for (const param of this.parameters) {
      applyWeightConstraint(param, constraints.attention);
    }
  }

  /**
   * Check if early stopping triggered
   */
  shouldStop(): boolean {
    return this.config.earlyStopping.enabled &&
      this.earlyStopCounter >= this.config.earlyStopping.patience;
  }

  /**
   * Get training history
   */
  getHistory(): TrainingMetrics[] {
    return this.history;
  }

  /**
   * Get current config
   */
  getConfig(): TrainingConfig {
    return this.config;
  }

  /**
   * Get pruning statistics
   */
  getPruningStats() {
    return this.pruningManager.getStats();
  }
}

function argmax(arr: Float32Array): number {
  let maxIdx = 0;
  let maxVal = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > maxVal) {
      maxVal = arr[i];
      maxIdx = i;
    }
  }
  return maxIdx;
}
