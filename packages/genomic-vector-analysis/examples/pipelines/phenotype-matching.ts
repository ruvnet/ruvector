/**
 * Phenotype Matching Pipeline
 *
 * Workflow: Patient HPO terms → Similar cases → Diagnosis
 * Uses semantic search to find similar patients and prioritize diagnoses
 */

import { GenomicVectorDB } from '../../src/index';
import HPOLookup, { PatientPhenotype } from '../../integrations/hpo-lookup';
import ClinVarImporter from '../../integrations/clinvar-importer';

export interface DiagnosticCase {
  caseId: string;
  patientId: string;
  age: number;
  sex: 'M' | 'F' | 'U';
  hpoTerms: string[];
  diagnosis: string;
  confirmedGenes: string[];
  pathogenicVariants: Array<{
    gene: string;
    variantId: string;
    classification: string;
  }>;
  outcome?: string;
}

export interface SimilarCase {
  case: DiagnosticCase;
  similarity: number;
  sharedPhenotypes: string[];
  phenotypeOverlap: number;
  suggestedGenes: string[];
}

export interface DiagnosisHypothesis {
  diagnosis: string;
  confidence: number;
  supportingEvidence: {
    similarCases: number;
    candidateGenes: string[];
    phenotypeMatch: number;
    literatureSupport?: number;
  };
  candidateVariants?: Array<{
    gene: string;
    variantId: string;
    likelihood: number;
  }>;
}

export class PhenotypeMatchingPipeline {
  private db: GenomicVectorDB;
  private hpo: HPOLookup;
  private clinvar: ClinVarImporter;
  private caseDatabase: DiagnosticCase[] = [];

  constructor(hpo: HPOLookup, clinvar: ClinVarImporter) {
    this.db = new GenomicVectorDB({
      embeddingModel: 'text-embedding-3-small',
      dimension: 1536
    });
    this.hpo = hpo;
    this.clinvar = clinvar;
  }

  /**
   * Load case database for similarity matching
   */
  async loadCaseDatabase(cases: DiagnosticCase[]): Promise<void> {
    console.log(`Loading ${cases.length} diagnostic cases...`);

    this.caseDatabase = cases;

    // Ingest cases into vector database for semantic search
    const documents = cases.map(case_ => {
      const description = this.createCaseDescription(case_);

      return {
        id: `case_${case_.caseId}`,
        content: description,
        metadata: {
          type: 'diagnostic_case',
          caseId: case_.caseId,
          diagnosis: case_.diagnosis,
          genes: case_.confirmedGenes.join('|'),
          hpoTerms: case_.hpoTerms.join('|'),
          age: case_.age,
          sex: case_.sex
        }
      };
    });

    // Batch ingest
    const batchSize = 100;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      await this.db.addDocuments(batch);

      if ((i + batch.length) % 500 === 0) {
        console.log(`  Loaded ${i + batch.length} cases`);
      }
    }

