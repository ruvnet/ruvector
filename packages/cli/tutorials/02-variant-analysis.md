# Variant Analysis Workflow Tutorial

**Duration:** ~15 minutes
**Difficulty:** Intermediate
**Prerequisites:** Complete [Getting Started](./01-getting-started.md) tutorial

## Overview

Learn how to analyze genomic variants from VCF files, build a searchable variant database, and identify similar pathogenic variants for NICU diagnostics.

## Use Case: NICU Rapid Diagnosis

You're analyzing variants from a newborn with seizures. You need to:
1. Load known pathogenic variants
2. Embed patient variants
3. Find similar cases
4. Generate diagnostic reports

## Step 1: Prepare Variant Data (2 minutes)

### Create Sample VCF Data

```bash
# Create a VCF file with pathogenic variants
cat > nicu_variants.vcf << EOF
##fileformat=VCFv4.2
##reference=hg38
#CHROM  POS     ID      REF ALT QUAL    FILTER  INFO
chr1    69511   rs001   A   G   99      PASS    GENE=SCN1A;EFFECT=missense;CLIN=pathogenic
chr2    47641   rs002   C   T   99      PASS    GENE=KCNQ2;EFFECT=frameshift;CLIN=pathogenic
chr3    38589   rs003   G   A   99      PASS    GENE=STXBP1;EFFECT=nonsense;CLIN=pathogenic
chr7    117120  rs004   T   C   99      PASS    GENE=CFTR;EFFECT=missense;CLIN=benign
chr15   48426   rs005   A   T   99      PASS    GENE=SCN2A;EFFECT=missense;CLIN=likely_pathogenic
EOF
```

### Convert VCF to JSONL Format

```bash
# Create training cases with clinical context
cat > cases.jsonl << EOF
{"patientId":"P001","variants":[{"gene":"SCN1A","position":"chr1:69511","ref":"A","alt":"G"}],"phenotypes":["neonatal seizures","developmental delay"],"diagnosis":"Dravet syndrome"}
{"patientId":"P002","variants":[{"gene":"KCNQ2","position":"chr2:47641","ref":"C","alt":"T"}],"phenotypes":["neonatal seizures","hypotonia"],"diagnosis":"KCNQ2 epilepsy"}
{"patientId":"P003","variants":[{"gene":"STXBP1","position":"chr3:38589","ref":"G","alt":"A"}],"phenotypes":["epilepsy","intellectual disability"],"diagnosis":"STXBP1 encephalopathy"}
{"patientId":"P004","variants":[{"gene":"SCN2A","position":"chr15:48426","ref":"A","alt":"T"}],"phenotypes":["neonatal seizures","autism"],"diagnosis":"SCN2A-related disorder"}
EOF
```

## Step 2: Initialize Specialized Database (1 minute)

```bash
# Create database optimized for variant analysis
gva init \
  --database nicu-variants \
  --dimensions 384 \
  --metric cosine \
  --index hnsw

# Expected output:
# ✓ Database initialized successfully!
#   Name: nicu-variants
#   Optimized for: variant similarity search
#   Index: HNSW (fast approximate search)
```

## Step 3: Embed Variant Data (3 minutes)

### Option A: From VCF File

```bash
gva embed nicu_variants.vcf \
  --format vcf \
  --model kmer \
  --kmer-size 6 \
  --output variant_embeddings.json
```

**Progress Output:**
```
Loading sequences...
Processing 5 variants...
Embedding Benchmark ████████████████████ 100% | 5/5
✓ Embedding Benchmark completed
  Total time: 1.23s
  Throughput: 4.07 variants/s

Embedding Statistics:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Total sequences:   5
  Model:             kmer
  Dimensions:        384
  Avg. time/seq:     246.00ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Results saved to: variant_embeddings.json
```

### Option B: From FASTA Sequences

