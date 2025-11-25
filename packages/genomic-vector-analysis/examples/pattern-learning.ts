/**
 * Pattern Learning Example - Genomic Vector Analysis
 *
 * This example demonstrates:
 * 1. Create clinical cases dataset
 * 2. Train pattern recognizer
 * 3. Predict diagnosis for new cases
 * 4. Analyze learned patterns
 */

import { GenomicVectorDB } from '../src/index';
import type { ClinicalCase } from '../src/types';

async function patternLearningExample() {
  console.log('=== Pattern Learning Example ===\n');

  // 1. Initialize database
  console.log('1. Initializing database...');
  const db = new GenomicVectorDB({
    database: { dimensions: 384 },
    embeddings: { model: 'kmer', dimensions: 384 },
  });

  // 2. Create training dataset
  console.log('2. Creating training dataset...\n');

  const trainingCases: ClinicalCase[] = [
    // Dravet syndrome cases
    {
      id: 'case-1',
      variants: [
        {
          id: 'var-1',
          chromosome: 'chr2',
          position: 166245425,
          reference: 'C',
          alternate: 'T',
          genotype: 'heterozygous',
        },
      ],
      phenotypes: [
        { id: 'HP:0001250', name: 'Seizures' },
        { id: 'HP:0001263', name: 'Global developmental delay' },
        { id: 'HP:0001249', name: 'Intellectual disability' },
      ],
      diagnosis: 'Dravet syndrome',
      outcome: 'managed',
    },
    {
      id: 'case-2',
      variants: [
        {
          id: 'var-2',
          chromosome: 'chr2',
          position: 166245426,
          reference: 'G',
          alternate: 'A',
          genotype: 'heterozygous',
        },
      ],
      phenotypes: [
        { id: 'HP:0001250', name: 'Seizures' },
        { id: 'HP:0011097', name: 'Epileptic spasms' },
        { id: 'HP:0001263', name: 'Global developmental delay' },
      ],
      diagnosis: 'Dravet syndrome',
      outcome: 'managed',
    },
    {
      id: 'case-3',
      variants: [
        {
          id: 'var-3',
          chromosome: 'chr2',
          position: 166245450,
          reference: 'A',
          alternate: 'G',
          genotype: 'heterozygous',
        },
      ],
      phenotypes: [
        { id: 'HP:0001250', name: 'Seizures' },
        { id: 'HP:0002376', name: 'Developmental regression' },
        { id: 'HP:0001249', name: 'Intellectual disability' },
      ],
      diagnosis: 'Dravet syndrome',
      outcome: 'managed',
    },

    // GLUT1 deficiency cases
    {
      id: 'case-4',
      variants: [
        {
          id: 'var-4',
          chromosome: 'chr1',
          position: 43395412,
          reference: 'C',
          alternate: 'T',
          genotype: 'heterozygous',
        },
      ],
      phenotypes: [
        { id: 'HP:0001250', name: 'Seizures' },
        { id: 'HP:0002380', name: 'Ataxia' },
        { id: 'HP:0001263', name: 'Global developmental delay' },
      ],
      diagnosis: 'GLUT1 deficiency',
      outcome: 'improved',
    },
    {
      id: 'case-5',
      variants: [
        {
          id: 'var-5',
          chromosome: 'chr1',
          position: 43395420,
          reference: 'G',
          alternate: 'C',
          genotype: 'heterozygous',
        },
      ],
      phenotypes: [
        { id: 'HP:0001250', name: 'Seizures' },
        { id: 'HP:0002120', name: 'Cerebral atrophy' },
        { id: 'HP:0002376', name: 'Developmental regression' },
      ],
      diagnosis: 'GLUT1 deficiency',
      outcome: 'improved',
    },

    // Rett syndrome cases
    {
      id: 'case-6',
      variants: [
        {
          id: 'var-6',
          chromosome: 'chrX',
          position: 153296777,
          reference: 'C',
          alternate: 'T',
          genotype: 'heterozygous',
        },
      ],
      phenotypes: [
        { id: 'HP:0002376', name: 'Developmental regression' },
        { id: 'HP:0001251', name: 'Ataxia' },
        { id: 'HP:0012758', name: 'Neurodevelopmental delay' },
      ],
      diagnosis: 'Rett syndrome',
      outcome: 'stable',
    },
  ];

  console.log(`Created ${trainingCases.length} training cases`);
  console.log('Diagnoses:');
  const diagnosisCounts = trainingCases.reduce((acc, c) => {
    acc[c.diagnosis!] = (acc[c.diagnosis!] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  for (const [diagnosis, count] of Object.entries(diagnosisCounts)) {
    console.log(`  - ${diagnosis}: ${count} cases`);
  }
  console.log();

  // 3. Train pattern recognizer
  console.log('3. Training pattern recognizer...');
  const startTime = Date.now();

  const metrics = await db.learning.trainFromCases(trainingCases);

  const trainingTime = Date.now() - startTime;

  console.log('\nTraining Results:');
  console.log('-----------------');
  console.log(`Training time: ${trainingTime}ms`);
  console.log(`Accuracy: ${(metrics.accuracy! * 100).toFixed(2)}%`);
  console.log(`Precision: ${(metrics.precision! * 100).toFixed(2)}%`);
  console.log(`Recall: ${(metrics.recall! * 100).toFixed(2)}%`);
  console.log(`F1 Score: ${(metrics.f1Score! * 100).toFixed(2)}%`);
  console.log();

  // 4. Analyze learned patterns
  console.log('4. Analyzing learned patterns...');
  const patterns = db.learning.getPatterns();

  console.log(`\nLearned ${patterns.length} patterns:\n`);

  for (const pattern of patterns) {
    console.log(`Pattern: ${pattern.name}`);
    console.log(`  Description: ${pattern.description}`);
    console.log(`  Frequency: ${pattern.frequency} occurrences`);
    console.log(`  Confidence: ${(pattern.confidence * 100).toFixed(1)}%`);
    console.log(`  Diagnosis: ${pattern.metadata?.diagnosis}`);
    console.log(`  Common phenotypes: ${pattern.metadata?.phenotypes?.join(', ')}`);
    console.log(`  Example cases: ${pattern.examples.join(', ')}`);
    console.log();
  }

  // 5. Predict diagnosis for new case
  console.log('5. Predicting diagnosis for new case...');

  const newCase: ClinicalCase = {
    id: 'new-case-1',
    variants: [
      {
        id: 'new-var-1',
        chromosome: 'chr2',
        position: 166245427,
        reference: 'T',
        alternate: 'C',
        genotype: 'heterozygous',
      },
    ],
    phenotypes: [
      { id: 'HP:0001250', name: 'Seizures' },
      { id: 'HP:0001263', name: 'Global developmental delay' },
    ],
  };

  console.log('\nNew case details:');
  console.log(`Variants: chr${newCase.variants[0].chromosome}:${newCase.variants[0].position}`);
  console.log(`Phenotypes: ${newCase.phenotypes.map(p => p.name).join(', ')}`);

  const prediction = await db.learning.predict(newCase);

  console.log('\nPrediction Results:');
  console.log('-------------------');
  console.log(`Predicted diagnosis: ${prediction.diagnosis}`);
  console.log(`Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);

  if (prediction.supportingPatterns.length > 0) {
    console.log('\nSupporting patterns:');
    for (const pattern of prediction.supportingPatterns) {
      console.log(`  - ${pattern.name}`);
      console.log(`    Frequency: ${pattern.frequency}, Confidence: ${(pattern.confidence * 100).toFixed(1)}%`);
      console.log(`    Similarity: ${((pattern.metadata?.similarity || 0) * 100).toFixed(1)}%`);
    }
  }

  console.log('\n=== Example Complete ===');
}

// Run example
patternLearningExample().catch(console.error);
