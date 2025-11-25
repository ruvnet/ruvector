# Pre-trained Models Directory

This directory contains pre-trained embedding models for genomic analysis.

## Available Models

### K-mer Models
- **kmer-3-384d.json** (3.5 KB)
  - 3-mer frequency embeddings
  - 384 dimensions
  - Trained on 1000 Genomes Project data
  - Best for: Short motifs, regulatory elements

- **kmer-5-384d.json** (3.5 KB)
  - 5-mer frequency embeddings
  - 384 dimensions
  - Context-aware embeddings for specific regions
  - Best for: Gene sequences, exons, functional regions

### Protein Models
- **protein-embedding.json** (3.5 KB)
  - Amino acid and protein domain embeddings
  - 384 dimensions
  - Trained on UniProt + AlphaFold data
  - Best for: Protein sequence analysis, functional prediction

### Phenotype Models
- **phenotype-hpo.json** (5.5 KB)
  - Human Phenotype Ontology term embeddings
  - 384 dimensions
  - HPO version 2024-01-01
  - Best for: Clinical phenotyping, disease prediction

### Variant Models
- **variant-patterns.json** (5.5 KB)
  - Common pathogenic variant embeddings
  - 384 dimensions
  - From ClinVar, gnomAD, COSMIC, HGMD
  - Best for: Variant interpretation, pathogenicity prediction

### Sample Data
- **sample-embeddings.json** (5.0 KB)
  - Pre-computed gene, patient profile, and disease signature embeddings
  - 384 dimensions
  - Includes BRCA1, TP53, CFTR, SCN1A, MECP2
  - Best for: Quick lookups, example data

## Total Size
All models combined: 31 KB (well under the 10 MB limit)

## Usage

### Load a Model
```typescript
import { PreTrainedModels } from '@ruvector/genomic-vector-analysis';

const model = await PreTrainedModels.load('kmer-5-384d');
```

### List Available Models
```typescript
const models = PreTrainedModels.list();
console.log('Available models:', models);
```

### Get Model Info
```typescript
const info = PreTrainedModels.getInfo('kmer-5-384d');
console.log('Model dimensions:', info.dimensions);
```

## Training Custom Models

See `../scripts/train-models/README.md` for instructions on training custom models.

## Model Format

All models use JSON format with the following structure:
```json
{
  "metadata": {
    "name": "model-name",
    "version": "1.0.0",
    "description": "...",
    "dimensions": 384,
    "checksum": "sha256:..."
  },
  "embeddings": {
    "key1": [0.1, -0.2, ...],
    "key2": [0.3, 0.4, ...]
  }
}
```

## Checksum Verification

All models include SHA-256 checksums for integrity verification. The PreTrainedModels API automatically validates checksums when loading models.

## License

These models are provided under the MIT License. Training data sources have their own licenses - see `../docs/PRETRAINED_MODELS.md` for references.
