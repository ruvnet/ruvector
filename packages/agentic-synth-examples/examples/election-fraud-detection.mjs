#!/usr/bin/env node

/**
 * Election Fraud Detection and Real-Time Monitoring Example
 *
 * Demonstrates:
 * - Benford's Law analysis for vote fraud detection
 * - Turnout anomaly detection
 * - Geographic clustering analysis
 * - Real-time vote monitoring
 * - Live race calling
 */

import { FraudDetectionEngine, RealTimeMonitor, createLiveDashboard } from '../dist/election-2026/index.js';

console.log('\n🔍 ELECTION FRAUD DETECTION & REAL-TIME MONITORING\n');
console.log('═'.repeat(60) + '\n');

// ==================================================
// Part 1: Fraud Detection
// ==================================================

console.log('📊 PART 1: FRAUD DETECTION ANALYSIS\n');

const fraudDetector = new FraudDetectionEngine();

// Sample vote count data from Georgia counties
const georgiaVotes = [
  {
    location: 'Fulton County',
    timestamp: '2026-11-03T20:00:00Z',
    totalVotes: 450230,
    democraticVotes: 315161,  // 70% Dem
    republicanVotes: 135069,  // 30% Rep
    otherVotes: 0,
    registeredVoters: 580000,
    precinctReporting: 95
  },
  {
    location: 'Gwinnett County',
    timestamp: '2026-11-03T20:00:00Z',
    totalVotes: 298450,
    democraticVotes: 176633,  // 59% Dem
    republicanVotes: 121817,  // 41% Rep
    otherVotes: 0,
    registeredVoters: 385000,
    precinctReporting: 92
  },
  {
    location: 'Cobb County',
    timestamp: '2026-11-03T20:00:00Z',
    totalVotes: 285120,
    democraticVotes: 156816,  // 55% Dem
    republicanVotes: 128304,  // 45% Rep
    otherVotes: 0,
    registeredVoters: 360000,
    precinctReporting: 90
  },
  {
    location: 'Cherokee County',
    timestamp: '2026-11-03T20:00:00Z',
    totalVotes: 142340,
    democraticVotes: 39855,   // 28% Dem
    republicanVotes: 102485,  // 72% Rep
    otherVotes: 0,
    registeredVoters: 165000,
    precinctReporting: 88
  }
];

// Historical data for comparison
const historicalVotes = [
  {
    location: 'Fulton County',
    timestamp: '2022-11-08T20:00:00Z',
    totalVotes: 420000,
    democraticVotes: 294000,  // 70% Dem
    republicanVotes: 126000,  // 30% Rep
    otherVotes: 0,
    registeredVoters: 550000,
    precinctReporting: 100
  },
  {
    location: 'Gwinnett County',
    timestamp: '2022-11-08T20:00:00Z',
    totalVotes: 280000,
    democraticVotes: 154000,  // 55% Dem
    republicanVotes: 126000,  // 45% Rep
    otherVotes: 0,
    registeredVoters: 370000,
    precinctReporting: 100
  }
];

// 1. Benford's Law Analysis
console.log('🔬 Benford\'s Law Analysis...\n');
const benfordResults = fraudDetector.benfordsLawAnalysis(georgiaVotes);

for (const result of benfordResults) {
  console.log(`${result.location}:`);
  console.log(`  Chi-square: ${result.chiSquare.toFixed(2)}`);
  console.log(`  P-value: ${result.pValue.toFixed(4)}`);
  console.log(`  Passes Benford: ${result.passesTest ? '✓' : '✗'}`);
  console.log(`  Suspicion: ${result.suspicionLevel}\n`);
}

// 2. Turnout Anomaly Detection
console.log('📈 Turnout Anomaly Detection...\n');
const turnoutAnomalies = fraudDetector.detectTurnoutAnomalies(georgiaVotes, historicalVotes);

for (const anomaly of turnoutAnomalies) {
  console.log(`${anomaly.location}:`);
  console.log(`  Current: ${anomaly.actualTurnout.toFixed(1)}%`);
  console.log(`  Expected: ${anomaly.expectedTurnout.toFixed(1)}%`);
  console.log(`  Z-score: ${anomaly.standardDeviations.toFixed(2)}`);
  console.log(`  Anomalous: ${anomaly.isAnomalous ? '⚠️ Yes' : '✓ No'}\n`);
}

// 3. Vote Swing Analysis
console.log('↔️  Vote Swing Analysis...\n');
const swingAlerts = fraudDetector.analyzeVoteSwings(georgiaVotes, historicalVotes);

if (swingAlerts.length > 0) {
  console.log(`Found ${swingAlerts.length} swing alerts:\n`);
  for (const alert of swingAlerts) {
    console.log(`${alert.location}:`);
    console.log(`  Severity: ${alert.severity.toUpperCase()}`);
    console.log(`  ${alert.description}`);
    console.log(`  Anomaly Score: ${alert.anomalyScore.toFixed(0)}/100\n`);
  }
} else {
  console.log('✓ No unusual swings detected\n');
}

