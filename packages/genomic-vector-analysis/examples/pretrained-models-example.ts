/**
 * Pre-trained Models Usage Examples
 *
 * Demonstrates how to use the pre-trained genomic models
 */

import { PreTrainedModels } from '../src/models/PreTrainedModels';

/**
 * Example 1: K-mer sequence embedding
 */
async function kmerExample() {
  console.log('=== K-mer Embedding Example ===\n');

  // Load k-mer model
  const model = await PreTrainedModels.load('kmer-5-384d');

  // Embed a DNA sequence
  const sequence = 'ATCGATCGATCG';
  const embedding = model.embed(sequence);

  console.log(`Sequence: ${sequence}`);
  console.log(`Embedding dimensions: ${embedding?.length}`);
  console.log(`First 10 values: [${embedding?.slice(0, 10).map(v => v.toFixed(3)).join(', ')}]`);

  // Compare two sequences
  const seq2 = 'ATCGATCGATTG';
  const embedding2 = model.embed(seq2);

  const similarity = cosineSimilarity(embedding!, embedding2!);
  console.log(`\nSimilarity between sequences: ${similarity.toFixed(3)}`);

  // Get model metadata
  const metadata = model.getMetadata();
  console.log(`\nModel: ${metadata.name} v${metadata.version}`);
  console.log(`Training accuracy: ${metadata.accuracy_metrics?.classification_accuracy}`);
}

/**
 * Example 2: Phenotype analysis
 */
async function phenotypeExample() {
  console.log('\n=== Phenotype Analysis Example ===\n');

  // Load HPO model
  const model = await PreTrainedModels.load('phenotype-hpo');

  // Look up phenotype embeddings
  const seizures = model.lookup('HP:0001250');
  const developmentalDelay = model.lookup('HP:0001263');

  console.log('Phenotypes:');
  console.log('  - HP:0001250 (Seizures)');
  console.log('  - HP:0001263 (Global developmental delay)');

  // Calculate similarity
  const similarity = cosineSimilarity(seizures!, developmentalDelay!);
  console.log(`\nPhenotype similarity: ${similarity.toFixed(3)}`);

  // Get phenotype details
  const rawData = model.getRawData();
  const seizureInfo = rawData.hpo_terms['HP:0001250'];

  console.log(`\nSeizures (HP:0001250):`);
  console.log(`  Category: ${seizureInfo.category}`);
  console.log(`  Related genes: ${seizureInfo.related_genes.join(', ')}`);
  console.log(`  Diseases: ${seizureInfo.disease_associations.join(', ')}`);
}

/**
 * Example 3: Variant interpretation
 */
async function variantExample() {
  console.log('\n=== Variant Interpretation Example ===\n');

  // Load variant model
  const model = await PreTrainedModels.load('variant-patterns');

  // Look up variant embeddings
  const brca1 = model.lookup('BRCA1_c.68_69delAG');
  const cftr = model.lookup('CFTR_c.1521_1523delCTT');

  console.log('Variants:');
  console.log('  - BRCA1 c.68_69delAG (Hereditary breast/ovarian cancer)');
  console.log('  - CFTR c.1521_1523delCTT (Cystic fibrosis)');

  // Get variant details
  const rawData = model.getRawData();
  const brca1Info = rawData.common_pathogenic_variants['BRCA1_c.68_69delAG'];

  console.log(`\nBRCA1 Variant Details:`);
  console.log(`  Gene: ${brca1Info.gene}`);
  console.log(`  Type: ${brca1Info.variant_type}`);
  console.log(`  Disease: ${brca1Info.disease}`);
  console.log(`  Frequency: ${brca1Info.population_frequency}`);
  console.log(`  Protein effect: ${brca1Info.protein_effect}`);
  console.log(`  Functional impact: ${brca1Info.functional_impact}`);

  // Compare variant embeddings
  const similarity = cosineSimilarity(brca1!, cftr!);
  console.log(`\nVariant similarity: ${similarity.toFixed(3)}`);
}

/**
 * Example 4: Protein analysis
 */
async function proteinExample() {
  console.log('\n=== Protein Analysis Example ===\n');

  // Load protein model
  const model = await PreTrainedModels.load('protein-embedding');

  // Look up amino acid embeddings
  const methionine = model.lookup('M');
  const cysteine = model.lookup('C');

  console.log('Amino acids:');
  console.log('  - M (Methionine) - Start codon');
  console.log('  - C (Cysteine) - Disulfide bonds');

  const similarity = cosineSimilarity(methionine!, cysteine!);
  console.log(`\nAmino acid similarity: ${similarity.toFixed(3)}`);

  // Get protein domain embeddings
  const rawData = model.getRawData();
  const kinaseDomain = rawData.protein_domains?.kinase_domain;

  console.log(`\nProtein domain: Kinase`);
  console.log(`  Embedding dimensions: ${kinaseDomain?.length}`);
  console.log(`  First 5 values: [${kinaseDomain?.slice(0, 5).map(v => v.toFixed(3)).join(', ')}]`);
}

/**
 * Example 5: Patient profile matching
 */
