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

export { type CampaignFactors as C, type Demographics as D, type EconomicIndicators as E, type HistoricalResults as H, type ModelPerformance as M, type NationalResults as N, type PoliticalEnvironment as P, type StateElectionData as S, type USState as U, ElectionSimulator as a, type PollingData as b, type SimulationResult as c, type StateAggregateResults as d, type ElectionLearningMetrics as e, type SimulationConfig as f, type SimulationProgress as g, type ScenarioAnalysis as h, type SensitivityAnalysis as i, runElectionSimulation as r };
