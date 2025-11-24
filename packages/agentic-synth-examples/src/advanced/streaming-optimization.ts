/**
 * Advanced Streaming Optimization Example
 *
 * This example demonstrates:
 * - Multi-model parallel benchmarking
 * - Adaptive learning with weight adjustment
 * - Real-time streaming updates
 * - Quality assessment algorithms
 * - Performance optimization
 * - Automated model selection
 *
 * Use cases:
 * - Finding the best model for your use case
 * - Optimizing data generation pipelines
 * - Benchmarking AI model performance
 * - Cost-performance analysis
 *
 * @example
 * ```typescript
 * import { StreamingOptimization } from '@ruvector/agentic-synth-examples/advanced';
 *
 * const optimizer = new StreamingOptimization();
 * const results = await optimizer.run({
 *   iterations: 5,
 *   schema: mySchema,
 *   models: ['gemini', 'claude', 'kimi']
 * });
 *
 * console.log(`Best model: ${results.optimalModel}`);
 * ```
 */

import { AgenticSynth } from '@ruvector/agentic-synth';

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  red: '\x1b[31m'
} as const;

/**
 * Model configuration interface for streaming optimization
 */
export interface StreamingModelConfig {
  provider: 'gemini' | 'openrouter';
  model: string;
  name: string;
  weight: number;
  apiKey?: string;
}

/**
 * Benchmark result interface for streaming optimization
 */
export interface StreamingBenchmarkResult {
  success: boolean;
  model: string;
  duration: number;
  speed: number;
  quality: StreamingQualityMetrics;
  recordsGenerated: number;
  data?: any[];
  error?: string;
}

/**
 * Quality metrics interface for streaming optimization
 */
export interface StreamingQualityMetrics {
  overall: number;
  completeness: number;
  dataTypes: number;
  consistency: number;
  realism: number;
}

/**
 * Optimization result interface
 */
export interface StreamingOptimizationResult {
  iterations: StreamingBenchmarkResult[][];
  modelPerformance: Record<string, StreamingPerformanceHistory[]>;
  optimalModel: string | null;
  improvementRate: number;
}

/**
 * Performance history interface for streaming optimization
 */
export interface StreamingPerformanceHistory {
  iteration: number;
  quality: number;
  speed: number;
  duration: number;
}

/**
 * Advanced Streaming Optimization Engine
 *
 * This class provides multi-model benchmarking, adaptive learning,
 * and automated model selection for optimal performance.
 */
export class StreamingOptimization {
  private models: StreamingModelConfig[];
  private performanceHistory: any[] = [];
  private optimizedPrompts: Map<string, any> = new Map();
  private learningRate: number = 0.1;
  private bestModel: string | null = null;

  /**
   * Create a new streaming optimization engine
   *
   * @param customModels - Optional custom model configurations
   */
  constructor(customModels?: StreamingModelConfig[]) {
    this.models = customModels || [
      {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        name: 'Gemini Flash',
        weight: 1.0
      },
      {
        provider: 'openrouter',
        model: 'anthropic/claude-sonnet-4.5',
        name: 'Claude Sonnet',
        weight: 0.8
      },
      {
        provider: 'openrouter',
        model: 'moonshot/moonshot-v1-32k',
        name: 'Kimi K2',
        weight: 0.7
      }
    ];
  }

  /**
   * Display a banner in the console
   */
  private banner(text: string): void {
    const border = '═'.repeat(text.length + 4);
    console.log(`${colors.bright}${colors.magenta}\n╔${border}╗`);
    console.log(`║  ${text}  ║`);
    console.log(`╚${border}╝${colors.reset}\n`);
  }

