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
 * 2026 US Midterm Election Simulation Types
 *
 * Comprehensive type definitions for state-of-the-art election modeling
 */
/**
 * US State information
 */
interface USState {
    name: string;
    abbreviation: string;
    electoralVotes: number;
    population: number;
    region: 'Northeast' | 'South' | 'Midwest' | 'West';
    senateRace: boolean;
    governorRace: boolean;
}
/**
 * Demographic factors influencing elections
 */
interface Demographics {
    medianAge: number;
    collegeEducation: number;
    urbanization: number;
    raceEthnicity: {
        white: number;
        black: number;
        hispanic: number;
        asian: number;
        other: number;
    };
    medianIncome: number;
}
/**
 * Economic indicators
 */
interface EconomicIndicators {
    unemploymentRate: number;
    gdpGrowth: number;
    inflationRate: number;
    consumerConfidence: number;
    gasPrice: number;
    housingAffordability: number;
}
/**
 * Polling data
 */
interface PollingData {
    democraticSupport: number;
    republicanSupport: number;
    independentSupport: number;
    undecided: number;
    marginOfError: number;
    sampleSize: number;
    pollDate: string;
    pollster: string;
    quality: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-';
}
/**
 * Historical election results
 */
interface HistoricalResults {
    year: number;
    democraticVote: number;
    republicanVote: number;
    thirdPartyVote: number;
    turnout: number;
    winner: 'D' | 'R' | 'I';
}
/**
 * Current political environment
 */
interface PoliticalEnvironment {
    presidentialApproval: number;
    congressionalApproval: number;
    genericBallot: {
        democratic: number;
        republican: number;
    };
    rightDirection: number;
    partisanLean: 'D+' | 'R+' | 'EVEN';
    leanMargin: number;
}
/**
 * Campaign factors
 */
interface CampaignFactors {
    democraticFunding: number;
    republicanFunding: number;
    democraticQuality: number;
    republicanQuality: number;
    incumbentParty: 'D' | 'R' | 'NONE';
    competitiveness: 'SAFE_D' | 'LIKELY_D' | 'LEAN_D' | 'TOSSUP' | 'LEAN_R' | 'LIKELY_R' | 'SAFE_R';
}
/**
 * Complete state election data for simulation
 */
interface StateElectionData {
    state: USState;
    demographics: Demographics;
    economics: EconomicIndicators;
    polling: PollingData[];
    historical: HistoricalResults[];
    environment: PoliticalEnvironment;
    campaign: CampaignFactors;
    timestamp: string;
}
/**
 * Single simulation result
 */
interface SimulationResult {
    simulationId: number;
    state: string;
    race: 'Senate' | 'Governor' | 'House';
    winner: 'D' | 'R' | 'I';
    margin: number;
    turnout: number;
    democraticVote: number;
    republicanVote: number;
    thirdPartyVote: number;
    uncertainty: number;
    keyFactors: string[];
}
/**
 * Aggregated results across all simulations for a state
 */
interface StateAggregateResults {
    state: string;
    totalSimulations: number;
    democraticWins: number;
    republicanWins: number;
    independentWins: number;
    averageMargin: number;
    medianMargin: number;
    averageTurnout: number;
    winProbability: {
        democratic: number;
        republican: number;
        independent: number;
    };
    confidence: number;
    trendDirection: 'D' | 'R' | 'STABLE';
    competitiveScore: number;
}
/**
 * National aggregate results
 */
interface NationalResults {
    senate: {
        currentSeats: {
            D: number;
            R: number;
            I: number;
        };
        projectedSeats: {
            D: number;
            R: number;
            I: number;
        };
        netChange: {
            D: number;
            R: number;
            I: number;
        };
        probabilityControl: {
            D: number;
            R: number;
        };
    };
    governors: {
        currentSeats: {
            D: number;
            R: number;
            I: number;
        };
        projectedSeats: {
            D: number;
            R: number;
            I: number;
        };
        netChange: {
            D: number;
            R: number;
            I: number;
        };
    };
    house: {
        currentSeats: {
            D: number;
            R: number;
            I: number;
        };
        projectedSeats: {
            D: number;
            R: number;
            I: number;
        };
        netChange: {
            D: number;
            R: number;
            I: number;
        };
        probabilityControl: {
            D: number;
            R: number;
        };
    };
    timestamp: string;
    confidence: number;
    totalSimulations: number;
}
/**
 * Self-learning metrics for election optimization
 */
