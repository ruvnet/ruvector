/**
 * 2026 US Midterm Election Simulation Types
 *
 * Comprehensive type definitions for state-of-the-art election modeling
 */

/**
 * US State information
 */
export interface USState {
  name: string;
  abbreviation: string;
  electoralVotes: number;
  population: number;
  region: 'Northeast' | 'South' | 'Midwest' | 'West';
  senateRace: boolean;  // True if Senate race in 2026
  governorRace: boolean; // True if Governor race in 2026
}

/**
 * Demographic factors influencing elections
 */
export interface Demographics {
  medianAge: number;
  collegeEducation: number;  // Percentage with college degree
  urbanization: number;      // Percentage in urban areas
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
export interface EconomicIndicators {
  unemploymentRate: number;
  gdpGrowth: number;
  inflationRate: number;
  consumerConfidence: number;  // Index 0-100
  gasPrice: number;
  housingAffordability: number; // Index 0-100
}

/**
 * Polling data
 */
export interface PollingData {
  democraticSupport: number;   // Percentage
  republicanSupport: number;   // Percentage
  independentSupport: number;  // Percentage
  undecided: number;           // Percentage
  marginOfError: number;
  sampleSize: number;
  pollDate: string;
  pollster: string;
  quality: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-';
}

/**
 * Historical election results
 */
export interface HistoricalResults {
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
export interface PoliticalEnvironment {
  presidentialApproval: number;    // Percentage
  congressionalApproval: number;   // Percentage
  genericBallot: {                 // Generic congressional ballot
    democratic: number;
    republican: number;
  };
  rightDirection: number;          // Percentage who think country is on right track
  partisanLean: 'D+' | 'R+' | 'EVEN';
  leanMargin: number;
}

/**
 * Campaign factors
 */
export interface CampaignFactors {
  democraticFunding: number;   // Millions of dollars
  republicanFunding: number;   // Millions of dollars
  democraticQuality: number;   // Candidate quality 0-100
  republicanQuality: number;   // Candidate quality 0-100
  incumbentParty: 'D' | 'R' | 'NONE';
  competitiveness: 'SAFE_D' | 'LIKELY_D' | 'LEAN_D' | 'TOSSUP' | 'LEAN_R' | 'LIKELY_R' | 'SAFE_R';
}

/**
 * Complete state election data for simulation
 */
export interface StateElectionData {
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
export interface SimulationResult {
  simulationId: number;
  state: string;
  race: 'Senate' | 'Governor' | 'House';
  winner: 'D' | 'R' | 'I';
  margin: number;              // Percentage margin
  turnout: number;             // Voter turnout percentage
  democraticVote: number;      // Percentage
  republicanVote: number;      // Percentage
  thirdPartyVote: number;      // Percentage
  uncertainty: number;         // Uncertainty score 0-1
  keyFactors: string[];        // Top factors influencing outcome
}

/**
 * Aggregated results across all simulations for a state
 */
export interface StateAggregateResults {
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
  confidence: number;          // Statistical confidence 0-1
  trendDirection: 'D' | 'R' | 'STABLE';
  competitiveScore: number;    // 0-100, higher = more competitive
}

/**
 * National aggregate results
 */
export interface NationalResults {
  senate: {
    currentSeats: { D: number; R: number; I: number };
    projectedSeats: { D: number; R: number; I: number };
    netChange: { D: number; R: number; I: number };
    probabilityControl: { D: number; R: number };
  };
  governors: {
    currentSeats: { D: number; R: number; I: number };
    projectedSeats: { D: number; R: number; I: number };
    netChange: { D: number; R: number; I: number };
  };
  house: {
    currentSeats: { D: number; R: number; I: number };
    projectedSeats: { D: number; R: number; I: number };
    netChange: { D: number; R: number; I: number };
    probabilityControl: { D: number; R: number };
  };
  timestamp: string;
  confidence: number;
  totalSimulations: number;
}

/**
 * Self-learning metrics for election optimization
 */
export interface ElectionLearningMetrics {
  iteration: number;
  accuracy: number;            // Historical validation accuracy
  rmse: number;                // Root mean square error
  calibration: number;         // Calibration score 0-1
  resolution: number;          // Prediction resolution 0-1
  brier: number;               // Brier score (lower is better)
  logLoss: number;             // Log loss (lower is better)
  improvements: {
    fromPrevious: number;      // Percentage improvement
    fromBaseline: number;      // Percentage improvement from baseline
  };
}

/**
 * Model performance comparison
 */
export interface ModelPerformance {
  modelName: string;
  totalSimulations: number;
  averageAccuracy: number;
  averageSpeed: number;        // Simulations per second
  averageQuality: number;      // Quality score 0-1
  costEfficiency: number;      // Score 0-1
  bestFor: string[];           // Use cases where this model excels
}

/**
 * Complete simulation configuration
 */
export interface SimulationConfig {
  states: string[];            // State abbreviations to simulate
  simulationsPerState: number; // Number of Monte Carlo simulations
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
export interface SimulationProgress {
  currentState: string;
  statesCompleted: number;
  totalStates: number;
  simulationsCompleted: number;
  totalSimulations: number;
  percentComplete: number;
  estimatedTimeRemaining: number; // Seconds
  currentModel: string;
  averageSimulationTime: number;  // Milliseconds
  status: 'initializing' | 'running' | 'optimizing' | 'complete' | 'error';
}

/**
 * Scenario analysis
 */
export interface ScenarioAnalysis {
  name: string;
  description: string;
  assumptions: Record<string, any>;
  results: NationalResults;
  probability: number;         // Likelihood of this scenario
}

/**
 * Sensitivity analysis
 */
export interface SensitivityAnalysis {
  factor: string;
  baselineValue: number;
  variations: {
    value: number;
    impact: number;            // Impact on outcome
    confidence: number;
  }[];
}
