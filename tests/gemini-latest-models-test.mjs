#!/usr/bin/env node

/**
 * Comprehensive Gemini Models Test Suite
 * Tests latest Gemini models (November 2025) with agentic-synth
 *
 * Models tested:
 * - gemini-3-pro: Best multimodal understanding
 * - gemini-2.5-pro: Advanced reasoning
 * - gemini-2.5-flash: Best price-performance
 * - gemini-2.5-flash-lite: Fastest, cost-efficient
 */

import { AgenticSynth } from '@ruvector/agentic-synth';
import { z } from 'zod';
import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// Test configuration
const GEMINI_MODELS = [
  { id: 'gemini-3-pro', name: 'Gemini 3 Pro', description: 'Best multimodal understanding' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Advanced reasoning' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Best price-performance' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Fastest, cost-efficient' }
];

const TEST_COUNTS = [1, 10, 50];

// Schema definitions for testing
const SimpleSchema = z.object({
  id: z.string().describe('Unique identifier'),
  name: z.string().describe('Full name'),
  email: z.string().email().describe('Email address'),
  age: z.number().min(18).max(120).describe('Age in years'),
  active: z.boolean().describe('Account active status')
});

const ComplexSchema = z.object({
  userId: z.string().uuid().describe('User UUID'),
  profile: z.object({
    firstName: z.string().describe('First name'),
    lastName: z.string().describe('Last name'),
    bio: z.string().max(500).describe('Biography'),
    avatar: z.string().url().describe('Avatar URL')
  }).describe('User profile'),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'auto']).describe('UI theme'),
    notifications: z.object({
      email: z.boolean().describe('Email notifications enabled'),
      push: z.boolean().describe('Push notifications enabled'),
      sms: z.boolean().describe('SMS notifications enabled')
    }).describe('Notification settings'),
    language: z.string().length(2).describe('ISO language code')
  }).describe('User preferences'),
  metadata: z.object({
    createdAt: z.string().datetime().describe('Account creation date'),
    lastLogin: z.string().datetime().describe('Last login timestamp'),
    loginCount: z.number().int().positive().describe('Total login count'),
    tags: z.array(z.string()).min(1).max(10).describe('User tags')
  }).describe('Account metadata'),
  subscription: z.object({
    tier: z.enum(['free', 'basic', 'premium', 'enterprise']).describe('Subscription tier'),
    validUntil: z.string().datetime().describe('Subscription end date'),
    autoRenew: z.boolean().describe('Auto-renewal enabled'),
    paymentMethod: z.string().describe('Payment method')
  }).describe('Subscription details')
});

// Results storage
const testResults = {
  timestamp: new Date().toISOString(),
  environment: {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  },
  models: {}
};

// Helper functions
function getApiKey() {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
  if (!key) {
    throw new Error('❌ GEMINI_API_KEY or GOOGLE_GEMINI_API_KEY environment variable not set');
  }
  return key;
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function calculateStats(durations) {
  const sorted = [...durations].sort((a, b) => a - b);
  return {
    min: Math.min(...durations),
    max: Math.max(...durations),
    mean: durations.reduce((a, b) => a + b, 0) / durations.length,
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)]
  };
}

function validateDataQuality(data, schema) {
  const errors = [];
  const warnings = [];

  data.forEach((item, idx) => {
    try {
      schema.parse(item);
    } catch (err) {
      errors.push({ index: idx, error: err.message });
    }
  });

  // Check for diversity
  const uniqueValues = new Set(data.map(d => JSON.stringify(d)));
  const diversityScore = uniqueValues.size / data.length;

  if (diversityScore < 0.8) {
    warnings.push(`Low diversity: ${(diversityScore * 100).toFixed(1)}% unique records`);
  }

  return {
    valid: errors.length === 0,
    errorCount: errors.length,
    errors: errors.slice(0, 5), // Show first 5 errors
    warnings,
    diversityScore,
    qualityScore: ((data.length - errors.length) / data.length) * 100
  };
}

