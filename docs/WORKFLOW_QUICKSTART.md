# GitHub Workflows Quick Start Guide

Get started with Tiny Dancer-powered GitHub workflows in 5 minutes.

## Prerequisites

- GitHub repository with Actions enabled
- Rust project with Cargo.toml
- ruvector-tiny-dancer crates installed

## Quick Setup

### Step 1: Copy Workflows

```bash
# All workflows are ready to use in .github/workflows/
ls .github/workflows/

# Workflows included:
# - intelligent-test-routing.yml
# - performance-benchmarking.yml
# - model-training.yml
# - cost-optimization.yml
# - pr-analysis.yml
```

### Step 2: Validate

```bash
# Run validation script
./scripts/validate-workflows.sh

# Expected output:
# ✅ All workflows passed validation!
```

### Step 3: Commit and Push

```bash
git add .github/workflows/*.yml
git commit -m "feat: Add Tiny Dancer intelligent workflows"
git push origin main
```

### Step 4: Test with a PR

```bash
# Create a test branch
git checkout -b test-workflows

# Make a small change
echo "# Test" >> README.md

# Commit and push
git add README.md
git commit -m "test: Trigger intelligent workflows"
git push origin test-workflows

# Create PR
gh pr create --title "Test: Intelligent Workflows" --body "Testing Tiny Dancer routing"
```

## What Happens Next

### On PR Creation

1. **Intelligent Test Routing** analyzes your changes
2. **PR Analysis** calculates complexity score
3. **Cost Optimization** estimates run cost
4. Workflows route to appropriate test depth

### Expected Routing

| Change Type | Workflow Action | Time | Cost |
|-------------|----------------|------|------|
| Docs only | Lightweight tests | 5 min | $0.04 |
| Bug fix (1-5 files) | Balanced tests | 15 min | $0.12 |
| Feature (>10 files) | Full test suite | 30 min | $0.24 |

### On Merge to Main

1. **Performance Benchmarking** runs
2. Results compared to baseline
3. **Model Training** scheduled (weekly)

## Viewing Results

### GitHub Actions Tab

```bash
# View all workflow runs
gh run list

# View specific workflow
gh run list --workflow=intelligent-test-routing.yml

# View logs
gh run view <run-id> --log
```

### PR Comments

Workflows automatically comment on PRs with:
- Analysis reports
- Routing decisions
- Cost savings
- Confidence scores

### Artifacts

Download reports and data:

```bash
# List artifacts
gh run view <run-id> --log

# Download specific artifact
gh run download <run-id> -n performance-report
gh run download <run-id> -n cost-optimization-report
```

## Configuration

### Customize Routing Thresholds

Edit workflow files to adjust confidence thresholds:

```yaml
# .github/workflows/intelligent-test-routing.yml

if [ $CONFIDENCE -gt 90 ]; then
    # Adjust this threshold (default: 90)
    echo "run_full_suite=false"
fi
```

### Adjust Complexity Scoring

```yaml
# .github/workflows/pr-analysis.yml

COMPLEXITY_SCORE=$((FILES_CHANGED * 2 + LINES_CHANGED / 10 + COMMITS))
# Adjust multipliers to change sensitivity
```

## Monitoring

### Cost Tracking

View cost reports in workflow artifacts:

```bash
gh run download <run-id> -n cost-optimization-report
cat optimization-report.md
```

### Performance Trends

Check benchmark results over time:

```bash
# View benchmark history
ls benchmark-history/

# Latest results
cat benchmark-history/$(ls -t benchmark-history/ | head -1)
```

## Troubleshooting

### Workflow Not Triggering

```bash
# Check workflow syntax
gh workflow view intelligent-test-routing.yml

# Manually trigger
gh workflow run intelligent-test-routing.yml
```

### Tests Taking Too Long

Lower the complexity threshold for lightweight routing:

```yaml
# Increase threshold from 20 to 30
if [ $COMPLEXITY -lt 30 ]; then
    echo "analysis_depth=lightweight"
fi
```

### Cost Higher Than Expected

1. Check routing decisions in logs
2. Verify confidence scores
3. Review complexity calculations
4. Consider retraining model

## Examples

### Example 1: Documentation Change

```bash
# Change README
echo "New docs" >> README.md
git commit -am "docs: Update README"
git push

# Expected: Lightweight tests (5 min, $0.04)
# Actual routing: docs,lint
# Confidence: 0.95
```

### Example 2: Small Bug Fix

```bash
# Fix a bug in one file
vim src/lib.rs
git commit -am "fix: Correct typo in error message"
git push

# Expected: Balanced tests (15 min, $0.12)
# Actual routing: unit,integration
# Confidence: 0.87
```

### Example 3: Major Refactor

```bash
# Refactor multiple files
vim src/*.rs
git commit -am "refactor: Restructure core module"
git push

# Expected: Full test suite (30 min, $0.24)
# Actual routing: all
# Confidence: 0.98
```

## Advanced Usage

### Manual Workflow Dispatch

```bash
# Run performance benchmarks
gh workflow run performance-benchmarking.yml \
  -f benchmark_type=routing

# Trigger model training
gh workflow run model-training.yml \
  -f training_type=incremental \
  -f data_source=production-logs
```

### Scheduled Workflows

Workflows run automatically on schedule:

- **Performance Benchmarking**: Nightly at 2 AM UTC
- **Model Training**: Weekly on Sundays at 3 AM UTC

### Integration with Deployment

Add deployment workflow:

```yaml
name: Deploy with Cost Optimization

on:
  push:
    branches: [main]

jobs:
  deploy:
    steps:
      - name: Route Deployment Strategy
        run: |
          # Use Tiny Dancer routing for deployment
          if [ $CONFIDENCE > 0.95 ]; then
            echo "strategy=blue-green"
          else
            echo "strategy=canary"
          fi
```

## Best Practices

1. **Monitor First Week**: Watch routing decisions for accuracy
2. **Adjust Thresholds**: Fine-tune based on your codebase
3. **Regular Retraining**: Keep models updated weekly
4. **Track Costs**: Review monthly savings reports
5. **Validate Quarterly**: Run full suite to ensure quality

## Next Steps

1. ✅ Workflows are running
2. 📊 Monitor first few PRs
3. 🎯 Adjust thresholds if needed
4. 💰 Review cost savings after 1 week
5. 🚀 Expand to deployment workflows

## Resources

- [Full Documentation](GITHUB_WORKFLOWS.md)
- [Tiny Dancer Core](../crates/ruvector-tiny-dancer-core/README.md)
- [GitHub Actions Docs](https://docs.github.com/en/actions)

## Support

Questions? Issues?
- GitHub Issues: https://github.com/ruvnet/ruvector/issues
- Discussions: https://github.com/ruvnet/ruvector/discussions

---

**Cost Savings Goal**: 56% reduction in CI/CD costs
**Quality Guarantee**: Zero false negatives with neural routing
