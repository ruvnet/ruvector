# GitHub Actions Workflows Overview

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CI/CD Pipeline                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   Test   │  │  Build   │  │ Quality  │  │   Docs   │  │
│  │          │  │          │  │          │  │          │  │
│  │ • Unit   │  │ • TS     │  │ • Lint   │  │ • API    │  │
│  │ • Int.   │  │ • WASM   │  │ • Format │  │ • Guide  │  │
│  │ • Perf   │  │ • Bundle │  │ • Sec    │  │ • Deploy │  │
│  │ • Cov    │  │ • Type   │  │ • CodeQL │  │          │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│       │             │              │              │        │
│       └─────────────┴──────────────┴──────────────┘        │
│                           │                                │
│                     Quality Gates                          │
│                           │                                │
│                    ┌──────▼──────┐                        │
│                    │   Publish   │                        │
│                    │             │                        │
│                    │ • NPM       │                        │
│                    │ • GitHub    │                        │
│                    │ • Docker    │                        │
│                    └─────────────┘                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Workflow Matrix

| Workflow | Runs On | Node Versions | Duration | Artifacts |
|----------|---------|---------------|----------|-----------|
| Test | Push/PR/Daily | 18.x, 20.x, 22.x | 5-10 min | Test results, coverage |
| Build | Push/PR | 18.x, 20.x, 22.x | 3-5 min | Build outputs, WASM |
| Quality | Push/PR/Weekly | 20.x | 5-8 min | Audit reports, SARIF |
| Docs | Push/PR | 20.x | 2-3 min | API docs, site |
| Publish | Tags | 20.x | 5-10 min | NPM package, release |

## Workflow Dependencies

```
test.yml
  ├─ unit-tests (parallel)
  ├─ integration-tests (parallel)
  ├─ performance-tests (parallel)
  ├─ coverage (parallel)
  ├─ validation-tests (parallel)
  ├─ rust-benchmarks (parallel)
  └─ test-report (depends on all above)

build.yml
  ├─ typescript-build (parallel)
  ├─ rust-wasm-build (parallel)
  ├─ bundle-analysis (depends on typescript-build)
  ├─ typecheck (parallel)
  └─ build-success (depends on all above)

quality.yml (all parallel)
  ├─ eslint
  ├─ prettier
  ├─ typescript-strict
  ├─ security-audit
  ├─ snyk-security
  ├─ codeql
  ├─ dependency-review (PR only)
  ├─ code-complexity
  ├─ license-check
  └─ quality-summary (depends on key jobs)

docs.yml
  ├─ validate-docs (parallel)
  ├─ generate-api-docs (depends on validate-docs)
  ├─ build-docs-site (depends on generate-api-docs)
  ├─ deploy-docs (main only, depends on build-docs-site)
  └─ docs-coverage (parallel)

publish.yml
  ├─ quality-gates (parallel)
  ├─ security-scan (parallel)
  ├─ publish-npm (depends on quality-gates, security-scan)
  ├─ create-github-release (depends on publish-npm)
  ├─ build-docker (depends on publish-npm, optional)
  └─ notify-release (depends on create-github-release)
```

## Performance Optimizations

### Caching Strategy
- **npm cache:** Speeds up dependency installation by 3-5x
- **Cargo cache:** Reduces Rust build time
- **GitHub Actions cache:** Stores build artifacts

### Parallel Execution
- Test suites run in parallel (unit, integration, performance)
- Build jobs execute concurrently
- Quality checks run independently

### Resource Limits
- Max workers for tests: 2 (CI mode)
- Timeout for integration tests: 15 minutes
- Timeout for performance tests: 30 minutes

## Security Features

### Multi-Layer Security Scanning

1. **npm audit** (Built-in)
   - Moderate severity threshold
   - Runs on push/PR and weekly

2. **Snyk** (Third-party)
   - High severity threshold
   - Advanced vulnerability detection
   - SARIF upload to GitHub Security

3. **CodeQL** (GitHub)
   - JavaScript/TypeScript analysis
   - Security and quality queries
   - Integration with GitHub Security tab

4. **Dependency Review** (PR-based)
   - License compliance
   - Security vulnerability detection
   - Blocks GPL-2.0, GPL-3.0

### Provenance Attestation

NPM publish includes provenance:
- Links package to source commit
- Verifies build environment
- Enhances supply chain security

## Badge Integration

Add these badges to your README:

```markdown
[![Test](https://github.com/ruvnet/ruvector/actions/workflows/test.yml/badge.svg)](https://github.com/ruvnet/ruvector/actions/workflows/test.yml)
[![Build](https://github.com/ruvnet/ruvector/actions/workflows/build.yml/badge.svg)](https://github.com/ruvnet/ruvector/actions/workflows/build.yml)
[![Quality](https://github.com/ruvnet/ruvector/actions/workflows/quality.yml/badge.svg)](https://github.com/ruvnet/ruvector/actions/workflows/quality.yml)
[![codecov](https://codecov.io/gh/ruvnet/ruvector/branch/main/graph/badge.svg)](https://codecov.io/gh/ruvnet/ruvector)
[![npm version](https://badge.fury.io/js/%40ruvector%2Fgenomic-vector-analysis.svg)](https://badge.fury.io/js/%40ruvector%2Fgenomic-vector-analysis)
```

## Cost Optimization

### GitHub Actions Minutes

Estimated monthly usage (assuming 50 PRs/month):
- Test workflow: ~500 minutes
- Build workflow: ~250 minutes
- Quality workflow: ~400 minutes
- Docs workflow: ~150 minutes
- Publish workflow: ~50 minutes

**Total:** ~1,350 minutes/month

**GitHub Free Tier:** 2,000 minutes/month (sufficient)

### Optimization Tips
- Use workflow conditions to skip unnecessary runs
- Cache dependencies aggressively
- Run expensive tests only on main branch
- Use matrix strategy efficiently

## Maintenance Schedule

### Daily
- Automated test runs (2 AM UTC)
- Review test failures

### Weekly
- Security scans (Monday 9 AM UTC)
- Dependabot PRs review
- Performance trend analysis

### Monthly
- Review workflow efficiency
- Update dependencies
- Check for workflow optimizations

### Quarterly
- Review and update quality thresholds
- Evaluate new GitHub Actions features
- Security posture review

---

**Last Updated:** 2025-11-23
