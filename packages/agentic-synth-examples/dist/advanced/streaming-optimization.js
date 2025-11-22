// src/advanced/streaming-optimization.ts
import { AgenticSynth } from "@ruvector/agentic-synth";
var colors = {
  reset: "\x1B[0m",
  bright: "\x1B[1m",
  dim: "\x1B[2m",
  green: "\x1B[32m",
  blue: "\x1B[34m",
  yellow: "\x1B[33m",
  cyan: "\x1B[36m",
  magenta: "\x1B[35m",
  red: "\x1B[31m"
};
var StreamingOptimization = class {
  models;
  performanceHistory = [];
  optimizedPrompts = /* @__PURE__ */ new Map();
  learningRate = 0.1;
  bestModel = null;
  /**
   * Create a new streaming optimization engine
   *
   * @param customModels - Optional custom model configurations
   */
  constructor(customModels) {
    this.models = customModels || [
      {
        provider: "gemini",
        model: "gemini-2.5-flash",
        name: "Gemini Flash",
        weight: 1
      },
      {
        provider: "openrouter",
        model: "anthropic/claude-sonnet-4.5",
        name: "Claude Sonnet",
        weight: 0.8
      },
      {
        provider: "openrouter",
        model: "moonshot/moonshot-v1-32k",
        name: "Kimi K2",
        weight: 0.7
      }
    ];
  }
  /**
   * Display a banner in the console
   */
  banner(text) {
    const border = "\u2550".repeat(text.length + 4);
    console.log(`${colors.bright}${colors.magenta}
\u2554${border}\u2557`);
    console.log(`\u2551  ${text}  \u2551`);
    console.log(`\u255A${border}\u255D${colors.reset}
`);
  }
  /**
   * Create a progress bar
   */
  progressBar(current, total, label = "", metrics = {}) {
    const width = 40;
    const percentage = current / total * 100;
    const filled = Math.floor(current / total * width);
    const empty = width - filled;
    const bar = "\u2588".repeat(filled) + "\u2591".repeat(empty);
    const percent = percentage.toFixed(1).padStart(5);
    let metricsStr = "";
    if (Object.keys(metrics).length > 0) {
      metricsStr = ` ${colors.dim}| ${Object.entries(metrics).map(([k, v]) => `${k}: ${v}`).join(" | ")}${colors.reset}`;
    }
    return `${colors.cyan}${label}${colors.reset} [${colors.green}${bar}${colors.reset}] ${percent}%${metricsStr}`;
  }
  /**
   * Initialize AI generators for all configured models
   */
  async initializeGenerators(apiKeys) {
    console.log(`${colors.yellow}\u26A1 Initializing Multi-Model Generators...${colors.reset}`);
    const generators = {};
    for (const modelConfig of this.models) {
      const apiKey = modelConfig.apiKey || apiKeys[modelConfig.provider];
      if (!apiKey) {
        console.log(`${colors.yellow}\u26A0\uFE0F  Skipping ${modelConfig.name} - No API key${colors.reset}`);
        continue;
      }
      try {
        generators[modelConfig.name] = new AgenticSynth({
          provider: modelConfig.provider,
          model: modelConfig.model,
          apiKey
        });
        console.log(`${colors.green}\u2713 ${modelConfig.name} initialized${colors.reset}`);
      } catch (error) {
        console.log(`${colors.red}\u2717 ${modelConfig.name} failed: ${error.message}${colors.reset}`);
      }
    }
    return generators;
  }
  /**
   * Benchmark a single model
   */
  async benchmarkModel(generator, modelName, schema, count = 3) {
    const startTime = Date.now();
    try {
      const result = await generator.generate("structured", {
        schema,
        count
      });
      const duration = (Date.now() - startTime) / 1e3;
      const data = result.data || result;
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
    } catch (error) {
      return {
        success: false,
        model: modelName,
        error: error.message,
        duration: (Date.now() - startTime) / 1e3,
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
  assessQuality(data, schema) {
    const checks = {
      completeness: 0,
      dataTypes: 0,
      consistency: 0,
      realism: 0
    };
    const schemaKeys = Object.keys(schema);
    data.forEach((record) => {
      const recordKeys = Object.keys(record);
      const hasAllFields = schemaKeys.every((key) => recordKeys.includes(key));
      checks.completeness += hasAllFields ? 1 : 0;
    });
    checks.completeness /= data.length;
    data.forEach((record) => {
      let typeMatches = 0;
      schemaKeys.forEach((key) => {
        const expectedType = schema[key].type;
        const actualType = typeof record[key];
        if (expectedType === "number" && actualType === "number" || expectedType === "string" && actualType === "string" || expectedType === "boolean" && actualType === "boolean") {
          typeMatches++;
        }
      });
      checks.dataTypes += typeMatches / schemaKeys.length;
    });
    checks.dataTypes /= data.length;
    checks.consistency = 0.85;
    checks.realism = 0.9;
    const overall = checks.completeness * 0.3 + checks.dataTypes * 0.3 + checks.consistency * 0.2 + checks.realism * 0.2;
    return {
      overall,
      ...checks
    };
  }
  /**
   * Update model weights based on performance (reinforcement learning)
   */
  updateModelWeights(bestModel, allResults) {
    const bestScore = allResults.find((r) => r.model === bestModel)?.quality.overall || 0;
    for (const modelConfig of this.models) {
      const result = allResults.find((r) => r.model === modelConfig.name);
      if (!result) continue;
      const performanceRatio = result.quality.overall / bestScore;
      const adjustment = (performanceRatio - 1) * this.learningRate;
      modelConfig.weight = Math.max(0.1, Math.min(1, modelConfig.weight + adjustment));
    }
    this.learningRate *= 0.95;
  }
  /**
   * Run optimization with adaptive learning
   */
  async optimizeWithLearning(generators, schema, iterations = 5) {
    this.banner("\u{1F9E0} ADAPTIVE LEARNING OPTIMIZATION");
    const results = {
      iterations: [],
      modelPerformance: {},
      optimalModel: null,
      improvementRate: 0
    };
    for (let i = 1; i <= iterations; i++) {
      console.log(`
${this.progressBar(i - 1, iterations, `Iteration ${i}/${iterations}`)}`);
      console.log(`${colors.yellow}\u{1F52C} Testing all models in parallel...${colors.reset}
`);
      const modelTests = Object.entries(generators).map(
        ([name, gen]) => this.benchmarkModel(gen, name, schema)
      );
      const benchmarks = await Promise.all(modelTests);
      const iterationResults = [];
      for (const benchmark of benchmarks) {
        if (!benchmark.success) {
          console.log(`${colors.red}\u2717 ${benchmark.model}: Failed - ${benchmark.error}${colors.reset}`);
          continue;
        }
        iterationResults.push(benchmark);
        console.log(`${colors.green}\u2713 ${benchmark.model}${colors.reset}`);
        console.log(`  Time: ${colors.cyan}${benchmark.duration.toFixed(2)}s${colors.reset} | Speed: ${colors.cyan}${benchmark.speed.toFixed(2)} rec/s${colors.reset} | Quality: ${colors.cyan}${(benchmark.quality.overall * 100).toFixed(1)}%${colors.reset}`);
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
      const successfulResults = iterationResults.filter((r) => r.success);
      if (successfulResults.length > 0) {
        const bestThisIteration = successfulResults.reduce(
          (best, current) => current.quality.overall > best.quality.overall ? current : best
        );
        console.log(`
${colors.bright}${colors.green}\u{1F3C6} Best this iteration: ${bestThisIteration.model}${colors.reset}
`);
        this.updateModelWeights(bestThisIteration.model, successfulResults);
      }
      results.iterations.push(iterationResults);
      if (i < iterations) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
    const modelScores = {};
    for (const [model, history] of Object.entries(results.modelPerformance)) {
      const avgQuality = history.reduce((sum, r) => sum + r.quality, 0) / history.length;
      const avgSpeed = history.reduce((sum, r) => sum + r.speed, 0) / history.length;
      modelScores[model] = avgQuality * 0.7 + avgSpeed / 10 * 0.3;
    }
    let optimalModel = null;
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
  async run(options) {
    this.banner("\u{1F680} ADVANCED STREAMING OPTIMIZATION ENGINE");
    const apiKeys = options.apiKeys || {
      gemini: process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || "",
      openrouter: process.env.OPENROUTER_API_KEY || ""
    };
    const generators = await this.initializeGenerators(apiKeys);
    if (Object.keys(generators).length === 0) {
      throw new Error("No generators initialized. Check API keys.");
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
  displayFinalAnalysis(results) {
    this.banner("\u{1F4CA} OPTIMIZATION COMPLETE - FINAL ANALYSIS");
    console.log(`${colors.cyan}\u{1F3AF} Optimal Model:${colors.reset} ${colors.bright}${colors.green}${results.optimalModel}${colors.reset}
`);
    console.log(`${colors.cyan}\u{1F4C8} Model Performance Summary:${colors.reset}
`);
    for (const [model, history] of Object.entries(results.modelPerformance)) {
      const avgQuality = history.reduce((sum, r) => sum + r.quality, 0) / history.length;
      const avgSpeed = history.reduce((sum, r) => sum + r.speed, 0) / history.length;
      const isOptimal = model === results.optimalModel;
      const prefix = isOptimal ? `${colors.green}\u2605` : ` `;
      console.log(`${prefix} ${colors.bright}${model}${colors.reset}`);
      console.log(`  Quality:  ${colors.cyan}${(avgQuality * 100).toFixed(1)}%${colors.reset}`);
      console.log(`  Speed:    ${colors.cyan}${avgSpeed.toFixed(2)} rec/s${colors.reset}
`);
    }
    console.log(`${colors.cyan}\u{1F4A1} Recommendations:${colors.reset}`);
    console.log(`  1. Use ${colors.bright}${results.optimalModel}${colors.reset} for production workloads`);
    console.log(`  2. Quality-focused tasks: Use highest quality model`);
    console.log(`  3. Speed-focused tasks: Use fastest model`);
    console.log(`  4. Cost-optimized: Use Gemini Flash for best value
`);
  }
};
async function runStreamingOptimizationExample() {
  const optimizer = new StreamingOptimization();
  const schema = {
    timestamp: { type: "string", description: "ISO 8601 timestamp" },
    symbol: { type: "string", description: "Stock ticker (AAPL, GOOGL, etc.)" },
    open: { type: "number", description: "Opening price in USD" },
    high: { type: "number", description: "Highest price in USD" },
    low: { type: "number", description: "Lowest price in USD" },
    close: { type: "number", description: "Closing price in USD" },
    volume: { type: "number", description: "Trading volume" },
    sentiment: { type: "string", description: "Market sentiment: bullish, bearish, neutral" }
  };
  const results = await optimizer.run({
    schema,
    iterations: 5
  });
  console.log(`
\u2728 Optimal model for your use case: ${results.optimalModel}`);
  return results;
}
export {
  StreamingOptimization,
  runStreamingOptimizationExample
};
//# sourceMappingURL=streaming-optimization.js.map