  /**
   * Create a progress bar
   */
  private progressBar(
    current: number,
    total: number,
    label: string = '',
    metrics: Record<string, any> = {}
  ): string {
    const width = 40;
    const percentage = (current / total) * 100;
    const filled = Math.floor((current / total) * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const percent = percentage.toFixed(1).padStart(5);

    let metricsStr = '';
    if (Object.keys(metrics).length > 0) {
      metricsStr = ` ${colors.dim}| ${Object.entries(metrics)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | ')}${colors.reset}`;
    }

    return `${colors.cyan}${label}${colors.reset} [${colors.green}${bar}${colors.reset}] ${percent}%${metricsStr}`;
  }

  /**
   * Initialize AI generators for all configured models
   */
  async initializeGenerators(apiKeys: Record<string, string>): Promise<Record<string, AgenticSynth>> {
    console.log(`${colors.yellow}⚡ Initializing Multi-Model Generators...${colors.reset}`);

    const generators: Record<string, AgenticSynth> = {};

    for (const modelConfig of this.models) {
      const apiKey = modelConfig.apiKey || apiKeys[modelConfig.provider];

      if (!apiKey) {
        console.log(`${colors.yellow}⚠️  Skipping ${modelConfig.name} - No API key${colors.reset}`);
        continue;
      }

      try {
        generators[modelConfig.name] = new AgenticSynth({
          provider: modelConfig.provider,
          model: modelConfig.model,
          apiKey
        });
        console.log(`${colors.green}✓ ${modelConfig.name} initialized${colors.reset}`);
      } catch (error: any) {
        console.log(`${colors.red}✗ ${modelConfig.name} failed: ${error.message}${colors.reset}`);
      }
    }

    return generators;
  }

  /**
   * Benchmark a single model
   */
  async benchmarkModel(
    generator: AgenticSynth,
    modelName: string,
    schema: Record<string, any>,
    count: number = 3
  ): Promise<StreamingBenchmarkResult> {
    const startTime = Date.now();

    try {
      const result = await generator.generate('structured', {
        schema,
        count
      });

      const duration = (Date.now() - startTime) / 1000;
      const data = (result as any).data || result;

      // Calculate quality metrics
      const quality = this.assessQuality(data, schema);
      const speed = count / duration;

      return {
        success: true,
        model: modelName,
        duration,
        speed,
        quality,
        recordsGenerated: data.length,
        data
      };
    } catch (error: any) {
      return {
        success: false,
        model: modelName,
        error: error.message,
        duration: (Date.now() - startTime) / 1000,
        speed: 0,
        quality: {
          overall: 0,
          completeness: 0,
          dataTypes: 0,
          consistency: 0,
          realism: 0
        },
        recordsGenerated: 0
      };
    }
  }

  /**
   * Assess the quality of generated data
   */
  private assessQuality(data: any[], schema: Record<string, any>): StreamingQualityMetrics {
    const checks = {
      completeness: 0,
      dataTypes: 0,
      consistency: 0,
      realism: 0
    };

    const schemaKeys = Object.keys(schema);

    // Check completeness (all fields present)
    data.forEach(record => {
      const recordKeys = Object.keys(record);
      const hasAllFields = schemaKeys.every(key => recordKeys.includes(key));
      checks.completeness += hasAllFields ? 1 : 0;
    });
    checks.completeness /= data.length;

    // Check data types match
    data.forEach(record => {
      let typeMatches = 0;
      schemaKeys.forEach(key => {
        const expectedType = schema[key].type;
        const actualType = typeof record[key];
        if (
          (expectedType === 'number' && actualType === 'number') ||
          (expectedType === 'string' && actualType === 'string') ||
          (expectedType === 'boolean' && actualType === 'boolean')
        ) {
          typeMatches++;
        }
      });
      checks.dataTypes += typeMatches / schemaKeys.length;
    });
    checks.dataTypes /= data.length;

    // Consistency and realism (simplified for this example)
    checks.consistency = 0.85;
    checks.realism = 0.90;

    const overall = (
      checks.completeness * 0.3 +
      checks.dataTypes * 0.3 +
      checks.consistency * 0.2 +
      checks.realism * 0.2
    );

    return {
      overall,
      ...checks
    };
  }

  /**
   * Update model weights based on performance (reinforcement learning)
   */
  private updateModelWeights(bestModel: string, allResults: StreamingBenchmarkResult[]): void {
    const bestScore = allResults.find(r => r.model === bestModel)?.quality.overall || 0;

    for (const modelConfig of this.models) {
      const result = allResults.find(r => r.model === modelConfig.name);
      if (!result) continue;

      const performanceRatio = result.quality.overall / bestScore;
      const adjustment = (performanceRatio - 1) * this.learningRate;
      modelConfig.weight = Math.max(0.1, Math.min(1.0, modelConfig.weight + adjustment));
    }

    // Decay learning rate over time
    this.learningRate *= 0.95;
  }

  /**
   * Run optimization with adaptive learning
   */
  async optimizeWithLearning(
    generators: Record<string, AgenticSynth>,
    schema: Record<string, any>,
    iterations: number = 5
  ): Promise<StreamingOptimizationResult> {
    this.banner('🧠 ADAPTIVE LEARNING OPTIMIZATION');

    const results: StreamingOptimizationResult = {
      iterations: [],
      modelPerformance: {},
      optimalModel: null,
      improvementRate: 0
    };

    for (let i = 1; i <= iterations; i++) {
      console.log(`\n${this.progressBar(i - 1, iterations, `Iteration ${i}/${iterations}`)}`);
      console.log(`${colors.yellow}🔬 Testing all models in parallel...${colors.reset}\n`);

      // Test all models in parallel
      const modelTests = Object.entries(generators).map(([name, gen]) =>
        this.benchmarkModel(gen, name, schema)
      );

      const benchmarks = await Promise.all(modelTests);

      // Process and display results
      const iterationResults: StreamingBenchmarkResult[] = [];

      for (const benchmark of benchmarks) {
        if (!benchmark.success) {
          console.log(`${colors.red}✗ ${benchmark.model}: Failed - ${benchmark.error}${colors.reset}`);
          continue;
        }

        iterationResults.push(benchmark);

        console.log(`${colors.green}✓ ${benchmark.model}${colors.reset}`);
        console.log(`  Time: ${colors.cyan}${benchmark.duration.toFixed(2)}s${colors.reset} | ` +
                    `Speed: ${colors.cyan}${benchmark.speed.toFixed(2)} rec/s${colors.reset} | ` +
                    `Quality: ${colors.cyan}${(benchmark.quality.overall * 100).toFixed(1)}%${colors.reset}`);

        // Track performance
        if (!results.modelPerformance[benchmark.model]) {
          results.modelPerformance[benchmark.model] = [];
        }
        results.modelPerformance[benchmark.model].push({
          iteration: i,
          quality: benchmark.quality.overall,
          speed: benchmark.speed,
          duration: benchmark.duration
        });
      }

      // Find best model this iteration
      const successfulResults = iterationResults.filter(r => r.success);
      if (successfulResults.length > 0) {
        const bestThisIteration = successfulResults.reduce((best, current) =>
          current.quality.overall > best.quality.overall ? current : best
        );

        console.log(`\n${colors.bright}${colors.green}🏆 Best this iteration: ${bestThisIteration.model}${colors.reset}\n`);

        // Update weights
        this.updateModelWeights(bestThisIteration.model, successfulResults);
      }

      results.iterations.push(iterationResults);

      // Small delay for streaming effect
      if (i < iterations) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    // Determine optimal model
    const modelScores: Record<string, number> = {};
    for (const [model, history] of Object.entries(results.modelPerformance)) {
      const avgQuality = history.reduce((sum, r) => sum + r.quality, 0) / history.length;
      const avgSpeed = history.reduce((sum, r) => sum + r.speed, 0) / history.length;
      modelScores[model] = avgQuality * 0.7 + (avgSpeed / 10) * 0.3;
    }

    let optimalModel: string | null = null;
    let bestScore = 0;

    for (const [model, score] of Object.entries(modelScores)) {
      if (score > bestScore) {
        bestScore = score;
        optimalModel = model;
      }
    }

    results.optimalModel = optimalModel;
    this.bestModel = optimalModel;

    return results;
  }

  /**
   * Run the complete optimization pipeline
   */
  async run(options: {
    schema: Record<string, any>;
    iterations?: number;
    apiKeys?: Record<string, string>;
  }): Promise<StreamingOptimizationResult> {
    this.banner('🚀 ADVANCED STREAMING OPTIMIZATION ENGINE');

    const apiKeys = options.apiKeys || {
      gemini: process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || '',
      openrouter: process.env.OPENROUTER_API_KEY || ''
    };

    const generators = await this.initializeGenerators(apiKeys);

    if (Object.keys(generators).length === 0) {
      throw new Error('No generators initialized. Check API keys.');
    }

    const results = await this.optimizeWithLearning(
      generators,
      options.schema,
      options.iterations || 5
    );

    this.displayFinalAnalysis(results);

    return results;
  }

  /**
   * Display final analysis
   */
  private displayFinalAnalysis(results: StreamingOptimizationResult): void {
    this.banner('📊 OPTIMIZATION COMPLETE - FINAL ANALYSIS');

    console.log(`${colors.cyan}🎯 Optimal Model:${colors.reset} ${colors.bright}${colors.green}${results.optimalModel}${colors.reset}\n`);
    console.log(`${colors.cyan}📈 Model Performance Summary:${colors.reset}\n`);

    for (const [model, history] of Object.entries(results.modelPerformance)) {
      const avgQuality = history.reduce((sum, r) => sum + r.quality, 0) / history.length;
      const avgSpeed = history.reduce((sum, r) => sum + r.speed, 0) / history.length;

      const isOptimal = model === results.optimalModel;
      const prefix = isOptimal ? `${colors.green}★` : ` `;

      console.log(`${prefix} ${colors.bright}${model}${colors.reset}`);
      console.log(`  Quality:  ${colors.cyan}${(avgQuality * 100).toFixed(1)}%${colors.reset}`);
      console.log(`  Speed:    ${colors.cyan}${avgSpeed.toFixed(2)} rec/s${colors.reset}\n`);
    }

    console.log(`${colors.cyan}💡 Recommendations:${colors.reset}`);
    console.log(`  1. Use ${colors.bright}${results.optimalModel}${colors.reset} for production workloads`);
    console.log(`  2. Quality-focused tasks: Use highest quality model`);
    console.log(`  3. Speed-focused tasks: Use fastest model`);
    console.log(`  4. Cost-optimized: Use Gemini Flash for best value\n`);
  }
}

/**
 * Example usage
 */
export async function runStreamingOptimizationExample() {
  const optimizer = new StreamingOptimization();

  // Stock market data schema
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

  const results = await optimizer.run({
    schema,
    iterations: 5
  });

  console.log(`\n✨ Optimal model for your use case: ${results.optimalModel}`);

  return results;
}
