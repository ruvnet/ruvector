/**
 * Advanced Learning Capabilities Example
 *
 * This example demonstrates all six learning paradigms implemented in the
 * genomic vector analysis package.
 */

import {
  // Reinforcement Learning
  QLearningOptimizer,
  PolicyGradientOptimizer,
  MultiArmedBandit,

  // Transfer Learning
  PreTrainedModelRegistry,
  FineTuningEngine,
  DomainAdaptation,
  FewShotLearner,

  // Federated Learning
  FederatedLearningCoordinator,
  SecureAggregation,

  // Meta-Learning
  BayesianOptimizer,
  AdaptiveEmbedding,
  HNSWAutotuner,

  // Explainable AI
  SHAPExplainer,
  AttentionAnalyzer,
  FeatureImportanceAnalyzer,
  CounterfactualGenerator,

  // Continuous Learning
  OnlineLearner,
  ForgettingPrevention,
  ModelVersionManager,

  // Types
  type State,
  type Action,
  type EmbeddingModel
} from '../src';

// =============================================================================
// 1. REINFORCEMENT LEARNING EXAMPLE
// =============================================================================

async function reinforcementLearningExample() {
  console.log('\n=== Reinforcement Learning Example ===\n');

  // Q-Learning for query optimization
  const qLearning = new QLearningOptimizer({
    learningRate: 0.1,
    discountFactor: 0.95,
    explorationRate: 1.0,
    explorationDecay: 0.995
  });

  // Simulate learning over multiple episodes
  for (let episode = 0; episode < 100; episode++) {
    const state: State = {
      queryComplexity: Math.random(),
      datasetSize: 10000 + Math.floor(Math.random() * 90000),
      dimensionality: 768,
      currentIndexParams: {
        efSearch: 100,
        M: 16,
        efConstruction: 200
      },
      recentLatencies: [5, 6, 4, 7, 5]
    };

    const action = qLearning.selectAction(state);

    // Simulate executing action and getting reward
    const reward = Math.random() > 0.5 ? 1.0 : -0.5;

    const nextState: State = { ...state };

    qLearning.update({
      state,
      action,
      reward,
      nextState,
      done: false,
      timestamp: Date.now()
    });

    if ((episode + 1) % 20 === 0) {
      const stats = qLearning.getStatistics();
      console.log(`Episode ${episode + 1}: Exploration rate = ${stats.explorationRate.toFixed(4)}`);
    }
  }

  // Multi-Armed Bandit for model selection
  const bandit = new MultiArmedBandit(
    ['dna-bert', 'esm2', 'kmer'] as EmbeddingModel[],
    2.0
  );

  console.log('\nModel Selection with Multi-Armed Bandit:');
  for (let i = 0; i < 50; i++) {
    const model = bandit.selectModel();
    const performance = 0.7 + Math.random() * 0.3;
    bandit.updateReward(model, performance);
  }

  const banditStats = bandit.getStatistics();
  console.log('Bandit statistics:', JSON.stringify(banditStats, null, 2));
}

// =============================================================================
// 2. TRANSFER LEARNING EXAMPLE
// =============================================================================

