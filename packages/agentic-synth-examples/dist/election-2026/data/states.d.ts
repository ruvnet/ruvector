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

export { US_STATES, getCompetitiveStates, getGovernorRaceStates, getSenateRaceStates, getStateByAbbr, getStatesByRegion };
