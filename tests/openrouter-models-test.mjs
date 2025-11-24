#!/usr/bin/env node

/**
 * OpenRouter Models Testing Suite
 * Tests latest models (November 2025) for agentic-synth package
 *
 * Models tested:
 * - anthropic/claude-sonnet-4-5 (Latest Claude)
 * - anthropic/claude-3.5-sonnet (Production Claude)
 * - openai/gpt-4-turbo (Latest GPT-4)
 * - google/gemini-pro (Gemini via OpenRouter)
 *
 * Also compares with direct Gemini API
 */

import { createAgenticSynth } from '@ruvector/agentic-synth';

// Test configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error('❌ OPENROUTER_API_KEY environment variable not set');
  process.exit(1);
}

// Models to test
const MODELS = [
  {
    id: 'anthropic/claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    provider: 'openrouter',
    category: 'premium'
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'openrouter',
    category: 'production'
  },
  {
    id: 'openai/gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openrouter',
    category: 'premium'
  },
  {
    id: 'google/gemini-pro',
    name: 'Gemini Pro (OpenRouter)',
    provider: 'openrouter',
    category: 'standard'
  }
];

// Test prompts for different complexity levels
const TEST_PROMPTS = {
  simple: {
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
        email: { type: 'string' }
      },
      required: ['name', 'age', 'email']
    },
    prompt: 'Generate a user profile for a software engineer named John Doe, age 32.',
    description: 'Simple structured output'
  },

  complex: {
    schema: {
      type: 'object',
      properties: {
        project: { type: 'string' },
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
              estimatedHours: { type: 'number' },
              dependencies: { type: 'array', items: { type: 'string' } },
              tags: { type: 'array', items: { type: 'string' } }
            },
            required: ['id', 'title', 'priority', 'estimatedHours']
          }
        },
        totalHours: { type: 'number' },
        deadline: { type: 'string' }
      },
      required: ['project', 'tasks', 'totalHours', 'deadline']
    },
    prompt: 'Generate a project plan for building a REST API with authentication, database integration, and testing. Include 5-7 tasks with realistic estimates.',
    description: 'Complex nested structure'
  },

  analytical: {
    schema: {
      type: 'object',
      properties: {
        analysis: { type: 'string' },
        metrics: {
          type: 'object',
          properties: {
            performance_score: { type: 'number', minimum: 0, maximum: 100 },
            reliability_score: { type: 'number', minimum: 0, maximum: 100 },
            cost_efficiency: { type: 'number', minimum: 0, maximum: 100 }
          }
        },
        recommendations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              priority: { type: 'string', enum: ['low', 'medium', 'high'] },
              action: { type: 'string' },
              impact: { type: 'string' },
              effort: { type: 'string', enum: ['small', 'medium', 'large'] }
            }
          }
        }
      },
      required: ['analysis', 'metrics', 'recommendations']
    },
    prompt: 'Analyze the following system architecture: Microservices-based e-commerce platform with React frontend, Node.js backend, PostgreSQL database, and Redis cache. Provide performance analysis and optimization recommendations.',
    description: 'Analytical reasoning task'
  }
};

