#!/usr/bin/env npx tsx
/**
 * Training Script
 *
 * Main entry point for training the Dynamic Attention model
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseCliArgs, buildConfigFromArgs, printHelp, formatConfig } from './cli.js';
import { Trainer, Tensor, type TrainingMetrics } from './trainer.js';
import { createPipeline } from '../dynamic-attention.js';
import { hrTimeUs } from '../simd-utils.js';

// ============================================================================
// Data Loading
// ============================================================================

interface DataSample {
  query: number[];
  context?: number[][];
  candidates: Array<{
    id: string;
    embedding: number[];
    successRate?: number;
  }>;
  label: string; // Best candidate ID
  useLightweight?: boolean;
}

function loadData(filePath: string): DataSample[] {
  if (!fs.existsSync(filePath)) {
    console.warn(`Data file not found: ${filePath}, generating synthetic data`);
    return generateSyntheticData(1000);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  return lines.map(line => JSON.parse(line));
}

function generateSyntheticData(count: number, dim = 384): DataSample[] {
  const data: DataSample[] = [];

  const candidates = [
    { id: 'model-a', embedding: randomArray(dim), successRate: 0.95 },
    { id: 'model-b', embedding: randomArray(dim), successRate: 0.88 },
    { id: 'model-c', embedding: randomArray(dim), successRate: 0.82 },
    { id: 'model-d', embedding: randomArray(dim), successRate: 0.90 },
  ];

  for (let i = 0; i < count; i++) {
    const query = randomArray(dim);
    const context = Math.random() > 0.3
      ? [randomArray(dim), randomArray(dim)]
      : undefined;

    // Assign label based on some heuristic
    const labelIdx = Math.floor(Math.random() * candidates.length);

    data.push({
      query,
      context,
      candidates,
      label: candidates[labelIdx].id,
      useLightweight: Math.random() > 0.7,
    });
  }

  return data;
}

function randomArray(size: number): number[] {
  return Array.from({ length: size }, () => (Math.random() - 0.5) * 2);
}

function splitData<T>(data: T[], valRatio: number): { train: T[]; val: T[] } {
  const shuffled = [...data].sort(() => Math.random() - 0.5);
  const splitIdx = Math.floor(data.length * (1 - valRatio));
  return {
    train: shuffled.slice(0, splitIdx),
    val: shuffled.slice(splitIdx),
  };
}

// ============================================================================
// Training Loop
// ============================================================================

async function train() {
  // Parse CLI arguments
  const args = parseCliArgs();

  // Show help if requested
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // Build config from args
  const config = buildConfigFromArgs(args);

  // Print config
  if (args.verbose) {
    console.log(formatConfig(config));
  }

  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║        Dynamic Attention Training                             ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Load data
  console.log('📂 Loading data...');
  const rawData = loadData(config.data.trainPath);
  console.log(`   Loaded ${rawData.length} samples`);

  // Split data
  const { train: trainData, val: valData } = config.data.valPath
    ? { train: rawData, val: loadData(config.data.valPath) }
    : splitData(rawData, config.data.valSplit);

  console.log(`   Train: ${trainData.length}, Val: ${valData.length}\n`);

  // Prepare tensors
  const dim = trainData[0].query.length;
  const numCandidates = trainData[0].candidates.length;

  console.log(`📐 Model dimensions: input=${dim}, candidates=${numCandidates}\n`);

  // Create trainer
  const trainer = new Trainer(config);

  // Register model parameters (simplified for demo)
  const params = {
    attention_qkv: Tensor.randn([dim * 3, dim], true, 0.02),
    attention_out: Tensor.randn([dim, dim], true, 0.02),
    fastgrnn_reset: Tensor.randn([64, dim + 5], true, 0.02),
    fastgrnn_update: Tensor.randn([64, dim + 5], true, 0.02),
    fastgrnn_candidate: Tensor.randn([64, dim + 5], true, 0.02),
    output: Tensor.randn([numCandidates, 64], true, 0.02),
  };

  trainer.registerParameters(params);

  // Convert data to tensor format
  const trainTensors = trainData.map(sample => {
    const candidateIdx = sample.candidates.findIndex(c => c.id === sample.label);
    const target = new Float32Array(numCandidates);
    target[candidateIdx >= 0 ? candidateIdx : 0] = 1;

    return {
      input: new Tensor(new Float32Array(sample.query), [dim], true),
      target: new Tensor(target, [numCandidates]),
    };
  });

  const valTensors = valData.map(sample => {
    const candidateIdx = sample.candidates.findIndex(c => c.id === sample.label);
    const target = new Float32Array(numCandidates);
    target[candidateIdx >= 0 ? candidateIdx : 0] = 1;

    return {
      input: new Tensor(new Float32Array(sample.query), [dim]),
      target: new Tensor(target, [numCandidates]),
    };
  });

  // Create checkpoint directory
  if (config.checkpoint.enabled) {
    fs.mkdirSync(config.checkpoint.dir, { recursive: true });
  }

  // Training loop
  console.log('🚀 Starting training...\n');
  console.log('Epoch │   Train Loss │     Val Loss │ Train Acc │  Val Acc │     LR     │ Sparsity │  Time');
  console.log('──────┼──────────────┼──────────────┼───────────┼──────────┼────────────┼──────────┼───────');

  let bestValLoss = Infinity;
  const startTime = hrTimeUs();

  for (let epoch = 0; epoch < config.epochs; epoch++) {
    // Train one epoch
    const metrics = await trainer.trainEpoch(epoch, trainTensors, valTensors);

    // Print progress
    console.log(
      `${epoch.toString().padStart(5)} │ ` +
      `${metrics.trainLoss.toFixed(6).padStart(12)} │ ` +
      `${metrics.valLoss.toFixed(6).padStart(12)} │ ` +
      `${(metrics.trainAccuracy * 100).toFixed(1).padStart(8)}% │ ` +
      `${(metrics.valAccuracy * 100).toFixed(1).padStart(7)}% │ ` +
      `${metrics.learningRate.toExponential(2).padStart(10)} │ ` +
      `${(metrics.sparsity * 100).toFixed(1).padStart(7)}% │ ` +
      `${(metrics.epochTimeMs / 1000).toFixed(1).padStart(5)}s`
    );

    // Save best checkpoint
    if (config.checkpoint.enabled && metrics.valLoss < bestValLoss) {
      bestValLoss = metrics.valLoss;
      const checkpointPath = path.join(config.checkpoint.dir, `best_model_epoch_${epoch}.json`);
      saveCheckpoint(checkpointPath, params, metrics, config);
      console.log(`      │ 💾 Saved checkpoint: ${checkpointPath}`);
    }

    // Early stopping check
    if (trainer.shouldStop()) {
      console.log(`\n⏹️  Early stopping triggered at epoch ${epoch}`);
      break;
    }
  }

  const totalTime = (hrTimeUs() - startTime) / 1_000_000;

  // Print summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                      Training Complete');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const history = trainer.getHistory();
  const finalMetrics = history[history.length - 1];

  console.log(`Total Time:        ${totalTime.toFixed(1)}s`);
  console.log(`Final Train Loss:  ${finalMetrics.trainLoss.toFixed(6)}`);
  console.log(`Final Val Loss:    ${finalMetrics.valLoss.toFixed(6)}`);
  console.log(`Best Val Loss:     ${bestValLoss.toFixed(6)}`);
  console.log(`Final Train Acc:   ${(finalMetrics.trainAccuracy * 100).toFixed(2)}%`);
  console.log(`Final Val Acc:     ${(finalMetrics.valAccuracy * 100).toFixed(2)}%`);
  console.log(`Final Sparsity:    ${(finalMetrics.sparsity * 100).toFixed(1)}%`);

  // Pruning stats
  const pruningStats = trainer.getPruningStats();
  if (Object.keys(pruningStats).length > 0) {
    console.log('\nPruning Statistics:');
    for (const [name, stats] of Object.entries(pruningStats)) {
      console.log(`  ${name}: ${(stats.sparsity * 100).toFixed(1)}% sparse (${stats.nnz}/${stats.total} weights)`);
    }
  }

  // Save final model
  if (args.outputPath) {
    const outputPath = args.outputPath;
    saveCheckpoint(outputPath, params, finalMetrics, config);
    console.log(`\n📁 Model saved to: ${outputPath}`);
  }

  return {
    history,
    finalMetrics,
    config,
  };
}

// ============================================================================
// Checkpoint Management
// ============================================================================

function saveCheckpoint(
  filePath: string,
  params: { [name: string]: Tensor },
  metrics: TrainingMetrics,
  config: any
): void {
  const checkpoint = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    metrics,
    config: {
      epochs: config.epochs,
      optimizer: config.optimizer.type,
      lr: config.optimizer.learningRate,
      pruning: config.pruning.strategy,
      sparsity: config.pruning.targetSparsity,
    },
    parameters: {} as { [name: string]: { shape: number[]; data: number[] } },
  };

  for (const [name, tensor] of Object.entries(params)) {
    checkpoint.parameters[name] = {
      shape: tensor.shape,
      data: Array.from(tensor.data),
    };
  }

  fs.writeFileSync(filePath, JSON.stringify(checkpoint, null, 2));
}

// ============================================================================
// Main
// ============================================================================

train().catch(error => {
  console.error('Training failed:', error);
  process.exit(1);
});