interface ElectionLearningMetrics {
    iteration: number;
    accuracy: number;
    rmse: number;
    calibration: number;
    resolution: number;
    brier: number;
    logLoss: number;
    improvements: {
        fromPrevious: number;
        fromBaseline: number;
    };
}
/**
 * Model performance comparison
 */
interface ModelPerformance {
    modelName: string;
    totalSimulations: number;
    averageAccuracy: number;
    averageSpeed: number;
    averageQuality: number;
    costEfficiency: number;
    bestFor: string[];
}
/**
 * Complete simulation configuration
 */
interface SimulationConfig {
    states: string[];
    simulationsPerState: number;
    races: ('Senate' | 'Governor' | 'House')[];
    models: ('gemini' | 'claude' | 'kimi')[];
    enableSelfLearning: boolean;
    enableSwarmOptimization: boolean;
    enableStreaming: boolean;
    historicalValidation: boolean;
    uncertaintyQuantification: boolean;
    parallelProcessing: boolean;
    maxParallelStates: number;
}
/**
 * Simulation progress for real-time updates
 */
interface SimulationProgress {
    currentState: string;
    statesCompleted: number;
    totalStates: number;
    simulationsCompleted: number;
    totalSimulations: number;
    percentComplete: number;
    estimatedTimeRemaining: number;
    currentModel: string;
    averageSimulationTime: number;
    status: 'initializing' | 'running' | 'optimizing' | 'complete' | 'error';
}
/**
 * Scenario analysis
 */
interface ScenarioAnalysis {
    name: string;
    description: string;
    assumptions: Record<string, any>;
    results: NationalResults;
    probability: number;
}
/**
 * Sensitivity analysis
 */
interface SensitivityAnalysis {
    factor: string;
    baselineValue: number;
    variations: {
        value: number;
        impact: number;
        confidence: number;
    }[];
}

/**
 * 2026 US Midterm Election Simulator
 *
 * State-of-the-art election modeling with:
 * - 1000+ Monte Carlo simulations per state
 * - Self-learning optimization
 * - Multi-model benchmarking
 * - Swarm-coordinated parallel processing
 * - Real-time streaming results
 */

/**
 * Main Election Simulator Class
 */
declare class ElectionSimulator {
    private config;
    private generators;
    private progress;
    private learningMetrics;
    private modelPerformance;
    constructor(config?: Partial<SimulationConfig>);
    /**
     * Display banner
     */
    private banner;
    /**
     * Progress bar
     */
    private progressBar;
    /**
     * Initialize AI generators for all configured models
     */
    initializeGenerators(apiKeys: Record<string, string>): Promise<void>;
    /**
     * Generate realistic state election data schema
     */
    private getStateDataSchema;
    /**
     * Run simulations for a single state
     */
    simulateState(stateAbbr: string, modelKey: string, iterations: number): Promise<SimulationResult[]>;
    /**
     * Identify key factors influencing election outcome
     */
    private identifyKeyFactors;
    /**
     * Aggregate results for a state
     */
    private aggregateStateResults;
    /**
     * Run complete election simulation
     */
    run(apiKeys?: Record<string, string>): Promise<{
        stateResults: Record<string, StateAggregateResults>;
        nationalResults: NationalResults;
        learningMetrics: ElectionLearningMetrics[];
        modelPerformance: Record<string, ModelPerformance>;
    }>;
    /**
     * Calculate national aggregate results
     */
    private calculateNationalResults;
    /**
     * Display final results
     */
    private displayFinalResults;
}
/**
 * Quick start function for running election simulation
 */