async function transferLearningExample() {
  console.log('\n=== Transfer Learning Example ===\n');

  // Get pre-trained model
  const registry = new PreTrainedModelRegistry();
  const dnaBert = registry.getModel('dna-bert');

  if (!dnaBert) {
    console.log('DNA-BERT model not found');
    return;
  }

  console.log(`Using ${dnaBert.name}: ${dnaBert.parameters.toLocaleString()} parameters`);

  // Fine-tune on disease-specific data
  const fineTuner = new FineTuningEngine(dnaBert, {
    learningRate: 2e-5,
    epochs: 5,
    batchSize: 16,
    earlyStoppingPatience: 2
  });

  const diseaseData = Array(1000).fill(null).map((_, i) => ({
    sequence: 'ATCGATCGATCG'.repeat(10),
    label: i % 2 === 0 ? 'pathogenic' : 'benign'
  }));

  console.log('Fine-tuning model...');
  const history = await fineTuner.fineTune(diseaseData);

  console.log('\nTraining history:');
  for (const metrics of history) {
    console.log(
      `Epoch ${metrics.epoch + 1}: ` +
      `Train Loss=${metrics.trainLoss.toFixed(4)}, ` +
      `Valid Acc=${(metrics.validAccuracy * 100).toFixed(2)}%`
    );
  }

  // Domain adaptation (NICU → Pediatric Oncology)
  const adapter = new DomainAdaptation({
    sourceModels: ['dna-bert'],
    targetDomain: 'pediatric_oncology',
    adaptationStrategy: 'feature_based',
    discrepancyMetric: 'mmd'
  });

  const nicuEmbeddings = Array(500).fill(null).map(() => ({
    embedding: Array(768).fill(0).map(() => Math.random()),
    label: 'nicu_case'
  }));

  const oncologyEmbeddings = Array(500).fill(null).map(() => ({
    embedding: Array(768).fill(0).map(() => Math.random()),
    label: 'oncology_case'
  }));

  console.log('\nDomain adaptation...');
  const { transformedEmbeddings, discrepancy } =
    await adapter.adapt(nicuEmbeddings, oncologyEmbeddings);

  console.log(`Domain discrepancy: ${discrepancy.toFixed(4)}`);
  console.log(`Transformed ${transformedEmbeddings.length} embeddings`);

  // Few-shot learning for rare diseases
  const fewShot = new FewShotLearner({
    nWay: 5,
    kShot: 5,
    querySize: 15,
    episodes: 20
  });

  const rareDiseases = Array(100).fill(null).map((_, i) => ({
    embedding: Array(768).fill(0).map(() => Math.random()),
    disease: `disease_${i % 5}`
  }));

  console.log('\nFew-shot learning...');
  const { accuracy, episodes } = await fewShot.metaTrain(rareDiseases);
  console.log(`Few-shot accuracy: ${(accuracy * 100).toFixed(2)}% over ${episodes} episodes`);
}

// =============================================================================
// 3. FEDERATED LEARNING EXAMPLE
// =============================================================================

async function federatedLearningExample() {
  console.log('\n=== Federated Learning Example ===\n');

  const coordinator = new FederatedLearningCoordinator({
    numInstitutions: 5,
    rounds: 5,
    clientFraction: 0.6,
    localEpochs: 3,
    aggregationStrategy: 'fedavg',
    privacyBudget: 1.0
  });

  // Register healthcare institutions
  coordinator.registerInstitution('hosp_1', 'Children\'s Hospital Boston', 5000);
  coordinator.registerInstitution('hosp_2', 'Stanford Children\'s', 7500);
  coordinator.registerInstitution('hosp_3', 'UCSF Pediatrics', 6000);
  coordinator.registerInstitution('hosp_4', 'Seattle Children\'s', 8000);
  coordinator.registerInstitution('hosp_5', 'Mayo Clinic Pediatrics', 9000);

  console.log('Starting federated training...');
  const globalModels = await coordinator.train();

  const stats = coordinator.getStatistics();
  console.log('\nFederated Learning Results:');
  console.log(`Final accuracy: ${(stats.finalAccuracy * 100).toFixed(2)}%`);
  console.log(`Final loss: ${stats.finalLoss.toFixed(4)}`);
  console.log(`Privacy budget remaining: ${stats.privacyAccountant?.privacyBudgetRemaining.toFixed(4)}`);

  // Secure aggregation demo
  const secureAgg = new SecureAggregation({
    threshold: 3,
    noiseScale: 0.01,
    dropoutTolerance: 0.2
  });

  console.log('\nSecure aggregation initialized');
}

// =============================================================================
// 4. META-LEARNING EXAMPLE
// =============================================================================

