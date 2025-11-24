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

import type { StateAggregateResults } from './types.js';

/**
 * Live vote count update
 */
export interface LiveVoteUpdate {
  timestamp: string;
  location: string;            // State, county, or precinct
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
export interface RaceStatus {
  state: string;
  race: 'Senate' | 'Governor' | 'House';
  status: 'too_early' | 'too_close' | 'leaning_dem' | 'leaning_rep' | 'called_dem' | 'called_rep';
  confidence: number;           // 0-1
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
export interface CountyResult {
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
export interface VoteTypeAnalysis {
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
    shift: number;              // Partisan shift from early to election day
  };
}

/**
 * Live projection with uncertainty
 */
export interface LiveProjection {
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
    marginError: number;        // 95% confidence interval
    volatilityScore: number;    // 0-1, higher = more volatile
  };
}

/**
 * Main Real-Time Monitoring Engine
 */
export class RealTimeMonitor {
  private voteUpdates: LiveVoteUpdate[] = [];
  private raceStatuses: Map<string, RaceStatus> = new Map();
  private countyResults: Map<string, CountyResult[]> = new Map();
  private updateCallbacks: Array<(update: LiveVoteUpdate) => void> = [];

  /**
   * Subscribe to live updates
   */
  subscribe(callback: (update: LiveVoteUpdate) => void): () => void {
    this.updateCallbacks.push(callback);
    return () => {
      this.updateCallbacks = this.updateCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Process incoming vote update
   */
  processVoteUpdate(update: LiveVoteUpdate): void {
    this.voteUpdates.push(update);

    // Update race status
    this.updateRaceStatus(update);

    // Notify subscribers
    for (const callback of this.updateCallbacks) {
      try {
        callback(update);
      } catch (error) {
        console.error('Subscriber callback error:', error);
      }
    }
  }

  /**
   * Update race status based on latest data
   */
  private updateRaceStatus(update: LiveVoteUpdate): void {
    const key = `${update.location}_Senate`;
    let status = this.raceStatuses.get(key);

    if (!status) {
      status = {
        state: update.location,
        race: 'Senate',
        status: 'too_early',
        confidence: 0,
        winProbability: { democratic: 0.5, republican: 0.5 },
        currentMargin: 0,
        votesRemaining: 0,
        reportingPercentage: 0,
        lastUpdate: update.timestamp
      };
    }

    // Update current results
    const totalVotes = update.democraticVotes + update.republicanVotes + update.otherVotes;
    const demPct = (update.democraticVotes / totalVotes) * 100;
    const repPct = (update.republicanVotes / totalVotes) * 100;
    const margin = demPct - repPct;

    status.currentMargin = margin;
    status.reportingPercentage = update.reportingPercentage;
    status.lastUpdate = update.timestamp;

    // Calculate remaining votes
    const reportedVotes = totalVotes;
    const estimatedTotal = reportedVotes / (update.reportingPercentage / 100);
    status.votesRemaining = estimatedTotal - reportedVotes;

    // Update probabilities using live data
    const projection = this.calculateLiveProjection(update);
    status.winProbability = projection.projection.winProbability;
    status.confidence = 1 - projection.uncertainty.volatilityScore;

    // Determine race status
    status.status = this.determineRaceStatus(
      status.winProbability,
      status.reportingPercentage,
      status.confidence
    );

    // Call race if conditions met
    if (!status.projectedWinner && this.shouldCallRace(status)) {
      status.projectedWinner = status.winProbability.democratic > 0.5 ? 'D' : 'R';
      status.timeOfCall = new Date().toISOString();
      status.status = status.projectedWinner === 'D' ? 'called_dem' : 'called_rep';

      console.log(`\n🔔 RACE CALLED: ${status.state} - ${status.projectedWinner} wins`);
      console.log(`   Confidence: ${(status.confidence * 100).toFixed(1)}%`);
      console.log(`   Margin: ${status.currentMargin.toFixed(1)}%`);
      console.log(`   Reporting: ${status.reportingPercentage.toFixed(1)}%\n`);
    }

    this.raceStatuses.set(key, status);
  }

  /**
   * Calculate live projection with uncertainty
   */
  calculateLiveProjection(update: LiveVoteUpdate): LiveProjection {
    const totalVotes = update.democraticVotes + update.republicanVotes + update.otherVotes;
    const demPct = (update.democraticVotes / totalVotes) * 100;
    const repPct = (update.republicanVotes / totalVotes) * 100;

    // Estimate remaining votes
    const estimatedTotal = totalVotes / (update.reportingPercentage / 100);
    const votesRemaining = estimatedTotal - totalVotes;

    // Project final results (assuming current margin holds)
    const projectedDem = demPct;
    const projectedRep = repPct;

    // Calculate uncertainty based on votes remaining
    const marginError = this.calculateMarginError(
      update.reportingPercentage,
      votesRemaining,
      totalVotes
    );

    const volatility = this.calculateVolatility(update.reportingPercentage);

    // Win probability calculation
    const marginDiff = projectedDem - projectedRep;
    const zScore = marginDiff / marginError;
    const demWinProb = this.normalCDF(zScore);

    return {
      state: update.location,
      timestamp: update.timestamp,
      votesIn: totalVotes,
      votesRemaining,
      reportingPercentage: update.reportingPercentage,
      currentResults: {
        democratic: demPct,
        republican: repPct,
        margin: demPct - repPct
      },
      projection: {
        democraticTotal: projectedDem,
        republicanTotal: projectedRep,
        margin: projectedDem - projectedRep,
        winProbability: {
          democratic: demWinProb,
          republican: 1 - demWinProb
        }
      },
      uncertainty: {
        marginError,
        volatilityScore: volatility
      }
    };
  }

  /**
   * Analyze early vs election day voting patterns
   */
  analyzeVoteTypes(
    state: string,
    earlyVotes: LiveVoteUpdate,
    electionDayVotes: LiveVoteUpdate
  ): VoteTypeAnalysis {
    const earlyTotal = earlyVotes.democraticVotes + earlyVotes.republicanVotes;
    const earlyMargin = ((earlyVotes.democraticVotes - earlyVotes.republicanVotes) / earlyTotal) * 100;

    const electionDayTotal = electionDayVotes.democraticVotes + electionDayVotes.republicanVotes;
    const electionDayMargin = ((electionDayVotes.democraticVotes - electionDayVotes.republicanVotes) / electionDayTotal) * 100;

    return {
      location: state,
      earlyVotes: {
        total: earlyTotal,
        democratic: earlyVotes.democraticVotes,
        republican: earlyVotes.republicanVotes,
        margin: earlyMargin
      },
      electionDayVotes: {
        total: electionDayTotal,
        democratic: electionDayVotes.democraticVotes,
        republican: electionDayVotes.republicanVotes,
        margin: electionDayMargin
      },
      comparison: {
        earlyMargin,
        electionDayMargin,
        shift: electionDayMargin - earlyMargin
      }
    };
  }

  /**
   * Get current race status
   */
  getRaceStatus(state: string, race: 'Senate' | 'Governor' | 'House' = 'Senate'): RaceStatus | undefined {
    return this.raceStatuses.get(`${state}_${race}`);
  }

  /**
   * Get all race statuses
   */
  getAllRaceStatuses(): RaceStatus[] {
    return Array.from(this.raceStatuses.values());
  }

  /**
   * Get called races
   */
  getCalledRaces(): RaceStatus[] {
    return Array.from(this.raceStatuses.values())
      .filter(r => r.status === 'called_dem' || r.status === 'called_rep');
  }

  /**
   * Get uncalled races
   */
  getUncalledRaces(): RaceStatus[] {
    return Array.from(this.raceStatuses.values())
      .filter(r => r.status !== 'called_dem' && r.status !== 'called_rep');
  }

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
      controlProbability: { D: number; R: number };
    };
    topCompetitiveRaces: RaceStatus[];
    recentUpdates: LiveVoteUpdate[];
  } {
    const allRaces = Array.from(this.raceStatuses.values());
    const called = this.getCalledRaces();
    const uncalled = this.getUncalledRaces();

    // Calculate projected Senate seats
    let demSeats = 0;
    let repSeats = 0;
    let tossups = 0;

    for (const race of allRaces) {
      if (race.status === 'called_dem') demSeats++;
      else if (race.status === 'called_rep') repSeats++;
      else if (race.winProbability.democratic > 0.6) demSeats++;
      else if (race.winProbability.republican > 0.6) repSeats++;
      else tossups++;
    }

    // Get most competitive uncalled races
    const competitive = uncalled
      .sort((a, b) => {
        const aGap = Math.abs(a.winProbability.democratic - a.winProbability.republican);
        const bGap = Math.abs(b.winProbability.democratic - b.winProbability.republican);
        return aGap - bGap;
      })
      .slice(0, 10);

    return {
      timestamp: new Date().toISOString(),
      totalRaces: allRaces.length,
      calledRaces: called.length,
      uncalledRaces: uncalled.length,
      nationalProjection: {
        democraticSeats: demSeats,
        republicanSeats: repSeats,
        tossups,
        controlProbability: {
          D: demSeats > 50 ? 0.8 : 0.2,
          R: repSeats > 50 ? 0.8 : 0.2
        }
      },
      topCompetitiveRaces: competitive,
      recentUpdates: this.voteUpdates.slice(-20)
    };
  }

