# OpenRouter Models Testing Suite

Comprehensive testing suite for evaluating latest LLM models (November 2025) with the agentic-synth package.

## Models Tested

### OpenRouter Models
1. **anthropic/claude-sonnet-4-5** - Latest Claude (if available)
2. **anthropic/claude-3.5-sonnet** - Current production Claude
3. **openai/gpt-4-turbo** - Latest GPT-4
4. **google/gemini-pro** - Gemini via OpenRouter

### Direct API Comparison
- **google/gemini-pro-direct** - Gemini Direct API

## Test Cases

### 1. Simple Structured Output
- Basic user profile generation
- Tests schema compliance and data types
- Minimal complexity

### 2. Complex Nested Structure
- Project planning with tasks and dependencies
- Tests array handling and nested objects
- Medium complexity

### 3. Analytical Reasoning
- System architecture analysis
- Tests reasoning capabilities and structured recommendations
- High complexity

## Metrics Evaluated

### Performance Metrics
- **Response Time**: Latency from request to completion
- **Success Rate**: Percentage of successful completions
- **Quality Score**: 0-100 based on:
  - Schema compliance (40%)
  - Response completeness (30%)
  - Response time (15%)
  - Error-free execution (15%)

### Cost Metrics
- **Total Cost**: Cumulative cost across all tests
- **Cost Efficiency**: Quality score per dollar
- **Per-token Pricing**: Input and output token costs

### Quality Metrics
- **Schema Validation**: All required fields present and typed correctly
- **Data Completeness**: All expected properties populated
- **Error Handling**: Graceful failure and recovery

## Usage

### Prerequisites
```bash
# Set required environment variables
export OPENROUTER_API_KEY="your-openrouter-key"
export GEMINI_API_KEY="your-gemini-key"  # Optional for direct API comparison
```

### Run Tests
```bash
# Run from tests directory
cd /workspaces/ruvector/tests
node openrouter-models-test.mjs

# Or run from project root
node tests/openrouter-models-test.mjs
```

### With Hooks Integration
```bash
# Pre-test hook
npx claude-flow@alpha hooks pre-task --description "OpenRouter model testing"

# Run tests
node tests/openrouter-models-test.mjs

# Post-test hook
npx claude-flow@alpha hooks post-task --task-id "openrouter-testing"
```

## Output

### Console Output
- Real-time test progress
- Model-by-model results
- Comprehensive rankings:
  - Quality rankings
  - Cost efficiency rankings
  - Speed rankings
- Recommendations by use case
- OpenRouter vs Direct API comparison

### JSON Results
Results are automatically saved to:
```
/workspaces/ruvector/tests/openrouter-test-results-{timestamp}.json
```

Contains:
- Individual test results
- Aggregate statistics
- Analysis and rankings
- Summary metrics

## Interpreting Results

### Quality Score Components
```
Quality Score (0-100):
├─ Schema Compliance (40 pts)
│  ├─ All required fields present
│  └─ Correct data types
├─ Response Completeness (30 pts)
│  └─ All properties populated
├─ Response Time (15 pts)
│  ├─ < 2s: 15 pts
│  ├─ < 5s: 10 pts
│  └─ < 10s: 5 pts
└─ Error-free (15 pts)
```

### Cost Efficiency
```
Efficiency = Quality Score / (Cost × 1000)
Higher is better
Represents quality points per milli-dollar
```

## Recommendations Use Cases

### Best Quality
Use the highest-ranked quality model for:
- Critical business decisions
- Complex analytical tasks
- High-stakes content generation

### Best Cost Efficiency
Use the highest cost-efficiency model for:
- High-volume production workloads
- Batch processing
- Cost-sensitive applications

### Best Speed
Use the fastest model for:
- Real-time applications
- Low-latency requirements
- Interactive experiences

## OpenRouter vs Direct API

The test suite compares Gemini via OpenRouter against direct Gemini API access:

**Consider OpenRouter when:**
- Need unified API across multiple models
- Want simplified model switching
- Prefer single billing/API key management

**Consider Direct API when:**
- Cost is primary concern (often cheaper)
- Need cutting-edge model features
- Require specific provider capabilities

## Error Handling Tests

The suite includes error handling validation:
- Invalid schema detection
- Missing API key handling
- Invalid model name handling
- Network timeout recovery

## Integration with Agentic-Synth

All tests use the `@ruvector/agentic-synth` package:

```javascript
import { createAgenticSynth } from '@ruvector/agentic-synth';

const synth = createAgenticSynth({
  provider: 'openrouter',
  model: 'anthropic/claude-3.5-sonnet',
  apiKey: process.env.OPENROUTER_API_KEY,
  temperature: 0.7,
  schema: yourSchema
});

const result = await synth.generateStructured(prompt);
```

## Continuous Testing

Schedule regular tests to:
- Monitor model performance over time
- Track cost changes
- Validate new model releases
- Ensure quality consistency

## Contributing

To add new models or test cases:

1. Add model to `MODELS` array
2. Add test case to `TEST_PROMPTS` object
3. Update pricing in `testModelWithPrompt()`
4. Run tests and validate results

## Support

- Package: `@ruvector/agentic-synth`
- Issues: https://github.com/ruvnet/ruvector/issues
- Documentation: See package README
