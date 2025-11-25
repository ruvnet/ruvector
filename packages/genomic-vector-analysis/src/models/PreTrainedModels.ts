import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/**
 * Model metadata interface
 */
export interface ModelMetadata {
  name: string;
  version: string;
  description: string;
  dimensions: number;
  training_date?: string;
  accuracy_metrics?: Record<string, number>;
  normalization?: string;
  checksum?: string;
  [key: string]: any;
}

/**
 * Model data interface
 */
export interface ModelData {
  metadata: ModelMetadata;
  [key: string]: any;
}

/**
 * Model registry entry
 */
export interface ModelRegistryEntry {
  name: string;
  fileName: string;
  description: string;
  dimensions: number;
  version: string;
  category: 'kmer' | 'protein' | 'phenotype' | 'variant' | 'sample';
  remoteUrl?: string;
}

/**
 * Pre-trained model instance
 */
export class PreTrainedModel {
  private data: ModelData;

  constructor(data: ModelData) {
    this.data = data;
  }

  /**
   * Get model metadata
   */
  getMetadata(): ModelMetadata {
    return this.data.metadata;
  }

  /**
   * Get model dimensions
   */
  getDimensions(): number {
    return this.data.metadata.dimensions;
  }

  /**
   * Embed a sequence (k-mer model)
   */
  embed(sequence: string): number[] | null {
    if (this.data.embeddings) {
      const embedding = this.data.embeddings[sequence];
      if (embedding) {
        return Array.isArray(embedding) ? embedding : null;
      }
    }

    // For k-mer models, try to compute from k-mer frequencies
    if (this.data.vocabulary && this.data.metadata.kmer_size) {
      return this.computeKmerEmbedding(sequence);
    }

    return null;
  }

  /**
   * Compute k-mer embedding for a sequence
   */
  private computeKmerEmbedding(sequence: string): number[] | null {
    const kmerSize = this.data.metadata.kmer_size;
    const dimensions = this.data.metadata.dimensions;

    if (!kmerSize || sequence.length < kmerSize) {
      return null;
    }

    // Extract k-mers from sequence
    const kmers: string[] = [];
    for (let i = 0; i <= sequence.length - kmerSize; i++) {
      kmers.push(sequence.substring(i, i + kmerSize));
    }

    // Average k-mer embeddings
    const embedding = new Array(dimensions).fill(0);
    let count = 0;

    for (const kmer of kmers) {
      const kmerEmbedding = this.data.embeddings?.[kmer];
      if (kmerEmbedding && Array.isArray(kmerEmbedding)) {
        for (let i = 0; i < Math.min(dimensions, kmerEmbedding.length); i++) {
          embedding[i] += kmerEmbedding[i];
        }
        count++;
      }
    }

    if (count === 0) {
      return null;
    }

    // Average and normalize
    for (let i = 0; i < dimensions; i++) {
      embedding[i] /= count;
    }

    return this.normalizeEmbedding(embedding);
  }

  /**
   * Look up a pre-computed embedding by key
   */
  lookup(key: string): number[] | null {
    // Try direct lookup in various possible locations
    const locations = [
      this.data.embeddings?.[key],
      this.data.amino_acid_embeddings?.[key],
      this.data.hpo_terms?.[key]?.embedding,
      this.data.common_pathogenic_variants?.[key]?.embedding,
      this.data.common_genes?.[key]?.embedding,
      this.data.example_patient_profiles?.[key]?.combined_embedding,
      this.data.disease_signatures?.[key]?.signature_embedding,
      this.data.pathway_embeddings?.[key]
    ];

    for (const embedding of locations) {
      if (embedding && Array.isArray(embedding)) {
        return embedding;
      }
    }

    return null;
  }

  /**
   * Get all available keys for lookup
   */
  getAvailableKeys(): string[] {
    const keys: string[] = [];

    if (this.data.embeddings) {
      keys.push(...Object.keys(this.data.embeddings));
    }
    if (this.data.amino_acid_embeddings) {
      keys.push(...Object.keys(this.data.amino_acid_embeddings));
    }
    if (this.data.hpo_terms) {
      keys.push(...Object.keys(this.data.hpo_terms));
    }
    if (this.data.common_pathogenic_variants) {
      keys.push(...Object.keys(this.data.common_pathogenic_variants));
    }
    if (this.data.common_genes) {
      keys.push(...Object.keys(this.data.common_genes));
    }
    if (this.data.example_patient_profiles) {
      keys.push(...Object.keys(this.data.example_patient_profiles));
    }
    if (this.data.disease_signatures) {
      keys.push(...Object.keys(this.data.disease_signatures));
    }
    if (this.data.pathway_embeddings) {
      keys.push(...Object.keys(this.data.pathway_embeddings));
    }

    return [...new Set(keys)];
  }

  /**
   * Normalize embedding vector (L2 normalization)
   */
  private normalizeEmbedding(embedding: number[]): number[] {
    const magnitude = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0)
    );

    if (magnitude === 0) {
      return embedding;
    }

    return embedding.map(val => val / magnitude);
  }

  /**
   * Get raw model data
   */
  getRawData(): ModelData {
    return this.data;
  }
}

/**
 * Pre-trained models registry and loader
 */
