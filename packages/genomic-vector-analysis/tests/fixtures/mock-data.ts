/**
 * Mock Data Generators for Testing
 * Generates realistic genomic data for reproducible tests
 */

import { HNSWIndex, HNSWConfig } from '../../src/indexing';
import { VariantEncoder, Variant } from '../../src/encoding';
import * as fs from 'fs/promises';

/**
 * Generate mock VCF file with specified characteristics
 */
export async function generateMockVCF(options: {
  variantCount: number;
  type?: 'exome' | 'genome' | 'panel';
  sampleId?: string;
  outputPath?: string;
}): Promise<string> {
  const {
    variantCount,
    type = 'exome',
    sampleId = 'SAMPLE1',
    outputPath = `/tmp/mock_${Date.now()}.vcf`,
  } = options;

  let vcfContent = `##fileformat=VCFv4.2
##reference=GRCh38
##INFO=<ID=AF,Number=A,Type=Float,Description="Allele Frequency">
##INFO=<ID=GENE,Number=1,Type=String,Description="Gene Symbol">
##INFO=<ID=CSQ,Number=.,Type=String,Description="Consequence">
##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\t${sampleId}\n`;

  const chromosomes =
    type === 'exome'
      ? ['chr1', 'chr2', 'chr3', 'chr17'] // Common exome targets
      : type === 'genome'
      ? Array.from({ length: 22 }, (_, i) => `chr${i + 1}`).concat(['chrX', 'chrY'])
      : ['chr1', 'chr17']; // Panel

  const genes = [
    'BRCA1',
    'BRCA2',
    'TP53',
    'SCN1A',
    'DMD',
    'CFTR',
    'HTT',
    'FMR1',
    'MECP2',
  ];
  const consequences = [
    'missense_variant',
    'synonymous_variant',
    'frameshift_variant',
    'stop_gained',
    'splice_donor_variant',
  ];
  const nucleotides = ['A', 'T', 'C', 'G'];

  for (let i = 0; i < variantCount; i++) {
    const chr = chromosomes[Math.floor(Math.random() * chromosomes.length)];
    const pos = 10000 + Math.floor(Math.random() * 100000000);
    const ref = nucleotides[Math.floor(Math.random() * nucleotides.length)];
    const alt = nucleotides.filter((n) => n !== ref)[
      Math.floor(Math.random() * 3)
    ];
    const af = Math.random() * 0.05; // 0-5% allele frequency
    const gene = genes[Math.floor(Math.random() * genes.length)];
    const csq = consequences[Math.floor(Math.random() * consequences.length)];
    const qual = 30 + Math.floor(Math.random() * 70);
    const gt = Math.random() > 0.5 ? '0/1' : '1/1';

    vcfContent += `${chr}\t${pos}\t.\t${ref}\t${alt}\t${qual}\tPASS\tAF=${af.toFixed(4)};GENE=${gene};CSQ=${csq}\tGT\t${gt}\n`;
  }

  await fs.writeFile(outputPath, vcfContent);
  return outputPath;
}

/**
 * Generate mock variant objects
 */
export function generateMockVariants(count: number): Variant[] {
  const chromosomes = Array.from({ length: 22 }, (_, i) => `chr${i + 1}`);
  const genes = [
    'BRCA1',
    'BRCA2',
    'TP53',
    'SCN1A',
    'DMD',
    'CFTR',
    'HTT',
    'FMR1',
  ];
  const nucleotides = ['A', 'T', 'C', 'G'];

  return Array.from({ length: count }, (_, i) => ({
    chromosome: chromosomes[Math.floor(Math.random() * chromosomes.length)],
    position: 10000 + Math.floor(Math.random() * 100000000),
    refAllele: nucleotides[Math.floor(Math.random() * nucleotides.length)],
    altAllele:
      nucleotides[Math.floor(Math.random() * nucleotides.length)],
    gene: genes[Math.floor(Math.random() * genes.length)],
    gnomadAF: Math.random() * 0.01,
    phylopScore: Math.random() * 10 - 5,
    gerpScore: Math.random() * 6 - 2,
    consequence: 'missense_variant',
  }));
}

/**
 * Generate mock HNSW database with variant embeddings
 */
