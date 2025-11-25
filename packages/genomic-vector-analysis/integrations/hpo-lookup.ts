/**
 * HPO (Human Phenotype Ontology) Lookup Integration
 *
 * Integrates HPO for phenotype-to-gene mapping and patient similarity matching.
 * Enables phenotype-driven variant prioritization and diagnosis support.
 */

import * as fs from 'fs';
import * as readline from 'readline';
import { GenomicVectorDB } from '../src/index';

export interface HPOTerm {
  id: string;
  name: string;
  definition: string;
  synonyms: string[];
  isObsolete: boolean;
  parents: string[];
  children: string[];
  genes: string[];
  diseases: string[];
}

export interface HPOAnnotation {
  hpoId: string;
  hpoName: string;
  geneSymbol: string;
  geneId: string;
  diseaseId: string;
  diseaseName: string;
  evidence: string;
  frequency?: string;
  onset?: string;
}

export interface PatientPhenotype {
  patientId: string;
  hpoTerms: string[];
  age?: number;
  sex?: 'M' | 'F' | 'U';
  additionalInfo?: Record<string, any>;
}

export class HPOLookup {
  private db: GenomicVectorDB;
  private hpoTerms: Map<string, HPOTerm> = new Map();
  private phenotypeToGenes: Map<string, Set<string>> = new Map();
  private geneToPhenotypes: Map<string, Set<string>> = new Map();

  constructor(db: GenomicVectorDB) {
    this.db = db;
  }

  /**
   * Load HPO ontology from OBO file
   */
  async loadOntology(oboFile: string): Promise<void> {
    const fileStream = fs.createReadStream(oboFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let currentTerm: Partial<HPOTerm> | null = null;

    for await (const line of rl) {
      const trimmed = line.trim();

      if (trimmed === '[Term]') {
        if (currentTerm && currentTerm.id) {
          this.hpoTerms.set(currentTerm.id, currentTerm as HPOTerm);
        }
        currentTerm = {
          id: '',
          name: '',
          definition: '',
          synonyms: [],
          isObsolete: false,
          parents: [],
          children: [],
          genes: [],
          diseases: []
        };
      } else if (currentTerm) {
        if (trimmed.startsWith('id: ')) {
          currentTerm.id = trimmed.substring(4);
        } else if (trimmed.startsWith('name: ')) {
          currentTerm.name = trimmed.substring(6);
        } else if (trimmed.startsWith('def: ')) {
          currentTerm.definition = trimmed.substring(5).replace(/^"(.*)".*$/, '$1');
        } else if (trimmed.startsWith('synonym: ')) {
          currentTerm.synonyms!.push(trimmed.substring(9).replace(/^"(.*)".*$/, '$1'));
        } else if (trimmed.startsWith('is_a: ')) {
          const parentId = trimmed.substring(6).split('!')[0].trim();
          currentTerm.parents!.push(parentId);
        } else if (trimmed === 'is_obsolete: true') {
          currentTerm.isObsolete = true;
        }
      }
    }

    // Add last term
    if (currentTerm && currentTerm.id) {
      this.hpoTerms.set(currentTerm.id, currentTerm as HPOTerm);
    }

    // Build child relationships
    this.hpoTerms.forEach(term => {
      term.parents.forEach(parentId => {
        const parent = this.hpoTerms.get(parentId);
        if (parent && !parent.children.includes(term.id)) {
          parent.children.push(term.id);
        }
      });
    });
  }

  /**
   * Load HPO gene annotations
   */
  async loadGeneAnnotations(annotationFile: string): Promise<void> {
    const fileStream = fs.createReadStream(annotationFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (line.startsWith('#')) continue;

      const fields = line.split('\t');
      if (fields.length < 4) continue;

      const [geneSymbol, geneId, hpoId, hpoName] = fields;

      // Update term with gene association
      const term = this.hpoTerms.get(hpoId);
      if (term && !term.genes.includes(geneSymbol)) {
        term.genes.push(geneSymbol);
      }

      // Build phenotype-to-gene mapping
      if (!this.phenotypeToGenes.has(hpoId)) {
        this.phenotypeToGenes.set(hpoId, new Set());
      }
      this.phenotypeToGenes.get(hpoId)!.add(geneSymbol);

      // Build gene-to-phenotype mapping
      if (!this.geneToPhenotypes.has(geneSymbol)) {
        this.geneToPhenotypes.set(geneSymbol, new Set());
      }
      this.geneToPhenotypes.get(geneSymbol)!.add(hpoId);
    }

    // Ingest into vector database
    await this.ingestHPOTerms();
  }

  /**
   * Ingest HPO terms into vector database
   */
  private async ingestHPOTerms(): Promise<void> {
    const documents: any[] = [];

    this.hpoTerms.forEach(term => {
      if (term.isObsolete) return;

      const description = this.createHPODescription(term);

      documents.push({
        id: `hpo_${term.id}`,
        content: description,
        metadata: {
          type: 'hpo_term',
          hpoId: term.id,
          hpoName: term.name,
          genes: term.genes.join('|'),
          geneCount: term.genes.length,
          source: 'hpo'
        }
      });
    });

    // Batch ingest
    const batchSize = 1000;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      await this.db.addDocuments(batch);
    }
  }

