#!/usr/bin/env node
/**
 * Granular Voter Modeling Example
 *
 * Demonstrates multi-level voter profiling from broad state aggregates
 * to individual voters with sub-personas and grounding data.
 */

import {
  GranularVoterModeler,
  GranularityLevel,
  GRANULARITY_RESOURCE_REQUIREMENTS
} from '../dist/election-2026/index.js';

console.log('\n🎯 GRANULAR VOTER MODELING SYSTEM');
console.log('================================\n');

/**
 * Example 1: State-level modeling (lowest resource cost)
 */
async function stateLevel() {
  console.log('📊 Example 1: State-Level Modeling (Broad Aggregates)');
  console.log('─────────────────────────────────────────────────────\n');

  const modeler = new GranularVoterModeler({
    level: GranularityLevel.STATE,
    resourceStrategy: 'cost_optimized',
    enableSubPersonas: false,
    useGroundingData: false
  });

  const results = await modeler.model('Georgia');

  console.log('State-Level Results:');
  console.log(`  Democratic: ${results.stateResults.aggregateVote.D}%`);
  console.log(`  Republican: ${results.stateResults.aggregateVote.R}%`);
  console.log(`  Independent: ${results.stateResults.aggregateVote.I}%`);
  console.log(`  Turnout: ${results.stateResults.turnoutEstimate}%`);
  console.log(`  Confidence: ${(results.quality.confidence * 100).toFixed(1)}%\n`);
}

/**
 * Example 2: County-level modeling
 */
async function countyLevel() {
  console.log('🗺️  Example 2: County-Level Modeling');
  console.log('─────────────────────────────────────\n');

  const modeler = new GranularVoterModeler({
    level: GranularityLevel.COUNTY,
    resourceStrategy: 'balanced',
    enableSwarmCoordination: true,
    swarmAgentCount: 4
  });

  const results = await modeler.model('Pennsylvania', {
    counties: ['Philadelphia', 'Allegheny', 'Montgomery', 'Bucks', 'Delaware']
  });

  console.log(`Counties Modeled: ${results.totalProfiles}`);
  console.log(`Key Demographics: ${results.insights.keyDemographics.join(', ')}`);
  console.log(`Swing Clusters: ${results.insights.swingVoterClusters.join(', ')}\n`);
}

/**
 * Example 3: Demographic cluster modeling with personas
 */
async function clusterLevel() {
  console.log('👥 Example 3: Demographic Cluster Modeling (Personas)');
  console.log('─────────────────────────────────────────────────────\n');

  const modeler = new GranularVoterModeler({
    level: GranularityLevel.DEMOGRAPHIC_CLUSTER,
    resourceStrategy: 'accuracy',
    enableSubPersonas: true,
    maxSubPersonas: 5,
    useGroundingData: true
  });

  const results = await modeler.model('Michigan', {
    targetDemographics: [
      'Young Urban Professionals',
      'Suburban Parents',
      'Rural Working Class',
      'Retired Seniors'
    ]
  });

  console.log('Cluster Analysis:');
  console.log(`  Total Clusters: ${results.totalProfiles}`);
  console.log(`  Grounding Data Coverage: ${(results.quality.groundingDataCoverage * 100).toFixed(1)}%`);

  // Show example cluster
  if (results.clusterResults && Object.keys(results.clusterResults).length > 0) {
    const clusterId = Object.keys(results.clusterResults)[0];
    const cluster = results.clusterResults[clusterId];
    console.log(`\nExample Cluster: ${cluster.name}`);
    console.log(`  Size: ${cluster.size.toLocaleString()} voters`);
    console.log(`  Turnout Rate: ${(cluster.votingBehavior.turnoutRate * 100).toFixed(1)}%`);
    console.log(`  Partisan Lean: ${cluster.votingBehavior.partisanLean > 0 ? 'R' : 'D'} ${Math.abs(cluster.votingBehavior.partisanLean * 100).toFixed(1)}%`);
    console.log(`  Sub-Personas: ${cluster.personas.length}`);

    cluster.personas.forEach(persona => {
      console.log(`\n  📍 ${persona.description}`);
      console.log(`     Weight: ${(persona.weight * 100).toFixed(0)}%`);
      console.log(`     D: ${(persona.voteTendency.democratic * 100).toFixed(0)}% | R: ${(persona.voteTendency.republican * 100).toFixed(0)}% | I: ${(persona.voteTendency.independent * 100).toFixed(0)}%`);
      console.log(`     Triggers: ${persona.triggers.join(', ')}`);
    });
  }
  console.log();
}

/**
 * Example 4: Individual voter modeling (highest granularity)
 */