export async function generateMockDatabase(
  name: string,
  variantCount: number
): Promise<HNSWIndex> {
  const config: HNSWConfig = {
    dimensions: 384,
    m: 48,
    efConstruction: 300,
    efSearch: 150,
    maxElements: variantCount * 2,
    distanceMetric: 'cosine',
  };

  const index = new HNSWIndex(config);
  const encoder = new VariantEncoder({ dimensions: 384 });

  // Generate and insert variants
  const batchSize = 1000;
  const numBatches = Math.ceil(variantCount / batchSize);

  for (let batch = 0; batch < numBatches; batch++) {
    const count = Math.min(batchSize, variantCount - batch * batchSize);
    const variants = generateMockVariants(count);
    const embeddings = encoder.encodeBatch(variants);

    const entries = embeddings.map((vector, i) => ({
      id: `${name}_variant_${batch * batchSize + i}`,
      vector,
      metadata: variants[i],
    }));

    await index.insertBatch(entries);
  }

  return index;
}

/**
 * Generate mock clinical variant data (pathogenic/benign)
 */
export function generateClinicalVariants(options: {
  pathogenic: number;
  benign: number;
  vus: number;
}): Variant[] {
  const variants: Variant[] = [];
  const { pathogenic, benign, vus } = options;

  // Pathogenic variants (BRCA1/BRCA2, TP53)
  for (let i = 0; i < pathogenic; i++) {
    variants.push({
      chromosome: 'chr17',
      position: 43044295 + i,
      refAllele: 'G',
      altAllele: 'A',
      gene: Math.random() > 0.5 ? 'BRCA1' : 'TP53',
      clinicalSignificance: 'pathogenic',
      gnomadAF: Math.random() * 0.0001, // Very rare
      phylopScore: 5 + Math.random() * 5, // Highly conserved
      gerpScore: 4 + Math.random() * 2,
      consequence: 'missense_variant',
    });
  }

  // Benign variants (common polymorphisms)
  for (let i = 0; i < benign; i++) {
    variants.push({
      chromosome: `chr${Math.floor(Math.random() * 22) + 1}`,
      position: 10000 + Math.floor(Math.random() * 100000000),
      refAllele: 'A',
      altAllele: 'T',
      clinicalSignificance: 'benign',
      gnomadAF: 0.01 + Math.random() * 0.5, // Common
      phylopScore: Math.random() * 2 - 1, // Not conserved
      gerpScore: Math.random() * 2 - 1,
      consequence: 'synonymous_variant',
    });
  }

  // Variants of uncertain significance
  for (let i = 0; i < vus; i++) {
    variants.push({
      chromosome: `chr${Math.floor(Math.random() * 22) + 1}`,
      position: 10000 + Math.floor(Math.random() * 100000000),
      refAllele: 'C',
      altAllele: 'G',
      clinicalSignificance: 'vus',
      gnomadAF: Math.random() * 0.001,
      phylopScore: Math.random() * 10 - 5,
      gerpScore: Math.random() * 6 - 2,
      consequence: 'missense_variant',
    });
  }

  return shuffleArray(variants);
}

/**
 * Generate mock HPO phenotype terms
 */
export function generateMockPhenotypes(): string[] {
  const phenotypes = [
    'HP:0001250', // Seizures
    'HP:0001252', // Hypotonia
    'HP:0002376', // Developmental regression
    'HP:0001263', // Global developmental delay
    'HP:0001249', // Intellectual disability
    'HP:0002650', // Scoliosis
    'HP:0001166', // Arachnodactyly
    'HP:0000098', // Tall stature
  ];

  const count = 2 + Math.floor(Math.random() * 4); // 2-5 phenotypes
  return shuffleArray(phenotypes).slice(0, count);
}

/**
 * Generate mock ClinVar database
 */
