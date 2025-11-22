/**
 * Validation Script for Published Packages
 * Tests @ruvector/agentic-synth@0.1.1 with real API providers
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables from agentic-synth package
config({ path: resolve(__dirname, '../packages/agentic-synth/.env') });

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  Package Validation - @ruvector/agentic-synth v0.1.1      ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Check API keys
const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;
const openrouterKey = process.env.OPENROUTER_API_KEY;

console.log('🔑 API Key Status:');
console.log(`   Gemini: ${geminiKey && !geminiKey.includes('your-') ? '✅ Configured' : '❌ Missing'}`);
console.log(`   OpenRouter: ${openrouterKey && !openrouterKey.includes('your-') ? '✅ Configured' : '❌ Missing'}`);

if (!geminiKey || geminiKey.includes('your-')) {
  console.log('\n❌ Error: GOOGLE_GEMINI_API_KEY not configured in .env file');
  console.log('   Please add your API key to: packages/agentic-synth/.env\n');
  process.exit(1);
}

if (!openrouterKey || openrouterKey.includes('your-')) {
  console.log('\n❌ Error: OPENROUTER_API_KEY not configured in .env file');
  console.log('   Please add your API key to: packages/agentic-synth/.env\n');
  process.exit(1);
}

const results = [];

async function runTest(name, testFn) {
  const start = Date.now();
  try {
    console.log(`\n🧪 ${name}`);
    const result = await testFn();
    const duration = Date.now() - start;
    console.log(`✅ PASS (${duration}ms)`);
    results.push({ name, status: 'pass', duration });
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`❌ FAIL (${duration}ms)`);
    console.log(`   Error: ${error.message}`);
    results.push({ name, status: 'fail', duration, error: error.message });
    return null;
  }
}

// Test 1: Import the local package
console.log('\n📦 Testing Package Imports\n');

let SyntheticDataGenerator;
try {
  const pkg = await import('../packages/agentic-synth/dist/index.js');
  SyntheticDataGenerator = pkg.SyntheticDataGenerator;
  console.log('✅ Successfully imported SyntheticDataGenerator from local package');
} catch (error) {
  console.log('❌ Failed to import from local package:', error.message);
  console.log('\n🔄 Attempting to import from published package...');

  try {
    const pkg = await import('@ruvector/agentic-synth');
    SyntheticDataGenerator = pkg.SyntheticDataGenerator;
    console.log('✅ Successfully imported from published package');
  } catch (publishedError) {
    console.log('❌ Failed to import published package:', publishedError.message);
    process.exit(1);
  }
}

// Test 2: Gemini Basic Generation
await runTest('Test 1: Gemini Basic Generation', async () => {
  const generator = new SyntheticDataGenerator({
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp',
    apiKey: geminiKey,
  });

  const schema = {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Person full name' },
      age: { type: 'number', description: 'Age between 18-65' },
      email: { type: 'string', description: 'Valid email address' },
    },
  };

  const data = await generator.generate(schema, 2);

  if (!Array.isArray(data)) {
    throw new Error(`Expected array, got ${typeof data}`);
  }

  if (data.length !== 2) {
    throw new Error(`Expected 2 records, got ${data.length}`);
  }

  console.log('   Generated data:', JSON.stringify(data, null, 2));
  return data;
});

// Test 3: OpenRouter Basic Generation
await runTest('Test 2: OpenRouter Basic Generation', async () => {
  const generator = new SyntheticDataGenerator({
    provider: 'openrouter',
    model: 'anthropic/claude-3.5-sonnet',
    apiKey: openrouterKey,
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

  if (!Array.isArray(data)) {
    throw new Error(`Expected array, got ${typeof data}`);
  }

  if (data.length !== 2) {
    throw new Error(`Expected 2 records, got ${data.length}`);
  }

  console.log('   Generated data:', JSON.stringify(data, null, 2));
  return data;
});

// Test 4: Complex Nested Schema with Gemini
await runTest('Test 3: Gemini Complex Nested Schema', async () => {
  const generator = new SyntheticDataGenerator({
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp',
    apiKey: geminiKey,
  });

  const schema = {
    type: 'object',
    properties: {
      user: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Full name' },
          profile: {
            type: 'object',
            properties: {
              bio: { type: 'string', description: 'Short biography' },
              interests: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of hobbies'
              },
            },
          },
        },
      },
    },
  };

  const data = await generator.generate(schema, 1);

  if (!data[0]?.user?.profile?.interests) {
    throw new Error('Nested structure not properly generated');
  }

  console.log('   Generated data:', JSON.stringify(data, null, 2));
  return data;
});

// Generate Summary Report
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  Validation Results Summary                                ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const passed = results.filter(r => r.status === 'pass').length;
const failed = results.filter(r => r.status === 'fail').length;
const total = results.length;

console.log(`✅ Passed: ${passed}/${total}`);
console.log(`❌ Failed: ${failed}/${total}`);
console.log(`📊 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

if (failed > 0) {
  console.log('\n❌ Failed Tests:');
  results
    .filter(r => r.status === 'fail')
    .forEach(r => {
      console.log(`   • ${r.name}`);
      console.log(`     ${r.error}`);
    });
}

console.log('\n📋 Detailed Results:');
results.forEach(r => {
  const icon = r.status === 'pass' ? '✅' : '❌';
  console.log(`   ${icon} ${r.name} - ${r.duration}ms`);
});

console.log('\n✨ Validation Complete!\n');

process.exit(failed > 0 ? 1 : 0);