    console.log('Case database loaded');
  }

  /**
   * Create semantic description of case
   */
  private createCaseDescription(case_: DiagnosticCase): string {
    const parts: string[] = [];

    // Demographics
    parts.push(`${case_.age} year old ${case_.sex === 'M' ? 'male' : case_.sex === 'F' ? 'female' : 'patient'}`);

    // Phenotypes
    const phenotypeNames = case_.hpoTerms
      .map(hpo => this.hpo.getTerm(hpo)?.name || hpo)
      .filter(Boolean);

    parts.push(`presenting with: ${phenotypeNames.join(', ')}`);

    // Diagnosis
    if (case_.diagnosis) {
      parts.push(`Diagnosis: ${case_.diagnosis}`);
    }

    // Genes
    if (case_.confirmedGenes.length > 0) {
      parts.push(`Genetic cause: ${case_.confirmedGenes.join(', ')} gene variants`);
    }

    // Variants
    if (case_.pathogenicVariants.length > 0) {
      const variantDescs = case_.pathogenicVariants.map(v =>
        `${v.gene} ${v.variantId} (${v.classification})`
      );
      parts.push(`Pathogenic variants: ${variantDescs.join('; ')}`);
    }

    return parts.join('. ');
  }

  /**
   * Find similar cases based on phenotype
   */
  async findSimilarCases(
    patientHpos: string[],
    options?: {
      minSimilarity?: number;
      limit?: number;
      ageRange?: [number, number];
      sex?: 'M' | 'F';
    }
  ): Promise<SimilarCase[]> {
    // Create query from patient phenotypes
    const phenotypeNames = patientHpos
      .map(hpo => this.hpo.getTerm(hpo)?.name || hpo)
      .filter(Boolean);

    const query = `Patient with ${phenotypeNames.join(', ')}`;

    // Search for similar cases
    const searchResults = await this.db.search(query, {
      limit: options?.limit || 20,
      filter: {
        type: 'diagnostic_case',
        ...(options?.sex && { sex: options.sex })
      }
    });

    // Calculate detailed similarity for each case
    const similarCases: SimilarCase[] = [];

    for (const result of searchResults) {
      const case_ = this.caseDatabase.find(c => c.caseId === result.metadata.caseId);
      if (!case_) continue;

      // Age filter
      if (options?.ageRange) {
        const [minAge, maxAge] = options.ageRange;
        if (case_.age < minAge || case_.age > maxAge) continue;
      }

      // Calculate phenotypic similarity
      const similarity = this.hpo.calculatePhenotypicSimilarity(
        patientHpos,
        case_.hpoTerms
      );

      if (options?.minSimilarity && similarity < options.minSimilarity) {
        continue;
      }

      // Find shared phenotypes
      const patientSet = new Set(patientHpos);
      const sharedPhenotypes = case_.hpoTerms.filter(hpo => patientSet.has(hpo));

      // Calculate overlap percentage
      const phenotypeOverlap = sharedPhenotypes.length / patientHpos.length;

      similarCases.push({
        case: case_,
        similarity,
        sharedPhenotypes,
        phenotypeOverlap,
        suggestedGenes: case_.confirmedGenes
      });
    }

    // Sort by similarity
    return similarCases.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Generate diagnosis hypotheses
   */
  async generateDiagnosisHypotheses(
    patientHpos: string[],
    patientVariants?: Array<{ gene: string; variantId: string }>,
    options?: {
      minCasesSupport?: number;
      minConfidence?: number;
    }
  ): Promise<DiagnosisHypothesis[]> {
    console.log('Generating diagnosis hypotheses...');

    // Find similar cases
    const similarCases = await this.findSimilarCases(patientHpos, {
      minSimilarity: 0.3,
      limit: 50
    });

    console.log(`Found ${similarCases.length} similar cases`);

    // Group by diagnosis
    const diagnosisGroups = new Map<string, SimilarCase[]>();
    similarCases.forEach(sc => {
      if (!sc.case.diagnosis) return;

      if (!diagnosisGroups.has(sc.case.diagnosis)) {
        diagnosisGroups.set(sc.case.diagnosis, []);
      }
      diagnosisGroups.get(sc.case.diagnosis)!.push(sc);
    });

    // Get candidate genes from HPO
    const candidateGeneMap = await this.hpo.getCandidateGenes(patientHpos);
    const rankedGenes = Array.from(candidateGeneMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([gene]) => gene);

    // Generate hypotheses
    const hypotheses: DiagnosisHypothesis[] = [];

    diagnosisGroups.forEach((cases, diagnosis) => {
      // Filter by minimum cases support
      if (options?.minCasesSupport && cases.length < options.minCasesSupport) {
        return;
      }

      // Calculate average similarity
      const avgSimilarity = cases.reduce((sum, c) => sum + c.similarity, 0) / cases.length;

      // Get all genes from similar cases
      const genesInCases = new Set<string>();
      cases.forEach(c => c.case.confirmedGenes.forEach(g => genesInCases.add(g)));

      // Find genes that overlap with candidate genes
      const relevantGenes = rankedGenes.filter(g => genesInCases.has(g));

      // Calculate phenotype match
      const allPhenotypesInCases = new Set<string>();
      cases.forEach(c => c.case.hpoTerms.forEach(h => allPhenotypesInCases.add(h)));
      const phenotypeMatch = patientHpos.filter(h => allPhenotypesInCases.has(h)).length / patientHpos.length;

      // Calculate confidence
      const caseSupportScore = Math.min(cases.length / 10, 1); // Normalize to max 10 cases
      const similarityScore = avgSimilarity;
      const phenotypeScore = phenotypeMatch;
      const geneScore = relevantGenes.length > 0 ? 1 : 0;

      const confidence = (caseSupportScore * 0.3 + similarityScore * 0.4 + phenotypeScore * 0.2 + geneScore * 0.1);

      // Filter by minimum confidence
      if (options?.minConfidence && confidence < options.minConfidence) {
        return;
      }

      // Find candidate variants if patient variants provided
      let candidateVariants: DiagnosisHypothesis['candidateVariants'];
      if (patientVariants) {
        candidateVariants = patientVariants
          .filter(v => relevantGenes.includes(v.gene))
          .map(v => ({
            gene: v.gene,
            variantId: v.variantId,
            likelihood: candidateGeneMap.get(v.gene) || 0 / patientHpos.length
          }))
          .sort((a, b) => b.likelihood - a.likelihood);
      }

      hypotheses.push({
        diagnosis,
        confidence,
        supportingEvidence: {
          similarCases: cases.length,
          candidateGenes: relevantGenes,
          phenotypeMatch
        },
        candidateVariants
      });
    });

    // Sort by confidence
    return hypotheses.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Prioritize patient variants based on phenotype
   */
  async prioritizeVariantsByPhenotype(
    patientHpos: string[],
    variants: Array<{ gene: string; variantId: string; [key: string]: any }>
  ): Promise<Array<{ variant: any; priority: number; reasons: string[] }>> {
    console.log('Prioritizing variants by phenotype...');

    // Get prioritization from HPO
    const hpoPrioritized = await this.hpo.prioritizeVariants(variants, patientHpos);

    // Enhance with similar case information
    const similarCases = await this.findSimilarCases(patientHpos, {
      minSimilarity: 0.5,
      limit: 20
    });

    // Get genes from similar cases
    const genesInSimilarCases = new Map<string, number>();
    similarCases.forEach(sc => {
      sc.case.confirmedGenes.forEach(gene => {
        genesInSimilarCases.set(gene, (genesInSimilarCases.get(gene) || 0) + sc.similarity);
      });
    });

    // Combine prioritization
    const prioritized = hpoPrioritized.map(p => {
      let priority = p.score * 0.6; // HPO score weight
      const reasons: string[] = [];

      // Add phenotype match reasons
      if (p.matchedPhenotypes.length > 0) {
        reasons.push(`Matches ${p.matchedPhenotypes.length} patient phenotypes`);
      }

      // Add similar case support
      const caseSupport = genesInSimilarCases.get(p.variant.gene) || 0;
      if (caseSupport > 0) {
        priority += caseSupport * 0.4; // Similar case weight
        reasons.push(`Found in ${Math.round(caseSupport * 10)} similar cases`);
      }

      return {
        variant: p.variant,
        priority,
        reasons
      };
    });

    return prioritized.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Generate diagnostic report
   */
  generateDiagnosticReport(
    patientId: string,
    patientHpos: string[],
    hypotheses: DiagnosisHypothesis[],
    similarCases: SimilarCase[]
  ): string {
    const phenotypeNames = patientHpos
      .map(hpo => this.hpo.getTerm(hpo)?.name || hpo)
      .filter(Boolean);

    const report: string[] = [
      '# Phenotype-Based Diagnostic Report',
      '',
      `**Patient ID:** ${patientId}`,
      `**Date:** ${new Date().toLocaleDateString()}`,
      '',
      '## Patient Phenotypes',
      '',
      ...phenotypeNames.map(name => `- ${name}`),
      '',
      '## Differential Diagnoses',
      ''
    ];

    hypotheses.slice(0, 5).forEach((hyp, idx) => {
      report.push(`### ${idx + 1}. ${hyp.diagnosis}`);
      report.push(`**Confidence:** ${(hyp.confidence * 100).toFixed(1)}%`);
      report.push(`**Supporting Cases:** ${hyp.supportingEvidence.similarCases}`);
      report.push(`**Phenotype Match:** ${(hyp.supportingEvidence.phenotypeMatch * 100).toFixed(1)}%`);

      if (hyp.supportingEvidence.candidateGenes.length > 0) {
        report.push(`**Candidate Genes:** ${hyp.supportingEvidence.candidateGenes.slice(0, 5).join(', ')}`);
      }

      if (hyp.candidateVariants && hyp.candidateVariants.length > 0) {
        report.push(`**Candidate Variants:**`);
        hyp.candidateVariants.slice(0, 3).forEach(v => {
          report.push(`  - ${v.gene}: ${v.variantId} (likelihood: ${(v.likelihood * 100).toFixed(1)}%)`);
        });
      }

      report.push('');
    });

    report.push('## Similar Cases', '');

    similarCases.slice(0, 5).forEach((sc, idx) => {
      report.push(`### Case ${idx + 1}`);
      report.push(`**Similarity:** ${(sc.similarity * 100).toFixed(1)}%`);
      report.push(`**Diagnosis:** ${sc.case.diagnosis}`);
      report.push(`**Age/Sex:** ${sc.case.age}y / ${sc.case.sex}`);
      report.push(`**Shared Phenotypes:** ${sc.sharedPhenotypes.length}/${patientHpos.length}`);
      report.push(`**Confirmed Genes:** ${sc.case.confirmedGenes.join(', ')}`);
      report.push('');
    });

    return report.join('\n');
  }
}

export default PhenotypeMatchingPipeline;