async function patientMatchingExample() {
  console.log('\n=== Patient Profile Matching Example ===\n');

  // Load sample embeddings
  const sampleModel = await PreTrainedModels.load('sample-embeddings');
  const phenoModel = await PreTrainedModels.load('phenotype-hpo');

  // Get disease signatures
  const dravetSignature = sampleModel.lookup('Dravet_syndrome');
  const rawData = sampleModel.getRawData();

  console.log('Disease signature: Dravet syndrome');
  const dravetInfo = rawData.disease_signatures?.Dravet_syndrome;
  console.log(`  Core phenotypes: ${dravetInfo?.core_phenotypes.join(', ')}`);
  console.log(`  Common genes: ${dravetInfo?.common_genes.join(', ')}`);

  // Simulate patient phenotypes
  const patientPhenotypes = ['HP:0001250', 'HP:0001263']; // Seizures + developmental delay

  console.log(`\nPatient phenotypes:`);
  for (const hpo of patientPhenotypes) {
    const info = rawData.hpo_terms?.[hpo];
    if (info) {
      console.log(`  - ${hpo}: ${info.term}`);
    }
  }

  // Get phenotype embeddings and average
  const phenoEmbeddings = patientPhenotypes
    .map(hpo => phenoModel.lookup(hpo))
    .filter(e => e !== null) as number[][];

  const avgPatientProfile = averageVectors(phenoEmbeddings);

  // Compare to disease signature
  const similarity = cosineSimilarity(avgPatientProfile, dravetSignature!);
  console.log(`\nMatch to Dravet syndrome: ${similarity.toFixed(3)}`);

  if (similarity > 0.7) {
    console.log('Strong match - consider Dravet syndrome in differential diagnosis');
  } else if (similarity > 0.5) {
    console.log('Moderate match - Dravet syndrome is possible');
  } else {
    console.log('Weak match - other diagnoses more likely');
  }
}

/**
 * Example 6: Gene similarity search
 */
async function geneSimilarityExample() {
  console.log('\n=== Gene Similarity Search Example ===\n');

  // Load sample embeddings
  const model = await PreTrainedModels.load('sample-embeddings');

  // Get gene embeddings
  const brca1 = model.lookup('BRCA1');
  const tp53 = model.lookup('TP53');
  const cftr = model.lookup('CFTR');

  // Get gene info
  const rawData = model.getRawData();
  const brca1Info = rawData.common_genes?.BRCA1;
  const tp53Info = rawData.common_genes?.TP53;

  console.log('Genes:');
  console.log(`  - BRCA1: ${brca1Info?.function}`);
  console.log(`  - TP53: ${tp53Info?.function}`);

  // Compare cancer-related genes
  const brca1Tp53Sim = cosineSimilarity(brca1!, tp53!);
  console.log(`\nBRCA1 vs TP53 similarity: ${brca1Tp53Sim.toFixed(3)}`);
  console.log('(Both are tumor suppressors - high similarity expected)');

  // Compare to unrelated gene
  const brca1CftrSim = cosineSimilarity(brca1!, cftr!);
  console.log(`\nBRCA1 vs CFTR similarity: ${brca1CftrSim.toFixed(3)}`);
  console.log('(Different functions - lower similarity expected)');
}

/**
 * Example 7: Model registry exploration
 */
async function registryExample() {
  console.log('\n=== Model Registry Example ===\n');

  // List all models
  const allModels = PreTrainedModels.list();
  console.log('Available models:');
  allModels.forEach(name => console.log(`  - ${name}`));

  // Get models by category
  console.log('\nK-mer models:');
  const kmerModels = PreTrainedModels.getByCategory('kmer');
  kmerModels.forEach(model => {
    console.log(`  - ${model.name}: ${model.description}`);
  });

  // Get model info without loading
  const info = PreTrainedModels.getInfo('kmer-5-384d');
  console.log(`\nModel info (without loading):`);
  console.log(`  Name: ${info?.name}`);
  console.log(`  Category: ${info?.category}`);
  console.log(`  Dimensions: ${info?.dimensions}`);
  console.log(`  Version: ${info?.version}`);

  // Get full registry
  const registry = PreTrainedModels.getRegistry();
  console.log(`\nTotal models in registry: ${registry.length}`);
}

/**
 * Helper: Cosine similarity
 */
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magA * magB);
}

/**
 * Helper: Average vectors
 */
function averageVectors(vectors: number[][]): number[] {
  const dim = vectors[0].length;
  const result = new Array(dim).fill(0);

  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) {
      result[i] += vec[i];
    }
  }

  return result.map(v => v / vectors.length);
}

/**
 * Run all examples
 */
async function main() {
  console.log('Pre-trained Models Examples');
  console.log('===========================\n');

  try {
    await kmerExample();
    await phenotypeExample();
    await variantExample();
    await proteinExample();
    await patientMatchingExample();
    await geneSimilarityExample();
    await registryExample();

    console.log('\n=== All examples completed successfully ===\n');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export {
  kmerExample,
  phenotypeExample,
  variantExample,
  proteinExample,
  patientMatchingExample,
  geneSimilarityExample,
  registryExample
};
