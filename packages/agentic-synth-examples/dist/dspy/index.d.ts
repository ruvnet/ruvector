import { EventEmitter } from 'events';
import { z } from 'zod';

/**
 * DSPy.ts Learning Session - Advanced Multi-Model Training Framework
 *
 * Production-ready implementation for concurrent AI model training with:
 * - DSPy-powered prompt optimization
 * - Multi-model parallel training (Claude, GPT-4, Llama, Gemini)
 * - Automatic quality improvement loops
 * - Real-time metrics and cost tracking
 * - Convergence detection and cross-model learning
 * - Hooks integration for swarm coordination
 *
 * @packageDocumentation
 */

/**
 * Supported AI model providers
 */
declare enum ModelProvider {
    CLAUDE = "claude",
    GPT4 = "gpt4",
    LLAMA = "llama",
    GEMINI = "gemini"
}
/**
 * Training phase states
 */
declare enum TrainingPhase {
    BASELINE = "baseline",
    OPTIMIZATION = "optimization",
    CROSS_LEARNING = "cross_learning",
    BENCHMARK = "benchmark",
    REPORT = "report"
}
/**
 * Model quality metrics
 */
interface QualityMetrics {
    score: number;
    accuracy: number;
    coherence: number;
    relevance: number;
    diversity: number;
    creativity: number;
}
/**
 * Model performance metrics
 */
interface PerformanceMetrics {
    latency: number;
    throughput: number;
    tokensUsed: number;
    cost: number;
    memoryUsage: number;
    errorRate: number;
}
/**
 * Training iteration result
 */
interface IterationResult {
    iteration: number;
    phase: TrainingPhase;
    modelProvider: ModelProvider;
    quality: QualityMetrics;
    performance: PerformanceMetrics;
    timestamp: Date;
    prompt: string;
    output: string;
    optimizations: string[];
}
/**
 * Model training configuration
 */
interface ModelConfig$1 {
    provider: ModelProvider;
    model: string;
    apiKey: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
}
/**
 * DSPy signature for prompt optimization
 */
interface DSPySignature {
    input: string;
    output: string;
    examples?: Array<{
        input: string;
        output: string;
    }>;
    constraints?: string[];
    objectives?: string[];
}
/**
 * Training session configuration
 */
