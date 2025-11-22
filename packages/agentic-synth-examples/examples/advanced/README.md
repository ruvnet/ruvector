# Advanced Examples

This directory contains advanced usage examples demonstrating sophisticated features of `@ruvector/agentic-synth`.

## Streaming Optimization Engine

**File:** `streaming-optimization.ts`

A comprehensive multi-model benchmarking and optimization system with adaptive learning capabilities.

### Features

- **Multi-Model Parallel Benchmarking**: Test Gemini, Claude, and Kimi models simultaneously
- **Adaptive Learning**: Dynamic weight adjustment based on performance using reinforcement learning
- **Real-Time Streaming**: Live progress updates with color-coded metrics
- **Quality Assessment**: 4-metric algorithm (completeness, data types, consistency, realism)
- **Automated Model Selection**: Intelligent optimal model recommendation
- **Performance Optimization**: Identify best model for your specific use case

### Installation

```bash
npm install @ruvector/agentic-synth @ruvector/agentic-synth-examples
```

### Quick Start

```typescript
import { StreamingOptimization } from '@ruvector/agentic-synth-examples';

const optimizer = new StreamingOptimization();

// Define your data schema
const schema = {
  timestamp: { type: 'string', description: 'ISO 8601 timestamp' },
  symbol: { type: 'string', description: 'Stock ticker (AAPL, GOOGL, etc.)' },
  open: { type: 'number', description: 'Opening price in USD' },
  high: { type: 'number', description: 'Highest price in USD' },
  low: { type: 'number', description: 'Lowest price in USD' },
  close: { type: 'number', description: 'Closing price in USD' },
  volume: { type: 'number', description: 'Trading volume' },
  sentiment: { type: 'string', description: 'Market sentiment: bullish, bearish, neutral' }
};

// Run optimization
const results = await optimizer.run({
  schema,
  iterations: 5,
  apiKeys: {
    gemini: process.env.GEMINI_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY
  }
});

console.log(`Best model: ${results.optimalModel}`);
```

### Custom Model Configuration

```typescript
import { StreamingOptimization, ModelConfig } from '@ruvector/agentic-synth-examples';

const customModels: ModelConfig[] = [
  {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    name: 'Gemini Flash',
    weight: 1.0,
    apiKey: process.env.GEMINI_API_KEY
  },
  {
    provider: 'openrouter',
    model: 'anthropic/claude-sonnet-4.5',
    name: 'Claude Sonnet 4.5',
    weight: 0.8,
    apiKey: process.env.OPENROUTER_API_KEY
  }
];

const optimizer = new StreamingOptimization(customModels);
const results = await optimizer.run({ schema, iterations: 3 });
```

### Output

The optimization engine provides:

```typescript
interface OptimizationResult {
  // Performance data for each iteration
  iterations: BenchmarkResult[][];

  // Historical performance by model
  modelPerformance: Record<string, PerformanceHistory[]>;

  // Recommended optimal model
  optimalModel: string | null;

  // Overall improvement rate
  improvementRate: number;
}
```

### Quality Metrics

Each benchmark includes comprehensive quality assessment:

```typescript
interface QualityMetrics {
  overall: number;      // Weighted overall score (0-1)
  completeness: number; // All schema fields present (0-1)
  dataTypes: number;    // Type correctness (0-1)
  consistency: number;  // Value consistency (0-1)
  realism: number;      // Data realism (0-1)
}
```

### Performance Characteristics

Based on comprehensive testing (November 2025):

| Model | Avg Speed | Avg Quality | Best For |
|-------|-----------|-------------|----------|
| **Gemini 2.5 Flash** | 2.2-3.5s | 85-90% | Production workloads, cost optimization |
| **Claude Sonnet 4.5** | 5.5-6.3s | 92-95% | Quality-critical tasks, complex schemas |
| **Kimi K2** | 5.8s | 88-92% | Balanced performance and quality |

### Use Cases

1. **Model Selection**: Find the best model for your specific data schema
2. **Cost Optimization**: Balance quality vs speed vs cost
3. **Quality Benchmarking**: Compare model performance objectively
4. **Adaptive Systems**: Build systems that learn and improve over time
5. **Performance Analysis**: Identify bottlenecks in data generation

### Advanced Features

#### Adaptive Weight Adjustment

The optimizer uses reinforcement learning to adjust model weights:

```typescript
// Models start with equal weights
// After each iteration, weights adjust based on performance
// Better performing models get higher weights
// Learning rate decays over time (0.95 decay factor)
```

#### Streaming Updates

Real-time progress bars and metrics:

```
Iteration 3/5 [████████████████████████████████████] 100%

✓ Gemini Flash
  Time: 2.84s | Speed: 1.06 rec/s | Quality: 87.3%

✓ Claude Sonnet 4.5
  Time: 5.92s | Speed: 0.51 rec/s | Quality: 94.1%

🏆 Best this iteration: Claude Sonnet 4.5
```

#### Quality Assessment Algorithm

Multi-metric evaluation:

- **Completeness (30%)**: All schema fields present
- **Data Types (30%)**: Correct type matching
- **Consistency (20%)**: Value range reasonableness
- **Realism (20%)**: Real-world data validity

### Environment Variables

```bash
# Required for Gemini models
GEMINI_API_KEY=your_gemini_api_key_here
# or
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here

# Required for OpenRouter models (Claude, Kimi, etc.)
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### Example Output

```
╔══════════════════════════════════════════════════════╗
║  📊 OPTIMIZATION COMPLETE - FINAL ANALYSIS          ║
╚══════════════════════════════════════════════════════╝

🎯 Optimal Model: Gemini Flash

📈 Model Performance Summary:

★ Gemini Flash
  Quality:  87.5%
  Speed:    1.12 rec/s

  Claude Sonnet 4.5
  Quality:  94.2%
  Speed:    0.48 rec/s

  Kimi K2
  Quality:  89.1%
  Speed:    0.95 rec/s

💡 Recommendations:
  1. Use Gemini Flash for production workloads
  2. Quality-focused tasks: Use highest quality model
  3. Speed-focused tasks: Use fastest model
  4. Cost-optimized: Use Gemini Flash for best value
```

### Error Handling

```typescript
try {
  const results = await optimizer.run({ schema, iterations: 5 });
} catch (error) {
  if (error.message.includes('No generators initialized')) {
    console.error('Check your API keys');
  }
  throw error;
}
```

### Tips

1. **Start Small**: Begin with 3 iterations to test
2. **Monitor Costs**: Each iteration makes API calls to all models
3. **API Keys**: Ensure valid API keys for all providers you want to test
4. **Schema Design**: Well-defined schemas produce better results
5. **Iterations**: More iterations = better learning but higher cost

### Related Examples

- **Self-Learning Generator**: `src/self-learning/`
- **DSPy Training**: `src/dspy/`
- **Stock Market Simulation**: `src/stock-market/`

### License

MIT