export async function generateClinVarData(
  variantCount: number
): Promise<string> {
  let vcfContent = `##fileformat=VCFv4.1
##INFO=<ID=CLNSIG,Number=.,Type=String,Description="Clinical significance">
##INFO=<ID=CLNREVSTAT,Number=.,Type=String,Description="Review status">
##INFO=<ID=CLNDN,Number=.,Type=String,Description="Disease names">
##INFO=<ID=GENEINFO,Number=1,Type=String,Description="Gene information">
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\n`;

  const significances = [
    'Pathogenic',
    'Likely_pathogenic',
    'Uncertain_significance',
    'Likely_benign',
    'Benign',
  ];
  const reviewStatuses = [
    'no_assertion',
    'criteria_provided',
    'reviewed_by_expert_panel',
  ];
  const diseases = [
    'Breast_cancer',
    'Epilepsy',
    'Cardiomyopathy',
    'Intellectual_disability',
  ];
  const genes = ['BRCA1', 'BRCA2', 'SCN1A', 'TP53', 'DMD'];

  for (let i = 0; i < variantCount; i++) {
    const chr = `chr${Math.floor(Math.random() * 22) + 1}`;
    const pos = 10000 + Math.floor(Math.random() * 100000000);
    const sig = significances[Math.floor(Math.random() * significances.length)];
    const status =
      reviewStatuses[Math.floor(Math.random() * reviewStatuses.length)];
    const disease = diseases[Math.floor(Math.random() * diseases.length)];
    const gene = genes[Math.floor(Math.random() * genes.length)];

    vcfContent += `${chr}\t${pos}\trs${100000 + i}\tG\tA\t.\t.\tCLNSIG=${sig};CLNREVSTAT=${status};CLNDN=${disease};GENEINFO=${gene}\n`;
  }

  const outputPath = `/tmp/mock_clinvar_${Date.now()}.vcf`;
  await fs.writeFile(outputPath, vcfContent);
  return outputPath;
}

/**
 * Generate mock gnomAD database
 */
export async function generateGnomADData(
  variantCount: number
): Promise<string> {
  let vcfContent = `##fileformat=VCFv4.2
##INFO=<ID=AF,Number=A,Type=Float,Description="Allele Frequency">
##INFO=<ID=AF_afr,Number=A,Type=Float,Description="African/African American">
##INFO=<ID=AF_amr,Number=A,Type=Float,Description="Latino/Admixed American">
##INFO=<ID=AF_eas,Number=A,Type=Float,Description="East Asian">
##INFO=<ID=AF_nfe,Number=A,Type=Float,Description="Non-Finnish European">
##INFO=<ID=AC,Number=A,Type=Integer,Description="Allele Count">
##INFO=<ID=AN,Number=1,Type=Integer,Description="Allele Number">
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\n`;

  for (let i = 0; i < variantCount; i++) {
    const chr = `chr${Math.floor(Math.random() * 22) + 1}`;
    const pos = 10000 + Math.floor(Math.random() * 100000000);
    const af = Math.random() * 0.1;
    const afAfr = Math.random() * 0.1;
    const afAmr = Math.random() * 0.1;
    const afEas = Math.random() * 0.1;
    const afNfe = Math.random() * 0.1;
    const an = 10000 + Math.floor(Math.random() * 90000);
    const ac = Math.floor(af * an);

    vcfContent += `${chr}\t${pos}\trs${100000 + i}\tA\tT\t.\tPASS\tAF=${af.toFixed(6)};AF_afr=${afAfr.toFixed(6)};AF_amr=${afAmr.toFixed(6)};AF_eas=${afEas.toFixed(6)};AF_nfe=${afNfe.toFixed(6)};AC=${ac};AN=${an}\n`;
  }

  const outputPath = `/tmp/mock_gnomad_${Date.now()}.vcf`;
  await fs.writeFile(outputPath, vcfContent);
  return outputPath;
}

/**
 * Generate mock test dataset with ground truth
 */
export interface GroundTruthDataset {
  variants: Variant[];
  groundTruth: {
    pathogenic: Set<number>;
    benign: Set<number>;
    vus: Set<number>;
  };
  phenotypeMatches: Map<number, string[]>;
}

export function generateGroundTruthDataset(
  totalVariants: number
): GroundTruthDataset {
  const pathogenicCount = Math.floor(totalVariants * 0.05); // 5% pathogenic
  const benignCount = Math.floor(totalVariants * 0.7); // 70% benign
  const vusCount = totalVariants - pathogenicCount - benignCount;

  const variants = generateClinicalVariants({
    pathogenic: pathogenicCount,
    benign: benignCount,
    vus: vusCount,
  });

  const groundTruth = {
    pathogenic: new Set<number>(),
    benign: new Set<number>(),
    vus: new Set<number>(),
  };

  const phenotypeMatches = new Map<number, string[]>();

  variants.forEach((variant, i) => {
    if (variant.clinicalSignificance === 'pathogenic') {
      groundTruth.pathogenic.add(i);
      phenotypeMatches.set(i, generateMockPhenotypes());
    } else if (variant.clinicalSignificance === 'benign') {
      groundTruth.benign.add(i);
    } else {
      groundTruth.vus.add(i);
    }
  });

  return { variants, groundTruth, phenotypeMatches };
}

// Utility functions
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