interface TrainingConfig {
    models: ModelConfig$1[];
    optimizationRounds?: number;
    convergenceThreshold?: number;
    maxConcurrency?: number;
    enableCrossLearning?: boolean;
    enableHooksIntegration?: boolean;
    costBudget?: number;
    timeoutPerIteration?: number;
    baselineIterations?: number;
    benchmarkSamples?: number;
}
declare const TrainingConfigSchema: z.ZodObject<{
    models: z.ZodArray<z.ZodObject<{
        provider: z.ZodEnum<typeof ModelProvider>;
        model: z.ZodString;
        apiKey: z.ZodString;
        temperature: z.ZodOptional<z.ZodNumber>;
        maxTokens: z.ZodOptional<z.ZodNumber>;
        topP: z.ZodOptional<z.ZodNumber>;
        presencePenalty: z.ZodOptional<z.ZodNumber>;
        frequencyPenalty: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    optimizationRounds: z.ZodDefault<z.ZodNumber>;
    convergenceThreshold: z.ZodDefault<z.ZodNumber>;
    maxConcurrency: z.ZodDefault<z.ZodNumber>;
    enableCrossLearning: z.ZodDefault<z.ZodBoolean>;
    enableHooksIntegration: z.ZodDefault<z.ZodBoolean>;
    costBudget: z.ZodOptional<z.ZodNumber>;
    timeoutPerIteration: z.ZodDefault<z.ZodNumber>;
    baselineIterations: z.ZodDefault<z.ZodNumber>;
    benchmarkSamples: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
/**
 * Abstract base class for all model-specific training agents
 */
declare abstract class ModelTrainingAgent extends EventEmitter {
    protected config: ModelConfig$1;
    protected results: IterationResult[];
    protected currentIteration: number;
    protected totalCost: number;
    protected isConverged: boolean;
    constructor(config: ModelConfig$1);
    /**
     * Execute a single training iteration
     */
    abstract execute(prompt: string, signature: DSPySignature): Promise<IterationResult>;
    /**
     * Calculate quality metrics for generated output
     */
    protected calculateQuality(output: string, expectedSignature: DSPySignature): Promise<QualityMetrics>;
    /**
     * Calculate performance metrics
     */
    protected calculatePerformance(startTime: number, endTime: number, tokensUsed: number): PerformanceMetrics;
    /**
     * Calculate cost based on tokens used
     */
    protected calculateCost(tokensUsed: number): number;
    /**
     * Get cost per 1K tokens for this model
     */
    protected abstract getCostPer1KTokens(): number;
    /**
     * Get current results
     */
    getResults(): IterationResult[];
    /**
     * Get total cost
     */
    getTotalCost(): number;
    /**
     * Check if converged
     */
    hasConverged(): boolean;
    /**
     * Calculate overall quality score
     */
    private calculateOverallScore;
    private calculateAccuracy;
    private calculateCoherence;
    private calculateRelevance;
    private calculateDiversity;
    private calculateCreativity;
    private checkConstraint;
    private calculateErrorRate;
}
/**
 * Claude Sonnet training agent
 */
declare class ClaudeSonnetAgent extends ModelTrainingAgent {
    execute(prompt: string, signature: DSPySignature): Promise<IterationResult>;
    private callClaudeAPI;
    private estimateTokens;
    protected getCostPer1KTokens(): number;
}
/**
 * GPT-4 training agent
 */
declare class GPT4Agent extends ModelTrainingAgent {
    execute(prompt: string, signature: DSPySignature): Promise<IterationResult>;
    private callGPT4API;
    private estimateTokens;
    protected getCostPer1KTokens(): number;
}
/**
 * Llama training agent
 */
declare class LlamaAgent extends ModelTrainingAgent {
    execute(prompt: string, signature: DSPySignature): Promise<IterationResult>;
    private callLlamaAPI;
    private estimateTokens;
    protected getCostPer1KTokens(): number;
}
/**
 * Gemini training agent
 */
declare class GeminiAgent extends ModelTrainingAgent {
    execute(prompt: string, signature: DSPySignature): Promise<IterationResult>;
    private callGeminiAPI;
    private estimateTokens;
    protected getCostPer1KTokens(): number;
}
/**
 * Collects and aggregates metrics across all training iterations
 */
declare class BenchmarkCollector {
    private metrics;
    /**
     * Add result to collection
     */
    addResult(result: IterationResult): void;
    /**
     * Get metrics for specific model
     */
    getModelMetrics(provider: ModelProvider): IterationResult[];
    /**
     * Calculate aggregate statistics
     */
    getAggregateStats(provider: ModelProvider): {
        provider: ModelProvider;
        totalIterations: number;
        avgQualityScore: number;
        minQualityScore: number;
        maxQualityScore: number;
        avgLatency: number;
        minLatency: number;
        maxLatency: number;
        totalCost: number;
        avgCostPer1K: number;
        convergenceRate: number;
        improvementRate: number;
    } | null;
    /**
     * Get comparison across all models
     */
    getComparison(): Record<string, any>;
    /**
     * Get best performing model
     */
    getBestModel(): ModelProvider | null;
    /**
     * Generate detailed report
     */
    generateReport(): string;
    private average;
    private calculateConvergenceRate;
    private calculateImprovementRate;
}
/**
 * DSPy-powered prompt optimization engine
 */
declare class OptimizationEngine {
    private signatures;
    private optimizationHistory;
    /**
     * Create a new DSPy signature
     */
    createSignature(name: string, input: string, output: string, options?: {
        examples?: Array<{
            input: string;
            output: string;
        }>;
        constraints?: string[];
        objectives?: string[];
    }): DSPySignature;
    /**
     * Optimize prompt based on previous results
     */
    optimizePrompt(basePrompt: string, results: IterationResult[], signature: DSPySignature): Promise<string>;
    /**
     * Enable cross-model learning
     */
    crossModelOptimization(allResults: Map<ModelProvider, IterationResult[]>): Promise<Map<ModelProvider, string>>;
    private addExamples;
    private addConstraints;
    private addObjectives;
    private incorporateBestPractices;
    private extractCommonPhrases;
    private mergePromptStrategies;
}
/**
 * Main DSPy training session orchestrator
 */
declare class DSPyTrainingSession extends EventEmitter {
    private config;
    private agents;
    private collector;
    private optimizer;
    private currentPhase;
    private startTime;
    private totalCost;
    constructor(config: TrainingConfig);
    /**
     * Initialize model agents
     */
    private initializeAgents;
    /**
     * Run complete training pipeline
     */
    run(basePrompt: string, signature: DSPySignature): Promise<void>;
    /**
     * Phase 1: Baseline generation (all models)
     */
    private runBaseline;
    /**
     * Phase 2: DSPy optimization (5 rounds per model)
     */
    private runOptimization;
    /**
     * Phase 3: Cross-model learning (share best patterns)
     */
    private runCrossLearning;
    /**
     * Phase 4: Final benchmark comparison
     */
    private runBenchmark;
    /**
     * Phase 5: Generate comprehensive report
     */
    private generateReport;
    /**
     * Handle iteration results
     */
    private handleIteration;
    /**
     * Integrate with Claude Flow hooks for swarm coordination
     */
    private integrateWithHooks;
    /**
     * Get current session statistics
     */
    getStatistics(): {
        currentPhase: TrainingPhase;
        totalCost: number;
        duration: number;
        bestModel: ModelProvider | null;
        comparison: Record<string, any>;
    };
    /**
     * Stop training session
     */
    stop(): void;
}

/**
 * DSPy.ts Multi-Model Benchmarking System v1.0.0
 *
 * Comprehensive benchmarking suite comparing multiple models across:
 * - Quality metrics (f1Score, exactMatch, bleuScore, rougeScore)
 * - Optimization strategies (BootstrapFewShot, MIPROv2)
 * - Cost-effectiveness analysis
 * - Performance characteristics
 *
 * Real-world implementation using actual dspy.ts v2.1.1 features:
 * - ChainOfThought for reasoning
 * - ReAct for iterative improvement
 * - MultiChainComparison for ensemble decisions
 * - BootstrapFewShot & MIPROv2 optimizers
 *
 * @requires dspy.ts@2.1.1
 * @requires Environment: OPENAI_API_KEY, ANTHROPIC_API_KEY
 */
declare const ChainOfThought: any;
interface ModelConfig {
    name: string;
    provider: 'openai' | 'anthropic' | 'openrouter';
    modelId: string;
    apiKey: string;
    costPer1kTokens: {
        input: number;
        output: number;
    };
    maxTokens: number;
}
interface BenchmarkMetrics {
    quality: {
        f1: number;
        exactMatch: number;
        bleu: number;
        rouge: number;
        overall: number;
    };
    performance: {
        avgLatency: number;
        p50: number;
        p95: number;
        p99: number;
        throughput: number;
        successRate: number;
    };
    cost: {
        totalCost: number;
        costPerSample: number;
        costPerQualityPoint: number;
        inputTokens: number;
        outputTokens: number;
    };
    optimization: {
        baselineQuality: number;
        bootstrapQuality: number;
        miproQuality: number;
        bootstrapImprovement: number;
        miproImprovement: number;
    };
}
interface BenchmarkResult {
    modelName: string;
    timestamp: string;
    metrics: BenchmarkMetrics;
    optimizationHistory: {
        method: 'baseline' | 'bootstrap' | 'mipro';
        round: number;
        quality: number;
        duration: number;
    }[];
    sampleSize: number;
    duration: number;
}
interface ComparisonReport {
    summary: {
        winner: {
            quality: string;
            performance: string;
            cost: string;
            optimization: string;
            overall: string;
        };
        modelsCompared: number;
        totalSamples: number;
        totalDuration: number;
    };
    results: BenchmarkResult[];
    rankings: {
        quality: {
            model: string;
            score: number;
        }[];
        performance: {
            model: string;
            score: number;
        }[];
        cost: {
            model: string;
            score: number;
        }[];
        optimization: {
            model: string;
            score: number;
        }[];
    };
    recommendations: {
        production: string;
        research: string;
        costOptimized: string;
        balanced: string;
    };
}
/**
 * Synthetic Data Generator using Chain of Thought
 */
declare class SyntheticDataModule extends ChainOfThought {
    constructor();
}
declare class MultiModelBenchmark {
    private models;
    private results;
    private outputDir;
    constructor(outputDir?: string);
    /**
     * Register a model for benchmarking
     */
    addModel(config: ModelConfig): void;
    /**
     * Run comprehensive comparison across all models
     */
    runComparison(sampleSize?: number): Promise<ComparisonReport>;
    /**
     * Benchmark a single model
     */
    private benchmarkModel;
    /**
     * Optimize with BootstrapFewShot
     */
    optimizeWithBootstrap(module: SyntheticDataModule, schema: any, sampleSize: number): Promise<SyntheticDataModule>;
    /**
     * Optimize with MIPROv2
     */
    optimizeWithMIPRO(module: SyntheticDataModule, schema: any, sampleSize: number): Promise<SyntheticDataModule>;
    /**
     * Evaluate module quality
     */
    private evaluateModule;
    /**
     * Measure performance metrics
     */
    private measurePerformance;
    /**
     * Generate training dataset
     */
    private generateTrainingSet;
    /**
     * Generate sample synthetic data
     */
    private generateSampleData;
    /**
     * Calculate quality score for synthetic data
     */
    private calculateQualityScore;
    /**
     * Calculate percentile
     */
    private percentile;
    /**
     * Generate comparison report
     */
    private generateComparisonReport;
    /**
     * Generate and save markdown report
     */
    generateReport(comparison: ComparisonReport): Promise<string>;
}

export { BenchmarkCollector, type BenchmarkMetrics, type ModelConfig as BenchmarkModelConfig, type BenchmarkResult, ClaudeSonnetAgent, type ComparisonReport, type DSPySignature, DSPyTrainingSession, GPT4Agent, GeminiAgent, type IterationResult, LlamaAgent, type ModelConfig$1 as ModelConfig, ModelProvider, ModelTrainingAgent, MultiModelBenchmark, OptimizationEngine, type PerformanceMetrics, type QualityMetrics, type TrainingConfig, TrainingConfigSchema, TrainingPhase };
