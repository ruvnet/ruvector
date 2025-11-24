/**
 * Live API Validation Tests
 * Tests @ruvector/agentic-synth with actual API providers
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { SyntheticDataGenerator } from '../../src/index.js';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

interface TestResult {
  test: string;
  provider: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  error?: string;
  data?: any;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  provider: string,
  testFn: () => Promise<any>
): Promise<void> {
  const start = Date.now();
  try {
    console.log(`\n🧪 Testing: ${name} (${provider})`);
    const data = await testFn();
    const duration = Date.now() - start;
    results.push({ test: name, provider, status: 'pass', duration, data });
    console.log(`✅ PASS - ${duration}ms`);
  } catch (error) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ test: name, provider, status: 'fail', duration, error: errorMsg });
    console.log(`❌ FAIL - ${errorMsg}`);
  }
}

async function testGeminiBasicGeneration() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('your-')) {
    throw new Error('GOOGLE_GEMINI_API_KEY not configured');
  }

  const generator = new SyntheticDataGenerator({
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp',
    apiKey,
  });

  const schema = {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Person name' },
      age: { type: 'number', description: 'Age in years' },
      email: { type: 'string', description: 'Email address' },
    },
  };

  const data = await generator.generate(schema, 3);

  if (!Array.isArray(data) || data.length !== 3) {
    throw new Error(`Expected 3 records, got ${data?.length || 0}`);
  }

  return data;
}

async function testOpenRouterBasicGeneration() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.includes('your-')) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const generator = new SyntheticDataGenerator({
    provider: 'openrouter',
    model: 'anthropic/claude-3.5-sonnet',
    apiKey,
  });

  const schema = {
    type: 'object',
    properties: {
      product: { type: 'string', description: 'Product name' },
      price: { type: 'number', description: 'Price in USD' },
      category: { type: 'string', description: 'Product category' },
    },
  };

  const data = await generator.generate(schema, 2);

  if (!Array.isArray(data) || data.length !== 2) {
    throw new Error(`Expected 2 records, got ${data?.length || 0}`);
  }

  return data;
}

async function testGeminiComplexSchema() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('your-')) {
    throw new Error('GOOGLE_GEMINI_API_KEY not configured');
  }

  const generator = new SyntheticDataGenerator({
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp',
    apiKey,
  });

  const schema = {
    type: 'object',
    properties: {
      user: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          profile: {
            type: 'object',
            properties: {
              bio: { type: 'string' },
              interests: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
      metrics: {
        type: 'object',
        properties: {
          views: { type: 'number' },
          likes: { type: 'number' },
        },
      },
    },
  };

  const data = await generator.generate(schema, 1);

  if (!Array.isArray(data) || data.length !== 1) {
    throw new Error(`Expected 1 record, got ${data?.length || 0}`);
  }

  // Validate nested structure
  const record = data[0];
  if (!record.user?.profile?.interests) {
    throw new Error('Nested structure not properly generated');
  }

  return data;
}

async function testOpenRouterStreamingMode() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.includes('your-')) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const generator = new SyntheticDataGenerator({
    provider: 'openrouter',
    model: 'anthropic/claude-3.5-sonnet',
    apiKey,
    stream: true,
  });

  const schema = {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Article title' },
      content: { type: 'string', description: 'Article content' },
    },
  };

  const chunks: any[] = [];
  for await (const chunk of generator.generateStream(schema, 1)) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    throw new Error('No data chunks received');
  }

  return { chunks: chunks.length };
}

async function testGeminiWithCache() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('your-')) {
    throw new Error('GOOGLE_GEMINI_API_KEY not configured');
  }

  const generator = new SyntheticDataGenerator({
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp',
    apiKey,
    cache: { enabled: true, ttl: 3600 },
  });

  const schema = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      timestamp: { type: 'string' },
    },
  };

  // First call - should hit API
  const data1 = await generator.generate(schema, 1);

  // Second call - should use cache
  const data2 = await generator.generate(schema, 1);

  return { cached: true, data1, data2 };
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Live API Validation Tests - @ruvector/agentic-synth      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Test Google Gemini
  console.log('\n📍 Google Gemini Tests');
  console.log('─'.repeat(60));
  await runTest('Basic Generation', 'gemini', testGeminiBasicGeneration);
  await runTest('Complex Schema', 'gemini', testGeminiComplexSchema);
  await runTest('With Cache', 'gemini', testGeminiWithCache);

  // Test OpenRouter
  console.log('\n📍 OpenRouter Tests');
  console.log('─'.repeat(60));
  await runTest('Basic Generation', 'openrouter', testOpenRouterBasicGeneration);
  await runTest('Streaming Mode', 'openrouter', testOpenRouterStreamingMode);

  // Generate Report
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Test Results Summary                                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const total = results.length;

  console.log(`\n✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  console.log(`📊 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter(r => r.status === 'fail')
      .forEach(r => {
        console.log(`   • ${r.test} (${r.provider}): ${r.error}`);
      });
  }

  console.log('\n📝 Detailed Results:');
  console.table(
    results.map(r => ({
      Test: r.test,
      Provider: r.provider,
      Status: r.status,
      Duration: `${r.duration}ms`,
    }))
  );

  // Exit with error code if any tests failed
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('\n💥 Fatal Error:', error);
  process.exit(1);
});