async function individualLevel() {
  console.log('🔍 Example 4: Individual Voter Modeling (Micro-Targeting)');
  console.log('──────────────────────────────────────────────────────────\n');

  const modeler = new GranularVoterModeler({
    level: GranularityLevel.INDIVIDUAL,
    resourceStrategy: 'accuracy',
    enableSubPersonas: true,
    maxSubPersonas: 5,
    useGroundingData: true,
    groundingDataSources: [
      {
        type: 'voter_file',
        name: 'State Voter Registration',
        coverage: 0.98,
        recency: '2024-11-01',
        reliability: 0.95,
        fields: ['name', 'age', 'party', 'vote_history']
      },
      {
        type: 'census',
        name: 'US Census Bureau',
        coverage: 1.0,
        recency: '2020-04-01',
        reliability: 0.99,
        fields: ['demographics', 'economics', 'geography']
      }
    ]
  });

  const results = await modeler.model('Arizona', {
    precincts: ['Maricopa-Downtown', 'Maricopa-Suburbs']
  });

  console.log('Individual Modeling:');
  console.log(`  Profiles Generated: ${results.totalProfiles.toLocaleString()}`);
  console.log(`  Model Calls: ${results.resourceUsage.modelCallsUsed.toLocaleString()}`);
  console.log(`  Cost Estimate: $${results.resourceUsage.costEstimateUSD.toFixed(2)}`);
  console.log(`  Confidence: ${(results.quality.confidence * 100).toFixed(1)}%`);

  // Show example individual profile
  if (results.individualProfiles && results.individualProfiles.length > 0) {
    const profile = results.individualProfiles[0];
    console.log(`\nExample Voter Profile: ${profile.voterId}`);
    console.log(`  Location: ${profile.geography.county}, ${profile.geography.state}`);
    console.log(`  Party: ${profile.political.registeredParty}`);
    console.log(`  Turnout Probability: ${(profile.behavior.turnoutProbability * 100).toFixed(1)}%`);
    console.log(`  Persuadability: ${(profile.behavior.persuadability * 100).toFixed(1)}%`);
    console.log(`  Confidence: ${(profile.confidence * 100).toFixed(1)}%`);

    console.log(`\n  Sub-Personas (${profile.subPersonas.length}):`);
    profile.subPersonas.forEach(persona => {
      console.log(`\n    🎭 ${persona.description} (${(persona.weight * 100).toFixed(0)}% weight)`);
      console.log(`       Type: ${persona.type}`);
      console.log(`       Vote Tendency: D ${(persona.voteTendency.democratic * 100).toFixed(0)}% | R ${(persona.voteTendency.republican * 100).toFixed(0)}% | I ${(persona.voteTendency.independent * 100).toFixed(0)}%`);
      console.log(`       Motivations: ${persona.motivations.join(', ')}`);
      console.log(`       Triggers: ${persona.triggers.join(', ')}`);
    });

    console.log(`\n  Issue Positions:`);
    profile.political.issuePositions.forEach(issue => {
      const position = issue.position > 0 ? 'Conservative' : 'Liberal';
      const strength = Math.abs(issue.position * 100).toFixed(0);
      console.log(`    • ${issue.issue}: ${position} ${strength}% (Salience: ${(issue.salience * 100).toFixed(0)}%)`);
    });
  }
  console.log();
}

/**
 * Example 5: Resource comparison across granularity levels
 */
function resourceComparison() {
  console.log('💰 Example 5: Resource Comparison Across Granularity Levels');
  console.log('────────────────────────────────────────────────────────────\n');

  console.log('Resource Requirements (1 State):');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('Level                  | Cost  | Calls   | Time    | Profiles');
  console.log('─────────────────────────────────────────────────────────────');

  Object.values(GranularityLevel).forEach(level => {
    const req = GRANULARITY_RESOURCE_REQUIREMENTS[level];
    const cost = `${req.computationalCost}x`.padEnd(5);
    const calls = req.modelCalls.toLocaleString().padEnd(7);
    const time = `${Math.floor(req.estimatedTimeSeconds / 60)}m`.padEnd(7);
    const profiles = req.profileCount.toLocaleString().padEnd(8);
    console.log(`${level.padEnd(22)} | ${cost} | ${calls} | ${time} | ${profiles}`);
  });

  console.log('\nCost Multipliers:');
  console.log(`  STATE → COUNTY:            ${GRANULARITY_RESOURCE_REQUIREMENTS[GranularityLevel.COUNTY].computationalCost}x increase`);
  console.log(`  COUNTY → PRECINCT:         ${GRANULARITY_RESOURCE_REQUIREMENTS[GranularityLevel.PRECINCT].computationalCost / GRANULARITY_RESOURCE_REQUIREMENTS[GranularityLevel.COUNTY].computationalCost}x increase`);
  console.log(`  PRECINCT → CLUSTER:        ${GRANULARITY_RESOURCE_REQUIREMENTS[GranularityLevel.DEMOGRAPHIC_CLUSTER].computationalCost / GRANULARITY_RESOURCE_REQUIREMENTS[GranularityLevel.PRECINCT].computationalCost}x increase`);
  console.log(`  CLUSTER → INDIVIDUAL:      ${GRANULARITY_RESOURCE_REQUIREMENTS[GranularityLevel.INDIVIDUAL].computationalCost / GRANULARITY_RESOURCE_REQUIREMENTS[GranularityLevel.DEMOGRAPHIC_CLUSTER].computationalCost}x increase`);
  console.log(`  STATE → INDIVIDUAL:        ${GRANULARITY_RESOURCE_REQUIREMENTS[GranularityLevel.INDIVIDUAL].computationalCost}x total increase\n`);
}

/**
 * Run all examples
 */
async function main() {
  try {
    // Run examples sequentially
    await stateLevel();
    await countyLevel();
    await clusterLevel();
    await individualLevel();
    resourceComparison();

    console.log('✅ All granularity examples completed!\n');
    console.log('💡 Key Takeaways:');
    console.log('   • State-level: Fast, low-cost, broad insights');
    console.log('   • County-level: Regional targeting, moderate cost');
    console.log('   • Cluster-level: Persona-based messaging, high accuracy');
    console.log('   • Individual-level: Micro-targeting, highest precision\n');
    console.log('📊 Use Cases:');
    console.log('   • Early polling: STATE level');
    console.log('   • Regional strategy: COUNTY level');
    console.log('   • Message testing: CLUSTER level');
    console.log('   • GOTV & persuasion: INDIVIDUAL level\n');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