declare function runElectionSimulation(options: {
    states?: string[];
    simulationsPerState?: number;
    models?: ('gemini' | 'claude' | 'kimi')[];
    enableSelfLearning?: boolean;
}): Promise<{
    stateResults: Record<string, StateAggregateResults>;
    nationalResults: NationalResults;
    learningMetrics: ElectionLearningMetrics[];
    modelPerformance: Record<string, ModelPerformance>;
}>;

/**
 * US State data for 2026 Midterm Elections
 */

/**
 * All 50 US states with 2026 election information
 * Based on actual 2026 election calendar
 */
declare const US_STATES: USState[];
/**
 * Get states with Senate races in 2026
 */
declare function getSenateRaceStates(): USState[];
/**
 * Get states with Governor races in 2026
 */
declare function getGovernorRaceStates(): USState[];
/**
 * Get competitive states (battlegrounds) based on recent history
 */
declare function getCompetitiveStates(): USState[];
/**
 * Get state by abbreviation
 */
declare function getStateByAbbr(abbr: string): USState | undefined;
/**
 * Get states by region
 */
declare function getStatesByRegion(region: 'Northeast' | 'South' | 'Midwest' | 'West'): USState[];

/**
 * Election Fraud Detection System
 *
 * Statistical anomaly detection and fraud analysis for election results
 * - Benford's Law analysis
 * - Turnout anomaly detection
 * - Geographic clustering analysis
 * - Timestamp irregularities
 * - Vote swing analysis
 */
/**
 * Fraud detection alert
 */
interface FraudAlert {
    alertId: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: 'benford' | 'turnout' | 'geographic' | 'timestamp' | 'swing' | 'statistical';
    location: string;
    description: string;
    anomalyScore: number;
    timestamp: string;
    evidence: {
        metric: string;
        expectedValue: number;
        actualValue: number;
        deviation: number;
    }[];
    recommendations: string[];
}
/**
 * Vote count data for fraud analysis
 */
interface VoteCountData {
    location: string;
    timestamp: string;
    totalVotes: number;
    democraticVotes: number;
    republicanVotes: number;
    otherVotes: number;
    registeredVoters: number;
    precinctReporting: number;
    votesByHour?: Record<string, number>;
    earlyVotes?: number;
    electionDayVotes?: number;
}
/**
 * Benford's Law analysis result
 */
interface BenfordAnalysis {
    location: string;
    digitPosition: 1 | 2;
    expectedDistribution: number[];
    actualDistribution: number[];
    chiSquare: number;
    pValue: number;
    passesTest: boolean;
    suspicionLevel: 'none' | 'low' | 'medium' | 'high';
}
/**
 * Turnout anomaly detection
 */
interface TurnoutAnomaly {
    location: string;
    actualTurnout: number;
    expectedTurnout: number;
    historicalAverage: number;
    standardDeviations: number;
    isAnomalous: boolean;
    suspicionLevel: 'none' | 'low' | 'medium' | 'high';
}
/**
 * Main Fraud Detection Engine
 */
declare class FraudDetectionEngine {
    private alerts;
    private analysisResults;
    /**
     * Benford's Law Analysis
     * First digit distribution should follow logarithmic pattern
     */
    benfordsLawAnalysis(voteCounts: VoteCountData[]): BenfordAnalysis[];
    /**
     * Turnout Anomaly Detection
     * Detect unusual turnout patterns
     */
    detectTurnoutAnomalies(current: VoteCountData[], historical: VoteCountData[]): TurnoutAnomaly[];
    /**
     * Geographic Clustering Analysis
     * Detect unusual patterns in adjacent areas
     */
    detectGeographicAnomalies(voteCounts: VoteCountData[], adjacencyMap: Map<string, string[]>): FraudAlert[];
    /**
     * Timestamp Irregularity Detection
     * Detect suspicious vote dumps or timing patterns
     */
    detectTimestampIrregularities(voteCounts: VoteCountData[]): FraudAlert[];
    /**
     * Vote Swing Analysis
     * Detect unrealistic partisan shifts
     */
    analyzeVoteSwings(current: VoteCountData[], previous: VoteCountData[]): FraudAlert[];
    /**
     * Get all fraud alerts
     */
    getAlerts(minSeverity?: 'low' | 'medium' | 'high' | 'critical'): FraudAlert[];
    /**
     * Generate comprehensive fraud report
     */
    generateFraudReport(): {
        totalAlerts: number;
        bySeverity: Record<string, number>;
        byType: Record<string, number>;
        highRiskLocations: string[];
        overallRiskScore: number;
        recommendations: string[];
    };
    private generateAlert;
    private groupByLocation;
    private extractFirstDigits;
    private calculateDistribution;
    private calculateChiSquare;
    private chiSquarePValue;
    private getSuspicionLevel;
    private getTurnoutSuspicionLevel;
    private calculateMargin;
    private mean;
    private standardDeviation;
    private generateRecommendations;
}

