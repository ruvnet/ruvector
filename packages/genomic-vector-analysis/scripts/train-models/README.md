# Model Training Scripts

This directory contains scripts for training custom genomic embedding models.

## Available Scripts

### 1. K-mer Model Training (`train-kmer-model.ts`)

Trains k-mer embedding models from FASTA sequence data using skip-gram architecture.

**Usage**:
```bash
npx ts-node train-kmer-model.ts <fasta-file> <output-file> [kmer-size] [dimensions]
```

**Example**:
```bash
# Train a 5-mer model with 384 dimensions
npx ts-node train-kmer-model.ts sequences.fasta kmer-5-384d.json 5 384

# Train a 3-mer model
npx ts-node train-kmer-model.ts sequences.fasta kmer-3-384d.json 3 384

# Train a 7-mer model
npx ts-node train-kmer-model.ts sequences.fasta kmer-7-512d.json 7 512
```

**Configuration** (edit in script):
- `windowSize`: Context window size (default: 5)
- `minCount`: Minimum k-mer frequency (default: 5)
- `learningRate`: Learning rate (default: 0.025)
- `epochs`: Number of training epochs (default: 10)
- `negSamples`: Negative samples per positive (default: 5)

**Input Format**:
FASTA format with DNA sequences:
```
>sequence1
ATCGATCGATCGATCG
>sequence2
GGGAAATTTCCCGGG
```

**Output**:
JSON file with model metadata and embeddings.

---

### 2. HPO Embeddings Training (`train-hpo-embeddings.ts`)

Generates embeddings for Human Phenotype Ontology terms based on ontology structure.

**Usage**:
```bash
npx ts-node train-hpo-embeddings.ts <output-file> [obo-file] [dimensions]
```

**Example**:
```bash
# Train HPO embeddings (uses example data)
npx ts-node train-hpo-embeddings.ts phenotype-hpo.json hp.obo 384

# Custom dimensions
npx ts-node train-hpo-embeddings.ts phenotype-custom.json hp.obo 512
```

**Features**:
- Ontology structure-aware embeddings
- Parent-child relationship encoding
- Gene association integration
- Disease association mapping

**Input Format**:
OBO format (Human Phenotype Ontology):
```
[Term]
id: HP:0001250
name: Seizures
is_a: HP:0000707
```

**Note**: Current version includes example HPO terms. For full ontology, download from:
https://hpo.jax.org/app/download/ontology

---

### 3. Variant Patterns Training (`train-variant-patterns.ts`)

Trains embeddings for genomic variants based on type, function, and frequency.

**Usage**:
```bash
npx ts-node train-variant-patterns.ts <output-file> [variant-file] [dimensions]
```

**Example**:
```bash
# Train variant pattern model
npx ts-node train-variant-patterns.ts variant-patterns.json clinvar.vcf 384

# Custom configuration
npx ts-node train-variant-patterns.ts variant-custom.json my-variants.vcf 512
```

**Features**:
- Variant type embeddings (missense, frameshift, etc.)
- Functional impact scoring
- Population frequency weighting
- Clinical significance encoding

**Input Format**:
VCF format or custom variant list.

---

## Data Sources

### Recommended Training Data

#### K-mer Models
- **1000 Genomes Project**: https://www.internationalgenome.org/
- **RefSeq**: https://www.ncbi.nlm.nih.gov/refseq/
- **Ensembl**: https://www.ensembl.org/

#### HPO Embeddings
- **HPO Downloads**: https://hpo.jax.org/app/download/ontology
- **HPO Annotations**: https://hpo.jax.org/app/download/annotation

#### Variant Patterns
- **ClinVar**: https://www.ncbi.nlm.nih.gov/clinvar/
- **gnomAD**: https://gnomad.broadinstitute.org/
- **COSMIC**: https://cancer.sanger.ac.uk/cosmic

---

## Training Pipeline

### Full Model Training Workflow

```bash
#!/bin/bash

# 1. Download training data
wget http://ftp.1000genomes.ebi.ac.uk/vol1/ftp/data_collections/1000_genomes_project/data.fasta
wget http://purl.obolibrary.org/obo/hp.obo
wget https://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh38/clinvar.vcf.gz

# 2. Preprocess data
gunzip clinvar.vcf.gz

# 3. Train k-mer models
npx ts-node train-kmer-model.ts data.fasta kmer-3-384d.json 3 384
npx ts-node train-kmer-model.ts data.fasta kmer-5-384d.json 5 384
npx ts-node train-kmer-model.ts data.fasta kmer-7-512d.json 7 512

# 4. Train HPO embeddings
npx ts-node train-hpo-embeddings.ts phenotype-hpo.json hp.obo 384

# 5. Train variant patterns
npx ts-node train-variant-patterns.ts variant-patterns.json clinvar.vcf 384

# 6. Move models to package
mv *.json ../../models/

# 7. Verify checksums
cd ../../models
sha256sum *.json
```

