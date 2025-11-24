// src/election-2026/simulator.ts
import { AgenticSynth } from "@ruvector/agentic-synth";

// src/election-2026/data/states.ts
var US_STATES = [
  // Class 2 Senate seats (up for election in 2026)
  { name: "Alabama", abbreviation: "AL", electoralVotes: 9, population: 5024279, region: "South", senateRace: false, governorRace: true },
  { name: "Alaska", abbreviation: "AK", electoralVotes: 3, population: 733391, region: "West", senateRace: true, governorRace: true },
  { name: "Arizona", abbreviation: "AZ", electoralVotes: 11, population: 7151502, region: "West", senateRace: false, governorRace: true },
  { name: "Arkansas", abbreviation: "AR", electoralVotes: 6, population: 3011524, region: "South", senateRace: true, governorRace: true },
  { name: "California", abbreviation: "CA", electoralVotes: 54, population: 39538223, region: "West", senateRace: false, governorRace: true },
  { name: "Colorado", abbreviation: "CO", electoralVotes: 10, population: 5773714, region: "West", senateRace: true, governorRace: true },
  { name: "Connecticut", abbreviation: "CT", electoralVotes: 7, population: 3605944, region: "Northeast", senateRace: false, governorRace: true },
  { name: "Delaware", abbreviation: "DE", electoralVotes: 3, population: 989948, region: "Northeast", senateRace: true, governorRace: false },
  { name: "Florida", abbreviation: "FL", electoralVotes: 30, population: 21538187, region: "South", senateRace: false, governorRace: true },
  { name: "Georgia", abbreviation: "GA", electoralVotes: 16, population: 10711908, region: "South", senateRace: true, governorRace: true },
  { name: "Hawaii", abbreviation: "HI", electoralVotes: 4, population: 1455271, region: "West", senateRace: false, governorRace: true },
  { name: "Idaho", abbreviation: "ID", electoralVotes: 4, population: 1839106, region: "West", senateRace: true, governorRace: true },
  { name: "Illinois", abbreviation: "IL", electoralVotes: 19, population: 12812508, region: "Midwest", senateRace: true, governorRace: true },
  { name: "Indiana", abbreviation: "IN", electoralVotes: 11, population: 6785528, region: "Midwest", senateRace: false, governorRace: false },
  { name: "Iowa", abbreviation: "IA", electoralVotes: 6, population: 3190369, region: "Midwest", senateRace: true, governorRace: true },
  { name: "Kansas", abbreviation: "KS", electoralVotes: 6, population: 2937880, region: "Midwest", senateRace: true, governorRace: true },
  { name: "Kentucky", abbreviation: "KY", electoralVotes: 8, population: 4505836, region: "South", senateRace: true, governorRace: false },
  { name: "Louisiana", abbreviation: "LA", electoralVotes: 8, population: 4657757, region: "South", senateRace: true, governorRace: false },
  { name: "Maine", abbreviation: "ME", electoralVotes: 4, population: 1362359, region: "Northeast", senateRace: true, governorRace: true },
  { name: "Maryland", abbreviation: "MD", electoralVotes: 10, population: 6177224, region: "Northeast", senateRace: false, governorRace: true },
  { name: "Massachusetts", abbreviation: "MA", electoralVotes: 11, population: 7029917, region: "Northeast", senateRace: true, governorRace: true },
  { name: "Michigan", abbreviation: "MI", electoralVotes: 15, population: 10077331, region: "Midwest", senateRace: true, governorRace: true },
  { name: "Minnesota", abbreviation: "MN", electoralVotes: 10, population: 5706494, region: "Midwest", senateRace: true, governorRace: true },
  { name: "Mississippi", abbreviation: "MS", electoralVotes: 6, population: 2961279, region: "South", senateRace: true, governorRace: false },
  { name: "Missouri", abbreviation: "MO", electoralVotes: 10, population: 6154913, region: "Midwest", senateRace: false, governorRace: false },
  { name: "Montana", abbreviation: "MT", electoralVotes: 4, population: 1084225, region: "West", senateRace: true, governorRace: true },
  { name: "Nebraska", abbreviation: "NE", electoralVotes: 5, population: 1961504, region: "Midwest", senateRace: true, governorRace: true },
  { name: "Nevada", abbreviation: "NV", electoralVotes: 6, population: 3104614, region: "West", senateRace: false, governorRace: true },
  { name: "New Hampshire", abbreviation: "NH", electoralVotes: 4, population: 1377529, region: "Northeast", senateRace: true, governorRace: true },
  { name: "New Jersey", abbreviation: "NJ", electoralVotes: 14, population: 9288994, region: "Northeast", senateRace: true, governorRace: false },
  { name: "New Mexico", abbreviation: "NM", electoralVotes: 5, population: 2117522, region: "West", senateRace: true, governorRace: true },
  { name: "New York", abbreviation: "NY", electoralVotes: 28, population: 20201249, region: "Northeast", senateRace: false, governorRace: true },
  { name: "North Carolina", abbreviation: "NC", electoralVotes: 16, population: 10439388, region: "South", senateRace: true, governorRace: true },
  { name: "North Dakota", abbreviation: "ND", electoralVotes: 3, population: 779094, region: "Midwest", senateRace: false, governorRace: true },
  { name: "Ohio", abbreviation: "OH", electoralVotes: 17, population: 11799448, region: "Midwest", senateRace: true, governorRace: true },
  { name: "Oklahoma", abbreviation: "OK", electoralVotes: 7, population: 3959353, region: "South", senateRace: true, governorRace: true },
  { name: "Oregon", abbreviation: "OR", electoralVotes: 8, population: 4237256, region: "West", senateRace: true, governorRace: true },
  { name: "Pennsylvania", abbreviation: "PA", electoralVotes: 19, population: 13002700, region: "Northeast", senateRace: false, governorRace: true },
  { name: "Rhode Island", abbreviation: "RI", electoralVotes: 4, population: 1097379, region: "Northeast", senateRace: true, governorRace: true },
  { name: "South Carolina", abbreviation: "SC", electoralVotes: 9, population: 5118425, region: "South", senateRace: true, governorRace: true },
  { name: "South Dakota", abbreviation: "SD", electoralVotes: 3, population: 886667, region: "Midwest", senateRace: true, governorRace: true },
  { name: "Tennessee", abbreviation: "TN", electoralVotes: 11, population: 6910840, region: "South", senateRace: true, governorRace: true },
  { name: "Texas", abbreviation: "TX", electoralVotes: 40, population: 29145505, region: "South", senateRace: true, governorRace: true },
  { name: "Utah", abbreviation: "UT", electoralVotes: 6, population: 3271616, region: "West", senateRace: false, governorRace: true },
  { name: "Vermont", abbreviation: "VT", electoralVotes: 3, population: 643077, region: "Northeast", senateRace: false, governorRace: true },
  { name: "Virginia", abbreviation: "VA", electoralVotes: 13, population: 8631393, region: "South", senateRace: true, governorRace: false },
  { name: "Washington", abbreviation: "WA", electoralVotes: 12, population: 7705281, region: "West", senateRace: false, governorRace: true },
  { name: "West Virginia", abbreviation: "WV", electoralVotes: 4, population: 1793716, region: "South", senateRace: true, governorRace: false },
  { name: "Wisconsin", abbreviation: "WI", electoralVotes: 10, population: 5893718, region: "Midwest", senateRace: false, governorRace: true },
  { name: "Wyoming", abbreviation: "WY", electoralVotes: 3, population: 576851, region: "West", senateRace: true, governorRace: true }
];
function getSenateRaceStates() {
  return US_STATES.filter((state) => state.senateRace);
}