export class PreTrainedModels {
  private static modelsDir: string;
  private static registry: Map<string, ModelRegistryEntry> = new Map();
  private static cache: Map<string, PreTrainedModel> = new Map();

  /**
   * Initialize the models directory
   */
  static initialize(modelsDir?: string): void {
    if (modelsDir) {
      this.modelsDir = modelsDir;
    } else {
      // Default to models directory relative to this file
      this.modelsDir = path.resolve(__dirname, '../../models');
    }

    // Register built-in models
    this.registerBuiltInModels();
  }

  /**
   * Register built-in models
   */
  private static registerBuiltInModels(): void {
    this.register({
      name: 'kmer-3-384d',
      fileName: 'kmer-3-384d.json',
      description: '3-mer frequency model trained on 1000 Genomes Project data',
      dimensions: 384,
      version: '1.0.0',
      category: 'kmer'
    });

    this.register({
      name: 'kmer-5-384d',
      fileName: 'kmer-5-384d.json',
      description: '5-mer frequency model with enhanced specificity',
      dimensions: 384,
      version: '1.0.0',
      category: 'kmer'
    });

    this.register({
      name: 'protein-embedding',
      fileName: 'protein-embedding.json',
      description: 'Protein sequence embedding model from UniProt and AlphaFold',
      dimensions: 384,
      version: '1.0.0',
      category: 'protein'
    });

    this.register({
      name: 'phenotype-hpo',
      fileName: 'phenotype-hpo.json',
      description: 'Human Phenotype Ontology term embeddings',
      dimensions: 384,
      version: '1.0.0',
      category: 'phenotype'
    });

    this.register({
      name: 'variant-patterns',
      fileName: 'variant-patterns.json',
      description: 'Common pathogenic variant patterns from ClinVar',
      dimensions: 384,
      version: '1.0.0',
      category: 'variant'
    });

    this.register({
      name: 'sample-embeddings',
      fileName: 'sample-embeddings.json',
      description: 'Pre-computed embeddings for common genes and patient profiles',
      dimensions: 384,
      version: '1.0.0',
      category: 'sample'
    });
  }

  /**
   * Register a model
   */
  static register(entry: ModelRegistryEntry): void {
    this.registry.set(entry.name, entry);
  }

  /**
   * Get registry entries
   */
  static getRegistry(): ModelRegistryEntry[] {
    return Array.from(this.registry.values());
  }

  /**
   * Get models by category
   */
  static getByCategory(category: string): ModelRegistryEntry[] {
    return Array.from(this.registry.values()).filter(
      entry => entry.category === category
    );
  }

  /**
   * Load a pre-trained model
   */
  static async load(modelName: string): Promise<PreTrainedModel> {
    // Check cache first
    if (this.cache.has(modelName)) {
      return this.cache.get(modelName)!;
    }

    // Get registry entry
    const entry = this.registry.get(modelName);
    if (!entry) {
      throw new Error(`Model '${modelName}' not found in registry`);
    }

    // Ensure models directory is initialized
    if (!this.modelsDir) {
      this.initialize();
    }

    // Load model file
    const modelPath = path.join(this.modelsDir, entry.fileName);

    try {
      const data = await fs.readFile(modelPath, 'utf-8');
      const modelData: ModelData = JSON.parse(data);

      // Validate checksum if present
      if (modelData.metadata.checksum) {
        await this.validateChecksum(modelPath, modelData.metadata.checksum);
      }

      // Create model instance
      const model = new PreTrainedModel(modelData);

      // Cache the model
      this.cache.set(modelName, model);

      return model;
    } catch (error) {
      throw new Error(`Failed to load model '${modelName}': ${error}`);
    }
  }

  /**
   * Validate model checksum
   */
  private static async validateChecksum(
    filePath: string,
    expectedChecksum: string
  ): Promise<void> {
    const [algorithm, expected] = expectedChecksum.split(':');

    if (!algorithm || !expected) {
      throw new Error('Invalid checksum format');
    }

    const fileData = await fs.readFile(filePath);
    const hash = crypto.createHash(algorithm).update(fileData).digest('hex');

    if (hash !== expected) {
      console.warn(
        `Checksum mismatch for ${filePath}. Expected: ${expected}, Got: ${hash}`
      );
    }
  }

  /**
   * Clear model cache
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Download a model from remote URL (if specified)
   */
  static async download(modelName: string): Promise<void> {
    const entry = this.registry.get(modelName);
    if (!entry || !entry.remoteUrl) {
      throw new Error(
        `Model '${modelName}' has no remote URL configured`
      );
    }

    // Ensure models directory exists
    if (!this.modelsDir) {
      this.initialize();
    }

    await fs.mkdir(this.modelsDir, { recursive: true });

    const modelPath = path.join(this.modelsDir, entry.fileName);

    // Download model (placeholder - would use actual HTTP client)
    console.log(`Downloading ${modelName} from ${entry.remoteUrl}...`);
    // Implementation would fetch from URL and save to modelPath
    throw new Error('Remote download not yet implemented');
  }

  /**
   * List all available models
   */
  static list(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Get model info without loading
   */
  static getInfo(modelName: string): ModelRegistryEntry | undefined {
    return this.registry.get(modelName);
  }
}

// Initialize on import
PreTrainedModels.initialize();

export default PreTrainedModels;
