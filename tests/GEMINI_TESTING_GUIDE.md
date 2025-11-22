# Gemini Models Testing Guide

## Overview

This guide explains how to test the latest Gemini models (November 2025) with the `@ruvector/agentic-synth` package.

## Latest Gemini Models (November 2025)

### Available Models

1. **gemini-3-pro** - Best multimodal understanding
   - Use case: Complex data structures, high accuracy requirements
   - Characteristics: Superior reasoning, best quality scores

2. **gemini-2.5-pro** - Advanced reasoning
   - Use case: Complex schemas, analytical tasks
   - Characteristics: Strong reasoning capabilities, reliable performance

3. **gemini-2.5-flash** - Best price-performance
   - Use case: Production workloads, balanced needs
   - Characteristics: Optimal balance of speed, quality, and cost

4. **gemini-2.5-flash-lite** - Fastest, cost-efficient
   - Use case: Development, testing, high-volume generation
   - Characteristics: Maximum speed, lowest cost, good quality

## Prerequisites

### 1. Set up Gemini API Key

```bash
# Option 1: GEMINI_API_KEY
export GEMINI_API_KEY="your-api-key-here"

# Option 2: GOOGLE_GEMINI_API_KEY
export GOOGLE_GEMINI_API_KEY="your-api-key-here"

# Permanent setup (add to ~/.bashrc or ~/.zshrc)
echo 'export GEMINI_API_KEY="your-api-key-here"' >> ~/.bashrc
```

### 2. Install Dependencies

```bash
cd /workspaces/ruvector
npm install
npm run build:all
```

### 3. Link Local Packages (if needed)

```bash
cd /workspaces/ruvector/packages/agentic-synth
npm link

cd /workspaces/ruvector
npm link @ruvector/agentic-synth
```

## Running the Tests

### Basic Usage

```bash
# Run all tests
node tests/gemini-latest-models-test.mjs

# With explicit API key
GEMINI_API_KEY="your-key" node tests/gemini-latest-models-test.mjs
```

### What Gets Tested

#### 1. Simple Schema Performance
- Tests with counts: 1, 10, 50 records
- Measures: Response time, records/second, quality score
- Schema: Basic user data (id, name, email, age, active status)

#### 2. Complex Nested Schema
- Tests with counts: 1, 10 records
- Measures: Response time, quality, diversity
- Schema: Full user profile with nested objects (profile, preferences, metadata, subscription)

#### 3. Quality Metrics
- **Validation**: Zod schema compliance
- **Diversity**: Uniqueness of generated records
- **Quality Score**: Percentage of valid records
- **Success Rate**: Test completion rate

#### 4. Performance Metrics
- **Response Time**: Average, min, max, p95
- **Throughput**: Records per second
- **Consistency**: Variation across runs

## Test Output

### Console Output

```
🚀 Starting Gemini Models Comprehensive Test Suite
================================================================================
🧪 Testing: Gemini 2.5 Flash (gemini-2.5-flash)
================================================================================

📊 Test 1: Simple Schema Performance
────────────────────────────────────────────────────────────────────────────────
  Testing count=1...
    ✓ Generated 1 records in 850ms
    ⚡ Rate: 1.18 records/sec
    ✨ Quality: 100.0%

  Testing count=10...
    ✓ Generated 10 records in 1.52s
    ⚡ Rate: 6.58 records/sec
    ✨ Quality: 100.0%

📈 Overall Performance:
  ⏱️  Average Response Time: 1.21s
  ✨ Average Quality Score: 100.0%
  ✅ Success Rate: 100.0%
```

### Generated Files

1. **Test Results JSON**: `/workspaces/ruvector/tests/gemini-model-test-results.json`
   - Detailed results for all models
   - Performance metrics
   - Quality scores
   - Error logs (if any)

2. **Hooks Memory**: Stored in Claude Flow memory
   - Key: `swarm/tester/gemini-results`
   - Accessible via hooks for coordination

## Interpreting Results

### Comparison Report

The test generates a comprehensive comparison:

