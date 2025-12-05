#!/usr/bin/env npx ts-node
/**
 * Checkpoint Verification Tool for RuvLLM Self-Improvement System
 *
 * Verifies saved model checkpoints and displays improvement metrics.
 *
 * Usage:
 *   npx ts-node benchmarks/verify-checkpoint.ts <checkpoint-file>
 *   npx ts-node benchmarks/verify-checkpoint.ts --list
 *   npx ts-node benchmarks/verify-checkpoint.ts --compare <file1> <file2>
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

interface ModelCheckpoint {
  version: string;
  modelName: string;
  timestamp: string;
  checkpointId: string;
  loraWeights: {
    a: number[][];
    b: number[][];
    rank: number;
    alpha: number;
  };
  trajectoryStats: {
    total: number;
    successful: number;
    avgQuality: number;
  };
  ewcState: {
    fisherDiagonal: number[];
    optimalWeights: number[];
    taskCount: number;
    lambda: number;
  };
  patternCentroids: number[][];
  patternQualities: number[];
  improvementHistory: {
    epoch: number;
    resolveRate: number;
    avgConfidence: number;
    patternsLearned: number;
    simdEnabled: boolean;
  }[];
  stateHash: string;
}

async function verifyCheckpoint(filePath: string): Promise<{ valid: boolean; checkpoint?: ModelCheckpoint; error?: string }> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const checkpoint: ModelCheckpoint = JSON.parse(data);

    // Verify hash
    const stateStr = JSON.stringify({
      lora: checkpoint.loraWeights,
      ewc: checkpoint.ewcState,
      patterns: checkpoint.patternCentroids,
    });
    const computedHash = crypto.createHash('sha256').update(stateStr).digest('hex');

    if (computedHash !== checkpoint.stateHash) {
      return { valid: false, error: 'Hash mismatch - checkpoint may be corrupted or tampered' };
    }

    return { valid: true, checkpoint };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

function displayCheckpoint(checkpoint: ModelCheckpoint): void {
  console.log('\n╔════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                         CHECKPOINT VERIFICATION REPORT                             ║');
  console.log('╠════════════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Model: ${checkpoint.modelName.padEnd(71)}║`);
  console.log(`║  Checkpoint ID: ${checkpoint.checkpointId.padEnd(63)}║`);
  console.log(`║  Timestamp: ${checkpoint.timestamp.padEnd(67)}║`);
  console.log(`║  Version: ${checkpoint.version.padEnd(69)}║`);
  console.log('╠════════════════════════════════════════════════════════════════════════════════════╣');
  console.log('║                              LEARNING STATE                                        ║');
  console.log('╠════════════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║  LoRA Rank: ${checkpoint.loraWeights.rank.toString().padEnd(67)}║`);
  console.log(`║  LoRA Alpha: ${checkpoint.loraWeights.alpha.toString().padEnd(66)}║`);
  console.log(`║  LoRA Parameters: ${(checkpoint.loraWeights.a[0].length * checkpoint.loraWeights.rank * 2).toString().padEnd(61)}║`);
  console.log('╠════════════════════════════════════════════════════════════════════════════════════╣');
  console.log('║                             TRAJECTORY STATS                                       ║');
  console.log('╠════════════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Total Trajectories: ${checkpoint.trajectoryStats.total.toString().padEnd(58)}║`);
  console.log(`║  Successful: ${checkpoint.trajectoryStats.successful.toString().padEnd(66)}║`);
  console.log(`║  Success Rate: ${((checkpoint.trajectoryStats.successful / checkpoint.trajectoryStats.total) * 100).toFixed(1)}%`.padEnd(80) + '║');
  console.log(`║  Avg Quality: ${(checkpoint.trajectoryStats.avgQuality * 100).toFixed(1)}%`.padEnd(80) + '║');
  console.log('╠════════════════════════════════════════════════════════════════════════════════════╣');
  console.log('║                               EWC++ STATE                                          ║');
  console.log('╠════════════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Task Count: ${checkpoint.ewcState.taskCount.toString().padEnd(66)}║`);
  console.log(`║  Lambda: ${checkpoint.ewcState.lambda.toString().padEnd(70)}║`);
  console.log(`║  Fisher Params: ${checkpoint.ewcState.fisherDiagonal.length.toString().padEnd(63)}║`);
  console.log('╠════════════════════════════════════════════════════════════════════════════════════╣');
  console.log('║                              PATTERN BANK                                          ║');
  console.log('╠════════════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Patterns Learned: ${checkpoint.patternCentroids.length.toString().padEnd(60)}║`);

  if (checkpoint.patternQualities.length > 0) {
    const avgQuality = checkpoint.patternQualities.reduce((a, b) => a + b, 0) / checkpoint.patternQualities.length;
    console.log(`║  Avg Pattern Quality: ${(avgQuality * 100).toFixed(1)}%`.padEnd(80) + '║');
  }

  console.log('╠════════════════════════════════════════════════════════════════════════════════════╣');
  console.log('║                          IMPROVEMENT HISTORY                                       ║');
  console.log('╠════════════════════════════════════════════════════════════════════════════════════╣');

  if (checkpoint.improvementHistory.length > 0) {
    const first = checkpoint.improvementHistory[0];
    const last = checkpoint.improvementHistory[checkpoint.improvementHistory.length - 1];
    const improvement = last.resolveRate - first.resolveRate;

    console.log(`║  Epochs Trained: ${checkpoint.improvementHistory.length.toString().padEnd(62)}║`);
    console.log(`║  Initial Resolve Rate: ${(first.resolveRate * 100).toFixed(1)}%`.padEnd(80) + '║');
    console.log(`║  Final Resolve Rate: ${(last.resolveRate * 100).toFixed(1)}%`.padEnd(80) + '║');
    console.log(`║  Total Improvement: ${improvement >= 0 ? '+' : ''}${(improvement * 100).toFixed(1)}%`.padEnd(80) + '║');
    console.log('║                                                                                    ║');
    console.log('║  Epoch History:                                                                    ║');

    for (const epoch of checkpoint.improvementHistory) {
      const simd = epoch.simdEnabled ? '✓' : '✗';
      console.log(`║    Epoch ${epoch.epoch.toString().padStart(2)}: Resolve=${(epoch.resolveRate * 100).toFixed(1).padStart(5)}% | Confidence=${(epoch.avgConfidence * 100).toFixed(1).padStart(5)}% | Patterns=${epoch.patternsLearned.toString().padStart(3)} | SIMD=${simd}`.padEnd(80) + '║');
    }
  }

  console.log('╠════════════════════════════════════════════════════════════════════════════════════╣');
  console.log('║                            VERIFICATION                                            ║');
  console.log('╠════════════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║  State Hash: ${checkpoint.stateHash.substring(0, 16)}...${checkpoint.stateHash.substring(48)}`.padEnd(80) + '║');
  console.log(`║  ✅ VERIFIED - Checkpoint integrity confirmed`.padEnd(84) + '║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════════╝');
}

async function listCheckpoints(dir: string): Promise<void> {
  const checkpointDir = path.join(dir, 'checkpoints');

  try {
    const files = await fs.readdir(checkpointDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    console.log('\n╔════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                         AVAILABLE CHECKPOINTS                                      ║');
    console.log('╠════════════════════════════════════════════════════════════════════════════════════╣');

    for (const file of jsonFiles) {
      const filePath = path.join(checkpointDir, file);
      const result = await verifyCheckpoint(filePath);

      if (result.valid && result.checkpoint) {
        const cp = result.checkpoint;
        const lastEpoch = cp.improvementHistory[cp.improvementHistory.length - 1];
        console.log(`║  ${cp.modelName.padEnd(25)} │ ${cp.checkpointId.substring(0, 8)} │ ${(lastEpoch?.resolveRate * 100 || 0).toFixed(1).padStart(5)}% │ ✅`.padEnd(84) + '║');
      } else {
        console.log(`║  ${file.padEnd(25)} │ ❌ Invalid: ${result.error?.substring(0, 30)}`.padEnd(84) + '║');
      }
    }

    console.log('╚════════════════════════════════════════════════════════════════════════════════════╝');
  } catch (error) {
    console.error(`No checkpoints found in ${checkpointDir}`);
  }
}

async function compareCheckpoints(file1: string, file2: string): Promise<void> {
  const [result1, result2] = await Promise.all([
    verifyCheckpoint(file1),
    verifyCheckpoint(file2),
  ]);

  if (!result1.valid || !result2.valid) {
    console.error('One or both checkpoints are invalid');
    return;
  }

  const cp1 = result1.checkpoint!;
  const cp2 = result2.checkpoint!;

  console.log('\n╔════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                         CHECKPOINT COMPARISON                                      ║');
  console.log('╠════════════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Model 1: ${cp1.modelName.padEnd(69)}║`);
  console.log(`║  Model 2: ${cp2.modelName.padEnd(69)}║`);
  console.log('╠════════════════════════════════════════════════════════════════════════════════════╣');

  const last1 = cp1.improvementHistory[cp1.improvementHistory.length - 1];
  const last2 = cp2.improvementHistory[cp2.improvementHistory.length - 1];

  console.log(`║  ${' '.padEnd(25)} │ ${'Model 1'.padEnd(15)} │ ${'Model 2'.padEnd(15)} │ ${'Diff'.padEnd(10)} ║`);
  console.log('╠════════════════════════════════════════════════════════════════════════════════════╣');

  const rate1 = (last1?.resolveRate * 100 || 0).toFixed(1) + '%';
  const rate2 = (last2?.resolveRate * 100 || 0).toFixed(1) + '%';
  const rateDiff = ((last1?.resolveRate || 0) - (last2?.resolveRate || 0)) * 100;
  console.log(`║  ${'Resolve Rate'.padEnd(25)} │ ${rate1.padEnd(15)} │ ${rate2.padEnd(15)} │ ${(rateDiff >= 0 ? '+' : '') + rateDiff.toFixed(1) + '%'.padEnd(5)} ║`);

  const patterns1 = cp1.patternCentroids.length.toString();
  const patterns2 = cp2.patternCentroids.length.toString();
  const patternDiff = cp1.patternCentroids.length - cp2.patternCentroids.length;
  console.log(`║  ${'Patterns'.padEnd(25)} │ ${patterns1.padEnd(15)} │ ${patterns2.padEnd(15)} │ ${(patternDiff >= 0 ? '+' : '') + patternDiff.toString().padEnd(5)} ║`);

  const epochs1 = cp1.improvementHistory.length.toString();
  const epochs2 = cp2.improvementHistory.length.toString();
  console.log(`║  ${'Epochs'.padEnd(25)} │ ${epochs1.padEnd(15)} │ ${epochs2.padEnd(15)} │ ${' '.padEnd(10)} ║`);

  console.log('╚════════════════════════════════════════════════════════════════════════════════════╝');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
RuvLLM Checkpoint Verification Tool

Usage:
  npx ts-node benchmarks/verify-checkpoint.ts <checkpoint-file>
  npx ts-node benchmarks/verify-checkpoint.ts --list
  npx ts-node benchmarks/verify-checkpoint.ts --compare <file1> <file2>

Options:
  --list              List all available checkpoints
  --compare           Compare two checkpoints
  --help              Show this help
`);
    return;
  }

  if (args.includes('--list')) {
    await listCheckpoints('./benchmarks/results');
    return;
  }

  if (args.includes('--compare')) {
    const idx = args.indexOf('--compare');
    if (args.length < idx + 3) {
      console.error('Usage: --compare <file1> <file2>');
      process.exit(1);
    }
    await compareCheckpoints(args[idx + 1], args[idx + 2]);
    return;
  }

  // Verify single checkpoint
  const filePath = args[0];
  console.log(`\nVerifying checkpoint: ${filePath}`);

  const result = await verifyCheckpoint(filePath);

  if (!result.valid) {
    console.error(`\n❌ Verification FAILED: ${result.error}`);
    process.exit(1);
  }

  displayCheckpoint(result.checkpoint!);
}

main().catch(console.error);