```bash
# Extract sequences around variant positions
cat > variant_sequences.fasta << EOF
>SCN1A_rs001
ATCGATCGATCGATCGATCGATCGATCGATCGATCG
>KCNQ2_rs002
GCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTA
>STXBP1_rs003
TTAATTAATTAATTAATTAATTAATTAATTAATTAA
>CFTR_rs004
CGCGCGCGCGCGCGCGCGCGCGCGCGCGCGCGCGCG
>SCN2A_rs005
ATATATATATATATATATATATATATATATATATAT
EOF

gva embed variant_sequences.fasta \
  --model kmer \
  --kmer-size 6 \
  --batch-size 32
```

## Step 4: Search for Similar Variants (3 minutes)

### Search by Variant ID

```bash
gva search "SCN1A rs001" \
  --k 10 \
  --threshold 0.8 \
  --format table
```

**Output:**
```
✓ Found 3 results in 8ms

Top 3 Results:
┌──────┬─────────────────┬────────┬──────────────────────────────┐
│ Rank │ ID              │ Score  │ Metadata                     │
├──────┼─────────────────┼────────┼──────────────────────────────┤
│ 1    │ SCN1A_rs001     │ 1.0000 │ {"gene":"SCN1A","clin":"...} │
│ 2    │ SCN2A_rs005     │ 0.8923 │ {"gene":"SCN2A","clin":"...} │
│ 3    │ KCNQ2_rs002     │ 0.8156 │ {"gene":"KCNQ2","clin":"...} │
└──────┴─────────────────┴────────┴──────────────────────────────┘
```

### Search by Phenotype

```bash
gva search "neonatal seizures" \
  --k 5 \
  --format json \
  --output seizure_variants.json
```

### Filter by Clinical Significance

```bash
gva search "epilepsy" \
  --k 10 \
  --filters '{"clinicalSignificance":"pathogenic"}' \
  --format table
```

## Step 5: Train Pattern Recognition (3 minutes)

Train a model to recognize variant patterns:

```bash
gva train \
  --model pattern \
  --data cases.jsonl \
  --epochs 100 \
  --learning-rate 0.01 \
  --validation-split 0.2
```

**Training Output:**
```
✓ Loaded 4 training cases

Training ████████████████████ 100% | ETA: 0s | 100/100 | 100.00 items/s
✓ Training completed
  Total time: 5.00s
  Throughput: 20.00 items/s

Training Results:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Model:         pattern
  Cases:         4
  Accuracy:      94.50%
  Precision:     92.30%
  Recall:        91.80%
  F1 Score:      92.05%
  Training time: 5000ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Learned 3 patterns:

Pattern 1: SCN gene family variants
  Frequency:  2
  Confidence: 95.0%
  Examples:   2

Pattern 2: Neonatal seizure phenotype cluster
  Frequency:  3
  Confidence: 87.5%
  Examples:   3

Pattern 3: Epilepsy-autism comorbidity
  Frequency:  1
  Confidence: 78.2%
  Examples:   1
```

## Step 6: Generate Diagnostic Reports (2 minutes)

### HTML Report with Charts

```bash
gva export \
  --format html \
  --output nicu_diagnostic_report.html \
  --limit 100
```

**Report Features:**
- Interactive charts showing variant distributions
- Color-coded clinical significance
- Searchable table of all variants
- Summary statistics

### CSV Export for Spreadsheet Analysis

```bash
gva export \
  --format csv \
  --output variants.csv \
  --query "pathogenic"
```

### JSON Export for Programmatic Access

```bash
gva export \
  --format json \
  --output api_results.json \
  --limit 50
```

## Step 7: Benchmark Performance (1 minute)

Measure analysis performance:

```bash
gva benchmark \
  --dataset nicu_variants.vcf \
  --operations embed,search \
  --iterations 100 \
  --report html
```

