import { EventEmitter } from 'events';
import { SynthConfig, GeneratorOptions, GenerationResult, AgenticSynth } from '@ruvector/agentic-synth';

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
interface PerformanceMetrics$1 {
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
    performance: PerformanceMetrics$1;
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
    protected calculatePerformance(startTime: number, endTime: number, tokensUsed: number): PerformanceMetrics$1;
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

/**
 * Self-Learning Generator - Adaptive data generation with feedback loops
 *
 * This generator improves its output quality over time by learning from feedback
 * and tracking performance metrics. It demonstrates how synthetic data generation
 * can evolve and adapt based on usage patterns and quality assessments.
 *
 * @packageDocumentation
 */

/**
 * Feedback data structure for learning improvements
 */
interface FeedbackData {
    generationId: string;
    quality: number;
    timestamp: Date;
    corrections?: Record<string, unknown>;
    comments?: string;
}
/**
 * Learning metrics tracking improvements over time
 */
interface LearningMetrics {
    totalGenerations: number;
    averageQuality: number;
    improvementRate: number;
    feedbackCount: number;
    lastUpdated: Date;
}
/**
 * Configuration for self-learning behavior
 */
interface SelfLearningConfig extends Partial<SynthConfig> {
    learningRate?: number;
    qualityThreshold?: number;
    feedbackWindowSize?: number;
    autoAdapt?: boolean;
}
/**
 * Generation history entry
 */
interface GenerationHistory {
    id: string;
    timestamp: Date;
    options: GeneratorOptions;
    result: GenerationResult;
    feedback?: FeedbackData;
}
/**
 * Self-Learning Generator with adaptive improvement
 *
 * Features:
 * - Tracks generation quality over time
 * - Learns from user feedback
 * - Adapts prompts and parameters based on performance
 * - Emits progress events for monitoring
 *
 * @example
 * ```typescript
 * const generator = new SelfLearningGenerator({
 *   provider: 'gemini',
 *   apiKey: process.env.GEMINI_API_KEY,
 *   learningRate: 0.3,
 *   autoAdapt: true
 * });
 *
 * // Generate with learning
 * const result = await generator.generateWithLearning({
 *   count: 10,
 *   schema: { name: { type: 'string' }, age: { type: 'number' } }
 * });
 *
 * // Provide feedback
 * await generator.provideFeedback(result.metadata.generationId, {
 *   quality: 0.85,
 *   comments: 'Good quality, names are realistic'
 * });
 *
 * // Get metrics
 * const metrics = generator.getMetrics();
 * console.log(`Average quality: ${metrics.averageQuality}`);
 * ```
 */
declare class SelfLearningGenerator extends EventEmitter {
    private synth;
    private config;
    private history;
    private metrics;
    private feedbackBuffer;
    constructor(config?: SelfLearningConfig);
    /**
     * Generate data with learning integration
     */
    generateWithLearning<T = unknown>(options: GeneratorOptions): Promise<GenerationResult<T> & {
        generationId: string;
    }>;
    /**
     * Provide feedback for a generation to improve future outputs
     */
    provideFeedback(generationId: string, feedback: Omit<FeedbackData, 'generationId' | 'timestamp'>): Promise<void>;
    /**
     * Adapt generation strategy based on feedback
     */
    private adapt;
    /**
     * Adapt generation options based on learning
     */
    private adaptOptions;
    /**
     * Update metrics based on feedback
     */
    private updateMetrics;
    /**
     * Get current learning metrics
     */
    getMetrics(): LearningMetrics;
    /**
     * Get generation history
     */
    getHistory(limit?: number): GenerationHistory[];
    /**
     * Reset learning state
     */
    reset(): void;
    /**
     * Export learning data for persistence
     */
    export(): {
        config: SelfLearningConfig;
        metrics: LearningMetrics;
        historyCount: number;
    };
    /**
     * Generate unique ID for tracking
     */
    private generateId;
}

/**
 * Stock Market Simulator - Realistic financial market data generation
 *
 * Generates OHLCV (Open, High, Low, Close, Volume) data with realistic market
 * dynamics, news events, and sentiment analysis. Perfect for backtesting trading
 * strategies and financial ML models.
 *
 * @packageDocumentation
 */

/**
 * OHLCV candlestick data point
 */
interface OHLCVData {
    timestamp: Date;
    symbol: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    vwap?: number;
}
/**
 * Market news event
 */
interface MarketNewsEvent {
    timestamp: Date;
    headline: string;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    impact: 'low' | 'medium' | 'high';
    affectedSymbols: string[];
}
/**
 * Market condition type
 */
type MarketCondition = 'bullish' | 'bearish' | 'sideways' | 'volatile' | 'crash' | 'rally';
/**
 * Stock market simulation configuration
 */
interface StockMarketConfig extends Partial<SynthConfig> {
    symbols?: string[];
    startPrice?: number;
    volatility?: number;
    marketCondition?: MarketCondition;
    includeNews?: boolean;
    newsFrequency?: number;
    tradingHours?: boolean;
}
/**
 * Market statistics
 */
interface MarketStatistics {
    totalCandles: number;
    avgVolume: number;
    priceChange: number;
    priceChangePercent: number;
    volatility: number;
    newsEvents: number;
}
/**
 * Stock Market Simulator with realistic OHLCV generation
 *
 * Features:
 * - Realistic OHLCV candlestick data
 * - Multiple market conditions (bull, bear, sideways, etc.)
 * - News event generation with sentiment
 * - Volume patterns and trends
 * - Trading hours simulation
 * - Statistical analysis
 *
 * @example
 * ```typescript
 * const simulator = new StockMarketSimulator({
 *   provider: 'gemini',
 *   apiKey: process.env.GEMINI_API_KEY,
 *   symbols: ['AAPL', 'GOOGL', 'MSFT'],
 *   marketCondition: 'bullish',
 *   includeNews: true
 * });
 *
 * // Generate market data
 * const result = await simulator.generateMarketData({
 *   startDate: new Date('2024-01-01'),
 *   endDate: new Date('2024-12-31'),
 *   interval: '1h'
 * });
 *
 * // Get news events
 * const news = await simulator.generateNewsEvents(10);
 *
 * // Analyze statistics
 * const stats = simulator.getStatistics();
 * console.log(`Total candles: ${stats.totalCandles}`);
 * ```
 */
declare class StockMarketSimulator extends EventEmitter {
    private synth;
    private config;
    private generatedCandles;
    private newsEvents;
    private currentPrice;
    constructor(config?: StockMarketConfig);
    /**
     * Generate realistic OHLCV market data
     */
    generateMarketData(options?: {
        startDate?: Date;
        endDate?: Date;
        interval?: string;
        symbol?: string;
    }): Promise<GenerationResult<OHLCVData>>;
    /**
     * Generate market news events with sentiment
     */
    generateNewsEvents(count?: number): Promise<MarketNewsEvent[]>;
    /**
     * Generate multi-symbol market data in parallel
     */
    generateMultiSymbolData(options?: {
        startDate?: Date;
        endDate?: Date;
        interval?: string;
    }): Promise<Map<string, OHLCVData[]>>;
    /**
     * Get market statistics
     */
    getStatistics(symbol?: string): MarketStatistics;
    /**
     * Export market data to CSV format
     */
    exportToCSV(symbol?: string): string;
    /**
     * Reset simulator state
     */
    reset(): void;
    /**
     * Convert generated data to OHLCV format
     */
    private convertToOHLCV;
    /**
     * Filter candles to trading hours only (9:30 AM - 4:00 PM ET)
     */
    private filterTradingHours;
    /**
     * Map market condition to trend direction
     */
    private mapMarketConditionToTrend;
    /**
     * Parse sentiment string to typed value
     */
    private parseSentiment;
    /**
     * Parse impact string to typed value
     */
    private parseImpact;
}

/**
 * Security Testing Generator - Penetration testing and vulnerability data
 *
 * Generates realistic security testing scenarios, vulnerability data, attack patterns,
 * and log analytics for testing security systems, training ML models, and conducting
 * security research.
 *
 * @packageDocumentation
 */

/**
 * Vulnerability severity levels
 */
type VulnerabilitySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
/**
 * Common vulnerability types
 */
type VulnerabilityType = 'sql-injection' | 'xss' | 'csrf' | 'rce' | 'path-traversal' | 'authentication-bypass' | 'privilege-escalation' | 'dos' | 'information-disclosure' | 'misconfiguration';
/**
 * Vulnerability test case
 */
interface VulnerabilityTestCase {
    id: string;
    type: VulnerabilityType;
    severity: VulnerabilitySeverity;
    description: string;
    target: string;
    payload: string;
    expectedResult: string;
    cwe?: string;
    cvss?: number;
}
/**
 * Security log entry
 */
interface SecurityLogEntry {
    timestamp: Date;
    level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
    source: string;
    eventType: string;
    message: string;
    ip?: string;
    user?: string;
    details?: Record<string, unknown>;
}
/**
 * Anomaly detection pattern
 */
interface AnomalyPattern {
    id: string;
    type: 'brute-force' | 'port-scan' | 'data-exfiltration' | 'privilege-abuse' | 'suspicious-traffic';
    confidence: number;
    indicators: string[];
    affectedResources: string[];
    timeline: Date[];
}
/**
 * Penetration testing scenario
 */
interface PenetrationTestScenario {
    id: string;
    name: string;
    objective: string;
    targetSystem: string;
    attackVector: string;
    steps: Array<{
        step: number;
        action: string;
        tool?: string;
        command?: string;
        expectedOutcome: string;
    }>;
    successCriteria: string[];
    mitigations: string[];
}
/**
 * Security testing configuration
 */
interface SecurityTestingConfig extends Partial<SynthConfig> {
    targetTypes?: string[];
    includePayloads?: boolean;
    severityFilter?: VulnerabilitySeverity[];
    logFormat?: 'json' | 'syslog' | 'custom';
}
/**
 * Security Testing Generator for penetration testing and vulnerability research
 *
 * Features:
 * - Vulnerability test case generation
 * - Penetration testing scenarios
 * - Security log analytics data
 * - Anomaly detection patterns
 * - Attack simulation data
 * - CVSS scoring and CWE mapping
 *
 * @example
 * ```typescript
 * const generator = new SecurityTestingGenerator({
 *   provider: 'gemini',
 *   apiKey: process.env.GEMINI_API_KEY,
 *   includePayloads: true,
 *   severityFilter: ['critical', 'high']
 * });
 *
 * // Generate vulnerability test cases
 * const vulns = await generator.generateVulnerabilities({
 *   count: 20,
 *   types: ['sql-injection', 'xss', 'rce']
 * });
 *
 * // Generate security logs
 * const logs = await generator.generateSecurityLogs({
 *   count: 1000,
 *   startDate: new Date('2024-01-01'),
 *   includeAnomalies: true
 * });
 *
 * // Create penetration test scenario
 * const scenario = await generator.generatePentestScenario({
 *   target: 'web-application',
 *   complexity: 'advanced'
 * });
 * ```
 */
declare class SecurityTestingGenerator extends EventEmitter {
    private synth;
    private config;
    private generatedVulnerabilities;
    private generatedLogs;
    private detectedAnomalies;
    constructor(config?: SecurityTestingConfig);
    /**
     * Generate vulnerability test cases
     */
    generateVulnerabilities(options?: {
        count?: number;
        types?: VulnerabilityType[];
        severity?: VulnerabilitySeverity;
    }): Promise<GenerationResult<VulnerabilityTestCase>>;
    /**
     * Generate security log entries
     */
    generateSecurityLogs(options?: {
        count?: number;
        startDate?: Date;
        endDate?: Date;
        includeAnomalies?: boolean;
        sources?: string[];
    }): Promise<GenerationResult<SecurityLogEntry>>;
    /**
     * Generate penetration testing scenario
     */
    generatePentestScenario(options?: {
        target?: string;
        complexity?: 'basic' | 'intermediate' | 'advanced';
        objective?: string;
    }): Promise<PenetrationTestScenario>;
    /**
     * Detect anomaly patterns in logs
     */
    detectAnomalies(logs?: SecurityLogEntry[]): Promise<AnomalyPattern[]>;
    /**
     * Get security statistics
     */
    getStatistics(): {
        totalVulnerabilities: number;
        criticalCount: number;
        totalLogs: number;
        anomalyCount: number;
        severityDistribution: Record<VulnerabilitySeverity, number>;
    };
    /**
     * Export logs to specified format
     */
    exportLogs(format?: 'json' | 'csv'): string;
    /**
     * Reset generator state
     */
    reset(): void;
    /**
     * Inject anomalies into log data
     */
    private injectAnomalies;
    /**
     * Parse log level string
     */
    private parseLogLevel;
    /**
     * Generate unique ID
     */
    private generateId;
}

/**
 * CI/CD Data Generator - Pipeline testing and deployment simulation
 *
 * Generates realistic CI/CD pipeline data including build results, test outcomes,
 * deployment scenarios, performance metrics, and monitoring alerts. Perfect for
 * testing DevOps tools and ML models for CI/CD optimization.
 *
 * @packageDocumentation
 */

/**
 * Pipeline execution status
 */
type PipelineStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'skipped';
/**
 * Pipeline stage types
 */
type StageType = 'build' | 'test' | 'lint' | 'security-scan' | 'deploy' | 'rollback';
/**
 * Deployment environment
 */
type Environment = 'development' | 'staging' | 'production' | 'test';
/**
 * Pipeline execution data
 */
interface PipelineExecution {
    id: string;
    pipelineName: string;
    trigger: 'push' | 'pull-request' | 'schedule' | 'manual';
    branch: string;
    commit: string;
    author: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    status: PipelineStatus;
    stages: StageExecution[];
    artifacts?: string[];
}
/**
 * Stage execution data
 */
interface StageExecution {
    name: string;
    type: StageType;
    status: PipelineStatus;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    logs?: string[];
    errorMessage?: string;
    metrics?: Record<string, number>;
}
/**
 * Test execution results
 */
interface TestResults {
    id: string;
    pipelineId: string;
    framework: string;
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    coverage?: number;
    failedTests?: Array<{
        name: string;
        error: string;
        stackTrace?: string;
    }>;
}
/**
 * Deployment record
 */
interface DeploymentRecord {
    id: string;
    pipelineId: string;
    environment: Environment;
    version: string;
    status: 'deploying' | 'deployed' | 'failed' | 'rolled-back';
    startTime: Date;
    endTime?: Date;
    deployedBy: string;
    rollbackReason?: string;
    healthChecks?: Array<{
        name: string;
        status: 'healthy' | 'unhealthy';
        message?: string;
    }>;
}
/**
 * Performance metrics
 */
interface PerformanceMetrics {
    timestamp: Date;
    pipelineId: string;
    cpuUsage: number;
    memoryUsage: number;
    diskIO: number;
    networkIO: number;
    buildTime: number;
    testTime: number;
}
/**
 * Monitoring alert
 */
interface MonitoringAlert {
    id: string;
    timestamp: Date;
    severity: 'info' | 'warning' | 'error' | 'critical';
    source: string;
    title: string;
    message: string;
    environment: Environment;
    resolved: boolean;
    resolvedAt?: Date;
}
/**
 * CI/CD configuration
 */
interface CICDConfig extends Partial<SynthConfig> {
    pipelineNames?: string[];
    environments?: Environment[];
    failureRate?: number;
    includePerformanceData?: boolean;
    includeAlerts?: boolean;
}
/**
 * CI/CD Data Generator for pipeline testing and DevOps analytics
 *
 * Features:
 * - Pipeline execution simulation
 * - Test result generation
 * - Deployment scenario creation
 * - Performance metrics tracking
 * - Monitoring alert generation
 * - Build artifact management
 *
 * @example
 * ```typescript
 * const generator = new CICDDataGenerator({
 *   provider: 'gemini',
 *   apiKey: process.env.GEMINI_API_KEY,
 *   pipelineNames: ['backend-api', 'frontend-ui', 'mobile-app'],
 *   failureRate: 0.15,
 *   includePerformanceData: true
 * });
 *
 * // Generate pipeline executions
 * const pipelines = await generator.generatePipelineExecutions({
 *   count: 50,
 *   dateRange: { start: new Date('2024-01-01'), end: new Date() }
 * });
 *
 * // Generate test results
 * const tests = await generator.generateTestResults(pipelines[0].id);
 *
 * // Simulate deployment
 * const deployment = await generator.generateDeployment({
 *   pipelineId: pipelines[0].id,
 *   environment: 'production'
 * });
 * ```
 */
declare class CICDDataGenerator extends EventEmitter {
    private synth;
    private config;
    private executions;
    private deployments;
    private alerts;
    private metrics;
    constructor(config?: CICDConfig);
    /**
     * Generate pipeline executions
     */
    generatePipelineExecutions(options?: {
        count?: number;
        dateRange?: {
            start: Date;
            end: Date;
        };
        pipelineName?: string;
    }): Promise<GenerationResult<PipelineExecution>>;
    /**
     * Generate test results for a pipeline
     */
    generateTestResults(pipelineId: string): Promise<TestResults>;
    /**
     * Generate deployment record
     */
    generateDeployment(options: {
        pipelineId: string;
        environment: Environment;
        version?: string;
    }): Promise<DeploymentRecord>;
    /**
     * Generate performance metrics
     */
    generatePerformanceMetrics(pipelineId: string, count?: number): Promise<PerformanceMetrics[]>;
    /**
     * Generate monitoring alerts
     */
    generateAlerts(count?: number): Promise<MonitoringAlert[]>;
    /**
     * Get CI/CD statistics
     */
    getStatistics(): {
        totalExecutions: number;
        successRate: number;
        avgDuration: number;
        totalDeployments: number;
        deploymentSuccessRate: number;
        activeAlerts: number;
    };
    /**
     * Export pipeline data to JSON
     */
    exportPipelineData(): string;
    /**
     * Reset generator state
     */
    reset(): void;
    /**
     * Generate pipeline stages
     */
    private generateStages;
    /**
     * Generate commit hash
     */
    private generateCommitHash;
    /**
     * Generate unique ID
     */
    private generateId;
}

/**
 * Swarm Coordinator - Multi-agent orchestration and distributed learning
 *
 * Coordinates multiple AI agents for collaborative data generation, implements
 * distributed learning patterns, and manages agent memory systems. Demonstrates
 * advanced multi-agent coordination and collective intelligence.
 *
 * @packageDocumentation
 */

/**
 * Agent role in the swarm
 */
type AgentRole = 'generator' | 'validator' | 'optimizer' | 'coordinator' | 'learner';
/**
 * Agent state
 */
type AgentState = 'idle' | 'active' | 'busy' | 'error' | 'offline';
/**
 * Agent definition
 */
interface Agent {
    id: string;
    role: AgentRole;
    state: AgentState;
    capabilities: string[];
    performance: {
        tasksCompleted: number;
        successRate: number;
        avgResponseTime: number;
    };
    memory: AgentMemory;
}
/**
 * Agent memory for learning and context
 */
interface AgentMemory {
    shortTerm: Array<{
        timestamp: Date;
        data: unknown;
    }>;
    longTerm: Map<string, unknown>;
    learnings: Array<{
        pattern: string;
        confidence: number;
    }>;
}
/**
 * Coordination task
 */
interface CoordinationTask {
    id: string;
    type: 'generate' | 'validate' | 'optimize' | 'learn';
    priority: 'low' | 'medium' | 'high' | 'critical';
    assignedAgents: string[];
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    result?: unknown;
    startTime?: Date;
    endTime?: Date;
}
/**
 * Swarm coordination strategy
 */
type CoordinationStrategy = 'hierarchical' | 'mesh' | 'consensus' | 'leader-follower';
/**
 * Distributed learning pattern
 */
interface DistributedLearningPattern {
    id: string;
    pattern: string;
    learnedBy: string[];
    confidence: number;
    applications: number;
    lastUpdated: Date;
}
/**
 * Swarm configuration
 */
interface SwarmConfig extends Partial<SynthConfig> {
    agentCount?: number;
    strategy?: CoordinationStrategy;
    enableLearning?: boolean;
    memorySize?: number;
    syncInterval?: number;
}
/**
 * Swarm statistics
 */
interface SwarmStatistics {
    totalAgents: number;
    activeAgents: number;
    tasksCompleted: number;
    avgTaskDuration: number;
    learningPatterns: number;
    overallSuccessRate: number;
}
/**
 * Swarm Coordinator for multi-agent orchestration
 *
 * Features:
 * - Multi-agent coordination and task distribution
 * - Distributed learning and pattern sharing
 * - Agent memory management
 * - Consensus-based decision making
 * - Performance optimization
 * - Fault tolerance and recovery
 *
 * @example
 * ```typescript
 * const swarm = new SwarmCoordinator({
 *   provider: 'gemini',
 *   apiKey: process.env.GEMINI_API_KEY,
 *   agentCount: 5,
 *   strategy: 'consensus',
 *   enableLearning: true
 * });
 *
 * // Initialize agents
 * await swarm.initializeSwarm();
 *
 * // Coordinate data generation
 * const result = await swarm.coordinateGeneration({
 *   count: 100,
 *   schema: { name: { type: 'string' }, value: { type: 'number' } }
 * });
 *
 * // Get swarm statistics
 * const stats = swarm.getStatistics();
 * console.log(`Active agents: ${stats.activeAgents}`);
 *
 * // Learn from patterns
 * await swarm.sharePattern('high-quality-names', 0.95);
 * ```
 */
declare class SwarmCoordinator extends EventEmitter {
    private synth;
    private config;
    private agents;
    private tasks;
    private learningPatterns;
    private syncTimer?;
    constructor(config?: SwarmConfig);
    /**
     * Initialize the swarm with agents
     */
    initializeSwarm(): Promise<void>;
    /**
     * Coordinate data generation across multiple agents
     */
    coordinateGeneration<T = unknown>(options: GeneratorOptions): Promise<GenerationResult<T>>;
    /**
     * Share a learning pattern across the swarm
     */
    sharePattern(pattern: string, confidence: number): Promise<void>;
    /**
     * Perform consensus-based decision making
     */
    reachConsensus<T>(proposals: T[], votingAgents?: string[]): Promise<T>;
    /**
     * Get swarm statistics
     */
    getStatistics(): SwarmStatistics;
    /**
     * Get agent details
     */
    getAgent(agentId: string): Agent | undefined;
    /**
     * Get all agents
     */
    getAllAgents(): Agent[];
    /**
     * Shutdown the swarm
     */
    shutdown(): void;
    /**
     * Select agents by role
     */
    private selectAgents;
    /**
     * Validate generation result
     */
    private validateResult;
    /**
     * Optimize generation result
     */
    private optimizeResult;
    /**
     * Start memory synchronization
     */
    private startMemorySync;
    /**
     * Synchronize memory across agents
     */
    private synchronizeMemory;
    /**
     * Get capabilities for agent role
     */
    private getCapabilitiesForRole;
    /**
     * Generate unique ID
     */
    private generateId;
}

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

/**
 * @ruvector/agentic-synth-examples
 *
 * Production-ready examples for agentic-synth including:
 * - DSPy multi-model training and benchmarking
 * - Self-learning adaptive systems
 * - Stock market simulation
 * - Security testing scenarios
 * - CI/CD pipeline data generation
 * - Multi-agent swarm coordination
 */

/**
 * Factory functions for quick initialization
 */
declare const Examples: {
    /**
     * Create a self-learning generator
     */
    createSelfLearning: (config?: any) => SelfLearningGenerator;
    /**
     * Create a stock market simulator
     */
    createStockMarket: (config?: any) => StockMarketSimulator;
    /**
     * Create a security testing generator
     */
    createSecurity: (config?: any) => SecurityTestingGenerator;
    /**
     * Create a CI/CD data generator
     */
    createCICD: (config?: any) => CICDDataGenerator;
    /**
     * Create a swarm coordinator
     */
    createSwarm: (config?: any) => SwarmCoordinator;
    /**
     * Create a streaming optimization engine
     */
    createStreamingOptimization: (customModels?: any) => StreamingOptimization;
};

export { type Agent, type AgentMemory, type AgentRole, type AnomalyPattern, BenchmarkCollector, type BenchmarkMetrics, type BenchmarkResult, CICDDataGenerator, type PerformanceMetrics as CICDPerformanceMetrics, ClaudeSonnetAgent, type ComparisonReport, type CoordinationStrategy, type CoordinationTask, type DSPySignature, DSPyTrainingSession, type DeploymentRecord, type DistributedLearningPattern, Examples, type FeedbackData, GPT4Agent, GeminiAgent, type IterationResult, type LearningMetrics, LlamaAgent, type MarketCondition, type MarketNewsEvent, type MarketStatistics, type ModelConfig$1 as ModelConfig, ModelProvider, ModelTrainingAgent, type MonitoringAlert, MultiModelBenchmark, type OHLCVData, OptimizationEngine, type PenetrationTestScenario, type PerformanceMetrics$1 as PerformanceMetrics, type PipelineExecution, type PipelineStatus, type QualityMetrics, type SecurityLogEntry, SecurityTestingGenerator, type SelfLearningConfig, SelfLearningGenerator, type StockMarketConfig, StockMarketSimulator, type StreamingBenchmarkResult, type StreamingModelConfig, StreamingOptimization, type StreamingOptimizationResult, type StreamingPerformanceHistory, type StreamingQualityMetrics, SwarmCoordinator, type SwarmStatistics, type TestResults, type TrainingConfig, TrainingPhase, type VulnerabilitySeverity, type VulnerabilityTestCase, type VulnerabilityType, runStreamingOptimizationExample };