  // Helper methods

  private determineRaceStatus(
    winProbability: { democratic: number; republican: number },
    reportingPct: number,
    confidence: number
  ): RaceStatus['status'] {
    if (reportingPct < 10) return 'too_early';

    const gap = Math.abs(winProbability.democratic - winProbability.republican);

    if (gap < 0.1) return 'too_close';
    if (winProbability.democratic > 0.55 && winProbability.democratic < 0.75) return 'leaning_dem';
    if (winProbability.republican > 0.55 && winProbability.republican < 0.75) return 'leaning_rep';

    return 'too_close';
  }

  private shouldCallRace(status: RaceStatus): boolean {
    // Conservative race calling criteria
    const minReporting = 70;      // At least 70% reporting
    const minConfidence = 0.95;   // 95% confidence
    const minWinProb = 0.99;      // 99% win probability

    const winProb = Math.max(
      status.winProbability.democratic,
      status.winProbability.republican
    );

    return (
      status.reportingPercentage >= minReporting &&
      status.confidence >= minConfidence &&
      winProb >= minWinProb
    );
  }

  private calculateMarginError(
    reportingPct: number,
    votesRemaining: number,
    votesIn: number
  ): number {
    // Margin of error increases with fewer votes counted
    const baseError = 1.0;  // 1% base error
    const scaleFactor = Math.sqrt(votesRemaining / (votesIn + votesRemaining));
    return baseError + (scaleFactor * 10);
  }

