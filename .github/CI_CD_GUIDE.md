# CI/CD Pipeline Guide

## Overview

This document describes the comprehensive CI/CD pipeline for the `genomic-vector-analysis` package, including workflows, quality gates, security measures, and release automation.

## Table of Contents

- [Workflows](#workflows)
- [Quality Gates](#quality-gates)
- [Security](#security)
- [Release Process](#release-process)
- [Configuration Files](#configuration-files)
- [Secrets Management](#secrets-management)
- [Troubleshooting](#troubleshooting)

## Workflows

### 1. Test Workflow (`test.yml`)

**Trigger:** Push/PR to main/develop, daily schedule

**Jobs:**
- **Unit Tests** - Matrix testing across Node 18.x, 20.x, 22.x
- **Integration Tests** - Full integration test suite
- **Performance Benchmarks** - Performance metrics with p95 latency tracking
- **Coverage Analysis** - Code coverage with 90% threshold
- **Validation Tests** - Data validation testing
- **Rust Benchmarks** - Criterion benchmarks for WASM modules

**Coverage Thresholds:**
- Statements: 90%
- Branches: 85%
- Functions: 90%
- Lines: 90%

**Performance Targets:**
- Query Latency (p95): <1ms
- Throughput: >50,000 variants/sec
- Memory Usage: <100GB for 100M variants

### 2. Build Workflow (`build.yml`)

**Trigger:** Push/PR to main/develop

**Jobs:**
- **TypeScript Build** - Compile TypeScript across Node versions
- **Rust WASM Build** - Compile Rust to WebAssembly
- **Bundle Analysis** - Check bundle size (<512KB threshold)
- **Type Check** - Strict TypeScript validation

**Artifacts:**
- Build outputs (7-day retention)
- WASM binaries
- Bundle size reports

### 3. Publish Workflow (`publish.yml`)

**Trigger:** Git tags (v*.*.*), manual workflow dispatch

**Jobs:**
- **Quality Gates** - Pre-publish validation
- **Security Scan** - npm audit + Snyk scanning
- **Publish to NPM** - With provenance attestation
- **GitHub Release** - Automated release creation
- **Docker Image** - Optional container build

**Version Format:** Semantic versioning (v1.0.0)

**Pre-publish Checks:**
- All tests passing
- Coverage threshold met
- No linting errors
- No TypeScript errors
- Bundle size within limits
- Security vulnerabilities checked

### 4. Documentation Workflow (`docs.yml`)

**Trigger:** Push/PR to main

**Jobs:**
- **Validate Docs** - Check markdown links and code examples
- **Generate API Docs** - TypeDoc API documentation
- **Build Docs Site** - Static documentation site
- **Deploy to GitHub Pages** - Automatic deployment
- **Documentation Coverage** - 70% threshold

**Deployed To:** GitHub Pages

### 5. Quality Workflow (`quality.yml`)

**Trigger:** Push/PR, weekly schedule

**Jobs:**
- **ESLint** - Linting with annotations
- **Prettier** - Code formatting check
- **TypeScript Strict** - Strict mode compilation
- **Security Audit** - npm audit (moderate threshold)
- **Snyk Security** - Advanced vulnerability scanning
- **CodeQL Analysis** - GitHub security scanning
- **Dependency Review** - License and security checks
- **Code Complexity** - Complexity analysis
- **License Check** - Allowed licenses verification

**Allowed Licenses:**
- MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD

## Quality Gates

### Pre-Commit Quality Gates
- TypeScript compilation passes
- ESLint passes (no errors)
- Prettier formatting applied
- All tests pass locally

### PR Quality Gates
- All tests pass (unit, integration, performance)
- Code coverage ≥90%
- No TypeScript errors
- No ESLint errors
- Bundle size <512KB
- Performance benchmarks meet targets
- Security scans pass
- Documentation updated

### Release Quality Gates
- All PR quality gates pass
- Full test suite passes
- Security audit clean
- Changelog updated
- Version bumped correctly

## Security

### Vulnerability Scanning

1. **npm audit** - Built-in npm security audit
   - Threshold: Moderate
   - Runs: Weekly + on PR

2. **Snyk** - Advanced security scanning
   - Threshold: High severity
   - Runs: Weekly + on PR + on release
   - Results uploaded to GitHub Security

3. **CodeQL** - GitHub native security analysis
   - Languages: JavaScript, TypeScript
   - Queries: Security and quality
   - Results: GitHub Security tab

4. **Dependency Review** - PR-based dependency analysis
   - Severity threshold: Moderate
   - License checks: GPL-2.0, GPL-3.0 blocked

### Secret Management

**Required Secrets:**
```
NPM_TOKEN           - NPM registry authentication
SNYK_TOKEN          - Snyk security scanning
GITHUB_TOKEN        - GitHub API access (auto-provided)
```

**Setup:**
```bash
# In GitHub repository settings
Settings → Secrets and variables → Actions → New repository secret
```

### Dependabot

Automated dependency updates configured for:
- NPM packages (weekly, Monday 9 AM UTC)
- Cargo/Rust (weekly, Monday 9 AM UTC)
- GitHub Actions (weekly, Monday 9 AM UTC)

Configuration: `.github/dependabot.yml`

## Release Process

### Automated Release (Recommended)

1. **Create a Git Tag:**
   ```bash
   git tag v1.2.3
   git push origin v1.2.3
   ```

2. **Automated Steps:**
   - Quality gates run automatically
   - Security scans execute
   - NPM package published with provenance
   - GitHub release created with changelog
   - Docker image built (optional)

### Manual Release

1. **Trigger Workflow:**
   - Go to Actions → Publish to NPM
   - Click "Run workflow"
   - Enter version (e.g., 1.2.3)

### Semantic Versioning

Follow [SemVer](https://semver.org/):
- **MAJOR** (v2.0.0): Breaking changes
- **MINOR** (v1.1.0): New features, backward compatible
- **PATCH** (v1.0.1): Bug fixes

### Pre-release Versions

For alpha/beta releases:
```bash
git tag v1.0.0-alpha.1
git tag v1.0.0-beta.1
git tag v1.0.0-rc.1
```

These will be marked as pre-releases in GitHub.

## Configuration Files

### TypeScript Configuration (`tsconfig.json`)
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  // ... full strict mode enabled
}
```

### ESLint Configuration (`.eslintrc.json`)
- TypeScript ESLint parser
- Recommended + requiring type checking rules
- Custom rules for code quality
- Max file size: 500 lines
- Max complexity: 15

### Prettier Configuration (`.prettierrc`)
- Single quotes
- 2-space indentation
- 100 character line width
- Trailing commas (ES5)
- LF line endings

### Node Version (`.nvmrc`)
```
20.10.0
```

### NPM Ignore (`.npmignore`)
Excludes from published package:
- Source files
- Tests
- Examples
- Documentation
- Configuration files

## Continuous Integration Best Practices

### Caching Strategy

All workflows use npm caching:
```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
```

Benefits:
- Faster builds (3-5x speedup)
- Reduced network usage
- Consistent dependency versions

### Matrix Testing

Testing across multiple Node versions ensures compatibility:
```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 22.x]
```

### Artifact Management

Build artifacts retained for 7 days:
- Useful for debugging
- Downloading build outputs
- Sharing between jobs

### Parallel Job Execution

Jobs run in parallel where possible:
- Unit tests + Integration tests + Performance tests (parallel)
- Build jobs run independently
- Quality checks run concurrently

## Monitoring and Alerts

### GitHub Actions Dashboard
- Monitor workflow runs
- Review test results
- Check coverage trends
- View performance metrics

### PR Comments

Automated comments on PRs:
- Performance benchmark results
- Bundle size analysis
- Coverage reports
- Documentation coverage

### GitHub Security Tab

Security alerts visible in:
- Security → Dependabot alerts
- Security → Code scanning alerts
- Security → Secret scanning

## Troubleshooting

### Common Issues

#### 1. Tests Failing in CI but Passing Locally

**Cause:** Environment differences

**Solution:**
```bash
# Run tests in CI mode locally
npm run test:ci

# Check Node version
node --version  # Should match .nvmrc

# Clean install
rm -rf node_modules package-lock.json
npm install
```

#### 2. Bundle Size Exceeds Threshold

**Cause:** Large dependencies or bundled files

**Solution:**
- Review bundle analysis artifacts
- Use tree-shaking
- Consider code splitting
- Check for duplicate dependencies

```bash
# Analyze bundle
npm run build
du -sh dist/
```

#### 3. Coverage Below Threshold

**Cause:** Untested code paths

**Solution:**
```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open coverage/lcov-report/index.html

# Focus on uncovered lines
```

#### 4. Security Vulnerabilities

**Cause:** Vulnerable dependencies

**Solution:**
```bash
# Check vulnerabilities
npm audit

# Auto-fix (when possible)
npm audit fix

# Update specific package
npm update package-name

# Check for breaking changes
npm outdated
```

#### 5. Publish Workflow Fails

**Cause:** Missing NPM_TOKEN or version conflict

**Solution:**
1. Verify NPM_TOKEN secret is set
2. Check version doesn't already exist
3. Ensure tag format is correct (v1.2.3)

```bash
# Check published versions
npm view @ruvector/genomic-vector-analysis versions

# Verify token
npm whoami --registry https://registry.npmjs.org/
```

### Debug Mode

Enable debug logging:
```yaml
env:
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true
```

### Re-running Failed Jobs

1. Go to Actions tab
2. Select failed workflow
3. Click "Re-run failed jobs"

## Performance Optimization

### Workflow Optimization Tips

1. **Cache Dependencies**
   - Use `actions/setup-node@v4` with cache
   - Cache build artifacts between jobs

2. **Parallel Execution**
   - Run independent jobs in parallel
   - Use matrix strategy for multi-version testing

3. **Conditional Execution**
   - Skip unnecessary jobs on draft PRs
   - Use path filters for monorepo setups

4. **Artifact Cleanup**
   - Set appropriate retention periods
   - Clean up temporary files

## Maintenance

### Weekly Tasks
- Review Dependabot PRs
- Check security alerts
- Monitor performance trends
- Update documentation

### Monthly Tasks
- Review and update quality thresholds
- Analyze test coverage trends
- Review workflow performance
- Update dependencies

### Quarterly Tasks
- Review and update CI/CD strategy
- Evaluate new tools/actions
- Performance benchmark analysis
- Security posture review

## Resources

### Documentation
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing](https://jestjs.io/docs/getting-started)
- [Semantic Versioning](https://semver.org/)

### Tools
- [npm Documentation](https://docs.npmjs.com/)
- [Snyk Security](https://snyk.io/docs/)
- [CodeQL](https://codeql.github.com/docs/)
- [Dependabot](https://docs.github.com/en/code-security/dependabot)

### Support
- GitHub Issues: https://github.com/ruvnet/ruvector/issues
- Email: support@ruv.io

---

**Last Updated:** 2025-11-23
**Version:** 1.0.0
**Maintained By:** Ruvector Team