async function metaLearningExample() {
  console.log('\n=== Meta-Learning Example ===\n');

  // Bayesian optimization for hyperparameters
  const optimizer = new BayesianOptimizer(
    {
      efSearch: { min: 50, max: 250, type: 'int' },
      M: { min: 8, max: 64, type: 'int' },
      learningRate: { min: 1e-5, max: 1e-2, type: 'float', log: true }
    },
    'ei',
    2.0
  );

  console.log('Running Bayesian optimization...');
  const bestConfig = await optimizer.optimize(
    async (config) => {
      // Simulate model evaluation
      return 0.8 + Math.random() * 0.15;
    },
    20,  // trials
    5    // random trials
  );

  console.log('\nBest hyperparameters found:');
  console.log(JSON.stringify(bestConfig, null, 2));

  // Adaptive embedding dimensionality
  const adaptive = new AdaptiveEmbedding({
    minDim: 64,
    maxDim: 1024,
    varianceThreshold: 0.95,
    method: 'pca'
  });

  const embeddings = Array(1000).fill(null).map(() =>
    Array(768).fill(0).map(() => Math.random())
  );

  console.log('\nLearning adaptive embedding dimension...');
  const { reducedDim, compressionRatio } = await adaptive.learn(embeddings);
  console.log(`Reduced dimension: ${reducedDim}`);
  console.log(`Compression ratio: ${(compressionRatio * 100).toFixed(2)}%`);

  // HNSW auto-tuning
  const autoTuner = new HNSWAutotuner({
    dataset: {
      size: 100000,
      dimensionality: 768,
      queryComplexity: 0.5
    },
    constraints: {
      maxLatency: 10,
      minRecall: 0.95
    }
  });

  console.log('\nAuto-tuning HNSW parameters...');
  const hnswParams = await autoTuner.tune();
  console.log('Optimal HNSW parameters:');
  console.log(JSON.stringify(hnswParams, null, 2));
}

// =============================================================================
// 5. EXPLAINABLE AI EXAMPLE
// =============================================================================

async function explainableAIExample() {
  console.log('\n=== Explainable AI Example ===\n');

  // SHAP values for variant prioritization
  const shapExplainer = new SHAPExplainer([
    'variant_frequency',
    'gnomad_af',
    'cadd_score',
    'revel_score',
    'gene_constraint',
    'phenotype_match'
  ]);

  const backgroundVariants = Array(100).fill(null).map(() => ({
    features: {
      variant_frequency: Math.random(),
      gnomad_af: Math.random(),
      cadd_score: Math.random() * 40,
      revel_score: Math.random(),
      gene_constraint: Math.random(),
      phenotype_match: Math.random()
    },
    priority: Math.random()
  }));

  shapExplainer.fit(backgroundVariants);

  const testVariant = {
    features: {
      variant_frequency: 0.01,
      gnomad_af: 0.0001,
      cadd_score: 25.5,
      revel_score: 0.85,
      gene_constraint: 0.9,
      phenotype_match: 0.75
    }
  };

  const predictFunction = (features: any) => {
    return features.cadd_score * 0.03 + features.revel_score * 0.5;
  };

  console.log('Computing SHAP values...');
  const shapValues = shapExplainer.explain(testVariant, predictFunction);

  console.log('\nTop feature contributions:');
  for (const shap of shapValues.slice(0, 5)) {
    console.log(
      `${shap.feature.padEnd(20)}: ${shap.shapValue > 0 ? '+' : ''}${shap.shapValue.toFixed(4)} ` +
      `(contribution: ${(shap.contribution * 100).toFixed(1)}%)`
    );
  }

  // Feature importance analysis
  const importanceAnalyzer = new FeatureImportanceAnalyzer();

  const trainingData = Array(500).fill(null).map(() => ({
    features: {
      variant_frequency: Math.random(),
      cadd_score: Math.random() * 40,
      phenotype_match: Math.random()
    },
    label: Math.random() > 0.5 ? 'pathogenic' : 'benign'
  }));

  const classifyFunction = (features: any) => {
    return features.cadd_score > 20 ? 'pathogenic' : 'benign';
  };

  console.log('\nComputing permutation importance...');
  const importance = importanceAnalyzer.computePermutationImportance(
    trainingData,
    classifyFunction,
    5
  );

  console.log('\nFeature importance ranking:');
  for (const fi of importance) {
    console.log(`${fi.rank}. ${fi.feature.padEnd(20)}: ${fi.importance.toFixed(4)} (${fi.category})`);
  }

  // Counterfactual explanation
  const cfGenerator = new CounterfactualGenerator();
  cfGenerator.learn(trainingData.map(d => d.features));

  console.log('\nGenerating counterfactual explanation...');
  const counterfactual = cfGenerator.generate(
    testVariant.features,
    'benign',
    classifyFunction,
    500
  );

  if (counterfactual) {
    console.log('\nRequired changes for benign classification:');
    for (const change of counterfactual.changes.slice(0, 3)) {
      console.log(
        `${change.feature}: ${change.originalValue.toFixed(4)} → ${change.counterfactualValue.toFixed(4)}`
      );
    }
  }
}

