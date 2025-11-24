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
export interface FraudAlert {
  alertId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'benford' | 'turnout' | 'geographic' | 'timestamp' | 'swing' | 'statistical';
  location: string;           // State, county, or precinct
  description: string;
  anomalyScore: number;        // 0-100, higher = more suspicious
  timestamp: string;
  evidence: {
    metric: string;
    expectedValue: number;
    actualValue: number;
    deviation: number;         // Standard deviations from normal
  }[];
  recommendations: string[];
}

/**
 * Vote count data for fraud analysis
 */
export interface VoteCountData {
  location: string;
  timestamp: string;
  totalVotes: number;
  democraticVotes: number;
  republicanVotes: number;
  otherVotes: number;
  registeredVoters: number;
  precinctReporting: number;   // Percentage
  votesByHour?: Record<string, number>;
  earlyVotes?: number;
  electionDayVotes?: number;
}

/**
 * Benford's Law analysis result
 */
export interface BenfordAnalysis {
  location: string;
  digitPosition: 1 | 2;         // Leading digit or second digit
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
export interface TurnoutAnomaly {
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
export class FraudDetectionEngine {
  private alerts: FraudAlert[] = [];
  private analysisResults: Map<string, any> = new Map();

  /**
   * Benford's Law Analysis
   * First digit distribution should follow logarithmic pattern
   */
  benfordsLawAnalysis(voteCounts: VoteCountData[]): BenfordAnalysis[] {
    const results: BenfordAnalysis[] = [];

    // Expected Benford distribution for first digit
    const benfordExpected = [
      0.301, 0.176, 0.125, 0.097, 0.079,
      0.067, 0.058, 0.051, 0.046
    ];

    for (const location of this.groupByLocation(voteCounts)) {
      const votes = location.votes.map(v => v.democraticVotes + v.republicanVotes);
      const firstDigits = this.extractFirstDigits(votes);
      const distribution = this.calculateDistribution(firstDigits);

      const chiSquare = this.calculateChiSquare(distribution, benfordExpected);
      const pValue = this.chiSquarePValue(chiSquare, 8); // 8 degrees of freedom

      results.push({
        location: location.name,
        digitPosition: 1,
        expectedDistribution: benfordExpected,
        actualDistribution: distribution,
        chiSquare,
        pValue,
        passesTest: pValue > 0.05,
        suspicionLevel: this.getSuspicionLevel(pValue)
      });

      // Generate alert if suspicious
      if (pValue < 0.01) {
        this.generateAlert({
          type: 'benford',
          location: location.name,
          severity: pValue < 0.001 ? 'critical' : 'high',
          description: `Benford's Law violation detected - vote counts don't follow expected statistical distribution`,
          anomalyScore: (1 - pValue) * 100,
          evidence: [{
            metric: 'Benford p-value',
            expectedValue: 0.05,
            actualValue: pValue,
            deviation: (0.05 - pValue) / 0.01
          }]
        });
      }
    }

    return results;
  }

  /**
   * Turnout Anomaly Detection
   * Detect unusual turnout patterns
   */
  detectTurnoutAnomalies(
    current: VoteCountData[],
    historical: VoteCountData[]
  ): TurnoutAnomaly[] {
    const results: TurnoutAnomaly[] = [];

    for (const curr of current) {
      const hist = historical.filter(h => h.location === curr.location);
      if (hist.length === 0) continue;

      const historicalTurnouts = hist.map(h =>
        (h.totalVotes / h.registeredVoters) * 100
      );

      const mean = this.mean(historicalTurnouts);
      const stdDev = this.standardDeviation(historicalTurnouts);
      const currentTurnout = (curr.totalVotes / curr.registeredVoters) * 100;

      const zScore = (currentTurnout - mean) / stdDev;
      const isAnomalous = Math.abs(zScore) > 2.5; // 2.5 standard deviations

      results.push({
        location: curr.location,
        actualTurnout: currentTurnout,
        expectedTurnout: mean,
        historicalAverage: mean,
        standardDeviations: zScore,
        isAnomalous,
        suspicionLevel: this.getTurnoutSuspicionLevel(Math.abs(zScore))
      });

      if (isAnomalous) {
        this.generateAlert({
          type: 'turnout',
          location: curr.location,
          severity: Math.abs(zScore) > 4 ? 'critical' : 'medium',
          description: `Unusual turnout detected - ${zScore > 0 ? 'higher' : 'lower'} than historical average`,
          anomalyScore: Math.min(100, Math.abs(zScore) * 20),
          evidence: [{
            metric: 'Turnout percentage',
            expectedValue: mean,
            actualValue: currentTurnout,
            deviation: zScore
          }]
        });
      }
    }

    return results;
  }

