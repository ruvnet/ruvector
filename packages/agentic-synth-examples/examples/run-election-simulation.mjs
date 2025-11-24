#!/usr/bin/env node

/**
 * Standalone 2026 US Midterm Election Simulation
 *
 * Run with: node run-election-simulation.mjs
 */

import { ElectionSimulator, getCompetitiveStates } from '../dist/election-2026/index.js';

async function main() {
  console.log('\n🗳️  2026 US MIDTERM ELECTION SIMULATION');
  console.log('=' .repeat(60) + '\n');

  // Get competitive states with Senate races
  const allCompetitive = getCompetitiveStates();
  const competitiveWithSenate = allCompetitive
    .filter(state => state.senateRace)
    .map(state => state.abbreviation);

  console.log(`📊 Analyzing ${competitiveWithSenate.length} competitive Senate races:`);
  console.log(competitiveWithSenate.join(', '));
  console.log('');

  // Configuration
  const config = {
    states: competitiveWithSenate,
    simulationsPerState: 1000,  // 1000 Monte Carlo simulations per state
    models: ['gemini'],
    enableSelfLearning: true,
    enableStreaming: true
  };

  console.log('⚙️  Configuration:');
  console.log(`   Simulations per state: ${config.simulationsPerState.toLocaleString()}`);
  console.log(`   Total simulations: ${(config.states.length * config.simulationsPerState).toLocaleString()}`);
  console.log(`   AI Models: ${config.models.join(', ')}`);
  console.log(`   Self-learning: Enabled ✓`);
  console.log('');

  // Create simulator
  const simulator = new ElectionSimulator(config);

  // Run simulation
  console.log('🚀 Starting simulation...\n');
  const startTime = Date.now();

  try {
    const results = await simulator.run();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n✅ Simulation complete in ${duration}s\n`);

    // Display summary
    console.log('=' .repeat(60));
    console.log('FINAL RESULTS SUMMARY');
    console.log('=' .repeat(60) + '\n');

    console.log('🏛️  SENATE PROJECTION\n');
    const { senate } = results.nationalResults;
    console.log(`Current:   D ${senate.currentSeats.D} | R ${senate.currentSeats.R}`);
    console.log(`Projected: D ${senate.projectedSeats.D} | R ${senate.projectedSeats.R}`);
    console.log(`Net Change: D ${senate.netChange.D > 0 ? '+' : ''}${senate.netChange.D} | R ${senate.netChange.R > 0 ? '+' : ''}${senate.netChange.R}`);
    console.log(`\nControl Probability:`);
    console.log(`  Democrats:  ${(senate.probabilityControl.D * 100).toFixed(1)}%`);
    console.log(`  Republicans: ${(senate.probabilityControl.R * 100).toFixed(1)}%`);

    console.log('\n\n🔥 MOST COMPETITIVE RACES\n');

    // Get top 5 most competitive
    const competitive = Object.entries(results.stateResults)
      .sort((a, b) => b[1].competitiveScore - a[1].competitiveScore)
      .slice(0, 5);

    for (const [state, result] of competitive) {
      const leader = result.winProbability.democratic > result.winProbability.republican ? 'D' : 'R';
      const leaderProb = Math.max(result.winProbability.democratic, result.winProbability.republican);
      const margin = result.averageMargin;

      console.log(`${state}: ${leader} ${(leaderProb * 100).toFixed(1)}% (margin: ${margin.toFixed(1)}%, competitive: ${result.competitiveScore.toFixed(0)}/100)`);
      console.log(`   D ${(result.winProbability.democratic * 100).toFixed(1)}% | R ${(result.winProbability.republican * 100).toFixed(1)}%`);
      console.log(`   Avg Turnout: ${result.averageTurnout.toFixed(1)}%\n`);
    }

    console.log('\n📈 SIMULATION STATISTICS\n');
    console.log(`Total Simulations: ${results.nationalResults.totalSimulations.toLocaleString()}`);
    console.log(`States Analyzed: ${Object.keys(results.stateResults).length}`);
    console.log(`Overall Confidence: ${(results.nationalResults.confidence * 100).toFixed(1)}%`);
    console.log(`Execution Time: ${duration}s`);

    console.log('\n' + '=' .repeat(60) + '\n');

    // Save results
    const fs = await import('fs');
    const outputPath = '/tmp/election-2026-results.json';
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`💾 Full results saved to: ${outputPath}\n`);

    return results;

  } catch (error) {
    console.error('\n❌ Simulation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run simulation
main()
  .then(() => {
    console.log('✨ Simulation complete!\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
