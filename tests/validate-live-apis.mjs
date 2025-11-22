/**
 * Live API Validation - @ruvector/agentic-synth v0.1.1
 * Tests with real Google Gemini and OpenRouter API keys
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env file manually
function loadEnv(filepath) {
  try {
    const content = readFileSync(filepath, 'utf-8');
    content.split('\n').forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      const [key, ...values] = line.split('=');
      if (key && values.length) {
        process.env[key.trim()] = values.join('=').trim();
      }
    });
  } catch (error) {
    console.error(`Failed to load .env from ${filepath}:`, error.message);
  }
}

// Load environment variables
loadEnv(resolve(__dirname, '../packages/agentic-synth/.env'));

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     Live API Validation - agentic-synth v0.1.1            ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Check all possible API key variable names
const apiKeys = {
  gemini: process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
};

console.log('🔑 API Key Status:');
console.log(`   GOOGLE_GEMINI_API_KEY: ${process.env.GOOGLE_GEMINI_API_KEY ? '✅ Set' : '❌ Not set'}`);
console.log(`   GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Not set'}`);
console.log(`   OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? '✅ Set' : '❌ Not set'}`);
console.log(`   ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅ Set' : '❌ Not set'}`);

// Export GEMINI_API_KEY if only GOOGLE_GEMINI_API_KEY is set
if (process.env.GOOGLE_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
  console.log('\n📝 Note: Setting GEMINI_API_KEY from GOOGLE_GEMINI_API_KEY');
  process.env.GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
  apiKeys.gemini = process.env.GEMINI_API_KEY;
}

if (!apiKeys.gemini || apiKeys.gemini.includes('your-')) {
  console.log('\n❌ Error: No valid Gemini API key found');
  console.log('   Please set GOOGLE_GEMINI_API_KEY or GEMINI_API_KEY in .env\n');
  process.exit(1);
}

console.log('\n📦 Importing Package...\n');

const results = [];

async function runTest(name, testFn) {
  const start = Date.now();
  try {
    console.log(`🧪 ${name}`);
    const result = await testFn();
    const duration = Date.now() - start;
    console.log(`✅ PASS (${duration}ms)\n`);
    results.push({ name, status: 'pass', duration });
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`❌ FAIL (${duration}ms)`);
    console.log(`   Error: ${error.message}\n`);
    results.push({ name, status: 'fail', duration, error: error.message });
    return null;
  }
}

// Import package
let AgenticSynth;
try {
  const pkg = await import('../packages/agentic-synth/dist/index.js');
  AgenticSynth = pkg.AgenticSynth || pkg.default;
  console.log('✅ Imported AgenticSynth from: packages/agentic-synth/dist/index.js');
  console.log('   Available exports:', Object.keys(pkg).join(', '));
  console.log('');
} catch (error) {
  console.log(`❌ Failed to import: ${error.message}\n`);
  process.exit(1);
}

// Test 1: Gemini with explicit API key
await runTest('Test 1: Gemini Basic Generation (explicit API key)', async () => {
  console.log('   Provider: gemini');
  console.log('   Model: gemini-2.0-flash-exp');
  console.log('   API Key: Provided explicitly\n');

  const generator = new AgenticSynth({
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp',
    apiKey: apiKeys.gemini,
  });

  const schema = {
    name: { type: 'string', description: 'Person full name' },
    age: { type: 'number', description: 'Age between 18-65' },
    email: { type: 'string', description: 'Valid email address' },
  };

  console.log('   Generating 2 records...');
  const result = await generator.generate('structured', { schema, count: 2 });
  const data = result.data;

  if (!Array.isArray(data)) {
    throw new Error(`Expected array, got ${typeof data}`);
  }

  if (data.length !== 2) {
    throw new Error(`Expected 2 records, got ${data.length}`);
  }

  console.log('   Generated:', JSON.stringify(data[0], null, 2));
  return data;
});

// Test 2: Gemini from environment variable
await runTest('Test 2: Gemini with Environment Variable', async () => {
  console.log('   Provider: gemini');
  console.log('   API Key: From GEMINI_API_KEY env var\n');

  const generator = new AgenticSynth({
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp',
    // No apiKey - should use GEMINI_API_KEY from env
  });

  const schema = {
    product: { type: 'string', description: 'Product name' },
    price: { type: 'number', description: 'Price in USD' },
  };

  console.log('   Generating 1 record...');
  const result = await generator.generate('structured', { schema, count: 1 });
  const data = result.data;

  if (!Array.isArray(data) || data.length !== 1) {
    throw new Error(`Expected 1 record, got ${data?.length || 0}`);
  }

  console.log('   Generated:', JSON.stringify(data[0], null, 2));
  return data;
});

// Test 3: OpenRouter if key available
if (apiKeys.openrouter && !apiKeys.openrouter.includes('your-')) {
  await runTest('Test 3: OpenRouter Basic Generation', async () => {
    console.log('   Provider: openrouter');
    console.log('   Model: anthropic/claude-3.5-sonnet');
    console.log('   API Key: Provided explicitly\n');

    const generator = new AgenticSynth({
      provider: 'openrouter',
      model: 'anthropic/claude-3.5-sonnet',
      apiKey: apiKeys.openrouter,
    });

    const schema = {
      title: { type: 'string', description: 'Article title' },
      summary: { type: 'string', description: 'Brief summary' },
    };

    console.log('   Generating 1 record...');
    const result = await generator.generate('structured', { schema, count: 1 });
    const data = result.data;

    if (!Array.isArray(data) || data.length !== 1) {
      throw new Error(`Expected 1 record, got ${data?.length || 0}`);
    }

    console.log('   Generated:', JSON.stringify(data[0], null, 2));
    return data;
  });
} else {
  console.log('⏭️  Test 3: OpenRouter - SKIPPED (no valid API key)\n');
  results.push({ name: 'Test 3: OpenRouter Basic Generation', status: 'skip', duration: 0 });
}

// Test 4: Complex nested schema
await runTest('Test 4: Complex Nested Schema', async () => {
  console.log('   Provider: gemini');
  console.log('   Testing: Nested objects and arrays\n');

  const generator = new AgenticSynth({
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp',
    apiKey: apiKeys.gemini,
  });

  const schema = {
    user: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        profile: {
          type: 'object',
          properties: {
            bio: { type: 'string', description: 'Short bio' },
            interests: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of 3 hobbies',
            },
          },
        },
      },
    },
  };

  console.log('   Generating 1 complex record...');
  const result = await generator.generate('structured', { schema, count: 1 });
  const data = result.data;
  const record = data[0];
  if (!record?.user?.profile?.interests) {
    throw new Error('Nested structure not properly generated');
  }

  if (!Array.isArray(record.user.profile.interests)) {
    throw new Error('Interests array not generated');
  }

  console.log('   Generated:', JSON.stringify(record, null, 2));
  return data;
});

// Generate Final Report
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║                Validation Summary                          ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const passed = results.filter(r => r.status === 'pass').length;
const failed = results.filter(r => r.status === 'fail').length;
const skipped = results.filter(r => r.status === 'skip').length;
const total = results.length;

console.log(`✅ Passed:  ${passed}/${total - skipped}`);
console.log(`❌ Failed:  ${failed}/${total - skipped}`);
console.log(`⏭️  Skipped: ${skipped}/${total}`);
console.log(`📊 Success Rate: ${total - skipped > 0 ? ((passed / (total - skipped)) * 100).toFixed(1) : 0}%\n`);

if (failed > 0) {
  console.log('Failed Tests:');
  results
    .filter(r => r.status === 'fail')
    .forEach(r => {
      console.log(`   ❌ ${r.name}`);
      console.log(`      ${r.error}`);
    });
  console.log('');
}

console.log('📋 All Results:');
results.forEach((r, i) => {
  const icon = r.status === 'pass' ? '✅' : r.status === 'skip' ? '⏭️ ' : '❌';
  const duration = r.status !== 'skip' ? ` (${r.duration}ms)` : '';
  console.log(`   ${icon} Test ${i + 1}: ${r.name}${duration}`);
});

console.log('\n✨ Validation Complete!\n');

process.exit(failed > 0 ? 1 : 0);