  /**
   * Geographic Clustering Analysis
   * Detect unusual patterns in adjacent areas
   */
  detectGeographicAnomalies(
    voteCounts: VoteCountData[],
    adjacencyMap: Map<string, string[]>
  ): FraudAlert[] {
    const alerts: FraudAlert[] = [];

    for (const [location, neighbors] of adjacencyMap) {
      const locationData = voteCounts.find(v => v.location === location);
      if (!locationData) continue;

      const neighborData = neighbors
        .map(n => voteCounts.find(v => v.location === n))
        .filter(Boolean) as VoteCountData[];

      if (neighborData.length === 0) continue;

      // Calculate local margin
      const localMargin = this.calculateMargin(locationData);
      const neighborMargins = neighborData.map(n => this.calculateMargin(n));
      const avgNeighborMargin = this.mean(neighborMargins);

      // Check for outliers
      const marginDiff = Math.abs(localMargin - avgNeighborMargin);

      if (marginDiff > 20) { // 20 percentage point difference
        alerts.push({
          alertId: `geo_${location}_${Date.now()}`,
          type: 'geographic',
          location,
          severity: marginDiff > 30 ? 'high' : 'medium',
          description: `Geographic outlier - voting pattern significantly differs from neighboring areas`,
          anomalyScore: Math.min(100, marginDiff * 2),
          timestamp: new Date().toISOString(),
          evidence: [{
            metric: 'Vote margin difference',
            expectedValue: avgNeighborMargin,
            actualValue: localMargin,
            deviation: marginDiff / 10
          }],
          recommendations: [
            'Compare demographics with neighboring areas',
            'Review precinct-level reporting',
            'Verify vote counting procedures'
          ]
        });
      }
    }

    return alerts;
  }

  /**
   * Timestamp Irregularity Detection
   * Detect suspicious vote dumps or timing patterns
   */
  detectTimestampIrregularities(voteCounts: VoteCountData[]): FraudAlert[] {
    const alerts: FraudAlert[] = [];

    for (const location of this.groupByLocation(voteCounts)) {
      const timeSeriesData = location.votes.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Check for sudden spikes
      for (let i = 1; i < timeSeriesData.length; i++) {
        const prev = timeSeriesData[i - 1];
        const curr = timeSeriesData[i];

        const prevTotal = prev.totalVotes;
        const currTotal = curr.totalVotes;
        const increase = currTotal - prevTotal;

        // Check for suspicious large jumps
        if (increase > prevTotal * 0.5) { // 50% increase
          const timeDiff = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
          const minutesDiff = timeDiff / (1000 * 60);

          alerts.push({
            alertId: `time_${location.name}_${i}`,
            type: 'timestamp',
            location: location.name,
            severity: increase > prevTotal ? 'critical' : 'high',
            description: `Suspicious vote spike detected - ${increase.toLocaleString()} votes in ${minutesDiff.toFixed(0)} minutes`,
            anomalyScore: Math.min(100, (increase / prevTotal) * 50),
            timestamp: curr.timestamp,
            evidence: [{
              metric: 'Vote increase rate',
              expectedValue: prevTotal * 0.1,
              actualValue: increase,
              deviation: increase / (prevTotal * 0.1)
            }],
            recommendations: [
              'Verify timestamp accuracy',
              'Review batch processing logs',
              'Confirm vote source and chain of custody'
            ]
          });
        }
      }
    }

    return alerts;
  }

  /**
   * Vote Swing Analysis
   * Detect unrealistic partisan shifts
   */
  analyzeVoteSwings(
    current: VoteCountData[],
    previous: VoteCountData[]
  ): FraudAlert[] {
    const alerts: FraudAlert[] = [];

    for (const curr of current) {
      const prev = previous.find(p => p.location === curr.location);
      if (!prev) continue;

      const currDemPct = (curr.democraticVotes / curr.totalVotes) * 100;
      const prevDemPct = (prev.democraticVotes / prev.totalVotes) * 100;

      const swing = currDemPct - prevDemPct;

      // Swings over 15 points are very rare
      if (Math.abs(swing) > 15) {
        alerts.push({
          alertId: `swing_${curr.location}`,
          type: 'swing',
          location: curr.location,
          severity: Math.abs(swing) > 25 ? 'critical' : 'high',
          description: `Extreme partisan swing detected - ${swing.toFixed(1)}% shift toward ${swing > 0 ? 'Democrats' : 'Republicans'}`,
          anomalyScore: Math.min(100, Math.abs(swing) * 4),
          timestamp: new Date().toISOString(),
          evidence: [{
            metric: 'Democratic vote share change',
            expectedValue: 5,
            actualValue: Math.abs(swing),
            deviation: Math.abs(swing) / 5
          }],
          recommendations: [
            'Compare demographic changes',
            'Review campaign activities',
            'Verify voter registration changes'
          ]
        });
      }
    }

    return alerts;
  }

