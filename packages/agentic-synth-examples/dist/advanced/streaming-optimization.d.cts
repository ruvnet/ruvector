import { AgenticSynth } from '@ruvector/agentic-synth';

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

/**
 * Model configuration interface for streaming optimization
 */
interface StreamingModelConfig {
    provider: 'gemini' | 'openrouter';
    model: string;
    name: string;
    weight: number;
    apiKey?: string;
}
/**
 * Benchmark result interface for streaming optimization
 */
interface StreamingBenchmarkResult {
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
interface StreamingQualityMetrics {
    overall: number;
    completeness: number;
    dataTypes: number;
    consistency: number;
    realism: number;
}
/**
 * Optimization result interface
 */
interface StreamingOptimizationResult {
    iterations: StreamingBenchmarkResult[][];
    modelPerformance: Record<string, StreamingPerformanceHistory[]>;
    optimalModel: string | null;
    improvementRate: number;
}
/**
 * Performance history interface for streaming optimization
 */
interface StreamingPerformanceHistory {
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
declare class StreamingOptimization {
    private models;
    private performanceHistory;
    private optimizedPrompts;
    private learningRate;
    private bestModel;
    /**
     * Create a new streaming optimization engine
     *
     * @param customModels - Optional custom model configurations
     */
    constructor(customModels?: StreamingModelConfig[]);
    /**
     * Display a banner in the console
     */
    private banner;
    /**
     * Create a progress bar
     */
    private progressBar;
    /**
     * Initialize AI generators for all configured models
     */
    initializeGenerators(apiKeys: Record<string, string>): Promise<Record<string, AgenticSynth>>;
    /**
     * Benchmark a single model
     */
    benchmarkModel(generator: AgenticSynth, modelName: string, schema: Record<string, any>, count?: number): Promise<StreamingBenchmarkResult>;
    /**
     * Assess the quality of generated data
     */
    private assessQuality;
    /**
     * Update model weights based on performance (reinforcement learning)
     */
    private updateModelWeights;
    /**
     * Run optimization with adaptive learning
     */
    optimizeWithLearning(generators: Record<string, AgenticSynth>, schema: Record<string, any>, iterations?: number): Promise<StreamingOptimizationResult>;
    /**
     * Run the complete optimization pipeline
     */
    run(options: {
        schema: Record<string, any>;
        iterations?: number;
        apiKeys?: Record<string, string>;
    }): Promise<StreamingOptimizationResult>;
    /**
     * Display final analysis
     */
    private displayFinalAnalysis;
}
/**
 * Example usage
 */
declare function runStreamingOptimizationExample(): Promise<StreamingOptimizationResult>;

export { type StreamingBenchmarkResult, type StreamingModelConfig, StreamingOptimization, type StreamingOptimizationResult, type StreamingPerformanceHistory, type StreamingQualityMetrics, runStreamingOptimizationExample };