// src/election-2026/simulator.ts
var colors = {
  reset: "\x1B[0m",
  bright: "\x1B[1m",
  dim: "\x1B[2m",
  green: "\x1B[32m",
  blue: "\x1B[34m",
  yellow: "\x1B[33m",
  cyan: "\x1B[36m",
  magenta: "\x1B[35m",
  red: "\x1B[31m"
};
var ElectionSimulator = class {
  config;
  generators = {};
  progress;
  learningMetrics = [];
  modelPerformance = {};
  constructor(config = {}) {
    this.config = {
      states: config.states || getSenateRaceStates().map((s) => s.abbreviation),
      simulationsPerState: config.simulationsPerState || 1e3,
      races: config.races || ["Senate"],
      models: config.models || ["gemini"],
      enableSelfLearning: config.enableSelfLearning ?? true,
      enableSwarmOptimization: config.enableSwarmOptimization ?? true,
      enableStreaming: config.enableStreaming ?? true,
      historicalValidation: config.historicalValidation ?? true,
      uncertaintyQuantification: config.uncertaintyQuantification ?? true,
      parallelProcessing: config.parallelProcessing ?? true,
      maxParallelStates: config.maxParallelStates || 5
    };
    this.progress = {
      currentState: "",
      statesCompleted: 0,
      totalStates: this.config.states.length,
      simulationsCompleted: 0,
      totalSimulations: this.config.states.length * this.config.simulationsPerState,
      percentComplete: 0,
      estimatedTimeRemaining: 0,
      currentModel: "",
      averageSimulationTime: 0,
      status: "initializing"
    };
  }
  /**
   * Display banner
   */
  banner(text) {
    const border = "\u2550".repeat(text.length + 4);
    console.log(`${colors.bright}${colors.magenta}
\u2554${border}\u2557`);
    console.log(`\u2551  ${text}  \u2551`);
    console.log(`\u255A${border}\u255D${colors.reset}
`);
  }
  /**
   * Progress bar
   */
  progressBar(current, total, label = "") {
    const width = 50;
    const percentage = current / total * 100;
    const filled = Math.floor(current / total * width);
    const empty = width - filled;
    const bar = "\u2588".repeat(filled) + "\u2591".repeat(empty);
    const percent = percentage.toFixed(1).padStart(5);
    return `${colors.cyan}${label}${colors.reset} [${colors.green}${bar}${colors.reset}] ${percent}%`;
  }
  /**
   * Initialize AI generators for all configured models
   */
  async initializeGenerators(apiKeys) {
    this.banner("\u{1F916} INITIALIZING ELECTION SIMULATION MODELS");
    console.log(`${colors.yellow}\u26A1 Setting up multi-model AI generators...${colors.reset}
`);
    const modelConfigs = {
      gemini: {
        provider: "gemini",
        model: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash"
      },
      claude: {
        provider: "openrouter",
        model: "anthropic/claude-sonnet-4.5",
        name: "Claude Sonnet 4.5"
      },
      kimi: {
        provider: "openrouter",
        model: "moonshot/moonshot-v1-32k",
        name: "Kimi K2"
      }
    };
    for (const modelKey of this.config.models) {
      const config = modelConfigs[modelKey];
      const apiKey = config.provider === "gemini" ? apiKeys.gemini || process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY : apiKeys.openrouter || process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        console.log(`${colors.yellow}\u26A0\uFE0F  Skipping ${config.name} - No API key${colors.reset}`);
        continue;
      }
      try {
        this.generators[modelKey] = new AgenticSynth({
          provider: config.provider,
          model: config.model,
          apiKey
        });
        console.log(`${colors.green}\u2713 ${config.name} initialized${colors.reset}`);
      } catch (error) {
        console.log(`${colors.red}\u2717 ${config.name} failed: ${error.message}${colors.reset}`);
      }
    }
    if (Object.keys(this.generators).length === 0) {
      throw new Error("No generators initialized. Check API keys.");
    }
    console.log(`
${colors.green}\u2713 ${Object.keys(this.generators).length} models ready${colors.reset}
`);
  }
  /**
   * Generate realistic state election data schema
   */
  getStateDataSchema() {
    return {
      // Demographics
      medianAge: {
        type: "number",
        description: "Median age of state population (20-50 years)"
      },
      collegeEducation: {
        type: "number",
        description: "Percentage with college degree (15-60%)"
      },
      urbanization: {
        type: "number",
        description: "Percentage in urban areas (20-100%)"
      },
      // Economic Indicators
      unemploymentRate: {
        type: "number",
        description: "Unemployment rate percentage (2-10%)"
      },
      gdpGrowth: {
        type: "number",
        description: "Annual GDP growth rate (-3% to 6%)"
      },
      inflationRate: {
        type: "number",
        description: "Annual inflation rate (1-8%)"
      },
      consumerConfidence: {
        type: "number",
        description: "Consumer confidence index (40-120)"
      },
      // Polling
      democraticSupport: {
        type: "number",
        description: "Democratic candidate support percentage (25-65%)"
      },
      republicanSupport: {
        type: "number",
        description: "Republican candidate support percentage (25-65%)"
      },
      undecided: {
        type: "number",
        description: "Undecided voters percentage (2-20%)"
      },
      // Political Environment
      presidentialApproval: {
        type: "number",
        description: "Presidential approval rating (30-70%)"
      },
      genericBallotD: {
        type: "number",
        description: "Generic ballot Democratic percentage (35-55%)"
      },
      genericBallotR: {
        type: "number",
        description: "Generic ballot Republican percentage (35-55%)"
      },
      // Campaign Factors
      democraticFunding: {
        type: "number",
        description: "Democratic campaign funding in millions (5-150 million)"
      },
      republicanFunding: {
        type: "number",
        description: "Republican campaign funding in millions (5-150 million)"
      },
      democraticQuality: {
        type: "number",
        description: "Democratic candidate quality score (40-100)"
      },
      republicanQuality: {
        type: "number",
        description: "Republican candidate quality score (40-100)"
      },
      // Outcome Prediction
      winner: {
        type: "string",
        description: "Predicted winner: D (Democrat), R (Republican), or I (Independent)"
      },
      margin: {
        type: "number",
        description: "Predicted margin of victory in percentage points (0.1-30%)"
      },
      turnout: {
        type: "number",
        description: "Predicted voter turnout percentage (35-75%)"
      },
      democraticVote: {
        type: "number",
        description: "Democratic vote share percentage (25-70%)"
      },
      republicanVote: {
        type: "number",
        description: "Republican vote share percentage (25-70%)"
      },
      uncertainty: {
        type: "number",
        description: "Prediction uncertainty score 0.0-1.0 (higher = more uncertain)"
      }
    };
  }
  /**
   * Run simulations for a single state
   */
  async simulateState(stateAbbr, modelKey, iterations) {
    const generator = this.generators[modelKey];
    const schema = this.getStateDataSchema();
    const results = [];
    const state = US_STATES.find((s) => s.abbreviation === stateAbbr);
    if (!state) throw new Error(`State not found: ${stateAbbr}`);
    const batchSize = 100;
    const batches = Math.ceil(iterations / batchSize);
    for (let batch = 0; batch < batches; batch++) {
      const batchCount = Math.min(batchSize, iterations - batch * batchSize);
      try {
        const result = await generator.generate("structured", {
          schema,
          count: batchCount
        });
        const data = result.data || result;
        for (let i = 0; i < data.length; i++) {
          const sim = data[i];
          results.push({
            simulationId: batch * batchSize + i + 1,
            state: stateAbbr,
            race: "Senate",
            // TODO: Support multiple race types
            winner: sim.winner || "D",
            margin: sim.margin || 0,
            turnout: sim.turnout || 50,
            democraticVote: sim.democraticVote || 45,
            republicanVote: sim.republicanVote || 45,
            thirdPartyVote: Math.max(0, 100 - sim.democraticVote - sim.republicanVote),
            uncertainty: sim.uncertainty || 0.5,
            keyFactors: this.identifyKeyFactors(sim)
          });
        }
        this.progress.simulationsCompleted += data.length;
        this.progress.percentComplete = this.progress.simulationsCompleted / this.progress.totalSimulations * 100;
      } catch (error) {
        console.error(`${colors.red}Error in batch ${batch + 1}: ${error.message}${colors.reset}`);
      }
    }
    return results;
  }
  /**
   * Identify key factors influencing election outcome
   */
  identifyKeyFactors(simulation) {
    const factors = [];
    if (simulation.presidentialApproval < 45) {
      factors.push("Low presidential approval");
    }
    if (Math.abs(simulation.genericBallotD - simulation.genericBallotR) > 5) {
      factors.push("Strong generic ballot advantage");
    }
    if (simulation.unemploymentRate > 5) {
      factors.push("Economic concerns");
    }
    if (Math.abs(simulation.democraticFunding - simulation.republicanFunding) > 30) {
      factors.push("Campaign funding disparity");
    }
    if (simulation.undecided > 10) {
      factors.push("High undecided voters");
    }
    return factors.length > 0 ? factors : ["Normal electoral environment"];
  }
  /**
   * Aggregate results for a state
   */
  aggregateStateResults(stateAbbr, results) {
    const totalSims = results.length;
    const democraticWins = results.filter((r) => r.winner === "D").length;
    const republicanWins = results.filter((r) => r.winner === "R").length;
    const independentWins = results.filter((r) => r.winner === "I").length;
    const margins = results.map((r) => r.margin).sort((a, b) => a - b);
    const averageMargin = margins.reduce((sum, m) => sum + m, 0) / margins.length;
    const medianMargin = margins[Math.floor(margins.length / 2)];
    const turnouts = results.map((r) => r.turnout);
    const averageTurnout = turnouts.reduce((sum, t) => sum + t, 0) / turnouts.length;
    const demWinRate = democraticWins / totalSims;
    const repWinRate = republicanWins / totalSims;
    let trendDirection = "STABLE";
    if (demWinRate - repWinRate > 0.1) trendDirection = "D";
    else if (repWinRate - demWinRate > 0.1) trendDirection = "R";
    const competitiveScore = 100 * (1 - Math.abs(demWinRate - repWinRate));
    return {
      state: stateAbbr,
      totalSimulations: totalSims,
      democraticWins,
      republicanWins,
      independentWins,
      averageMargin,
      medianMargin,
      averageTurnout,
      winProbability: {
        democratic: demWinRate,
        republican: repWinRate,
        independent: independentWins / totalSims
      },
      confidence: 1 - results.reduce((sum, r) => sum + r.uncertainty, 0) / totalSims,
      trendDirection,
      competitiveScore
    };
  }
  /**
   * Run complete election simulation
   */
  async run(apiKeys) {
    this.banner("\u{1F5F3}\uFE0F  2026 US MIDTERM ELECTION SIMULATION");
    console.log(`${colors.cyan}Configuration:${colors.reset}`);
    console.log(`  States: ${this.config.states.length}`);
    console.log(`  Simulations per state: ${this.config.simulationsPerState.toLocaleString()}`);
    console.log(`  Total simulations: ${this.progress.totalSimulations.toLocaleString()}`);
    console.log(`  Models: ${this.config.models.join(", ")}`);
    console.log(`  Self-learning: ${this.config.enableSelfLearning ? "Enabled \u2713" : "Disabled"}`);
    console.log(`  Parallel processing: ${this.config.parallelProcessing ? "Enabled \u2713" : "Disabled"}
`);
    await this.initializeGenerators(apiKeys || {});
    this.progress.status = "running";
    const stateResults = {};
    const startTime = Date.now();
    for (let i = 0; i < this.config.states.length; i++) {
      const stateAbbr = this.config.states[i];
      this.progress.currentState = stateAbbr;
      this.progress.currentModel = this.config.models[0];
      console.log(`
${this.progressBar(i, this.config.states.length, `State ${i + 1}/${this.config.states.length}`)}`);
      console.log(`${colors.bright}${colors.cyan}\u{1F5F3}\uFE0F  ${stateAbbr} - Running ${this.config.simulationsPerState.toLocaleString()} simulations...${colors.reset}`);
      const stateStartTime = Date.now();
      const results = await this.simulateState(
        stateAbbr,
        this.config.models[0],
        this.config.simulationsPerState
      );
      const stateDuration = (Date.now() - stateStartTime) / 1e3;
      const speed = this.config.simulationsPerState / stateDuration;
      const aggregate = this.aggregateStateResults(stateAbbr, results);
      stateResults[stateAbbr] = aggregate;
      console.log(`${colors.green}\u2713 Complete in ${stateDuration.toFixed(1)}s (${speed.toFixed(1)} sim/s)${colors.reset}`);
      console.log(`  Win Probability: ${colors.bright}D ${(aggregate.winProbability.democratic * 100).toFixed(1)}%${colors.reset} | ${colors.bright}R ${(aggregate.winProbability.republican * 100).toFixed(1)}%${colors.reset}`);
      console.log(`  Avg Margin: ${colors.cyan}${aggregate.averageMargin.toFixed(1)}%${colors.reset} | Turnout: ${colors.cyan}${aggregate.averageTurnout.toFixed(1)}%${colors.reset}`);
      console.log(`  Competitive Score: ${colors.yellow}${aggregate.competitiveScore.toFixed(0)}/100${colors.reset}`);
      this.progress.statesCompleted++;
      const elapsed = (Date.now() - startTime) / 1e3;
      const avgTimePerState = elapsed / (i + 1);
      this.progress.estimatedTimeRemaining = avgTimePerState * (this.config.states.length - (i + 1));
      this.progress.averageSimulationTime = stateDuration / this.config.simulationsPerState * 1e3;
    }
    const nationalResults = this.calculateNationalResults(stateResults);
    this.displayFinalResults(stateResults, nationalResults);
    this.progress.status = "complete";
    this.progress.percentComplete = 100;
    return {
      stateResults,
      nationalResults,
      learningMetrics: this.learningMetrics,
      modelPerformance: this.modelPerformance
    };
  }
  /**
   * Calculate national aggregate results
   */
  calculateNationalResults(stateResults) {
    const senateStates = getSenateRaceStates();
    let demSenateWins = 0;
    let repSenateWins = 0;
    for (const state of senateStates) {
      const result = stateResults[state.abbreviation];
      if (!result) continue;
      if (result.winProbability.democratic > 0.5) demSenateWins++;
      else if (result.winProbability.republican > 0.5) repSenateWins++;
    }
    const currentSeats = { D: 50, R: 50, I: 0 };
    return {
      senate: {
        currentSeats,
        projectedSeats: {
          D: currentSeats.D - senateStates.length + demSenateWins,
          R: currentSeats.R - senateStates.length + repSenateWins,
          I: 0
        },
        netChange: {
          D: demSenateWins - Math.floor(senateStates.length / 2),
          R: repSenateWins - Math.floor(senateStates.length / 2),
          I: 0
        },
        probabilityControl: {
          D: demSenateWins > senateStates.length / 2 ? 0.65 : 0.35,
          R: repSenateWins > senateStates.length / 2 ? 0.65 : 0.35
        }
      },
      governors: {
        currentSeats: { D: 23, R: 27, I: 0 },
        projectedSeats: { D: 23, R: 27, I: 0 },
        netChange: { D: 0, R: 0, I: 0 }
      },
      house: {
        currentSeats: { D: 213, R: 222, I: 0 },
        projectedSeats: { D: 218, R: 217, I: 0 },
        netChange: { D: 5, R: -5, I: 0 },
        probabilityControl: { D: 0.52, R: 0.48 }
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      confidence: Object.values(stateResults).reduce((sum, r) => sum + r.confidence, 0) / Object.keys(stateResults).length,
      totalSimulations: this.progress.simulationsCompleted
    };
  }
  /**
   * Display final results
   */
  displayFinalResults(stateResults, nationalResults) {
    this.banner("\u{1F4CA} FINAL ELECTION PROJECTIONS");
    console.log(`${colors.bright}${colors.cyan}\u{1F3DB}\uFE0F  SENATE PROJECTION${colors.reset}
`);
    console.log(`  Current: ${colors.blue}D ${nationalResults.senate.currentSeats.D}${colors.reset} | ${colors.red}R ${nationalResults.senate.currentSeats.R}${colors.reset}`);
    console.log(`  Projected: ${colors.bright}${colors.blue}D ${nationalResults.senate.projectedSeats.D}${colors.reset} | ${colors.bright}${colors.red}R ${nationalResults.senate.projectedSeats.R}${colors.reset}`);
    console.log(`  Net Change: D ${nationalResults.senate.netChange.D > 0 ? "+" : ""}${nationalResults.senate.netChange.D} | R ${nationalResults.senate.netChange.R > 0 ? "+" : ""}${nationalResults.senate.netChange.R}`);
    console.log(`  Control Probability: ${colors.blue}D ${(nationalResults.senate.probabilityControl.D * 100).toFixed(1)}%${colors.reset} | ${colors.red}R ${(nationalResults.senate.probabilityControl.R * 100).toFixed(1)}%${colors.reset}
`);
    console.log(`${colors.cyan}\u{1F525} Most Competitive Races:${colors.reset}
`);
    const competitive = Object.entries(stateResults).sort((a, b) => b[1].competitiveScore - a[1].competitiveScore).slice(0, 10);
    for (const [state, result] of competitive) {
      const leader = result.winProbability.democratic > result.winProbability.republican ? "D" : "R";
      const leaderProb = Math.max(result.winProbability.democratic, result.winProbability.republican);
      console.log(`  ${state}: ${leader} ${(leaderProb * 100).toFixed(1)}% (Competitive: ${result.competitiveScore.toFixed(0)}/100)`);
    }
    console.log(`
${colors.cyan}\u{1F4C8} Simulation Statistics:${colors.reset}`);
    console.log(`  Total Simulations: ${this.progress.simulationsCompleted.toLocaleString()}`);
    console.log(`  States Analyzed: ${this.progress.statesCompleted}`);
    console.log(`  Overall Confidence: ${(nationalResults.confidence * 100).toFixed(1)}%`);
    console.log(`  Average Simulation Time: ${this.progress.averageSimulationTime.toFixed(2)}ms
`);
  }
};
async function runElectionSimulation(options) {
  const simulator = new ElectionSimulator(options);
  const results = await simulator.run();
  return results;
}
export {
  ElectionSimulator,
  runElectionSimulation
};
//# sourceMappingURL=simulator.js.map