async function testModel(modelId, modelName, description) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 Testing: ${modelName} (${modelId})`);
  console.log(`📝 Description: ${description}`);
  console.log(`${'='.repeat(80)}\n`);

  const apiKey = getApiKey();
  const modelResults = {
    modelId,
    modelName,
    description,
    tests: {},
    overall: {}
  };

  try {
    const synth = new AgenticSynth({
      provider: 'gemini',
      model: modelId,
      apiKey,
      temperature: 0.7
    });

    // Test 1: Simple schema with various counts
    console.log('📊 Test 1: Simple Schema Performance');
    console.log('─'.repeat(80));

    const simpleResults = [];
    for (const count of TEST_COUNTS) {
      console.log(`  Testing count=${count}...`);
      const start = performance.now();

      try {
        const data = await synth.generateStructured(SimpleSchema, {
          count,
          temperature: 0.7
        });

        const duration = performance.now() - start;
        const quality = validateDataQuality(data, SimpleSchema);

        simpleResults.push({
          count,
          duration,
          recordsPerSecond: (count / (duration / 1000)).toFixed(2),
          quality
        });

        console.log(`    ✓ Generated ${data.length} records in ${formatDuration(duration)}`);
        console.log(`    ⚡ Rate: ${(count / (duration / 1000)).toFixed(2)} records/sec`);
        console.log(`    ✨ Quality: ${quality.qualityScore.toFixed(1)}%`);

      } catch (err) {
        console.error(`    ✗ Failed: ${err.message}`);
        simpleResults.push({ count, error: err.message });
      }
    }

    modelResults.tests.simple = simpleResults;

    // Test 2: Complex nested schema
    console.log('\n📊 Test 2: Complex Nested Schema');
    console.log('─'.repeat(80));

    const complexResults = [];
    for (const count of [1, 10]) { // Fewer tests for complex schema
      console.log(`  Testing count=${count}...`);
      const start = performance.now();

      try {
        const data = await synth.generateStructured(ComplexSchema, {
          count,
          temperature: 0.7
        });

        const duration = performance.now() - start;
        const quality = validateDataQuality(data, ComplexSchema);

        complexResults.push({
          count,
          duration,
          recordsPerSecond: (count / (duration / 1000)).toFixed(2),
          quality
        });

        console.log(`    ✓ Generated ${data.length} records in ${formatDuration(duration)}`);
        console.log(`    ⚡ Rate: ${(count / (duration / 1000)).toFixed(2)} records/sec`);
        console.log(`    ✨ Quality: ${quality.qualityScore.toFixed(1)}%`);
        console.log(`    🎯 Diversity: ${(quality.diversityScore * 100).toFixed(1)}%`);

      } catch (err) {
        console.error(`    ✗ Failed: ${err.message}`);
        complexResults.push({ count, error: err.message });
      }
    }

    modelResults.tests.complex = complexResults;

    // Calculate overall metrics
    const allDurations = [
      ...simpleResults.filter(r => r.duration).map(r => r.duration),
      ...complexResults.filter(r => r.duration).map(r => r.duration)
    ];

    const allQualityScores = [
      ...simpleResults.filter(r => r.quality).map(r => r.quality.qualityScore),
      ...complexResults.filter(r => r.quality).map(r => r.quality.qualityScore)
    ];

    if (allDurations.length > 0) {
      modelResults.overall = {
        avgResponseTime: allDurations.reduce((a, b) => a + b, 0) / allDurations.length,
        avgQuality: allQualityScores.reduce((a, b) => a + b, 0) / allQualityScores.length,
        stats: calculateStats(allDurations),
        successRate: ((allDurations.length / (simpleResults.length + complexResults.length)) * 100).toFixed(1)
      };

      console.log('\n📈 Overall Performance:');
      console.log(`  ⏱️  Average Response Time: ${formatDuration(modelResults.overall.avgResponseTime)}`);
      console.log(`  ✨ Average Quality Score: ${modelResults.overall.avgQuality.toFixed(1)}%`);
      console.log(`  ✅ Success Rate: ${modelResults.overall.successRate}%`);
      console.log(`  📊 Stats: min=${formatDuration(modelResults.overall.stats.min)}, max=${formatDuration(modelResults.overall.stats.max)}, p95=${formatDuration(modelResults.overall.stats.p95)}`);
    }

  } catch (err) {
    console.error(`\n❌ Model test failed: ${err.message}`);
    modelResults.error = err.message;
  }

  testResults.models[modelId] = modelResults;
  return modelResults;
}

function generateReport() {
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE COMPARISON REPORT');
  console.log('='.repeat(80));

  // Summary table
  console.log('\n🏆 Performance Summary:');
  console.log('─'.repeat(80));
  console.log('Model                    | Avg Time  | Quality | Success | Rate (rec/s)');
  console.log('─'.repeat(80));

  const rankings = [];

  Object.entries(testResults.models).forEach(([modelId, results]) => {
    if (results.overall && results.overall.avgResponseTime) {
      const model = GEMINI_MODELS.find(m => m.id === modelId);
      const avgRate = results.tests.simple
        .filter(r => r.recordsPerSecond)
        .reduce((sum, r) => sum + parseFloat(r.recordsPerSecond), 0) /
        results.tests.simple.filter(r => r.recordsPerSecond).length;

      rankings.push({
        modelId,
        modelName: model.name,
        avgTime: results.overall.avgResponseTime,
        quality: results.overall.avgQuality,
        success: parseFloat(results.overall.successRate),
        rate: avgRate
      });

      console.log(
        `${model.name.padEnd(24)} | ` +
        `${formatDuration(results.overall.avgResponseTime).padEnd(9)} | ` +
        `${results.overall.avgQuality.toFixed(1).padEnd(7)}% | ` +
        `${results.overall.successRate.padEnd(7)}% | ` +
        `${avgRate.toFixed(2)}`
      );
    }
  });

  // Recommendations
  console.log('\n\n💡 RECOMMENDATIONS:');
  console.log('─'.replace(80));

  // Best for speed
  const fastest = rankings.reduce((best, current) =>
    current.avgTime < best.avgTime ? current : best
  );
  console.log(`\n⚡ Fastest Model: ${fastest.modelName}`);
  console.log(`   Average response: ${formatDuration(fastest.avgTime)}`);
  console.log(`   Use for: High-throughput batch processing`);

  // Best for quality
  const highestQuality = rankings.reduce((best, current) =>
    current.quality > best.quality ? current : best
  );
  console.log(`\n✨ Highest Quality: ${highestQuality.modelName}`);
  console.log(`   Quality score: ${highestQuality.quality.toFixed(1)}%`);
  console.log(`   Use for: Complex schemas requiring precision`);

  // Best overall (balanced)
  const bestOverall = rankings.reduce((best, current) => {
    const currentScore = (current.quality / 100) * 0.6 + (1 - (current.avgTime / 10000)) * 0.4;
    const bestScore = (best.quality / 100) * 0.6 + (1 - (best.avgTime / 10000)) * 0.4;
    return currentScore > bestScore ? current : best;
  });
  console.log(`\n🎯 Best Overall (Recommended Default): ${bestOverall.modelName}`);
  console.log(`   Quality: ${bestOverall.quality.toFixed(1)}%, Speed: ${formatDuration(bestOverall.avgTime)}`);
  console.log(`   Use for: General-purpose synthetic data generation`);

  // Cost-efficiency (typically flash-lite)
  const flashLite = rankings.find(r => r.modelId.includes('flash-lite'));
  if (flashLite) {
    console.log(`\n💰 Most Cost-Efficient: ${flashLite.modelName}`);
    console.log(`   Quality: ${flashLite.quality.toFixed(1)}%, Speed: ${formatDuration(flashLite.avgTime)}`);
    console.log(`   Use for: Development, testing, cost-sensitive applications`);
  }

  console.log('\n' + '='.repeat(80));

  return {
    fastest,
    highestQuality,
    bestOverall,
    flashLite
  };
}

async function storeResultsWithHooks() {
  console.log('\n💾 Storing results with hooks...');

  try {
    const resultsJson = JSON.stringify(testResults, null, 2);

    // Store results in memory using hooks
    execSync(
      `npx claude-flow@alpha hooks post-task --task-id "gemini-model-testing" --memory-key "swarm/tester/gemini-results"`,
      { stdio: 'inherit' }
    );

    // Store detailed results as JSON file
    const resultsPath = '/workspaces/ruvector/tests/gemini-model-test-results.json';
    writeFileSync(resultsPath, resultsJson);
    console.log(`✓ Results saved to: ${resultsPath}`);

    // Notify about completion
    execSync(
      `npx claude-flow@alpha hooks notify --message "Gemini model testing completed. ${Object.keys(testResults.models).length} models tested."`,
      { stdio: 'inherit' }
    );

    return resultsPath;
  } catch (err) {
    console.error(`⚠️  Warning: Failed to store results with hooks: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting Gemini Models Comprehensive Test Suite');
  console.log(`📅 ${new Date().toLocaleString()}\n`);

  // Pre-task hook
  try {
    execSync(
      'npx claude-flow@alpha hooks pre-task --description "Testing latest Gemini models with agentic-synth"',
      { stdio: 'inherit' }
    );
  } catch (err) {
    console.log('⚠️  Note: Hooks not available, continuing without coordination...');
  }

  // Test each model sequentially (to avoid rate limits)
  for (const model of GEMINI_MODELS) {
    await testModel(model.id, model.name, model.description);

    // Small delay between models to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Generate comparison report
  const recommendations = generateReport();

  // Store results
  await storeResultsWithHooks();

  console.log('\n✅ Testing complete!\n');

  // Exit with appropriate code
  const hasErrors = Object.values(testResults.models).some(m => m.error);
  process.exit(hasErrors ? 1 : 0);
}

// Run tests
main().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