  private calculateVolatility(reportingPct: number): number {
    // Volatility decreases as more votes are counted
    if (reportingPct >= 95) return 0.1;
    if (reportingPct >= 80) return 0.2;
    if (reportingPct >= 50) return 0.4;
    if (reportingPct >= 25) return 0.6;
    return 0.8;
  }

  private normalCDF(z: number): number {
    // Approximate cumulative distribution function for standard normal
    // More accurate methods would use erf() or lookup tables
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

    return z > 0 ? 1 - p : p;
  }
}

/**
 * Create a live streaming dashboard
 */
export function createLiveDashboard(monitor: RealTimeMonitor): void {
  console.log('\n🗳️  LIVE ELECTION RESULTS\n');

  // Subscribe to updates
  monitor.subscribe((update) => {
    console.log(`\n📊 UPDATE: ${update.location}`);
    console.log(`   Reporting: ${update.reportingPercentage.toFixed(1)}%`);
    console.log(`   D: ${update.democraticVotes.toLocaleString()} | R: ${update.republicanVotes.toLocaleString()}`);

    const total = update.democraticVotes + update.republicanVotes + update.otherVotes;
    const demPct = (update.democraticVotes / total) * 100;
    const repPct = (update.republicanVotes / total) * 100;
    console.log(`   D: ${demPct.toFixed(1)}% | R: ${repPct.toFixed(1)}%`);
  });

  // Periodic dashboard refresh
  setInterval(() => {
    const dashboard = monitor.generateDashboard();

    console.clear();
    console.log('\n═══════════════════════════════════════════');
    console.log('      🗳️  LIVE ELECTION DASHBOARD');
    console.log('═══════════════════════════════════════════\n');

    console.log(`Last Update: ${new Date(dashboard.timestamp).toLocaleTimeString()}`);
    console.log(`Races Called: ${dashboard.calledRaces}/${dashboard.totalRaces}\n`);

    console.log('SENATE PROJECTION:');
    console.log(`  Democrats: ${dashboard.nationalProjection.democraticSeats} seats`);
    console.log(`  Republicans: ${dashboard.nationalProjection.republicanSeats} seats`);
    console.log(`  Tossups: ${dashboard.nationalProjection.tossups}\n`);

    console.log('TOP COMPETITIVE RACES:');
    for (const race of dashboard.topCompetitiveRaces.slice(0, 5)) {
      console.log(`  ${race.state}: ${(race.winProbability.democratic * 100).toFixed(1)}% D | ${(race.winProbability.republican * 100).toFixed(1)}% R`);
    }
  }, 5000);  // Refresh every 5 seconds
}
