import { U as USState, D as Demographics, E as EconomicIndicators, P as PoliticalEnvironment } from './simulator-BtZIARct.cjs';
export { C as CampaignFactors, e as ElectionLearningMetrics, a as ElectionSimulator, H as HistoricalResults, M as ModelPerformance, N as NationalResults, b as PollingData, h as ScenarioAnalysis, i as SensitivityAnalysis, f as SimulationConfig, g as SimulationProgress, c as SimulationResult, d as StateAggregateResults, S as StateElectionData, r as runElectionSimulation } from './simulator-BtZIARct.cjs';

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

export { type BenfordAnalysis, type CountyResult, type DemographicCluster, Demographics, EconomicIndicators, type FraudAlert, FraudDetectionEngine, GRANULARITY_RESOURCE_REQUIREMENTS, GranularVoterModeler, type GranularityAnalysis, type GranularityConfig, GranularityLevel, type GranularityResourceRequirements, type GroundingDataSource, type IssuePosition, type LiveProjection, type LiveVoteUpdate, PoliticalEnvironment, type RaceStatus, RealTimeMonitor, type SubPersona, type TurnoutAnomaly, USState, US_STATES, type VoteCountData, type VoteHistory, type VoteTypeAnalysis, type VoterProfile, createLiveDashboard, getCompetitiveStates, getGovernorRaceStates, getSenateRaceStates, getStateByAbbr, getStatesByRegion };
