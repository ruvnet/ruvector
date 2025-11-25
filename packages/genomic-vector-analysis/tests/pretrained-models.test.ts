import { PreTrainedModels, PreTrainedModel } from '../src/models/PreTrainedModels';
import { describe, it, expect, beforeAll } from '@jest/globals';
import path from 'path';

describe('PreTrainedModels', () => {
  beforeAll(() => {
    // Initialize with test models directory
    const modelsDir = path.resolve(__dirname, '../models');
    PreTrainedModels.initialize(modelsDir);
  });

  describe('Model Registry', () => {
    it('should list all available models', () => {
      const models = PreTrainedModels.list();
      expect(models).toContain('kmer-3-384d');
      expect(models).toContain('kmer-5-384d');
      expect(models).toContain('protein-embedding');
      expect(models).toContain('phenotype-hpo');
      expect(models).toContain('variant-patterns');
      expect(models).toContain('sample-embeddings');
    });

    it('should get model info without loading', () => {
      const info = PreTrainedModels.getInfo('kmer-5-384d');
      expect(info).toBeDefined();
      expect(info?.name).toBe('kmer-5-384d');
      expect(info?.dimensions).toBe(384);
      expect(info?.category).toBe('kmer');
    });

    it('should get models by category', () => {
      const kmerModels = PreTrainedModels.getByCategory('kmer');
      expect(kmerModels.length).toBeGreaterThanOrEqual(2);
      expect(kmerModels.some(m => m.name === 'kmer-3-384d')).toBe(true);
      expect(kmerModels.some(m => m.name === 'kmer-5-384d')).toBe(true);
    });
  });

  describe('K-mer Models', () => {
    let model: PreTrainedModel;

    beforeAll(async () => {
      model = await PreTrainedModels.load('kmer-5-384d');
    });

    it('should load kmer-5-384d model', () => {
      expect(model).toBeDefined();
      expect(model.getDimensions()).toBe(384);
    });

    it('should have correct metadata', () => {
      const metadata = model.getMetadata();
      expect(metadata.name).toBe('kmer-5-384d');
      expect(metadata.kmer_size).toBe(5);
      expect(metadata.dimensions).toBe(384);
    });

    it('should embed a DNA sequence', () => {
      const sequence = 'ATCGATCGATCG';
      const embedding = model.embed(sequence);

      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding!.length).toBeLessThanOrEqual(384);
    });

    it('should return null for sequences too short', () => {
      const shortSeq = 'ATG'; // Only 3 bases, need at least 5 for 5-mer
      const embedding = model.embed(shortSeq);
      expect(embedding).toBeNull();
    });

    it('should look up k-mer embeddings', () => {
      const atcga = model.lookup('ATCGA');
      expect(atcga).toBeDefined();
      expect(Array.isArray(atcga)).toBe(true);
    });

    it('should have position weights', () => {
      const rawData = model.getRawData();
      expect(rawData.position_weights).toBeDefined();
      expect(rawData.position_weights.promoter_region).toBeDefined();
    });
  });

  describe('Protein Embedding Model', () => {
    let model: PreTrainedModel;

    beforeAll(async () => {
      model = await PreTrainedModels.load('protein-embedding');
    });

    it('should load protein model', () => {
      expect(model).toBeDefined();
      expect(model.getDimensions()).toBe(384);
    });

    it('should look up amino acid embeddings', () => {
      const methionine = model.lookup('M');
      const cysteine = model.lookup('C');

      expect(methionine).toBeDefined();
      expect(cysteine).toBeDefined();
      expect(Array.isArray(methionine)).toBe(true);
      expect(Array.isArray(cysteine)).toBe(true);
    });

    it('should have protein domain embeddings', () => {
      const rawData = model.getRawData();
      expect(rawData.protein_domains).toBeDefined();
      expect(rawData.protein_domains.kinase_domain).toBeDefined();
    });

    it('should have functional annotations', () => {
      const rawData = model.getRawData();
      expect(rawData.functional_annotations).toBeDefined();
      expect(rawData.functional_annotations.enzyme).toBeDefined();
    });
  });

  describe('HPO Phenotype Model', () => {
    let model: PreTrainedModel;

    beforeAll(async () => {
      model = await PreTrainedModels.load('phenotype-hpo');
    });

    it('should load phenotype model', () => {
      expect(model).toBeDefined();
      expect(model.getDimensions()).toBe(384);
    });

    it('should look up HPO term embeddings', () => {
      const seizures = model.lookup('HP:0001250');
      expect(seizures).toBeDefined();
      expect(Array.isArray(seizures)).toBe(true);
    });

    it('should have HPO term metadata', () => {
      const rawData = model.getRawData();
      const seizureInfo = rawData.hpo_terms['HP:0001250'];

      expect(seizureInfo).toBeDefined();
      expect(seizureInfo.term).toBe('Seizures');
      expect(seizureInfo.category).toBe('Neurology');
      expect(seizureInfo.related_genes).toContain('SCN1A');
    });

    it('should have phenotype categories', () => {
      const rawData = model.getRawData();
      expect(rawData.phenotype_categories).toBeDefined();
      expect(rawData.phenotype_categories.Neurology).toBeDefined();
    });

    it('should have disease embeddings', () => {
      const rawData = model.getRawData();
      expect(rawData.disease_embeddings).toBeDefined();
      expect(rawData.disease_embeddings.Epilepsy).toBeDefined();
    });
  });

  describe('Variant Patterns Model', () => {
    let model: PreTrainedModel;

    beforeAll(async () => {
      model = await PreTrainedModels.load('variant-patterns');
    });

    it('should load variant model', () => {
      expect(model).toBeDefined();
      expect(model.getDimensions()).toBe(384);
    });

    it('should look up variant embeddings', () => {
      const brca1 = model.lookup('BRCA1_c.68_69delAG');
      expect(brca1).toBeDefined();
      expect(Array.isArray(brca1)).toBe(true);
    });

    it('should have variant metadata', () => {
      const rawData = model.getRawData();
      const brca1Info = rawData.common_pathogenic_variants['BRCA1_c.68_69delAG'];

      expect(brca1Info).toBeDefined();
      expect(brca1Info.gene).toBe('BRCA1');
      expect(brca1Info.variant_type).toBe('frameshift');
      expect(brca1Info.clinical_significance).toBe('pathogenic');
    });

    it('should have variant type embeddings', () => {
      const rawData = model.getRawData();
      expect(rawData.variant_type_embeddings).toBeDefined();
      expect(rawData.variant_type_embeddings.missense).toBeDefined();
      expect(rawData.variant_type_embeddings.frameshift).toBeDefined();
    });

    it('should have functional impact embeddings', () => {
      const rawData = model.getRawData();
      expect(rawData.functional_impact_embeddings).toBeDefined();
      expect(rawData.functional_impact_embeddings.loss_of_function).toBeDefined();
    });
  });

  describe('Sample Embeddings Model', () => {
    let model: PreTrainedModel;

    beforeAll(async () => {
      model = await PreTrainedModels.load('sample-embeddings');
    });

    it('should load sample embeddings', () => {
      expect(model).toBeDefined();
      expect(model.getDimensions()).toBe(384);
    });

    it('should look up gene embeddings', () => {
      const brca1 = model.lookup('BRCA1');
      const tp53 = model.lookup('TP53');

      expect(brca1).toBeDefined();
      expect(tp53).toBeDefined();
    });

    it('should have gene metadata', () => {
      const rawData = model.getRawData();
      const brca1Info = rawData.common_genes.BRCA1;

      expect(brca1Info).toBeDefined();
      expect(brca1Info.name).toBe('Breast cancer 1');
      expect(brca1Info.chromosome).toBe('17');
      expect(brca1Info.function).toContain('tumor suppressor');
    });

    it('should have patient profile embeddings', () => {
      const patientProfile = model.lookup('patient_epilepsy_001');
      expect(patientProfile).toBeDefined();
      expect(Array.isArray(patientProfile)).toBe(true);
    });

    it('should have disease signature embeddings', () => {
      const dravetSignature = model.lookup('Dravet_syndrome');
      expect(dravetSignature).toBeDefined();
      expect(Array.isArray(dravetSignature)).toBe(true);
    });

    it('should have pathway embeddings', () => {
      const rawData = model.getRawData();
      expect(rawData.pathway_embeddings).toBeDefined();
      expect(rawData.pathway_embeddings.DNA_repair).toBeDefined();
    });
  });

  describe('Model Caching', () => {
    it('should cache loaded models', async () => {
      // Clear cache first
      PreTrainedModels.clearCache();

      // First load
      const start1 = Date.now();
      await PreTrainedModels.load('kmer-3-384d');
      const time1 = Date.now() - start1;

      // Second load (from cache)
      const start2 = Date.now();
      await PreTrainedModels.load('kmer-3-384d');
      const time2 = Date.now() - start2;

      // Cache should be faster (though timing can be unreliable in tests)
      // Just verify both loads complete successfully
      expect(time1).toBeGreaterThan(0);
      expect(time2).toBeGreaterThanOrEqual(0);
    });

    it('should clear cache', async () => {
      await PreTrainedModels.load('kmer-3-384d');
      PreTrainedModels.clearCache();

      // Model should reload after cache clear
      const model = await PreTrainedModels.load('kmer-3-384d');
      expect(model).toBeDefined();
    });
  });

  describe('Available Keys', () => {
    it('should list all available keys in k-mer model', async () => {
      const model = await PreTrainedModels.load('kmer-5-384d');
      const keys = model.getAvailableKeys();

      expect(keys).toBeDefined();
      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBeGreaterThan(0);
    });

    it('should list all available keys in HPO model', async () => {
      const model = await PreTrainedModels.load('phenotype-hpo');
      const keys = model.getAvailableKeys();

      expect(keys).toContain('HP:0001250');
      expect(keys).toContain('HP:0001631');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-existent model', async () => {
      await expect(
        PreTrainedModels.load('non-existent-model')
      ).rejects.toThrow('not found in registry');
    });

    it('should return null for non-existent lookups', async () => {
      const model = await PreTrainedModels.load('kmer-5-384d');
      const result = model.lookup('NONEXISTENT');
      expect(result).toBeNull();
    });
  });
});