/**
 * Real-Time Election Monitoring System
 *
 * Live vote tracking, result streaming, and race calling
 * - County-by-county live results
 * - Real-time probability updates
 * - Early vs election day vote analysis
 * - Race calling logic
 * - Streaming dashboards
 */
/**
 * Live vote count update
 */
interface LiveVoteUpdate {
    timestamp: string;
    location: string;
    level: 'state' | 'county' | 'precinct';
    totalVotes: number;
    democraticVotes: number;
    republicanVotes: number;
    otherVotes: number;
    precinctsReporting: number;
    totalPrecincts: number;
    reportingPercentage: number;
    estimatedRemaining: number;
}
/**
 * Real-time race status
 */
interface RaceStatus {
    state: string;
    race: 'Senate' | 'Governor' | 'House';
    status: 'too_early' | 'too_close' | 'leaning_dem' | 'leaning_rep' | 'called_dem' | 'called_rep';
    confidence: number;
    winProbability: {
        democratic: number;
        republican: number;
    };
    currentMargin: number;
    votesRemaining: number;
    reportingPercentage: number;
    lastUpdate: string;
    projectedWinner?: 'D' | 'R';
    timeOfCall?: string;
}
/**
 * County-level results
 */
interface CountyResult {
    county: string;
    state: string;
    totalVotes: number;
    democraticVotes: number;
    republicanVotes: number;
    margin: number;
    turnout: number;
    reportingPercentage: number;
    lastUpdate: string;
}
/**
 * Vote type breakdown (early vs election day)
 */
interface VoteTypeAnalysis {
    location: string;
    earlyVotes: {
        total: number;
        democratic: number;
        republican: number;
        margin: number;
    };
    electionDayVotes: {
        total: number;
        democratic: number;
        republican: number;
        margin: number;
    };
    comparison: {
        earlyMargin: number;
        electionDayMargin: number;
        shift: number;
    };
}
/**
 * Live projection with uncertainty
 */
interface LiveProjection {
    state: string;
    timestamp: string;
    votesIn: number;
    votesRemaining: number;
    reportingPercentage: number;
    currentResults: {
        democratic: number;
        republican: number;
        margin: number;
    };
    projection: {
        democraticTotal: number;
        republicanTotal: number;
        margin: number;
        winProbability: {
            democratic: number;
            republican: number;
        };
    };
    uncertainty: {
        marginError: number;
        volatilityScore: number;
    };
}
/**
 * Main Real-Time Monitoring Engine
 */
