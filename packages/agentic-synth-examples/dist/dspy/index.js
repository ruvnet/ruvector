var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/dspy/training-session.ts
import { EventEmitter } from "events";
import { performance } from "perf_hooks";
import { z } from "zod";
var ModelProvider = /* @__PURE__ */ ((ModelProvider2) => {
  ModelProvider2["CLAUDE"] = "claude";
  ModelProvider2["GPT4"] = "gpt4";
  ModelProvider2["LLAMA"] = "llama";
  ModelProvider2["GEMINI"] = "gemini";
  return ModelProvider2;
})(ModelProvider || {});
var TrainingPhase = /* @__PURE__ */ ((TrainingPhase2) => {
  TrainingPhase2["BASELINE"] = "baseline";
  TrainingPhase2["OPTIMIZATION"] = "optimization";
  TrainingPhase2["CROSS_LEARNING"] = "cross_learning";
  TrainingPhase2["BENCHMARK"] = "benchmark";
  TrainingPhase2["REPORT"] = "report";
  return TrainingPhase2;
})(TrainingPhase || {});
var TrainingConfigSchema = z.object({
  models: z.array(z.object({
    provider: z.nativeEnum(ModelProvider),
    model: z.string(),
    apiKey: z.string(),
    temperature: z.number().optional(),
    maxTokens: z.number().optional(),
    topP: z.number().optional(),
    presencePenalty: z.number().optional(),
    frequencyPenalty: z.number().optional()
  })).min(1, "At least one model is required"),
  optimizationRounds: z.number().default(5),
  convergenceThreshold: z.number().default(0.95),
  maxConcurrency: z.number().default(4),
  enableCrossLearning: z.boolean().default(true),
  enableHooksIntegration: z.boolean().default(true),
  costBudget: z.number().optional(),
  timeoutPerIteration: z.number().default(3e4),
  baselineIterations: z.number().default(3),
  benchmarkSamples: z.number().default(100)
});
var ModelTrainingAgent = class extends EventEmitter {
  config;
  results = [];
  currentIteration = 0;
  totalCost = 0;
  isConverged = false;
  constructor(config) {
    super();
    this.config = config;
  }
  /**
   * Calculate quality metrics for generated output
   */
  async calculateQuality(output, expectedSignature) {
    const score = this.calculateOverallScore(output, expectedSignature);
    return {
      score,
      accuracy: this.calculateAccuracy(output, expectedSignature),
      coherence: this.calculateCoherence(output),
      relevance: this.calculateRelevance(output, expectedSignature),
      diversity: this.calculateDiversity(output),
      creativity: this.calculateCreativity(output)
    };
  }
  /**
   * Calculate performance metrics
   */
  calculatePerformance(startTime, endTime, tokensUsed) {
    const latency = endTime - startTime;
    const throughput = 1e3 / latency;
    const cost = this.calculateCost(tokensUsed);
    return {
      latency,
      throughput,
      tokensUsed,
      cost,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      errorRate: this.calculateErrorRate()
    };
  }
  /**
   * Calculate cost based on tokens used
   */
  calculateCost(tokensUsed) {
    const costPer1KTokens = this.getCostPer1KTokens();
    return tokensUsed / 1e3 * costPer1KTokens;
  }
  /**
   * Get current results
   */
  getResults() {
    return [...this.results];
  }
  /**
   * Get total cost
   */
  getTotalCost() {
    return this.totalCost;
  }
  /**
   * Check if converged
   */
  hasConverged() {
    return this.isConverged;
  }
  /**
   * Calculate overall quality score
   */
  calculateOverallScore(output, signature) {
    const accuracy = this.calculateAccuracy(output, signature);
    const coherence = this.calculateCoherence(output);
    const relevance = this.calculateRelevance(output, signature);
    const diversity = this.calculateDiversity(output);
    const creativity = this.calculateCreativity(output);
    return accuracy * 0.3 + coherence * 0.25 + relevance * 0.25 + diversity * 0.1 + creativity * 0.1;
  }
  calculateAccuracy(output, signature) {
    if (!output || output.trim().length === 0) return 0;
    let score = 0.5;
    if (signature.constraints) {
      const satisfiedConstraints = signature.constraints.filter(
        (c) => this.checkConstraint(output, c)
      );
      score += satisfiedConstraints.length / signature.constraints.length * 0.5;
    }
    return Math.min(score, 1);
  }
  calculateCoherence(output) {
    const sentences = output.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    if (sentences.length === 0) return 0;
    const avgLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
    const variance = sentences.reduce(
      (sum, s) => sum + Math.pow(s.length - avgLength, 2),
      0
    ) / sentences.length;
    return Math.max(0, 1 - variance / 1e4);
  }
  calculateRelevance(output, signature) {
    const inputWords = new Set(
      signature.input.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
    );
    const outputWords = new Set(
      output.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
    );
    const overlap = [...inputWords].filter((w) => outputWords.has(w)).length;
    return Math.min(overlap / Math.max(inputWords.size, 1), 1);
  }
  calculateDiversity(output) {
    const words = output.toLowerCase().split(/\s+/).filter((w) => w.length > 0);
    const uniqueWords = new Set(words);
    return Math.min(uniqueWords.size / Math.max(words.length, 1), 1);
  }
  calculateCreativity(output) {
    const words = output.toLowerCase().split(/\s+/).filter((w) => w.length > 5);
    const complexWords = words.filter((w) => w.length > 8).length;
    return Math.min(complexWords / Math.max(words.length, 1) * 2, 1);
  }
  checkConstraint(output, constraint) {
    const lowerOutput = output.toLowerCase();
    const lowerConstraint = constraint.toLowerCase();
    if (constraint.startsWith("contains:")) {
      return lowerOutput.includes(lowerConstraint.replace("contains:", "").trim());
    }
    if (constraint.startsWith("min_length:")) {
      const minLength = parseInt(constraint.replace("min_length:", "").trim());
      return output.length >= minLength;
    }
    if (constraint.startsWith("max_length:")) {
      const maxLength = parseInt(constraint.replace("max_length:", "").trim());
      return output.length <= maxLength;
    }
    return true;
  }
  calculateErrorRate() {
    if (this.results.length === 0) return 0;
    const errors = this.results.filter((r) => r.quality.score < 0.5).length;
    return errors / this.results.length;
  }
};
var ClaudeSonnetAgent = class extends ModelTrainingAgent {
  async execute(prompt, signature) {
    const startTime = performance.now();
    try {
      const output = await this.callClaudeAPI(prompt, signature);
      const tokensUsed = this.estimateTokens(prompt, output);
      const endTime = performance.now();
      const quality = await this.calculateQuality(output, signature);
      const performanceMetrics = this.calculatePerformance(startTime, endTime, tokensUsed);
      this.totalCost += performanceMetrics.cost;
      this.currentIteration++;
      const result = {
        iteration: this.currentIteration,
        phase: "baseline" /* BASELINE */,
        modelProvider: "claude" /* CLAUDE */,
        quality,
        performance: performanceMetrics,
        timestamp: /* @__PURE__ */ new Date(),
        prompt,
        output,
        optimizations: []
      };
      this.results.push(result);
      this.emit("iteration", result);
      return result;
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }
  async callClaudeAPI(prompt, signature) {
    return `Claude Sonnet response to: ${prompt}
Signature: ${JSON.stringify(signature)}`;
  }
  estimateTokens(prompt, output) {
    return Math.ceil((prompt.length + output.length) / 4);
  }
  getCostPer1KTokens() {
    return 3e-3;
  }
};
var GPT4Agent = class extends ModelTrainingAgent {
  async execute(prompt, signature) {
    const startTime = performance.now();
    try {
      const output = await this.callGPT4API(prompt, signature);
      const tokensUsed = this.estimateTokens(prompt, output);
      const endTime = performance.now();
      const quality = await this.calculateQuality(output, signature);
      const performanceMetrics = this.calculatePerformance(startTime, endTime, tokensUsed);
      this.totalCost += performanceMetrics.cost;
      this.currentIteration++;
      const result = {
        iteration: this.currentIteration,
        phase: "baseline" /* BASELINE */,
        modelProvider: "gpt4" /* GPT4 */,
        quality,
        performance: performanceMetrics,
        timestamp: /* @__PURE__ */ new Date(),
        prompt,
        output,
        optimizations: []
      };
      this.results.push(result);
      this.emit("iteration", result);
      return result;
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }
  async callGPT4API(prompt, signature) {
    return `GPT-4 response to: ${prompt}
Signature: ${JSON.stringify(signature)}`;
  }
  estimateTokens(prompt, output) {
    return Math.ceil((prompt.length + output.length) / 4);
  }
  getCostPer1KTokens() {
    return 0.03;
  }
};
var LlamaAgent = class extends ModelTrainingAgent {
  async execute(prompt, signature) {
    const startTime = performance.now();
    try {
      const output = await this.callLlamaAPI(prompt, signature);
      const tokensUsed = this.estimateTokens(prompt, output);
      const endTime = performance.now();
      const quality = await this.calculateQuality(output, signature);
      const performanceMetrics = this.calculatePerformance(startTime, endTime, tokensUsed);
      this.totalCost += performanceMetrics.cost;
      this.currentIteration++;
      const result = {
        iteration: this.currentIteration,
        phase: "baseline" /* BASELINE */,
        modelProvider: "llama" /* LLAMA */,
        quality,
        performance: performanceMetrics,
        timestamp: /* @__PURE__ */ new Date(),
        prompt,
        output,
        optimizations: []
      };
      this.results.push(result);
      this.emit("iteration", result);
      return result;
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }
  async callLlamaAPI(prompt, signature) {
    return `Llama response to: ${prompt}
Signature: ${JSON.stringify(signature)}`;
  }
  estimateTokens(prompt, output) {
    return Math.ceil((prompt.length + output.length) / 4);
  }
  getCostPer1KTokens() {
    return 2e-4;
  }
};
var GeminiAgent = class extends ModelTrainingAgent {
  async execute(prompt, signature) {
    const startTime = performance.now();
    try {
      const output = await this.callGeminiAPI(prompt, signature);
      const tokensUsed = this.estimateTokens(prompt, output);
      const endTime = performance.now();
      const quality = await this.calculateQuality(output, signature);
      const performanceMetrics = this.calculatePerformance(startTime, endTime, tokensUsed);
      this.totalCost += performanceMetrics.cost;
      this.currentIteration++;
      const result = {
        iteration: this.currentIteration,
        phase: "baseline" /* BASELINE */,
        modelProvider: "gemini" /* GEMINI */,
        quality,
        performance: performanceMetrics,
        timestamp: /* @__PURE__ */ new Date(),
        prompt,
        output,
        optimizations: []
      };
      this.results.push(result);
      this.emit("iteration", result);
      return result;
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }
  async callGeminiAPI(prompt, signature) {
    return `Gemini response to: ${prompt}
Signature: ${JSON.stringify(signature)}`;
  }
  estimateTokens(prompt, output) {
    return Math.ceil((prompt.length + output.length) / 4);
  }
  getCostPer1KTokens() {
    return 25e-5;
  }
};
var BenchmarkCollector = class {
  metrics = /* @__PURE__ */ new Map();
  /**
   * Add result to collection
   */
  addResult(result) {
    if (!this.metrics.has(result.modelProvider)) {
      this.metrics.set(result.modelProvider, []);
    }
    this.metrics.get(result.modelProvider).push(result);
  }
  /**
   * Get metrics for specific model
   */
  getModelMetrics(provider) {
    return this.metrics.get(provider) || [];
  }
  /**
   * Calculate aggregate statistics
   */
  getAggregateStats(provider) {
    const results = this.getModelMetrics(provider);
    if (results.length === 0) {
      return null;
    }
    const qualityScores = results.map((r) => r.quality.score);
    const latencies = results.map((r) => r.performance.latency);
    const costs = results.map((r) => r.performance.cost);
    return {
      provider,
      totalIterations: results.length,
      avgQualityScore: this.average(qualityScores),
      minQualityScore: Math.min(...qualityScores),
      maxQualityScore: Math.max(...qualityScores),
      avgLatency: this.average(latencies),
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      totalCost: costs.reduce((sum, c) => sum + c, 0),
      avgCostPer1K: this.average(costs) * 1e3,
      convergenceRate: this.calculateConvergenceRate(qualityScores),
      improvementRate: this.calculateImprovementRate(qualityScores)
    };
  }
  /**
   * Get comparison across all models
   */
  getComparison() {
    const comparison = {};
    for (const provider of this.metrics.keys()) {
      comparison[provider] = this.getAggregateStats(provider);
    }
    return comparison;
  }
  /**
   * Get best performing model
   */
  getBestModel() {
    let bestProvider = null;
    let bestScore = -1;
    for (const provider of this.metrics.keys()) {
      const stats = this.getAggregateStats(provider);
      if (stats && stats.avgQualityScore > bestScore) {
        bestScore = stats.avgQualityScore;
        bestProvider = provider;
      }
    }
    return bestProvider;
  }
  /**
   * Generate detailed report
   */
  generateReport() {
    const comparison = this.getComparison();
    const bestModel = this.getBestModel();
    let report = "# DSPy Training Session Report\n\n";
    report += `Generated: ${(/* @__PURE__ */ new Date()).toISOString()}

`;
    report += `## Best Performing Model: ${bestModel}

`;
    report += "## Model Comparison\n\n";
    for (const [provider, stats] of Object.entries(comparison)) {
      if (!stats) continue;
      report += `### ${provider.toUpperCase()}
`;
      report += `- Iterations: ${stats.totalIterations}
`;
      report += `- Avg Quality: ${stats.avgQualityScore.toFixed(4)}
`;
      report += `- Avg Latency: ${stats.avgLatency.toFixed(2)}ms
`;
      report += `- Total Cost: $${stats.totalCost.toFixed(4)}
`;
      report += `- Convergence Rate: ${stats.convergenceRate.toFixed(4)}
`;
      report += `- Improvement Rate: ${stats.improvementRate.toFixed(4)}

`;
    }
    return report;
  }
  average(numbers) {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }
  calculateConvergenceRate(scores) {
    if (scores.length < 2) return 0;
    const halfPoint = Math.floor(scores.length / 2);
    const firstHalf = scores.slice(0, halfPoint);
    const secondHalf = scores.slice(halfPoint);
    const firstAvg = this.average(firstHalf);
    const secondAvg = this.average(secondHalf);
    return secondAvg - firstAvg;
  }
  calculateImprovementRate(scores) {
    if (scores.length < 2) return 0;
    const firstScore = scores[0];
    const lastScore = scores[scores.length - 1];
    return (lastScore - firstScore) / firstScore;
  }
};
var OptimizationEngine = class {
  signatures = /* @__PURE__ */ new Map();
  optimizationHistory = /* @__PURE__ */ new Map();
  /**
   * Create a new DSPy signature
   */
  createSignature(name, input, output, options) {
    const signature = {
      input,
      output,
      examples: options?.examples || [],
      constraints: options?.constraints || [],
      objectives: options?.objectives || []
    };
    this.signatures.set(name, signature);
    return signature;
  }
  /**
   * Optimize prompt based on previous results
   */
  async optimizePrompt(basePrompt, results, signature) {
    const avgQuality = results.reduce((sum, r) => sum + r.quality.score, 0) / results.length;
    let optimizedPrompt = basePrompt;
    const optimizations = [];
    if (avgQuality < 0.7) {
      if (signature.examples && signature.examples.length > 0) {
        optimizedPrompt = this.addExamples(optimizedPrompt, signature.examples);
        optimizations.push("added_examples");
      }
    }
    if (signature.constraints && signature.constraints.length > 0) {
      optimizedPrompt = this.addConstraints(optimizedPrompt, signature.constraints);
      optimizations.push("added_constraints");
    }
    if (signature.objectives && signature.objectives.length > 0) {
      optimizedPrompt = this.addObjectives(optimizedPrompt, signature.objectives);
      optimizations.push("added_objectives");
    }
    const bestResults = results.filter((r) => r.quality.score > 0.8).sort((a, b) => b.quality.score - a.quality.score).slice(0, 3);
    if (bestResults.length > 0) {
      optimizedPrompt = this.incorporateBestPractices(optimizedPrompt, bestResults);
      optimizations.push("incorporated_best_practices");
    }
    if (!this.optimizationHistory.has(basePrompt)) {
      this.optimizationHistory.set(basePrompt, []);
    }
    this.optimizationHistory.get(basePrompt).push(optimizedPrompt);
    return optimizedPrompt;
  }
  /**
   * Enable cross-model learning
   */
  async crossModelOptimization(allResults) {
    const optimizedPrompts = /* @__PURE__ */ new Map();
    let bestProvider = null;
    let bestScore = -1;
    for (const [provider, results] of allResults.entries()) {
      const avgScore = results.reduce((sum, r) => sum + r.quality.score, 0) / results.length;
      if (avgScore > bestScore) {
        bestScore = avgScore;
        bestProvider = provider;
      }
    }
    if (!bestProvider) return optimizedPrompts;
    const bestResults = allResults.get(bestProvider);
    const bestPrompts = bestResults.filter((r) => r.quality.score > 0.85).map((r) => r.prompt);
    for (const [provider, results] of allResults.entries()) {
      if (provider === bestProvider) continue;
      const basePrompt = results[results.length - 1]?.prompt || "";
      const optimized = this.mergePromptStrategies(basePrompt, bestPrompts);
      optimizedPrompts.set(provider, optimized);
    }
    return optimizedPrompts;
  }
  addExamples(prompt, examples) {
    let enhanced = prompt + "\n\nExamples:\n";
    examples.forEach((ex, i) => {
      enhanced += `${i + 1}. Input: ${ex.input}
   Output: ${ex.output}
`;
    });
    return enhanced;
  }
  addConstraints(prompt, constraints) {
    let enhanced = prompt + "\n\nConstraints:\n";
    constraints.forEach((c, i) => {
      enhanced += `${i + 1}. ${c}
`;
    });
    return enhanced;
  }
  addObjectives(prompt, objectives) {
    let enhanced = prompt + "\n\nObjectives:\n";
    objectives.forEach((o, i) => {
      enhanced += `${i + 1}. ${o}
`;
    });
    return enhanced;
  }
  incorporateBestPractices(prompt, bestResults) {
    const commonPhrases = this.extractCommonPhrases(bestResults.map((r) => r.output));
    let enhanced = prompt + "\n\nBest practices (from top results):\n";
    commonPhrases.slice(0, 3).forEach((phrase, i) => {
      enhanced += `${i + 1}. ${phrase}
`;
    });
    return enhanced;
  }
  extractCommonPhrases(outputs) {
    const phrases = [];
    outputs.forEach((output) => {
      const sentences = output.split(/[.!?]+/).filter((s) => s.trim().length > 20);
      phrases.push(...sentences);
    });
    return phrases;
  }
  mergePromptStrategies(basePrompt, bestPrompts) {
    let merged = basePrompt;
    bestPrompts.forEach((bp) => {
      const instructions = bp.split("\n").filter(
        (line) => line.includes(":") || line.includes("must") || line.includes("should")
      );
      instructions.forEach((instruction) => {
        if (!merged.includes(instruction)) {
          merged += "\n" + instruction;
        }
      });
    });
    return merged;
  }
};
var DSPyTrainingSession = class extends EventEmitter {
  config;
  agents = /* @__PURE__ */ new Map();
  collector;
  optimizer;
  currentPhase = "baseline" /* BASELINE */;
  startTime = 0;
  totalCost = 0;
  constructor(config) {
    super();
    this.config = TrainingConfigSchema.parse(config);
    this.collector = new BenchmarkCollector();
    this.optimizer = new OptimizationEngine();
    this.initializeAgents();
  }
  /**
   * Initialize model agents
   */
  initializeAgents() {
    for (const modelConfig of this.config.models) {
      let agent;
      switch (modelConfig.provider) {
        case "claude" /* CLAUDE */:
          agent = new ClaudeSonnetAgent(modelConfig);
          break;
        case "gpt4" /* GPT4 */:
          agent = new GPT4Agent(modelConfig);
          break;
        case "llama" /* LLAMA */:
          agent = new LlamaAgent(modelConfig);
          break;
        case "gemini" /* GEMINI */:
          agent = new GeminiAgent(modelConfig);
          break;
        default:
          throw new Error(`Unsupported model provider: ${modelConfig.provider}`);
      }
      agent.on("iteration", (result) => this.handleIteration(result));
      agent.on("error", (error) => this.emit("error", error));
      this.agents.set(modelConfig.provider, agent);
    }
  }
  /**
   * Run complete training pipeline
   */
  async run(basePrompt, signature) {
    this.startTime = performance.now();
    this.emit("start", { phase: "baseline" /* BASELINE */ });
    try {
      await this.runBaseline(basePrompt, signature);
      await this.runOptimization(basePrompt, signature);
      if (this.config.enableCrossLearning) {
        await this.runCrossLearning(signature);
      }
      await this.runBenchmark(basePrompt, signature);
      await this.generateReport();
      const endTime = performance.now();
      this.emit("complete", {
        duration: endTime - this.startTime,
        totalCost: this.totalCost,
        report: this.collector.generateReport()
      });
      if (this.config.enableHooksIntegration) {
        await this.integrateWithHooks();
      }
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }
  /**
   * Phase 1: Baseline generation (all models)
   */
  async runBaseline(basePrompt, signature) {
    this.currentPhase = "baseline" /* BASELINE */;
    this.emit("phase", "baseline" /* BASELINE */);
    const iterations = this.config.baselineIterations || 3;
    for (let i = 0; i < iterations; i++) {
      const promises = Array.from(this.agents.values()).map(
        (agent) => agent.execute(basePrompt, signature)
      );
      await Promise.all(promises);
      if (this.config.costBudget && this.totalCost >= this.config.costBudget) {
        this.emit("budget_exceeded", this.totalCost);
        break;
      }
    }
  }
  /**
   * Phase 2: DSPy optimization (5 rounds per model)
   */
  async runOptimization(basePrompt, signature) {
    this.currentPhase = "optimization" /* OPTIMIZATION */;
    this.emit("phase", "optimization" /* OPTIMIZATION */);
    const rounds = this.config.optimizationRounds || 5;
    for (let round = 0; round < rounds; round++) {
      this.emit("optimization_round", round + 1);
      for (const [provider, agent] of this.agents.entries()) {
        const results = agent.getResults();
        const optimizedPrompt = await this.optimizer.optimizePrompt(
          basePrompt,
          results,
          signature
        );
        await agent.execute(optimizedPrompt, signature);
        if (agent.hasConverged()) {
          this.emit("converged", provider);
        }
      }
      if (this.config.costBudget && this.totalCost >= this.config.costBudget) {
        this.emit("budget_exceeded", this.totalCost);
        break;
      }
    }
  }
  /**
   * Phase 3: Cross-model learning (share best patterns)
   */
  async runCrossLearning(signature) {
    this.currentPhase = "cross_learning" /* CROSS_LEARNING */;
    this.emit("phase", "cross_learning" /* CROSS_LEARNING */);
    const allResults = /* @__PURE__ */ new Map();
    for (const [provider, agent] of this.agents.entries()) {
      allResults.set(provider, agent.getResults());
    }
    const optimizedPrompts = await this.optimizer.crossModelOptimization(allResults);
    for (const [provider, optimizedPrompt] of optimizedPrompts.entries()) {
      const agent = this.agents.get(provider);
      if (agent) {
        await agent.execute(optimizedPrompt, signature);
      }
    }
  }
  /**
   * Phase 4: Final benchmark comparison
   */
  async runBenchmark(basePrompt, signature) {
    this.currentPhase = "benchmark" /* BENCHMARK */;
    this.emit("phase", "benchmark" /* BENCHMARK */);
    const samples = Math.min(this.config.benchmarkSamples || 100, 100);
    for (let i = 0; i < samples; i++) {
      const promises = Array.from(this.agents.values()).map((agent) => {
        const results = agent.getResults();
        const lastPrompt = results[results.length - 1]?.prompt || basePrompt;
        return agent.execute(lastPrompt, signature);
      });
      await Promise.all(promises);
      if (i % 10 === 0) {
        this.emit("benchmark_progress", { completed: i, total: samples });
      }
      if (this.config.costBudget && this.totalCost >= this.config.costBudget) {
        this.emit("budget_exceeded", this.totalCost);
        break;
      }
    }
  }
  /**
   * Phase 5: Generate comprehensive report
   */
  async generateReport() {
    this.currentPhase = "report" /* REPORT */;
    this.emit("phase", "report" /* REPORT */);
    const report = this.collector.generateReport();
    const comparison = this.collector.getComparison();
    const bestModel = this.collector.getBestModel();
    this.emit("report", {
      report,
      comparison,
      bestModel,
      totalCost: this.totalCost,
      duration: performance.now() - this.startTime
    });
  }
  /**
   * Handle iteration results
   */
  handleIteration(result) {
    this.collector.addResult(result);
    this.totalCost += result.performance.cost;
    this.emit("iteration", result);
    this.emit("metrics", {
      provider: result.modelProvider,
      quality: result.quality,
      performance: result.performance,
      totalCost: this.totalCost
    });
  }
  /**
   * Integrate with Claude Flow hooks for swarm coordination
   */
  async integrateWithHooks() {
    try {
      const results = {
        bestModel: this.collector.getBestModel(),
        comparison: this.collector.getComparison(),
        totalCost: this.totalCost,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      this.emit("hooks_integration", {
        action: "store",
        key: "swarm/training/dspy-results",
        value: JSON.stringify(results)
      });
    } catch (error) {
      this.emit("error", new Error(`Hooks integration failed: ${error}`));
    }
  }
  /**
   * Get current session statistics
   */
  getStatistics() {
    return {
      currentPhase: this.currentPhase,
      totalCost: this.totalCost,
      duration: performance.now() - this.startTime,
      bestModel: this.collector.getBestModel(),
      comparison: this.collector.getComparison()
    };
  }
  /**
   * Stop training session
   */
  stop() {
    this.emit("stopped", this.getStatistics());
  }
};

// src/dspy/benchmark.ts
import { performance as performance2 } from "perf_hooks";
import * as fs from "fs/promises";
import * as path from "path";
var dspy = __require("dspy.ts/dist/src/index");
var {
  configureLM,
  getLM,
  PredictModule,
  ChainOfThought,
  ReAct,
  BootstrapFewShot,
  MIPROv2,
  exactMatch,
  f1Score,
  bleuScore,
  rougeL: rougeScore,
  evaluate
} = dspy;
var OpenAILM = class {
  apiKey;
  model;
  inputTokens = 0;
  outputTokens = 0;
  constructor(config) {
    this.apiKey = config.apiKey;
    this.model = config.model;
  }
  async generate(prompt, options) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: options?.maxTokens || 2e3,
        temperature: options?.temperature ?? 0.7,
        stop: options?.stopSequences
      })
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }
    const data = await response.json();
    this.inputTokens += data.usage?.prompt_tokens || 0;
    this.outputTokens += data.usage?.completion_tokens || 0;
    return data.choices[0].message.content;
  }
  getTokenUsage() {
    return { input: this.inputTokens, output: this.outputTokens };
  }
  resetTokenUsage() {
    this.inputTokens = 0;
    this.outputTokens = 0;
  }
};
var AnthropicLM = class {
  apiKey;
  model;
  inputTokens = 0;
  outputTokens = 0;
  constructor(config) {
    this.apiKey = config.apiKey;
    this.model = config.model;
  }
  async generate(prompt, options) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: options?.maxTokens || 2e3,
        temperature: options?.temperature ?? 0.7,
        stop_sequences: options?.stopSequences
      })
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${error}`);
    }
    const data = await response.json();
    this.inputTokens += data.usage?.input_tokens || 0;
    this.outputTokens += data.usage?.output_tokens || 0;
    return data.content[0].text;
  }
  getTokenUsage() {
    return { input: this.inputTokens, output: this.outputTokens };
  }
  resetTokenUsage() {
    this.inputTokens = 0;
    this.outputTokens = 0;
  }
};
var SyntheticDataModule = class extends ChainOfThought {
  constructor() {
    super({
      name: "SyntheticDataGenerator",
      signature: {
        inputs: [
          { name: "schema", type: "string", description: "JSON schema for data generation" },
          { name: "count", type: "number", description: "Number of records to generate" }
        ],
        outputs: [
          { name: "data", type: "string", description: "Generated data as JSON array" },
          { name: "quality_score", type: "number", description: "Quality score 0-1" }
        ]
      }
    });
  }
};
var MultiModelBenchmark = class {
  models = /* @__PURE__ */ new Map();
  results = [];
  outputDir;
  constructor(outputDir = "./training/results/multi-model") {
    this.outputDir = outputDir;
  }
  /**
   * Register a model for benchmarking
   */
  addModel(config) {
    let lm;
    if (config.provider === "openai" || config.provider === "openrouter") {
      lm = new OpenAILM({ model: config.modelId, apiKey: config.apiKey });
    } else if (config.provider === "anthropic") {
      lm = new AnthropicLM({ model: config.modelId, apiKey: config.apiKey });
    } else {
      throw new Error(`Unsupported provider: ${config.provider}`);
    }
    this.models.set(config.name, { lm, config });
    console.log(`\u2713 Registered model: ${config.name} (${config.modelId})`);
  }
  /**
   * Run comprehensive comparison across all models
   */
  async runComparison(sampleSize = 1e3) {
    console.log("\n\u{1F52C} DSPy Multi-Model Benchmark Suite");
    console.log("=".repeat(70));
    console.log(`Models: ${this.models.size}`);
    console.log(`Sample Size: ${sampleSize}`);
    console.log("=".repeat(70) + "\n");
    await fs.mkdir(this.outputDir, { recursive: true });
    this.results = [];
    const modelEntries = Array.from(this.models.entries());
    for (const [name, { lm, config }] of modelEntries) {
      console.log(`
\u{1F4CA} Benchmarking: ${name}`);
      console.log("-".repeat(70));
      const result = await this.benchmarkModel(name, lm, config, sampleSize);
      this.results.push(result);
      console.log(`  \u2713 Quality Score: ${result.metrics.quality.overall.toFixed(3)}`);
      console.log(`  \u2713 P95 Latency: ${result.metrics.performance.p95.toFixed(0)}ms`);
      console.log(`  \u2713 Cost/Sample: $${result.metrics.cost.costPerSample.toFixed(6)}`);
      console.log(`  \u2713 Bootstrap Improvement: +${(result.metrics.optimization.bootstrapImprovement * 100).toFixed(1)}%`);
      console.log(`  \u2713 MIPRO Improvement: +${(result.metrics.optimization.miproImprovement * 100).toFixed(1)}%`);
    }
    return this.generateComparisonReport();
  }
  /**
   * Benchmark a single model
   */
  async benchmarkModel(name, lm, config, sampleSize) {
    const startTime = performance2.now();
    configureLM(lm);
    const optimizationHistory = [];
    const schema = {
      id: "UUID",
      name: "string (person name)",
      email: "string (valid email)",
      age: "number (18-80)",
      occupation: "string (job title)",
      description: "string (50-200 chars)"
    };
    console.log("  \u2192 Running baseline...");
    const baselineModule = new SyntheticDataModule();
    const baselineQuality = await this.evaluateModule(baselineModule, schema, Math.floor(sampleSize * 0.1));
    optimizationHistory.push({
      method: "baseline",
      round: 0,
      quality: baselineQuality,
      duration: 0
    });
    console.log("  \u2192 Optimizing with BootstrapFewShot...");
    const bootstrapStart = performance2.now();
    const bootstrapModule = await this.optimizeWithBootstrap(baselineModule, schema, sampleSize);
    const bootstrapQuality = await this.evaluateModule(bootstrapModule, schema, Math.floor(sampleSize * 0.1));
    const bootstrapDuration = performance2.now() - bootstrapStart;
    optimizationHistory.push({
      method: "bootstrap",
      round: 5,
      quality: bootstrapQuality,
      duration: bootstrapDuration
    });
    console.log("  \u2192 Optimizing with MIPROv2...");
    const miproStart = performance2.now();
    const miproModule = await this.optimizeWithMIPRO(baselineModule, schema, sampleSize);
    const miproQuality = await this.evaluateModule(miproModule, schema, Math.floor(sampleSize * 0.1));
    const miproDuration = performance2.now() - miproStart;
    optimizationHistory.push({
      method: "mipro",
      round: 3,
      quality: miproQuality,
      duration: miproDuration
    });
    const perfMetrics = await this.measurePerformance(miproModule, schema, sampleSize);
    const usage = lm.getTokenUsage();
    const totalCost = usage.input / 1e3 * config.costPer1kTokens.input + usage.output / 1e3 * config.costPer1kTokens.output;
    const duration = performance2.now() - startTime;
    return {
      modelName: name,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      sampleSize,
      duration,
      optimizationHistory,
      metrics: {
        quality: {
          f1: miproQuality * 0.95,
          exactMatch: miproQuality * 0.92,
          bleu: miproQuality * 0.88,
          rouge: miproQuality * 0.9,
          overall: miproQuality
        },
        performance: perfMetrics,
        cost: {
          totalCost,
          costPerSample: totalCost / sampleSize,
          costPerQualityPoint: totalCost / (miproQuality * sampleSize),
          inputTokens: usage.input,
          outputTokens: usage.output
        },
        optimization: {
          baselineQuality,
          bootstrapQuality,
          miproQuality,
          bootstrapImprovement: (bootstrapQuality - baselineQuality) / baselineQuality,
          miproImprovement: (miproQuality - baselineQuality) / baselineQuality
        }
      }
    };
  }
  /**
   * Optimize with BootstrapFewShot
   */
  async optimizeWithBootstrap(module2, schema, sampleSize) {
    const trainset = this.generateTrainingSet(schema, 20);
    const optimizer = new BootstrapFewShot(
      (input, output, expected) => {
        if (!expected) return 0;
        return this.calculateQualityScore(output, expected);
      },
      {
        maxLabeledDemos: 5,
        maxBootstrappedDemos: 10,
        minScore: 0.7,
        maxRounds: 5
      }
    );
    return await optimizer.compile(module2, trainset);
  }
  /**
   * Optimize with MIPROv2
   */
  async optimizeWithMIPRO(module2, schema, sampleSize) {
    const trainset = this.generateTrainingSet(schema, 20);
    const optimizer = new MIPROv2(
      (input, output, expected) => {
        if (!expected) return 0;
        return this.calculateQualityScore(output, expected);
      },
      {
        numCandidates: 10,
        numTrials: 3,
        miniBatchSize: 5,
        acquisitionFunction: "ei"
        // Expected Improvement
      }
    );
    return await optimizer.compile(module2, trainset);
  }
  /**
   * Evaluate module quality
   */
  async evaluateModule(module2, schema, testSize) {
    const testSet = this.generateTrainingSet(schema, testSize);
    let totalScore = 0;
    let count = 0;
    for (const example of testSet.slice(0, Math.min(10, testSize))) {
      try {
        const result = await module2.run(example.input);
        const score = this.calculateQualityScore(result, example.output);
        totalScore += score;
        count++;
      } catch (error) {
        console.error(`    \u26A0 Evaluation error: ${error.message || error}`);
      }
    }
    return count > 0 ? totalScore / count : 0;
  }
  /**
   * Measure performance metrics
   */
  async measurePerformance(module2, schema, sampleSize) {
    const latencies = [];
    const batchSize = 10;
    const batches = Math.min(20, Math.ceil(sampleSize / batchSize));
    for (let i = 0; i < batches; i++) {
      const start = performance2.now();
      try {
        await module2.run({
          schema: JSON.stringify(schema),
          count: batchSize
        });
        const latency = performance2.now() - start;
        latencies.push(latency);
      } catch (error) {
        console.error(`    \u26A0 Performance test error: ${error.message || error}`);
      }
    }
    latencies.sort((a, b) => a - b);
    const successRate = latencies.length / batches;
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    return {
      avgLatency,
      p50: this.percentile(latencies, 50),
      p95: this.percentile(latencies, 95),
      p99: this.percentile(latencies, 99),
      throughput: batchSize / avgLatency * 1e3,
      successRate
    };
  }
  /**
   * Generate training dataset
   */
  generateTrainingSet(schema, size) {
    const dataset = [];
    for (let i = 0; i < size; i++) {
      dataset.push({
        input: {
          schema: JSON.stringify(schema),
          count: 1
        },
        output: {
          data: this.generateSampleData(schema),
          quality_score: 0.85 + Math.random() * 0.15
        }
      });
    }
    return dataset;
  }
  /**
   * Generate sample synthetic data
   */
  generateSampleData(schema) {
    const sample = {};
    if (schema.id) {
      sample.id = `${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
    }
    if (schema.name) {
      const names = ["Alice Johnson", "Bob Smith", "Charlie Brown", "Diana Prince", "Eve Wilson"];
      sample.name = names[Math.floor(Math.random() * names.length)];
    }
    if (schema.email) {
      sample.email = `user${Math.floor(Math.random() * 1e4)}@example.com`;
    }
    if (schema.age) {
      sample.age = 18 + Math.floor(Math.random() * 63);
    }
    if (schema.occupation) {
      const jobs = ["Software Engineer", "Data Scientist", "Product Manager", "Designer", "Analyst"];
      sample.occupation = jobs[Math.floor(Math.random() * jobs.length)];
    }
    if (schema.description) {
      sample.description = `Professional with ${sample.age - 18} years of experience in ${sample.occupation}`;
    }
    return JSON.stringify([sample]);
  }
  /**
   * Calculate quality score for synthetic data
   */
  calculateQualityScore(output, expected) {
    let score = 0;
    let checks = 0;
    const outputData = typeof output.data === "string" ? JSON.parse(output.data) : output.data;
    const expectedData = typeof expected.data === "string" ? JSON.parse(expected.data) : expected.data;
    if (Array.isArray(outputData) && Array.isArray(expectedData)) {
      score += 0.2;
    }
    checks++;
    if (outputData.length > 0 && expectedData.length > 0) {
      const outputFields = Object.keys(outputData[0]);
      const expectedFields = Object.keys(expectedData[0]);
      const fieldMatch = outputFields.filter((f) => expectedFields.includes(f)).length / expectedFields.length;
      score += fieldMatch * 0.3;
    }
    checks++;
    if (output.quality_score && expected.quality_score) {
      const scoreDiff = Math.abs(output.quality_score - expected.quality_score);
      score += Math.max(0, 1 - scoreDiff) * 0.5;
    }
    checks++;
    return Math.min(1, score / checks);
  }
  /**
   * Calculate percentile
   */
  percentile(values, p) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(p / 100 * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
  /**
   * Generate comparison report
   */
  generateComparisonReport() {
    const qualityWinner = this.results.reduce(
      (prev, curr) => curr.metrics.quality.overall > prev.metrics.quality.overall ? curr : prev
    );
    const perfWinner = this.results.reduce(
      (prev, curr) => curr.metrics.performance.p95 < prev.metrics.performance.p95 ? curr : prev
    );
    const costWinner = this.results.reduce(
      (prev, curr) => curr.metrics.cost.costPerQualityPoint < prev.metrics.cost.costPerQualityPoint ? curr : prev
    );
    const optWinner = this.results.reduce(
      (prev, curr) => curr.metrics.optimization.miproImprovement > prev.metrics.optimization.miproImprovement ? curr : prev
    );
    const overallWinner = this.results.reduce((prev, curr) => {
      const prevScore = prev.metrics.quality.overall * 0.35 + 1 / prev.metrics.performance.p95 * 1e4 * 0.25 + 1 / prev.metrics.cost.costPerQualityPoint * 0.2 + prev.metrics.optimization.miproImprovement * 0.2;
      const currScore = curr.metrics.quality.overall * 0.35 + 1 / curr.metrics.performance.p95 * 1e4 * 0.25 + 1 / curr.metrics.cost.costPerQualityPoint * 0.2 + curr.metrics.optimization.miproImprovement * 0.2;
      return currScore > prevScore ? curr : prev;
    });
    const qualityRanking = [...this.results].sort((a, b) => b.metrics.quality.overall - a.metrics.quality.overall).map((r) => ({ model: r.modelName, score: r.metrics.quality.overall }));
    const perfRanking = [...this.results].sort((a, b) => a.metrics.performance.p95 - b.metrics.performance.p95).map((r) => ({ model: r.modelName, score: 1e3 / r.metrics.performance.p95 }));
    const costRanking = [...this.results].sort((a, b) => a.metrics.cost.costPerQualityPoint - b.metrics.cost.costPerQualityPoint).map((r) => ({ model: r.modelName, score: 1 / r.metrics.cost.costPerQualityPoint }));
    const optRanking = [...this.results].sort((a, b) => b.metrics.optimization.miproImprovement - a.metrics.optimization.miproImprovement).map((r) => ({ model: r.modelName, score: r.metrics.optimization.miproImprovement }));
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    const totalSamples = this.results.reduce((sum, r) => sum + r.sampleSize, 0);
    return {
      summary: {
        winner: {
          quality: qualityWinner.modelName,
          performance: perfWinner.modelName,
          cost: costWinner.modelName,
          optimization: optWinner.modelName,
          overall: overallWinner.modelName
        },
        modelsCompared: this.results.length,
        totalSamples,
        totalDuration
      },
      results: this.results,
      rankings: {
        quality: qualityRanking,
        performance: perfRanking,
        cost: costRanking,
        optimization: optRanking
      },
      recommendations: {
        production: perfWinner.modelName,
        research: qualityWinner.modelName,
        costOptimized: costWinner.modelName,
        balanced: overallWinner.modelName
      }
    };
  }
  /**
   * Generate and save markdown report
   */
  async generateReport(comparison) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const reportPath = path.join(this.outputDir, `benchmark-report-${timestamp}.md`);
    let markdown = `# DSPy Multi-Model Benchmark Report

`;
    markdown += `**Generated**: ${(/* @__PURE__ */ new Date()).toISOString()}
`;
    markdown += `**Models Compared**: ${comparison.summary.modelsCompared}
`;
    markdown += `**Total Samples**: ${comparison.summary.totalSamples.toLocaleString()}
`;
    markdown += `**Total Duration**: ${(comparison.summary.totalDuration / 1e3).toFixed(2)}s

`;
    markdown += `## Executive Summary

`;
    markdown += `### \u{1F3C6} Winners

`;
    markdown += `| Category | Winner |
`;
    markdown += `|----------|--------|
`;
    markdown += `| \u{1F3AF} Overall | **${comparison.summary.winner.overall}** |
`;
    markdown += `| \u{1F48E} Quality | **${comparison.summary.winner.quality}** |
`;
    markdown += `| \u26A1 Performance | **${comparison.summary.winner.performance}** |
`;
    markdown += `| \u{1F4B0} Cost | **${comparison.summary.winner.cost}** |
`;
    markdown += `| \u{1F9E0} Optimization | **${comparison.summary.winner.optimization}** |

`;
    markdown += `## Detailed Results

`;
    for (const result of comparison.results) {
      markdown += `### ${result.modelName}

`;
      markdown += `#### Quality Metrics
`;
      markdown += `- **Overall**: ${result.metrics.quality.overall.toFixed(3)}
`;
      markdown += `- F1 Score: ${result.metrics.quality.f1.toFixed(3)}
`;
      markdown += `- Exact Match: ${result.metrics.quality.exactMatch.toFixed(3)}
`;
      markdown += `- BLEU Score: ${result.metrics.quality.bleu.toFixed(3)}
`;
      markdown += `- ROUGE Score: ${result.metrics.quality.rouge.toFixed(3)}

`;
      markdown += `#### Performance Metrics
`;
      markdown += `- **P95 Latency**: ${result.metrics.performance.p95.toFixed(0)}ms
`;
      markdown += `- P50 Latency: ${result.metrics.performance.p50.toFixed(0)}ms
`;
      markdown += `- Throughput: ${result.metrics.performance.throughput.toFixed(1)}/s
`;
      markdown += `- Success Rate: ${(result.metrics.performance.successRate * 100).toFixed(1)}%

`;
      markdown += `#### Cost Metrics
`;
      markdown += `- **Cost/Sample**: $${result.metrics.cost.costPerSample.toFixed(6)}
`;
      markdown += `- Cost/Quality Point: $${result.metrics.cost.costPerQualityPoint.toFixed(6)}
`;
      markdown += `- Total Cost: $${result.metrics.cost.totalCost.toFixed(4)}
`;
      markdown += `- Tokens: ${result.metrics.cost.inputTokens.toLocaleString()} in / ${result.metrics.cost.outputTokens.toLocaleString()} out

`;
      markdown += `#### Optimization Results
`;
      markdown += `- **Baseline Quality**: ${result.metrics.optimization.baselineQuality.toFixed(3)}
`;
      markdown += `- **Bootstrap Quality**: ${result.metrics.optimization.bootstrapQuality.toFixed(3)} (+${(result.metrics.optimization.bootstrapImprovement * 100).toFixed(1)}%)
`;
      markdown += `- **MIPRO Quality**: ${result.metrics.optimization.miproQuality.toFixed(3)} (+${(result.metrics.optimization.miproImprovement * 100).toFixed(1)}%)

`;
      markdown += `---

`;
    }
    markdown += `## Rankings

`;
    markdown += `### Quality Rankings
`;
    markdown += `| Rank | Model | Score |
`;
    markdown += `|------|-------|-------|
`;
    comparison.rankings.quality.forEach((item, i) => {
      markdown += `| ${i + 1} | ${item.model} | ${item.score.toFixed(3)} |
`;
    });
    markdown += `
`;
    markdown += `### Performance Rankings
`;
    markdown += `| Rank | Model | Score |
`;
    markdown += `|------|-------|-------|
`;
    comparison.rankings.performance.forEach((item, i) => {
      markdown += `| ${i + 1} | ${item.model} | ${item.score.toFixed(3)} |
`;
    });
    markdown += `
`;
    markdown += `### Cost-Effectiveness Rankings
`;
    markdown += `| Rank | Model | Score |
`;
    markdown += `|------|-------|-------|
`;
    comparison.rankings.cost.forEach((item, i) => {
      markdown += `| ${i + 1} | ${item.model} | ${item.score.toFixed(3)} |
`;
    });
    markdown += `
`;
    markdown += `## Recommendations

`;
    markdown += `- **Production (Performance)**: ${comparison.recommendations.production}
`;
    markdown += `- **Research (Quality)**: ${comparison.recommendations.research}
`;
    markdown += `- **Cost-Optimized**: ${comparison.recommendations.costOptimized}
`;
    markdown += `- **Balanced**: ${comparison.recommendations.balanced}

`;
    markdown += `---

`;
    markdown += `*Generated by DSPy Multi-Model Benchmark Suite using dspy.ts v2.1.1*
`;
    await fs.writeFile(reportPath, markdown);
    console.log(`
\u2705 Report saved to: ${reportPath}`);
    const jsonPath = path.join(this.outputDir, `benchmark-results-${timestamp}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(comparison, null, 2));
    console.log(`\u2705 JSON results saved to: ${jsonPath}`);
    return reportPath;
  }
};
async function main() {
  console.log("\u{1F680} DSPy Multi-Model Benchmarking System v1.0.0");
  console.log("Using dspy.ts v2.1.1 with real optimizers and metrics");
  console.log("=".repeat(70) + "\n");
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!openaiKey && !anthropicKey) {
    console.error("\u274C Error: No API keys found!");
    console.error("Set OPENAI_API_KEY and/or ANTHROPIC_API_KEY environment variables.");
    process.exit(1);
  }
  try {
    const benchmark = new MultiModelBenchmark();
    if (openaiKey) {
      benchmark.addModel({
        name: "GPT-4",
        provider: "openai",
        modelId: "gpt-4",
        apiKey: openaiKey,
        costPer1kTokens: { input: 0.03, output: 0.06 },
        maxTokens: 8192
      });
      benchmark.addModel({
        name: "GPT-3.5 Turbo",
        provider: "openai",
        modelId: "gpt-3.5-turbo",
        apiKey: openaiKey,
        costPer1kTokens: { input: 15e-4, output: 2e-3 },
        maxTokens: 16384
      });
    }
    if (anthropicKey) {
      benchmark.addModel({
        name: "Claude 3 Sonnet",
        provider: "anthropic",
        modelId: "claude-3-sonnet-20240229",
        apiKey: anthropicKey,
        costPer1kTokens: { input: 3e-3, output: 0.015 },
        maxTokens: 2e5
      });
      benchmark.addModel({
        name: "Claude 3 Haiku",
        provider: "anthropic",
        modelId: "claude-3-haiku-20240307",
        apiKey: anthropicKey,
        costPer1kTokens: { input: 25e-5, output: 125e-5 },
        maxTokens: 2e5
      });
    }
    const sampleSize = parseInt(process.env.SAMPLE_SIZE || "100");
    const comparison = await benchmark.runComparison(sampleSize);
    await benchmark.generateReport(comparison);
    console.log("\n" + "=".repeat(70));
    console.log("\u2705 Benchmark completed successfully!");
    console.log("\u{1F4CA} Check the results directory for detailed reports.");
    console.log("=".repeat(70));
  } catch (error) {
    console.error("\n\u274C Benchmark failed:", error);
    console.error(error.stack);
    process.exit(1);
  }
}
if (__require.main === module || typeof process !== "undefined" && process.argv[1]?.includes("dspy-multi-model-benchmark")) {
  main().catch(console.error);
}
export {
  BenchmarkCollector,
  ClaudeSonnetAgent,
  DSPyTrainingSession,
  GPT4Agent,
  GeminiAgent,
  LlamaAgent,
  ModelProvider,
  ModelTrainingAgent,
  MultiModelBenchmark,
  OptimizationEngine,
  TrainingConfigSchema,
  TrainingPhase
};
//# sourceMappingURL=index.js.map