// =============================================================================
// 6. CONTINUOUS LEARNING EXAMPLE
// =============================================================================

async function continuousLearningExample() {
  console.log('\n=== Continuous Learning Example ===\n');

  // Online learning from streaming cases
  const onlineLearner = new OnlineLearner({
    learningRate: 0.01,
    windowSize: 500,
    updateFrequency: 10
  });

  console.log('Processing streaming genomic cases...');

  for (let i = 0; i < 100; i++) {
    const newCase = {
      sequence: 'ATCG'.repeat(100),
      features: {
        quality: Math.random(),
        depth: Math.random() * 100
      }
    };

    const label = Math.random() > 0.5 ? 'normal' : 'abnormal';

    const result = await onlineLearner.processNewCase(
      newCase,
      label,
      (data) => ({
        prediction: Math.random() > 0.5 ? 'normal' : 'abnormal',
        confidence: Math.random()
      })
    );

    if (result.updated && (i + 1) % 10 === 0) {
      console.log(
        `Case ${i + 1}: Model updated - ` +
        `Accuracy: ${(result.performance.accuracy * 100).toFixed(2)}%`
      );
    }
  }

  // Catastrophic forgetting prevention
  const forgettingPrevention = new ForgettingPrevention(
    10000,
    'priority',
    1000
  );

  console.log('\nStoring important samples in replay buffer...');
  for (let i = 0; i < 50; i++) {
    forgettingPrevention.storeSample(
      `sample_${i}`,
      { data: Math.random() },
      i % 2 === 0 ? 'class_a' : 'class_b',
      Math.random()
    );
  }

  const replayBatch = forgettingPrevention.sampleReplay(16);
  console.log(`Sampled ${replayBatch.length} experiences for replay`);

  const bufferStats = forgettingPrevention.getBufferStatistics();
  console.log('Replay buffer statistics:');
  console.log(JSON.stringify(bufferStats, null, 2));

  // Model versioning and rollback
  const versionManager = new ModelVersionManager(10);

  console.log('\nCreating model versions...');
  const weights = new Map([['layer1', Array(100).fill(0).map(() => Math.random())]]);

  const v1 = versionManager.createVersion(
    weights,
    { accuracy: 0.85, loss: 0.35, samplesSeen: 1000 },
    { description: 'Initial model', tags: ['baseline'] }
  );

  const v2 = versionManager.createVersion(
    weights,
    { accuracy: 0.92, loss: 0.18, samplesSeen: 5000 },
    { description: 'Improved model', tags: ['production'] }
  );

  const v3 = versionManager.createVersion(
    weights,
    { accuracy: 0.88, loss: 0.25, samplesSeen: 8000 },
    { description: 'Model with new data', tags: ['experimental'] }
  );

  console.log('\nModel versions:');
  for (const version of versionManager.listVersions()) {
    console.log(
      `${version.version}: Accuracy=${(version.performance.accuracy * 100).toFixed(2)}%, ` +
      `Loss=${version.performance.loss.toFixed(4)}`
    );
  }

  // Automatic rollback on performance degradation
  const rolledBack = versionManager.checkAndRollback({
    accuracy: 0.75,
    loss: 0.50
  });

  if (rolledBack) {
    console.log('\nAutomatic rollback triggered due to performance degradation');
    const current = versionManager.getCurrentVersion();
    console.log(`Rolled back to version ${current?.version}`);
  }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   Genomic Vector Analysis - Advanced Learning Capabilities   ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  try {
    await reinforcementLearningExample();
    await transferLearningExample();
    await federatedLearningExample();
    await metaLearningExample();
    await explainableAIExample();
    await continuousLearningExample();

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                All Examples Completed Successfully!           ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export {
  reinforcementLearningExample,
  transferLearningExample,
  federatedLearningExample,
  metaLearningExample,
  explainableAIExample,
  continuousLearningExample
};