declare class RealTimeMonitor {
    private voteUpdates;
    private raceStatuses;
    private countyResults;
    private updateCallbacks;
    /**
     * Subscribe to live updates
     */
    subscribe(callback: (update: LiveVoteUpdate) => void): () => void;
    /**
     * Process incoming vote update
     */
    processVoteUpdate(update: LiveVoteUpdate): void;
    /**
     * Update race status based on latest data
     */
    private updateRaceStatus;
    /**
     * Calculate live projection with uncertainty
     */
    calculateLiveProjection(update: LiveVoteUpdate): LiveProjection;
    /**
     * Analyze early vs election day voting patterns
     */
    analyzeVoteTypes(state: string, earlyVotes: LiveVoteUpdate, electionDayVotes: LiveVoteUpdate): VoteTypeAnalysis;
    /**
     * Get current race status
     */
    getRaceStatus(state: string, race?: 'Senate' | 'Governor' | 'House'): RaceStatus | undefined;
    /**
     * Get all race statuses
     */
    getAllRaceStatuses(): RaceStatus[];
    /**
     * Get called races
     */
    getCalledRaces(): RaceStatus[];
    /**
     * Get uncalled races
     */
    getUncalledRaces(): RaceStatus[];
    /**
     * Generate live dashboard data
     */
    generateDashboard(): {
        timestamp: string;
        totalRaces: number;
        calledRaces: number;
        uncalledRaces: number;
        nationalProjection: {
            democraticSeats: number;
            republicanSeats: number;
            tossups: number;
            controlProbability: {
                D: number;
                R: number;
            };
        };
        topCompetitiveRaces: RaceStatus[];
        recentUpdates: LiveVoteUpdate[];
    };
    private determineRaceStatus;
    private shouldCallRace;
    private calculateMarginError;
    private calculateVolatility;
    private normalCDF;
}
/**
 * Create a live streaming dashboard
 */
declare function createLiveDashboard(monitor: RealTimeMonitor): void;

/**
 * Granular Voter Profile Modeling System
 *
 * Enables multi-level voter modeling from broad demographic aggregates
 * down to individual voter profiles with sub-personas based on grounding data.
 *
 * Resource allocation scales with granularity level:
 * - STATE: 1x resources (broad demographic aggregates)
 * - COUNTY: 10x resources (county-level demographics)
 * - PRECINCT: 50x resources (precinct-level voter patterns)
 * - DEMOGRAPHIC_CLUSTER: 100x resources (demographic group personas)
 * - INDIVIDUAL: 500x resources (individual voter profiles with sub-personas)
 */

/**
 * Granularity levels for voter modeling
 */
declare enum GranularityLevel {
    /** State-level aggregates (lowest resource cost, broadest modeling) */
    STATE = "STATE",
    /** County-level demographics and voting patterns */
    COUNTY = "COUNTY",
    /** Precinct-level voter behavior */
    PRECINCT = "PRECINCT",
    /** Demographic cluster personas (age/race/education/income groups) */
    DEMOGRAPHIC_CLUSTER = "DEMOGRAPHIC_CLUSTER",
    /** Individual voter profiles with sub-personas (highest resource cost, finest modeling) */
    INDIVIDUAL = "INDIVIDUAL"
}
/**
 * Resource requirements for each granularity level
 */
interface GranularityResourceRequirements {
    level: GranularityLevel;
    /** Relative computational cost (1x = STATE baseline) */
    computationalCost: number;
    /** Number of AI model calls required */
    modelCalls: number;
    /** Estimated memory usage in MB */
    memoryUsageMB: number;
    /** Estimated execution time in seconds */
    estimatedTimeSeconds: number;
    /** Number of profiles/personas generated */
    profileCount: number;
}
/**
 * Configuration for granular modeling
 */
interface GranularityConfig {
    /** Target granularity level */
    level: GranularityLevel;
    /** Resource allocation strategy */
    resourceStrategy: 'balanced' | 'speed' | 'accuracy' | 'cost_optimized';
    /** Enable sub-persona generation for individuals */
    enableSubPersonas: boolean;
    /** Maximum number of sub-personas per individual */
    maxSubPersonas: number;
    /** Use grounding data for persona refinement */
    useGroundingData: boolean;
    /** Grounding data sources */
    groundingDataSources?: GroundingDataSource[];
    /** Enable swarm coordination for parallel processing */
    enableSwarmCoordination: boolean;
    /** Number of parallel agents for swarm processing */
    swarmAgentCount: number;
}
/**
 * Grounding data sources for persona refinement
 */
interface GroundingDataSource {
    type: 'census' | 'polling' | 'consumer_data' | 'social_media' | 'voter_file' | 'survey';
    name: string;
    coverage: number;
    recency: string;
    reliability: number;
    fields: string[];
}
/**
 * Individual voter profile with sub-personas
 */
