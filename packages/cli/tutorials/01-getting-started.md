# Getting Started with Genomic Vector Analysis CLI

**Duration:** ~5 minutes
**Difficulty:** Beginner
**Prerequisites:** Node.js 18+, basic command-line knowledge

## Overview

Learn the basics of using the `gva` CLI to analyze genomic data with vector embeddings and similarity search.

## Installation

```bash
# Install from npm (when published)
npm install -g @ruvector/gva-cli

# Or use directly with npx
npx @ruvector/gva-cli --help

# Or link locally during development
cd packages/cli
npm link
```

## Step 1: Initialize Your First Database (30 seconds)

Create a new vector database for genomic analysis:

```bash
gva init --database my-genomics-db --dimensions 384
```

**Output:**
```
✓ Database initialized successfully!

Database Configuration:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Name:       my-genomics-db
  Dimensions: 384
  Metric:     cosine
  Index:      hnsw
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Key Concepts:**
- **Dimensions:** Vector size (384 is optimal for k-mer embeddings)
- **Metric:** Distance calculation method (cosine, euclidean, hamming)
- **Index:** HNSW provides fast approximate nearest neighbor search

## Step 2: Embed Genomic Sequences (1 minute)

Create sample data and generate embeddings:

```bash
# Create a sample FASTA file
cat > sample.fasta << EOF
>seq1
ATCGATCGATCGATCGATCGATCG
>seq2
GCTAGCTAGCTAGCTAGCTAGCTA
>seq3
TTAATTAATTAATTAATTAATTAA
EOF

# Generate embeddings
gva embed sample.fasta --model kmer --kmer-size 6
```

**Output:**
```
✓ Successfully embedded 3 sequences

Embedding Statistics:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Total sequences:   3
  Model:             kmer
  Dimensions:        384
  Avg. time/seq:     2.34ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**What's Happening:**
- K-mer model breaks sequences into overlapping k-mers (size 6)
- Each sequence becomes a 384-dimensional vector
- Vectors capture sequence patterns and similarities

## Step 3: Search for Similar Patterns (1 minute)

Search for sequences similar to a query:

```bash
gva search "ATCGATCG" --k 5 --format table
```

**Output:**
```
✓ Found 3 results in 12ms

Top 3 Results:
┌──────┬──────────────┬────────┬──────────┐
│ Rank │ ID           │ Score  │ Metadata │
├──────┼──────────────┼────────┼──────────┤
│ 1    │ seq1         │ 0.9876 │ {...}    │
│ 2    │ seq2         │ 0.7234 │ {...}    │
│ 3    │ seq3         │ 0.6123 │ {...}    │
└──────┴──────────────┴────────┴──────────┘

Search completed in 12ms
```

**Understanding Results:**
- **Score:** Cosine similarity (0-1, higher = more similar)
- **Rank:** Results ordered by similarity
- **Metadata:** Additional sequence information

## Step 4: View Database Statistics (30 seconds)

Check your database stats:

```bash
gva stats
```

**Output:**
```
📊 Database Statistics
═══════════════════════════════════════════════════

Database Information:
┌──────────────┬──────────────────┐
│ Name         │ my-genomics-db   │
│ Created      │ 2025-11-23       │
│ Total Vectors│ 3                │
│ Dimensions   │ 384              │
└──────────────┴──────────────────┘

Performance Metrics:
┌──────────────┬──────────────────┐
│ Throughput   │ 11,847 vectors/s │
│ Memory Usage │ 456 MB           │
└──────────────┴──────────────────┘
```

## Step 5: Try Interactive Mode (2 minutes)

Launch the interactive REPL:

```bash
gva interactive
```

**In Interactive Mode:**
```
╔══════════════════════════════════════════════════════════════╗
║     🧬 Genomic Vector Analysis - Interactive Mode 🧬       ║
╚══════════════════════════════════════════════════════════════╝

gva> help
Available Commands:
  search <query>         Search for genomic patterns
  embed <sequence>       Generate embeddings for a sequence
  stats                  Show database statistics
  export                 Export data in various formats
  history                Show command history
  exit                   Exit interactive mode

gva> search "ATCG"
Searching for: ATCG
[Results displayed...]

gva> stats
Database Statistics:
─────────────────────────────────
  Vectors: 3
  Dimensions: 384
─────────────────────────────────

gva> exit
Goodbye! 👋
```

**Interactive Features:**
- **Tab Completion:** Press Tab to autocomplete commands
- **History Navigation:** Use ↑/↓ arrows to browse command history
- **No Flags Needed:** Simplified syntax for quick exploration

## Quick Reference

### Essential Commands

```bash
# Initialize
gva init --database <name> --dimensions 384

# Embed sequences
gva embed <file> --model kmer

# Search
gva search <query> --k 10

# View stats
gva stats

# Export data
gva export --format json --output results.json

# Interactive mode
gva interactive

# Get help
gva <command> --help
```

### Common Options

- `--format <type>`: Output format (json, table, csv, html)
- `--model <type>`: Embedding model (kmer, dna-bert)
- `--k <number>`: Number of search results
- `--dimensions <number>`: Vector dimensions

## Next Steps

Congratulations! You've learned the basics of the GVA CLI. Continue with:

1. **[Variant Analysis Workflow](./02-variant-analysis.md)** - Analyze real genomic variants (15 min)
2. **[Pattern Learning](./03-pattern-learning.md)** - Train ML models on clinical data (30 min)
3. **[Advanced Optimization](./04-advanced-optimization.md)** - Performance tuning and scaling (45 min)

## Troubleshooting

### Command not found
```bash
# Ensure package is installed globally
npm install -g @ruvector/gva-cli

# Or use npx
npx @ruvector/gva-cli <command>
```

### Out of memory
```bash
# Reduce batch size
gva embed file.fasta --batch-size 16

# Use quantization
gva init --quantization scalar
```

### Slow searches
```bash
# Check database stats
gva stats

# Rebuild with HNSW index
gva init --index hnsw
```

## Resources

- [Full Documentation](../README.md)
- [API Reference](../../genomic-vector-analysis/docs/API.md)
- [GitHub Repository](https://github.com/ruvnet/ruvector)
- [Report Issues](https://github.com/ruvnet/ruvector/issues)

---

**Estimated Time Spent:** 5 minutes
**What You Learned:**
- ✓ Initialize a vector database
- ✓ Generate embeddings from sequences
- ✓ Search for similar patterns
- ✓ View database statistics
- ✓ Use interactive mode

Ready for more? Try the [Variant Analysis Workflow Tutorial](./02-variant-analysis.md)!