// 4. Generate Fraud Report
console.log('📋 FRAUD DETECTION SUMMARY\n');
const fraudReport = fraudDetector.generateFraudReport();

console.log(`Total Alerts: ${fraudReport.totalAlerts}`);
console.log(`Overall Risk Score: ${fraudReport.overallRiskScore.toFixed(1)}/100\n`);

console.log('By Severity:');
console.log(`  Critical: ${fraudReport.bySeverity.critical}`);
console.log(`  High: ${fraudReport.bySeverity.high}`);
console.log(`  Medium: ${fraudReport.bySeverity.medium}`);
console.log(`  Low: ${fraudReport.bySeverity.low}\n`);

if (fraudReport.highRiskLocations.length > 0) {
  console.log('⚠️  High Risk Locations:');
  for (const location of fraudReport.highRiskLocations) {
    console.log(`  - ${location}`);
  }
  console.log('');
}

console.log('Recommendations:');
for (const rec of fraudReport.recommendations) {
  console.log(`  • ${rec}`);
}

// ==================================================
// Part 2: Real-Time Monitoring
// ==================================================

console.log('\n\n📡 PART 2: REAL-TIME ELECTION MONITORING\n');
console.log('Simulating live vote updates...\n');

const monitor = new RealTimeMonitor();

// Subscribe to updates
monitor.subscribe((update) => {
  const total = update.democraticVotes + update.republicanVotes + update.otherVotes;
  const demPct = (update.democraticVotes / total) * 100;
  const repPct = (update.republicanVotes / total) * 100;

  console.log(`\n⚡ LIVE UPDATE: ${update.location}`);
  console.log(`   ${update.reportingPercentage.toFixed(1)}% reporting`);
  console.log(`   D: ${demPct.toFixed(1)}% (${update.democraticVotes.toLocaleString()})`);
  console.log(`   R: ${repPct.toFixed(1)}% (${update.republicanVotes.toLocaleString()})`);
});

// Simulate vote updates coming in
const simulateLiveResults = async () => {
  const states = ['GA', 'MI', 'PA', 'AZ', 'NC'];
  const reportingLevels = [25, 50, 75, 90, 95];

  for (const pct of reportingLevels) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 ${pct}% REPORTING NATIONWIDE`);
    console.log('═'.repeat(60));

    for (const state of states) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Delay for realism

      const baseVotes = 1000000;
      const votesIn = Math.floor((baseVotes * pct) / 100);

      // Simulate realistic partisan splits
      const demBase = state === 'GA' || state === 'MI' ? 0.51 : 0.49;
      const noise = (Math.random() - 0.5) * 0.04;
      const demPct = demBase + noise;

      const update = {
        timestamp: new Date().toISOString(),
        location: state,
        level: 'state' as const,
        totalVotes: votesIn,
        democraticVotes: Math.floor(votesIn * demPct),
        republicanVotes: Math.floor(votesIn * (1 - demPct - 0.01)),
        otherVotes: Math.floor(votesIn * 0.01),
        precinctsReporting: Math.floor(pct * 2.5),
        totalPrecincts: 250,
        reportingPercentage: pct,
        estimatedRemaining: baseVotes - votesIn
      };

      monitor.processVoteUpdate(update);
    }

    // Show dashboard after each batch
    console.log('\n');
    const dashboard = monitor.generateDashboard();

    console.log('🏛️  NATIONAL PROJECTION:');
    console.log(`   D: ${dashboard.nationalProjection.democraticSeats} seats`);
    console.log(`   R: ${dashboard.nationalProjection.republicanSeats} seats`);
    console.log(`   Tossups: ${dashboard.nationalProjection.tossups}`);

    console.log(`\n   Called: ${dashboard.calledRaces}/${dashboard.totalRaces} races`);
  }
};

// Run simulation
simulateLiveResults().then(() => {
  console.log('\n\n' + '═'.repeat(60));
  console.log('✅ SIMULATION COMPLETE');
  console.log('═'.repeat(60) + '\n');

  // Final race summary
  const calledRaces = monitor.getCalledRaces();
  const uncalledRaces = monitor.getUncalledRaces();

  console.log('🔔 CALLED RACES:\n');
  for (const race of calledRaces) {
    const winner = race.projectedWinner === 'D' ? 'Democrats' : 'Republicans';
    console.log(`   ${race.state}: ${winner} (${(race.confidence * 100).toFixed(1)}% confidence)`);
  }

  if (uncalledRaces.length > 0) {
    console.log('\n⏳ UNCALLED RACES:\n');
    for (const race of uncalledRaces) {
      console.log(`   ${race.state}: Too close to call`);
      console.log(`      D: ${(race.winProbability.democratic * 100).toFixed(1)}% | R: ${(race.winProbability.republican * 100).toFixed(1)}%`);
    }
  }

  console.log('\n✨ Analysis complete!\n');
  process.exit(0);
});