interface VoterProfile {
    /** Unique voter identifier */
    voterId: string;
    /** Geographic identifiers */
    geography: {
        state: string;
        county: string;
        precinct: string;
        zipCode: string;
    };
    /** Core demographics */
    demographics: Demographics;
    /** Economic situation */
    economics: EconomicIndicators;
    /** Political orientation */
    political: PoliticalEnvironment & {
        registeredParty: 'D' | 'R' | 'I' | 'NPA';
        voteHistory: VoteHistory[];
        issuePositions: IssuePosition[];
    };
    /** Behavioral patterns */
    behavior: {
        turnoutProbability: number;
        persuadability: number;
        informationSources: string[];
        socialInfluence: number;
    };
    /** Sub-personas representing different aspects of decision-making */
    subPersonas?: SubPersona[];
    /** Grounding data used for this profile */
    groundingData?: Record<string, any>;
    /** Confidence score for profile accuracy */
    confidence: number;
}
/**
 * Voting history record
 */
interface VoteHistory {
    year: number;
    election: 'primary' | 'general' | 'special';
    participated: boolean;
    method?: 'in_person' | 'absentee' | 'early';
}
/**
 * Issue position
 */
interface IssuePosition {
    issue: string;
    position: number;
    salience: number;
    volatility: number;
}
/**
 * Sub-persona representing a facet of voter identity
 */
interface SubPersona {
    /** Persona identifier */
    personaId: string;
    /** Persona type */
    type: 'economic' | 'cultural' | 'partisan' | 'issue_based' | 'identity';
    /** Persona description */
    description: string;
    /** Weight in decision-making (0-1) */
    weight: number;
    /** Key motivations */
    motivations: string[];
    /** Key concerns */
    concerns: string[];
    /** Voting tendency for this persona */
    voteTendency: {
        democratic: number;
        republican: number;
        independent: number;
    };
    /** Contextual triggers that activate this persona */
    triggers: string[];
}
/**
 * Demographic cluster (aggregated voter personas)
 */
interface DemographicCluster {
    clusterId: string;
    name: string;
    description: string;
    /** Number of voters in cluster */
    size: number;
    /** Cluster characteristics */
    characteristics: {
        demographics: Partial<Demographics>;
        economics: Partial<EconomicIndicators>;
        political: Partial<PoliticalEnvironment>;
    };
    /** Representative personas */
    personas: SubPersona[];
    /** Voting behavior patterns */
    votingBehavior: {
        turnoutRate: number;
        partisanLean: number;
        volatility: number;
        keyIssues: string[];
    };
    /** Geographic distribution */
    geographicDistribution: Record<string, number>;
}
/**
 * Granularity analysis results
 */
interface GranularityAnalysis {
    level: GranularityLevel;
    config: GranularityConfig;
    /** Total profiles generated */
    totalProfiles: number;
    /** Resource usage */
    resourceUsage: {
        computationTimeSeconds: number;
        modelCallsUsed: number;
        memoryUsedMB: number;
        costEstimateUSD: number;
    };
    /** State-level results */
    stateResults?: {
        aggregateVote: {
            D: number;
            R: number;
            I: number;
        };
        turnoutEstimate: number;
    };
    /** County-level results */
    countyResults?: Record<string, {
        aggregateVote: {
            D: number;
            R: number;
            I: number;
        };
        turnoutEstimate: number;
        demographicBreakdown: any;
    }>;
    /** Precinct-level results */
    precinctResults?: Record<string, {
        aggregateVote: {
            D: number;
            R: number;
            I: number;
        };
        turnoutEstimate: number;
    }>;
    /** Cluster-level results */
    clusterResults?: Record<string, DemographicCluster>;
    /** Individual profiles */
    individualProfiles?: VoterProfile[];
    /** Insights and patterns */
    insights: {
        keyDemographics: string[];
        swingVoterClusters: string[];
        highValueTargets: string[];
        persuasionOpportunities: string[];
    };
    /** Quality metrics */
    quality: {
        confidence: number;
        groundingDataCoverage: number;
        validationScore: number;
    };
}
/**
 * Resource estimation for different granularity levels
 */