---

## Performance Tuning

### K-mer Models

**For small datasets (<1000 sequences)**:
- `windowSize`: 3-5
- `minCount`: 2-5
- `epochs`: 5-10
- `learningRate`: 0.025

**For large datasets (>10,000 sequences)**:
- `windowSize`: 5-10
- `minCount`: 10-50
- `epochs`: 10-20
- `learningRate`: 0.01-0.025

**Memory optimization**:
- Reduce `dimensions` (256 instead of 384)
- Increase `minCount` to reduce vocabulary
- Process in batches for very large datasets

### HPO Embeddings

**Refinement epochs**:
- Small ontology subset: 5-10 epochs
- Full ontology: 10-20 epochs

**Dimension selection**:
- Basic similarity: 128-256 dimensions
- Disease prediction: 256-384 dimensions
- Multi-task learning: 384-512 dimensions

---

## Validation

### Model Quality Checks

```typescript
import { PreTrainedModels } from '@ruvector/genomic-vector-analysis';

// Load model
const model = await PreTrainedModels.load('kmer-5-384d');

// Check dimensions
console.log('Dimensions:', model.getDimensions());

// Validate embeddings
const keys = model.getAvailableKeys();
console.log('Total embeddings:', keys.length);

// Check normalization
const embedding = model.lookup(keys[0]);
const magnitude = Math.sqrt(
  embedding.reduce((sum, v) => sum + v * v, 0)
);
console.log('Normalized:', Math.abs(magnitude - 1.0) < 0.01);
```

### Similarity Testing

```typescript
// Test k-mer similarity
const model = await PreTrainedModels.load('kmer-5-384d');

const seq1 = model.embed('ATCGATCGATCG');
const seq2 = model.embed('ATCGATCGATTG'); // 1 base different
const seq3 = model.embed('GGGAAATTTCCC'); // completely different

const sim12 = cosineSimilarity(seq1, seq2);
const sim13 = cosineSimilarity(seq1, seq3);

console.log('Similar sequences:', sim12); // Should be high (>0.9)
console.log('Different sequences:', sim13); // Should be low (<0.5)
```

---

## Troubleshooting

### Out of Memory

**Problem**: Training crashes with heap out of memory

**Solutions**:
1. Reduce embedding dimensions
2. Increase `minCount` to filter rare k-mers
3. Process in batches
4. Run with increased memory: `node --max-old-space-size=8192`

### Slow Training

**Problem**: Training takes too long

**Solutions**:
1. Reduce number of epochs
2. Reduce negative samples
3. Sample subset of training data
4. Use smaller k-mer size

### Poor Quality Embeddings

**Problem**: Low similarity for related items

**Solutions**:
1. Increase training epochs
2. Increase embedding dimensions
3. Adjust learning rate
4. Use more training data
5. Increase context window size

---

## Custom Model Registration

After training a custom model, register it in the codebase:

```typescript
// In src/models/PreTrainedModels.ts

PreTrainedModels.register({
  name: 'kmer-7-512d',
  fileName: 'kmer-7-512d.json',
  description: '7-mer model with 512 dimensions',
  dimensions: 512,
  version: '1.0.0',
  category: 'kmer'
});
```

---

## Contributing

To contribute new models or training scripts:

1. **Add training script** in this directory
2. **Document usage** in this README
3. **Include validation** code
4. **Provide example data** or download instructions
5. **Submit pull request** with model and documentation

---

## References

### Papers
- Mikolov et al. (2013) - "Efficient Estimation of Word Representations in Vector Space"
- Asgari & Mofrad (2015) - "Continuous Distributed Representation of Biological Sequences"
- Köhler et al. (2021) - "The Human Phenotype Ontology in 2021"

### Tools
- **Word2Vec**: https://code.google.com/archive/p/word2vec/
- **BioVec**: https://github.com/kyu999/biovec
- **HPO Tools**: https://github.com/obophenotype/human-phenotype-ontology

### Datasets
- **1000 Genomes**: https://www.internationalgenome.org/
- **ClinVar**: https://www.ncbi.nlm.nih.gov/clinvar/
- **gnomAD**: https://gnomad.broadinstitute.org/
- **HPO**: https://hpo.jax.org/

---

## License

MIT License - see LICENSE file for details
