/**
 * 2026 US Midterm Election Simulation System
 *
 * Export all election simulation components
 */

export { ElectionSimulator, runElectionSimulation } from './simulator.js';
export * from './types.js';
export * from './data/states.js';
export { FraudDetectionEngine } from './fraud-detection.js';
export type {
  FraudAlert,
  VoteCountData,
  BenfordAnalysis,
  TurnoutAnomaly
} from './fraud-detection.js';
export { RealTimeMonitor, createLiveDashboard } from './realtime-monitor.js';
export type {
  LiveVoteUpdate,
  RaceStatus,
  CountyResult,
  VoteTypeAnalysis,
  LiveProjection
} from './realtime-monitor.js';

// Granular voter modeling exports
export { GranularVoterModeler, GranularityLevel, GRANULARITY_RESOURCE_REQUIREMENTS } from './granularity.js';
export type {
  GranularityConfig,
  GranularityResourceRequirements,
  GroundingDataSource,
  VoterProfile,
  VoteHistory,
  IssuePosition,
  SubPersona,
  DemographicCluster,
  GranularityAnalysis
} from './granularity.js';

// Re-export for convenience
export {
  US_STATES,
  getSenateRaceStates,
  getGovernorRaceStates,
  getCompetitiveStates,
  getStateByAbbr,
  getStatesByRegion
} from './data/states.js';