declare const GRANULARITY_RESOURCE_REQUIREMENTS: Record<GranularityLevel, GranularityResourceRequirements>;
/**
 * Granular voter modeling engine
 */
declare class GranularVoterModeler {
    private config;
    constructor(config?: Partial<GranularityConfig>);
    /**
     * Model voters at specified granularity level
     */
    model(state: string, options?: {
        counties?: string[];
        precincts?: string[];
        targetDemographics?: string[];
    }): Promise<GranularityAnalysis>;
    /**
     * Model at state level (broad aggregates)
     */
    private modelStateLevel;
    /**
     * Model at county level
     */
    private modelCountyLevel;
    /**
     * Model at precinct level
     */
    private modelPrecinctLevel;
    /**
     * Model demographic clusters with personas
     */
    private modelClusterLevel;
    /**
     * Model individual voters with sub-personas
     */
    private modelIndividualLevel;
    /**
     * Estimate resources for a modeling scenario
     */
    static estimateResources(level: GranularityLevel, scope: {
        states?: number;
        counties?: number;
        precincts?: number;
        profiles?: number;
    }): GranularityResourceRequirements;
}

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
    /**
     * Create an election simulator
     */
    createElectionSimulator: (config?: any) => ElectionSimulator;
    /**
     * Create a granular voter modeler
     */
    createGranularModeler: (config?: any) => GranularVoterModeler;
};

export { type Agent, type AgentMemory, type AgentRole, type AnomalyPattern, BenchmarkCollector, type BenchmarkMetrics, type BenchmarkResult, type BenfordAnalysis, CICDDataGenerator, type PerformanceMetrics as CICDPerformanceMetrics, type CampaignFactors, ClaudeSonnetAgent, type ComparisonReport, type CoordinationStrategy, type CoordinationTask, type CountyResult, type DSPySignature, DSPyTrainingSession, type DemographicCluster, type Demographics, type DeploymentRecord, type DistributedLearningPattern, type EconomicIndicators, type ElectionLearningMetrics, ElectionSimulator, Examples, type FeedbackData, type FraudAlert, FraudDetectionEngine, GPT4Agent, GRANULARITY_RESOURCE_REQUIREMENTS, GeminiAgent, GranularVoterModeler, type GranularityAnalysis, type GranularityConfig, GranularityLevel, type GranularityResourceRequirements, type GroundingDataSource, type HistoricalResults, type IssuePosition, type IterationResult, type LearningMetrics, type LiveProjection, type LiveVoteUpdate, LlamaAgent, type MarketCondition, type MarketNewsEvent, type MarketStatistics, type ModelConfig$1 as ModelConfig, type ModelPerformance, ModelProvider, ModelTrainingAgent, type MonitoringAlert, MultiModelBenchmark, type NationalResults, type OHLCVData, OptimizationEngine, type PenetrationTestScenario, type PerformanceMetrics$1 as PerformanceMetrics, type PipelineExecution, type PipelineStatus, type PoliticalEnvironment, type PollingData, type QualityMetrics, type RaceStatus, RealTimeMonitor, type ScenarioAnalysis, type SecurityLogEntry, SecurityTestingGenerator, type SelfLearningConfig, SelfLearningGenerator, type SensitivityAnalysis, type SimulationConfig, type SimulationProgress, type SimulationResult, type StateAggregateResults, type StateElectionData, type StockMarketConfig, StockMarketSimulator, type StreamingBenchmarkResult, type StreamingModelConfig, StreamingOptimization, type StreamingOptimizationResult, type StreamingPerformanceHistory, type StreamingQualityMetrics, type SubPersona, SwarmCoordinator, type SwarmStatistics, type TestResults, type TrainingConfig, TrainingPhase, type TurnoutAnomaly, type USState, US_STATES, type VoteCountData, type VoteHistory, type VoteTypeAnalysis, type VoterProfile, type VulnerabilitySeverity, type VulnerabilityTestCase, type VulnerabilityType, createLiveDashboard, getCompetitiveStates, getGovernorRaceStates, getSenateRaceStates, getStateByAbbr, getStatesByRegion, runElectionSimulation, runStreamingOptimizationExample };