  /**
   * Create semantic description for HPO term
   */
  private createHPODescription(term: HPOTerm): string {
    const parts: string[] = [];

    parts.push(`${term.name} (${term.id})`);
    parts.push(term.definition);

    if (term.synonyms.length > 0) {
      parts.push(`Also known as: ${term.synonyms.slice(0, 3).join(', ')}`);
    }

    if (term.genes.length > 0) {
      parts.push(`Associated with ${term.genes.length} genes: ${term.genes.slice(0, 10).join(', ')}`);
    }

    return parts.join('. ');
  }

  /**
   * Get genes associated with HPO term
   */
  getGenesForPhenotype(hpoId: string): string[] {
    return Array.from(this.phenotypeToGenes.get(hpoId) || []);
  }

  /**
   * Get phenotypes associated with gene
   */
  getPhenotypesForGene(geneSymbol: string): string[] {
    return Array.from(this.geneToPhenotypes.get(geneSymbol) || []);
  }

  /**
   * Get HPO term by ID
   */
  getTerm(hpoId: string): HPOTerm | undefined {
    return this.hpoTerms.get(hpoId);
  }

  /**
   * Search for HPO terms by description
   */
  async searchPhenotypes(query: string, limit: number = 10): Promise<any[]> {
    return await this.db.search(query, {
      limit,
      filter: { type: 'hpo_term' }
    });
  }

  /**
   * Get candidate genes for patient phenotypes
   */
  async getCandidateGenes(hpoTerms: string[]): Promise<Map<string, number>> {
    const geneCounts = new Map<string, number>();

    // Count how many phenotypes each gene is associated with
    for (const hpoId of hpoTerms) {
      const genes = this.getGenesForPhenotype(hpoId);

      // Include genes from parent terms (propagate up ontology)
      const allRelevantHpos = this.getAncestors(hpoId);
      allRelevantHpos.forEach(ancestorId => {
        const ancestorGenes = this.getGenesForPhenotype(ancestorId);
        genes.push(...ancestorGenes);
      });

      genes.forEach(gene => {
        geneCounts.set(gene, (geneCounts.get(gene) || 0) + 1);
      });
    }

    return geneCounts;
  }

  /**
   * Get all ancestor HPO terms
   */
  private getAncestors(hpoId: string, visited = new Set<string>()): string[] {
    if (visited.has(hpoId)) return [];
    visited.add(hpoId);

    const term = this.hpoTerms.get(hpoId);
    if (!term) return [];

    const ancestors: string[] = [];

    term.parents.forEach(parentId => {
      ancestors.push(parentId);
      ancestors.push(...this.getAncestors(parentId, visited));
    });

    return ancestors;
  }

  /**
   * Calculate phenotypic similarity between two patients
   */
  calculatePhenotypicSimilarity(
    patient1Hpos: string[],
    patient2Hpos: string[]
  ): number {
    // Resnik similarity: based on most informative common ancestor
    const set1 = new Set(patient1Hpos);
    const set2 = new Set(patient2Hpos);

    // Get all ancestors for both sets
    const ancestors1 = new Set<string>();
    patient1Hpos.forEach(hpo => {
      ancestors1.add(hpo);
      this.getAncestors(hpo).forEach(a => ancestors1.add(a));
    });

    const ancestors2 = new Set<string>();
    patient2Hpos.forEach(hpo => {
      ancestors2.add(hpo);
      this.getAncestors(hpo).forEach(a => ancestors2.add(a));
    });

    // Find common ancestors
    const commonAncestors = new Set(
      [...ancestors1].filter(a => ancestors2.has(a))
    );

    if (commonAncestors.size === 0) return 0;

    // Calculate information content (IC) based on specificity
    // More specific terms (fewer genes) have higher IC
    let maxIC = 0;
    commonAncestors.forEach(hpoId => {
      const term = this.hpoTerms.get(hpoId);
      if (term) {
        const ic = -Math.log((term.genes.length + 1) / (this.hpoTerms.size + 1));
        maxIC = Math.max(maxIC, ic);
      }
    });

    // Normalize to 0-1 range
    const maxPossibleIC = -Math.log(1 / (this.hpoTerms.size + 1));
    return maxIC / maxPossibleIC;
  }

  /**
   * Find similar patients based on phenotypes
   */
  async findSimilarPatients(
    patientHpos: string[],
    patientDatabase: PatientPhenotype[],
    minSimilarity: number = 0.5,
    limit: number = 10
  ): Promise<Array<{ patient: PatientPhenotype; similarity: number }>> {
    const similarities = patientDatabase.map(otherPatient => ({
      patient: otherPatient,
      similarity: this.calculatePhenotypicSimilarity(patientHpos, otherPatient.hpoTerms)
    }));

    return similarities
      .filter(s => s.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Prioritize variants based on patient phenotypes
   */
  async prioritizeVariants(
    variants: Array<{ gene: string; variantId: string; [key: string]: any }>,
    patientHpos: string[]
  ): Promise<Array<{ variant: any; score: number; matchedPhenotypes: string[] }>> {
    const candidateGenes = await this.getCandidateGenes(patientHpos);

    const prioritized = variants.map(variant => {
      const phenotypeScore = candidateGenes.get(variant.gene) || 0;
      const maxScore = patientHpos.length;
      const normalizedScore = phenotypeScore / maxScore;

      const matchedPhenotypes = patientHpos.filter(hpo => {
        const genes = this.getGenesForPhenotype(hpo);
        return genes.includes(variant.gene);
      });

      return {
        variant,
        score: normalizedScore,
        matchedPhenotypes
      };
    });

    return prioritized
      .sort((a, b) => b.score - a.score)
      .filter(p => p.score > 0);
  }
}

export default HPOLookup;