// Utility functions
function formatCost(cost) {
  if (cost < 0.001) return `$${(cost * 1000).toFixed(4)}‰`;
  if (cost < 0.01) return `$${(cost * 100).toFixed(3)}¢`;
  return `$${cost.toFixed(4)}`;
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function calculateQualityScore(result, schema) {
  let score = 0;
  const maxScore = 100;

  // Schema compliance (40 points)
  if (result.data) {
    score += 40;

    // Check required fields
    const required = schema.required || [];
    const hasAllRequired = required.every(field =>
      result.data.hasOwnProperty(field) && result.data[field] !== null
    );
    if (!hasAllRequired) score -= 10;

    // Check data types
    let typeErrors = 0;
    for (const [key, value] of Object.entries(result.data)) {
      if (schema.properties[key]) {
        const expectedType = schema.properties[key].type;
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (expectedType !== actualType && !(expectedType === 'number' && actualType === 'number')) {
          typeErrors++;
        }
      }
    }
    if (typeErrors > 0) score -= Math.min(typeErrors * 5, 15);
  }

  // Response completeness (30 points)
  if (result.data) {
    const propertyCount = Object.keys(result.data).length;
    const expectedCount = Object.keys(schema.properties).length;
    score += Math.min(30, (propertyCount / expectedCount) * 30);
  }

  // Response time (15 points)
  if (result.duration < 2000) score += 15;
  else if (result.duration < 5000) score += 10;
  else if (result.duration < 10000) score += 5;

  // No errors (15 points)
  if (!result.error) score += 15;

  return Math.min(Math.max(score, 0), maxScore);
}

// Test a single model with a single prompt
async function testModelWithPrompt(model, testCase, testName) {
  console.log(`  Testing ${model.name} - ${testCase.description}...`);

  const startTime = Date.now();
  let result = {
    model: model.id,
    modelName: model.name,
    testCase: testName,
    success: false,
    duration: 0,
    error: null,
    data: null,
    usage: null,
    cost: null,
    qualityScore: 0
  };

  try {
    const synth = createAgenticSynth({
      provider: 'openrouter',
      model: model.id,
      apiKey: OPENROUTER_API_KEY,
      temperature: 0.7,
      schema: testCase.schema
    });

    const response = await synth.generateStructured(testCase.prompt);

    result.duration = Date.now() - startTime;
    result.success = true;
    result.data = response.data;
    result.usage = response.usage;

    // Calculate cost (OpenRouter provides this in usage)
    if (response.usage) {
      // Estimated costs per 1M tokens (approximate)
      const costs = {
        'anthropic/claude-sonnet-4-5': { input: 3.00, output: 15.00 },
        'anthropic/claude-3.5-sonnet': { input: 3.00, output: 15.00 },
        'openai/gpt-4-turbo': { input: 10.00, output: 30.00 },
        'google/gemini-pro': { input: 0.50, output: 1.50 }
      };

      const modelCost = costs[model.id] || { input: 1.00, output: 2.00 };
      const inputCost = (response.usage.prompt_tokens / 1000000) * modelCost.input;
      const outputCost = (response.usage.completion_tokens / 1000000) * modelCost.output;
      result.cost = inputCost + outputCost;
    }

    result.qualityScore = calculateQualityScore(result, testCase.schema);

    console.log(`    ✅ Success - ${formatDuration(result.duration)} - Quality: ${result.qualityScore.toFixed(1)}/100 - Cost: ${formatCost(result.cost || 0)}`);

  } catch (error) {
    result.duration = Date.now() - startTime;
    result.error = error.message;
    result.qualityScore = 0;
    console.log(`    ❌ Failed - ${error.message}`);
  }

  return result;
}

// Test direct Gemini API for comparison
async function testDirectGemini(testCase, testName) {
  if (!GEMINI_API_KEY) {
    console.log('  ⚠️  Skipping direct Gemini test (no API key)');
    return null;
  }

  console.log(`  Testing Gemini Direct API - ${testCase.description}...`);

  const startTime = Date.now();
  let result = {
    model: 'google/gemini-pro-direct',
    modelName: 'Gemini Pro (Direct API)',
    testCase: testName,
    success: false,
    duration: 0,
    error: null,
    data: null,
    usage: null,
    cost: null,
    qualityScore: 0
  };

  try {
    const synth = createAgenticSynth({
      provider: 'google',
      model: 'gemini-pro',
      apiKey: GEMINI_API_KEY,
      temperature: 0.7,
      schema: testCase.schema
    });

    const response = await synth.generateStructured(testCase.prompt);

    result.duration = Date.now() - startTime;
    result.success = true;
    result.data = response.data;
    result.usage = response.usage;

    // Gemini direct API pricing
    if (response.usage) {
      const inputCost = (response.usage.prompt_tokens / 1000000) * 0.35;
      const outputCost = (response.usage.completion_tokens / 1000000) * 1.05;
      result.cost = inputCost + outputCost;
    }

    result.qualityScore = calculateQualityScore(result, testCase.schema);

    console.log(`    ✅ Success - ${formatDuration(result.duration)} - Quality: ${result.qualityScore.toFixed(1)}/100 - Cost: ${formatCost(result.cost || 0)}`);

  } catch (error) {
    result.duration = Date.now() - startTime;
    result.error = error.message;
    result.qualityScore = 0;
    console.log(`    ❌ Failed - ${error.message}`);
  }

  return result;
}

// Run all tests
async function runAllTests() {
  console.log('\n🧪 OpenRouter Models Testing Suite');
  console.log('━'.repeat(80));
  console.log(`Testing ${MODELS.length} models with ${Object.keys(TEST_PROMPTS).length} test cases`);
  console.log('━'.repeat(80));

  const allResults = [];

  for (const [testName, testCase] of Object.entries(TEST_PROMPTS)) {
    console.log(`\n📋 Test Case: ${testCase.description.toUpperCase()}`);
    console.log('─'.repeat(80));

    // Test OpenRouter models
    for (const model of MODELS) {
      const result = await testModelWithPrompt(model, testCase, testName);
      allResults.push(result);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Test direct Gemini API
    const geminiResult = await testDirectGemini(testCase, testName);
    if (geminiResult) {
      allResults.push(geminiResult);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return allResults;
}

// Analyze and report results
function analyzeResults(results) {
  console.log('\n\n📊 COMPREHENSIVE ANALYSIS');
  console.log('━'.repeat(80));

  // Group by model
  const byModel = {};
  results.forEach(r => {
    if (!byModel[r.model]) {
      byModel[r.model] = {
        name: r.modelName,
        results: [],
        totalCost: 0,
        avgDuration: 0,
        avgQuality: 0,
        successRate: 0
      };
    }
    byModel[r.model].results.push(r);
    byModel[r.model].totalCost += r.cost || 0;
  });

  // Calculate aggregates
  for (const [modelId, data] of Object.entries(byModel)) {
    const results = data.results;
    data.avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    data.avgQuality = results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length;
    data.successRate = (results.filter(r => r.success).length / results.length) * 100;
  }

  // Sort by quality score
  const sortedModels = Object.entries(byModel).sort((a, b) =>
    b[1].avgQuality - a[1].avgQuality
  );

  console.log('\n🏆 RANKINGS BY QUALITY SCORE\n');
  sortedModels.forEach(([modelId, data], index) => {
    const rank = ['🥇', '🥈', '🥉'][index] || `${index + 1}.`;
    console.log(`${rank} ${data.name}`);
    console.log(`   Quality: ${data.avgQuality.toFixed(1)}/100 | Success: ${data.successRate.toFixed(0)}% | Avg Time: ${formatDuration(data.avgDuration)} | Total Cost: ${formatCost(data.totalCost)}`);
  });

  console.log('\n\n💰 COST EFFICIENCY (Quality per Dollar)\n');
  const costEfficiency = sortedModels
    .filter(([, data]) => data.totalCost > 0)
    .map(([modelId, data]) => ({
      model: data.name,
      efficiency: data.avgQuality / (data.totalCost * 1000), // Quality per milli-dollar
      quality: data.avgQuality,
      cost: data.totalCost
    }))
    .sort((a, b) => b.efficiency - a.efficiency);

  costEfficiency.forEach((item, index) => {
    const rank = ['🥇', '🥈', '🥉'][index] || `${index + 1}.`;
    console.log(`${rank} ${item.model}`);
    console.log(`   Efficiency: ${item.efficiency.toFixed(0)} pts/$0.001 | Quality: ${item.quality.toFixed(1)} | Cost: ${formatCost(item.cost)}`);
  });

  console.log('\n\n⚡ SPEED RANKINGS\n');
  const speedRanking = sortedModels
    .sort((a, b) => a[1].avgDuration - b[1].avgDuration);

  speedRanking.forEach(([modelId, data], index) => {
    const rank = ['🥇', '🥈', '🥉'][index] || `${index + 1}.`;
    console.log(`${rank} ${data.name}: ${formatDuration(data.avgDuration)}`);
  });

  // Recommendations
  console.log('\n\n🎯 RECOMMENDATIONS\n');

  const bestQuality = sortedModels[0];
  const bestCost = costEfficiency[0];
  const bestSpeed = speedRanking[0];

  console.log(`🏅 Best Overall Quality: ${bestQuality[1].name}`);
  console.log(`   → Use for: Critical tasks requiring highest accuracy`);

  console.log(`\n💎 Best Cost Efficiency: ${bestCost.model}`);
  console.log(`   → Use for: High-volume production workloads`);

  console.log(`\n⚡ Fastest Response: ${bestSpeed[1].name}`);
  console.log(`   → Use for: Real-time applications, low-latency needs`);

  // Provider comparison
  const geminiOpenRouter = byModel['google/gemini-pro'];
  const geminiDirect = byModel['google/gemini-pro-direct'];

  if (geminiOpenRouter && geminiDirect) {
    console.log('\n\n🔄 GEMINI: OpenRouter vs Direct API\n');
    console.log(`OpenRouter:`);
    console.log(`  Quality: ${geminiOpenRouter.avgQuality.toFixed(1)}/100`);
    console.log(`  Speed: ${formatDuration(geminiOpenRouter.avgDuration)}`);
    console.log(`  Cost: ${formatCost(geminiOpenRouter.totalCost)}`);

    console.log(`\nDirect API:`);
    console.log(`  Quality: ${geminiDirect.avgQuality.toFixed(1)}/100`);
    console.log(`  Speed: ${formatDuration(geminiDirect.avgDuration)}`);
    console.log(`  Cost: ${formatCost(geminiDirect.totalCost)}`);

    const costSavings = ((geminiOpenRouter.totalCost - geminiDirect.totalCost) / geminiOpenRouter.totalCost) * 100;
    const speedDiff = ((geminiDirect.avgDuration - geminiOpenRouter.avgDuration) / geminiOpenRouter.avgDuration) * 100;

    console.log(`\n📊 Comparison:`);
    if (costSavings > 0) {
      console.log(`  💰 Direct API saves ${costSavings.toFixed(1)}% on cost`);
    } else {
      console.log(`  💰 OpenRouter saves ${Math.abs(costSavings).toFixed(1)}% on cost`);
    }

    if (speedDiff < 0) {
      console.log(`  ⚡ Direct API is ${Math.abs(speedDiff).toFixed(1)}% faster`);
    } else {
      console.log(`  ⚡ OpenRouter is ${speedDiff.toFixed(1)}% faster`);
    }

    console.log(`\n  Recommendation: ${costSavings > 10 ? 'Use Direct API for better cost' : 'Use OpenRouter for convenience'}`);
  }

  return {
    byModel,
    rankings: {
      quality: sortedModels,
      costEfficiency,
      speed: speedRanking
    }
  };
}

// Error handling test
async function testErrorHandling() {
  console.log('\n\n🛡️  ERROR HANDLING TESTS');
  console.log('━'.repeat(80));

  const errorTests = [
    {
      name: 'Invalid Schema',
      config: {
        provider: 'openrouter',
        model: 'anthropic/claude-3.5-sonnet',
        apiKey: OPENROUTER_API_KEY,
        schema: { type: 'invalid' }
      },
      prompt: 'Test prompt'
    },
    {
      name: 'Missing API Key',
      config: {
        provider: 'openrouter',
        model: 'anthropic/claude-3.5-sonnet',
        apiKey: '',
        schema: TEST_PROMPTS.simple.schema
      },
      prompt: 'Test prompt'
    },
    {
      name: 'Invalid Model',
      config: {
        provider: 'openrouter',
        model: 'invalid/model-name',
        apiKey: OPENROUTER_API_KEY,
        schema: TEST_PROMPTS.simple.schema
      },
      prompt: 'Test prompt'
    }
  ];

  for (const test of errorTests) {
    console.log(`\n  Testing: ${test.name}`);
    try {
      const synth = createAgenticSynth(test.config);
      await synth.generateStructured(test.prompt);
      console.log(`    ❌ Should have thrown error`);
    } catch (error) {
      console.log(`    ✅ Correctly caught error: ${error.message.substring(0, 60)}...`);
    }
  }
}

// Main execution
async function main() {
  try {
    // Run main tests
    const results = await runAllTests();

    // Analyze results
    const analysis = analyzeResults(results);

    // Test error handling
    await testErrorHandling();

    // Save results
    const timestamp = new Date().toISOString();
    const reportData = {
      timestamp,
      results,
      analysis,
      summary: {
        totalTests: results.length,
        successfulTests: results.filter(r => r.success).length,
        failedTests: results.filter(r => !r.success).length,
        totalCost: results.reduce((sum, r) => sum + (r.cost || 0), 0)
      }
    };

    console.log('\n\n📄 SUMMARY');
    console.log('━'.repeat(80));
    console.log(`Total Tests: ${reportData.summary.totalTests}`);
    console.log(`Successful: ${reportData.summary.successfulTests}`);
    console.log(`Failed: ${reportData.summary.failedTests}`);
    console.log(`Total Cost: ${formatCost(reportData.summary.totalCost)}`);

    // Store results with hooks
    console.log('\n💾 Storing results with hooks...');
    const resultsPath = `/workspaces/ruvector/tests/openrouter-test-results-${Date.now()}.json`;

    await import('fs/promises').then(fs =>
      fs.writeFile(resultsPath, JSON.stringify(reportData, null, 2))
    );

    console.log(`✅ Results saved to: ${resultsPath}`);

    console.log('\n✅ All tests completed successfully!');
    console.log('━'.repeat(80));

    return reportData;

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main, runAllTests, analyzeResults, testErrorHandling };