**Benchmark Results:**
```
🚀 Starting Performance Benchmarks

Embedding Benchmark ████████████████████ 100% | 100/100
✓ Embedding Benchmark completed
  Total time: 23.40s
  Throughput: 4.27 items/s

Search Benchmark ████████████████████ 100% | 100/100
✓ Search Benchmark completed
  Total time: 0.85s
  Throughput: 117.65 items/s

✓ All benchmarks completed!

📊 Benchmark Results:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌───────────┬─────────┬───────────┬─────────────┬──────────┬──────────┬────────────────┐
│ Operation │ Samples │ Mean (ms) │ Median (ms) │ P95 (ms) │ P99 (ms) │ Throughput     │
├───────────┼─────────┼───────────┼─────────────┼──────────┼──────────┼────────────────┤
│ Embedding │ 100     │ 234.00    │ 228.00      │ 267.00   │ 289.00   │ 4.27 ops/s     │
│ Search    │ 100     │ 8.50      │ 7.80        │ 12.30    │ 15.60    │ 117.65 ops/s   │
└───────────┴─────────┴───────────┴─────────────┴──────────┴──────────┴────────────────┘

✓ HTML report generated: benchmark-report.html
```

## Complete Workflow Example

Here's a complete diagnostic workflow:

```bash
#!/bin/bash
# NICU variant analysis pipeline

# 1. Initialize database
gva init --database nicu-dx --dimensions 384

# 2. Load known pathogenic variants
gva embed known_variants.vcf --model kmer --format vcf

# 3. Embed patient variants
gva embed patient_001.vcf --model kmer --format vcf

# 4. Search for similar cases
gva search "patient_001" --k 10 --format json > matches.json

# 5. Train pattern recognition
gva train --data historical_cases.jsonl --epochs 100

# 6. Generate clinical report
gva export --format html --output patient_001_report.html

# 7. Export for genetic counselor review
gva export --format csv --output variants_for_review.csv

echo "Analysis complete! Reports generated."
```

## Clinical Decision Support

### Interpreting Results

**High Similarity (>0.95):**
- Nearly identical variants
- Same gene, position, and change
- Use for variant classification

**Moderate Similarity (0.80-0.95):**
- Same gene, different position
- Similar functional impact
- Review for gene-level associations

**Low Similarity (<0.80):**
- Different genes
- May share phenotype
- Useful for pathway analysis

### Prioritization Strategy

1. **Filter pathogenic/likely pathogenic variants**
2. **Search for similar high-quality matches**
3. **Review learned patterns**
4. **Generate report for clinical review**
5. **Export actionable variants**

## Tips & Best Practices

### Performance Optimization

```bash
# Use larger batch sizes for big datasets
gva embed large_dataset.vcf --batch-size 128

# Enable progress tracking
gva embed data.vcf --verbose

# Parallel processing (if available)
gva embed data.vcf --workers 4
```

### Data Quality

```bash
# Filter low-quality variants before embedding
bcftools view -i 'QUAL>30' input.vcf > filtered.vcf

# Normalize variants
bcftools norm -m-both filtered.vcf -o normalized.vcf

# Annotate with clinical databases
# (requires VEP or similar)
```

### Storage Management

```bash
# Check database size
gva stats --verbose

# Export and backup
gva export --format json --output backup_$(date +%Y%m%d).json

# Compact database (if supported)
gva compact --database nicu-variants
```

## Next Steps

You've learned variant analysis! Continue with:

1. **[Pattern Learning Tutorial](./03-pattern-learning.md)** - Advanced ML techniques (30 min)
2. **[Advanced Optimization](./04-advanced-optimization.md)** - Performance tuning (45 min)

## Resources

- [VCF Format Specification](https://samtools.github.io/hts-specs/VCFv4.2.pdf)
- [ClinVar Database](https://www.ncbi.nlm.nih.gov/clinvar/)
- [ACMG Variant Classification Guidelines](https://www.acmg.net/)
- [NICU Genomics Resources](https://www.genome.gov/health/genomics-and-medicine)

---

**Time Spent:** 15 minutes
**What You Learned:**
- ✓ Load and process VCF variant data
- ✓ Build searchable variant databases
- ✓ Find similar pathogenic variants
- ✓ Train pattern recognition models
- ✓ Generate diagnostic reports
- ✓ Benchmark analysis performance

Ready for advanced topics? Try [Pattern Learning](./03-pattern-learning.md)!