  /**
   * Get all fraud alerts
   */
  getAlerts(minSeverity?: 'low' | 'medium' | 'high' | 'critical'): FraudAlert[] {
    if (!minSeverity) return this.alerts;

    const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    const minLevel = severityOrder[minSeverity];

    return this.alerts.filter(a => severityOrder[a.severity] >= minLevel);
  }

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
  } {
    const bySeverity = { low: 0, medium: 0, high: 0, critical: 0 };
    const byType: Record<string, number> = {};
    const locationScores = new Map<string, number>();

    for (const alert of this.alerts) {
      bySeverity[alert.severity]++;
      byType[alert.type] = (byType[alert.type] || 0) + 1;

      const currentScore = locationScores.get(alert.location) || 0;
      locationScores.set(alert.location, currentScore + alert.anomalyScore);
    }

    const highRiskLocations = Array.from(locationScores.entries())
      .filter(([_, score]) => score > 200)
      .sort((a, b) => b[1] - a[1])
      .map(([location]) => location);

    const overallRiskScore = this.alerts.reduce((sum, a) => sum + a.anomalyScore, 0) /
      Math.max(1, this.alerts.length);

    return {
      totalAlerts: this.alerts.length,
      bySeverity,
      byType,
      highRiskLocations,
      overallRiskScore,
      recommendations: this.generateRecommendations(bySeverity, highRiskLocations)
    };
  }

  // Helper methods

  private generateAlert(params: Partial<FraudAlert>) {
    this.alerts.push({
      alertId: `${params.type}_${params.location}_${Date.now()}`,
      severity: params.severity || 'medium',
      type: params.type!,
      location: params.location!,
      description: params.description!,
      anomalyScore: params.anomalyScore!,
      timestamp: new Date().toISOString(),
      evidence: params.evidence || [],
      recommendations: params.recommendations || []
    });
  }

  private groupByLocation(data: VoteCountData[]): { name: string; votes: VoteCountData[] }[] {
    const grouped = new Map<string, VoteCountData[]>();

    for (const item of data) {
      if (!grouped.has(item.location)) {
        grouped.set(item.location, []);
      }
      grouped.get(item.location)!.push(item);
    }

    return Array.from(grouped.entries()).map(([name, votes]) => ({ name, votes }));
  }

  private extractFirstDigits(numbers: number[]): number[] {
    return numbers
      .map(n => parseInt(n.toString()[0]))
      .filter(d => d > 0 && d <= 9);
  }

  private calculateDistribution(digits: number[]): number[] {
    const counts = new Array(9).fill(0);
    for (const digit of digits) {
      if (digit >= 1 && digit <= 9) {
        counts[digit - 1]++;
      }
    }
    return counts.map(c => c / digits.length);
  }

  private calculateChiSquare(observed: number[], expected: number[]): number {
    let chiSquare = 0;
    for (let i = 0; i < observed.length; i++) {
      const diff = observed[i] - expected[i];
      chiSquare += (diff * diff) / expected[i];
    }
    return chiSquare;
  }

  private chiSquarePValue(chiSquare: number, df: number): number {
    // Simplified p-value calculation (would use proper chi-square distribution in production)
    // Critical values for df=8: 15.51 (p=0.05), 20.09 (p=0.01), 26.12 (p=0.001)
    if (chiSquare < 15.51) return 0.10;
    if (chiSquare < 20.09) return 0.03;
    if (chiSquare < 26.12) return 0.005;
    return 0.001;
  }

  private getSuspicionLevel(pValue: number): 'none' | 'low' | 'medium' | 'high' {
    if (pValue > 0.05) return 'none';
    if (pValue > 0.01) return 'low';
    if (pValue > 0.001) return 'medium';
    return 'high';
  }

  private getTurnoutSuspicionLevel(zScore: number): 'none' | 'low' | 'medium' | 'high' {
    if (zScore < 2) return 'none';
    if (zScore < 3) return 'low';
    if (zScore < 4) return 'medium';
    return 'high';
  }

  private calculateMargin(data: VoteCountData): number {
    const demPct = (data.democraticVotes / data.totalVotes) * 100;
    const repPct = (data.republicanVotes / data.totalVotes) * 100;
    return demPct - repPct;
  }

  private mean(numbers: number[]): number {
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  private standardDeviation(numbers: number[]): number {
    const avg = this.mean(numbers);
    const squareDiffs = numbers.map(n => Math.pow(n - avg, 2));
    const avgSquareDiff = this.mean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }

  private generateRecommendations(
    bySeverity: Record<string, number>,
    highRiskLocations: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (bySeverity.critical > 0) {
      recommendations.push('Immediate manual audit required for critical alerts');
      recommendations.push('Contact election officials in flagged jurisdictions');
    }

    if (bySeverity.high > 5) {
      recommendations.push('Comprehensive review of vote counting procedures');
      recommendations.push('Verify chain of custody documentation');
    }

    if (highRiskLocations.length > 0) {
      recommendations.push(`Focus investigation on: ${highRiskLocations.slice(0, 5).join(', ')}`);
    }

    if (recommendations.length === 0) {
      recommendations.push('No significant anomalies detected');
      recommendations.push('Continue standard monitoring procedures');
    }

    return recommendations;
  }
}