```
📊 COMPREHENSIVE COMPARISON REPORT
════════════════════════════════════════════════════════════════════════════════

🏆 Performance Summary:
Model                    | Avg Time  | Quality | Success | Rate (rec/s)
────────────────────────────────────────────────────────────────────────────────
Gemini 3 Pro             | 2.15s     | 98.5%   | 100.0%  | 4.65
Gemini 2.5 Pro           | 1.85s     | 97.2%   | 100.0%  | 5.41
Gemini 2.5 Flash         | 1.21s     | 96.8%   | 100.0%  | 8.26
Gemini 2.5 Flash Lite    | 0.89s     | 95.1%   | 100.0%  | 11.24

💡 RECOMMENDATIONS:

⚡ Fastest Model: Gemini 2.5 Flash Lite
   Average response: 0.89s
   Use for: High-throughput batch processing

✨ Highest Quality: Gemini 3 Pro
   Quality score: 98.5%
   Use for: Complex schemas requiring precision

🎯 Best Overall (Recommended Default): Gemini 2.5 Flash
   Quality: 96.8%, Speed: 1.21s
   Use for: General-purpose synthetic data generation

💰 Most Cost-Efficient: Gemini 2.5 Flash Lite
   Quality: 95.1%, Speed: 0.89s
   Use for: Development, testing, cost-sensitive applications
```

## Customizing Tests

### Modify Test Counts

Edit the `TEST_COUNTS` array in the script:

```javascript
const TEST_COUNTS = [1, 10, 50, 100]; // Add more counts
```

### Add Custom Schemas

Add your own schemas for testing:

```javascript
const CustomSchema = z.object({
  // Your schema definition
});

// Add to test suite
const customResults = await synth.generateStructured(CustomSchema, {
  count: 10,
  temperature: 0.7
});
```

### Adjust Temperature

Change the temperature for more/less randomness:

```javascript
const synth = new AgenticSynth({
  provider: 'gemini',
  model: modelId,
  apiKey,
  temperature: 0.9 // Higher = more creative, Lower = more deterministic
});
```

## Integration with agentic-synth

### Using Test Results in Your Code

```typescript
import { AgenticSynth } from '@ruvector/agentic-synth';

// Based on test results, gemini-2.5-flash is recommended
const synth = new AgenticSynth({
  provider: 'gemini',
  model: 'gemini-2.5-flash', // Best overall
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.7
});

// For development/testing (faster, cheaper)
const devSynth = new AgenticSynth({
  provider: 'gemini',
  model: 'gemini-2.5-flash-lite',
  apiKey: process.env.GEMINI_API_KEY
});

// For production (highest quality)
const prodSynth = new AgenticSynth({
  provider: 'gemini',
  model: 'gemini-3-pro',
  apiKey: process.env.GEMINI_API_KEY
});
```

## Troubleshooting

### API Key Issues

```bash
# Verify API key is set
echo $GEMINI_API_KEY

# Test with explicit key
GEMINI_API_KEY="your-key" node tests/gemini-latest-models-test.mjs
```

### Rate Limits

If you hit rate limits:
- Tests automatically add 2-second delays between models
- Reduce `TEST_COUNTS` for fewer API calls
- Use a higher-tier API key with more quota

### Module Not Found

```bash
# Reinstall dependencies
npm install
npm run build:all

# Re-link packages
cd packages/agentic-synth && npm link
cd /workspaces/ruvector && npm link @ruvector/agentic-synth
```

## Best Practices

1. **Choose the Right Model**:
   - Development: `gemini-2.5-flash-lite`
   - Production: `gemini-2.5-flash` or `gemini-3-pro`
   - Complex schemas: `gemini-3-pro`
   - High volume: `gemini-2.5-flash-lite`

2. **Monitor Costs**:
   - Flash Lite: ~10x cheaper than Pro
   - Flash: ~5x cheaper than Pro
   - Balance quality vs. cost based on use case

3. **Quality Assurance**:
   - Always validate generated data with Zod schemas
   - Check diversity scores (should be >80%)
   - Monitor quality scores (aim for >95%)

4. **Performance Optimization**:
   - Use batch generation (count > 1) for better efficiency
   - Consider caching for repeated patterns
   - Use appropriate temperature for your use case

## Hooks Integration

The test automatically integrates with Claude Flow hooks:

```bash
# Pre-task hook
npx claude-flow@alpha hooks pre-task --description "Gemini model testing"

# Post-task hook (stores results)
npx claude-flow@alpha hooks post-task --task-id "gemini-model-testing"

# Notification hook
npx claude-flow@alpha hooks notify --message "Testing completed"
```

Results are stored in:
- Memory key: `swarm/tester/gemini-results`
- File: `/workspaces/ruvector/tests/gemini-model-test-results.json`

## Next Steps

1. Run the tests with your API key
2. Review the comparison report
3. Choose the best model for your use case
4. Update your agentic-synth configuration
5. Monitor performance in production
6. Re-run tests periodically as models improve

## Support

- agentic-synth docs: Check package README
- Gemini API docs: https://ai.google.dev/docs
- Issues: https://github.com/ruvnet/ruvector/issues
