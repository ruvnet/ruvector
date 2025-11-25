# Docker Integration for Genomic Vector Analysis

Complete bioinformatics environment with integrated tools for variant annotation and analysis.

## Quick Start

### 1. Copy and configure environment variables

```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 2. Build and start containers

```bash
# Build the Docker image
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f genomic-analysis
```

### 3. Access the environment

```bash
# Interactive shell
docker-compose exec genomic-analysis bash

# Run Jupyter notebook
docker-compose up jupyter
# Access at http://localhost:8888
```

## Included Tools

### Bioinformatics Tools
- **samtools** (v1.18) - SAM/BAM/CRAM manipulation
- **bcftools** (v1.18) - VCF/BCF manipulation
- **GATK** (v4.4.0.0) - Variant calling and analysis
- **VEP** (v110) - Ensembl Variant Effect Predictor
- **ANNOVAR** (placeholder) - Functional annotation
- **bedtools** - Genome arithmetic

### Databases (Pre-loaded)
- **ClinVar** - Clinical variant database
- **gnomAD** (chr22) - Population frequencies
- **HPO** - Human Phenotype Ontology
- **Reference Genome** (chr22) - GRCh38

### Development Tools
- **Node.js/TypeScript** - Runtime and type system
- **Python 3** - Analysis and scripting
- **Jupyter Notebook** - Interactive analysis

## Directory Structure

```
docker/
├── Dockerfile              # Main container definition
├── docker-compose.yml      # Multi-container orchestration
├── .env.example           # Environment configuration template
├── data/
│   ├── input/            # Place your VCF/BAM files here
│   ├── output/           # Analysis results
│   ├── cache/            # Temporary files
│   └── databases/        # Reference databases (auto-populated)
└── notebooks/            # Jupyter notebooks
```

## Usage Examples

### Example 1: Annotate VCF with all tools

```bash
# Enter container
docker-compose exec genomic-analysis bash

# Run annotation pipeline
cd /app
npx ts-node examples/pipelines/variant-annotation.ts \
  --vcf /data/input/patient.vcf \
  --output /data/output/annotated
```

### Example 2: Generate clinical report

```bash
# In container
npx ts-node examples/pipelines/clinical-reporting.ts \
  --vcf /data/input/patient.vcf \
  --phenotypes "HP:0001250,HP:0001263" \
  --output /data/output/report.html
```

### Example 3: Phenotype matching

```bash
# In container
npx ts-node examples/pipelines/phenotype-matching.ts \
  --patient-hpo "HP:0001250,HP:0001263,HP:0001252" \
  --vcf /data/input/patient.vcf \
  --output /data/output/diagnosis.json
```

### Example 4: Pharmacogenomics analysis

```bash
# In container
npx ts-node examples/pipelines/pharmacogenomics.ts \
  --vcf /data/input/patient.vcf \
  --drugs "clopidogrel,warfarin,simvastatin" \
  --output /data/output/pgx-report.html
```

## Custom Analysis with Jupyter

1. Start Jupyter service:
```bash
docker-compose up jupyter
```

2. Access notebook at `http://localhost:8888`

3. Create new notebook and import:
```python
import sys
sys.path.append('/app')

from integrations.vcf_parser import VCFParser
from integrations.clinvar_importer import ClinVarImporter
from src.index import GenomicVectorDB

# Your analysis code here
```

## Data Management

### Adding custom VCF files

```bash
# Copy to input directory
cp my-variants.vcf docker/data/input/

# Or mount directly in docker-compose.yml
volumes:
  - /path/to/my/data:/data/input
```

### Downloading full databases

```bash
# Enter container
docker-compose exec genomic-analysis bash

# Download full gnomAD (warning: ~1TB)
cd /data/databases
wget https://storage.googleapis.com/gcp-public-data--gnomad/release/4.0/vcf/genomes/gnomad.genomes.v4.0.sites.vcf.bgz

# Download full VEP cache (~20GB)
cd /opt/vep-cache
wget https://ftp.ensembl.org/pub/current_variation/indexed_vep_cache/homo_sapiens_vep_110_GRCh38.tar.gz
tar -xzf homo_sapiens_vep_110_GRCh38.tar.gz
```

### ANNOVAR Setup

ANNOVAR requires registration. After downloading:

```bash
# Copy ANNOVAR to container
docker cp annovar.tar.gz genomic-analysis:/opt/
docker-compose exec genomic-analysis bash
cd /opt
tar -xzf annovar.tar.gz
rm annovar.tar.gz

# Download databases
perl /opt/annovar/annotate_variation.pl -buildver hg38 -downdb -webfrom annovar refGene humandb/
perl /opt/annovar/annotate_variation.pl -buildver hg38 -downdb -webfrom annovar gnomad312_genome humandb/
```

## Performance Tuning

### Increase memory for large datasets

Edit `docker-compose.yml`:
```yaml
services:
  genomic-analysis:
    environment:
      - NODE_OPTIONS=--max-old-space-size=8192  # 8GB
    deploy:
      resources:
        limits:
          memory: 16G
```

### Enable parallel processing

```bash
# Set worker count
export WORKERS=8

# Use parallel processing in pipelines
npx ts-node examples/pipelines/variant-annotation.ts \
  --vcf /data/input/patient.vcf \
  --workers 8
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs genomic-analysis

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Out of memory errors

```bash
# Increase Docker memory limit
# Docker Desktop -> Settings -> Resources -> Memory

# Or use smaller batch sizes
export BATCH_SIZE=100
```

### Tool not found

```bash
# Verify tool installation
docker-compose exec genomic-analysis which samtools
docker-compose exec genomic-analysis vep --help

# Reinstall if needed
docker-compose exec genomic-analysis bash
apt-get update && apt-get install -y samtools
```

## Integration Testing

Run integration tests:

```bash
# In container
cd /app
npm test -- --grep "integration"

# Or run specific pipeline tests
npx ts-node tests/integration/vcf-annotation.test.ts
```

## Production Deployment

### Use Docker Swarm or Kubernetes

```bash
# Docker Swarm
docker stack deploy -c docker-compose.yml genomics

# Kubernetes
kubectl apply -f k8s/genomics-deployment.yaml
```

### Enable HTTPS

Add nginx reverse proxy in `docker-compose.yml`:
```yaml
nginx:
  image: nginx:alpine
  ports:
    - "443:443"
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf
    - ./ssl:/etc/nginx/ssl
```

## Support

For issues with:
- **Docker setup**: Check [Docker documentation](https://docs.docker.com/)
- **Bioinformatics tools**: Check respective tool documentation
- **ruvector integration**: Open issue at [ruvector GitHub](https://github.com/ruvnet/ruvector)

## License

See main package LICENSE file.
