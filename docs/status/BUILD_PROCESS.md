# Ruvector Multi-Platform Build Process

## Overview

Ruvector uses GitHub Actions to build native NAPI modules for multiple platforms automatically. This document explains the build architecture and how to work with it.

## Architecture

### Platform Packages

The project uses a **split package architecture**:

```
@ruvector/core (main package)
├── @ruvector/core-linux-x64
├── @ruvector/core-linux-arm64
├── @ruvector/core-darwin-x64
├── @ruvector/core-darwin-arm64
└── @ruvector/core-win32-x64
```

**Benefits:**
- Smaller install size (only downloads your platform)
- Automatic platform detection
- Native performance on all platforms
- Easy CI/CD integration

### Package Structure

```
npm/packages/core/
├── package.json           # Main package with optionalDependencies
├── index.js              # Platform detection and loading
├── index.d.ts            # TypeScript definitions
├── test.js               # Basic smoke tests
├── scripts/
│   └── publish-platforms.js  # Automated publishing
└── native/               # Built artifacts (CI only)
    ├── linux-x64/
    ├── linux-arm64/
    ├── darwin-x64/
    ├── darwin-arm64/
    └── win32-x64/
```

## GitHub Actions Workflow

### Build Matrix

The workflow builds for 5 platforms in parallel:

| Platform | Runner | Target Triple | Output |
|----------|--------|---------------|--------|
| Linux x64 | ubuntu-22.04 | x86_64-unknown-linux-gnu | ruvector.node |
| Linux ARM64 | ubuntu-22.04 | aarch64-unknown-linux-gnu | ruvector.node |
| macOS x64 | macos-13 | x86_64-apple-darwin | ruvector.node |
| macOS ARM64 | macos-14 | aarch64-apple-darwin | ruvector.node |
| Windows x64 | windows-2022 | x86_64-pc-windows-msvc | ruvector.dll |

### Workflow Triggers

```yaml
on:
  push:
    branches: [main]           # Build on every push to main
    tags: ['v*']               # Build and publish on version tags
  pull_request:
    branches: [main]           # Build on PRs (no publish)
  workflow_dispatch:           # Manual trigger
```

### Build Steps

1. **Checkout**: Clone repository
2. **Setup Node.js**: Install Node 18 with npm cache
3. **Setup Rust**: Install Rust toolchain for target platform
4. **Cache Rust**: Cache compiled dependencies
5. **Cross-compilation tools**: Install GCC for ARM64 (Linux only)
6. **Install dependencies**: Run `npm ci` in npm workspace
7. **Build native module**: Run `@napi-rs/cli` to compile Rust → NAPI
8. **Test**: Run smoke tests on native platform
9. **Upload artifacts**: Save .node/.dll files for publishing

### Publish Steps (Tags Only)

When you push a version tag (`v0.1.1`):

1. Download all platform artifacts
2. Run `publish-platforms.js` script:
   - Creates platform-specific packages
   - Publishes to npm with `--access public`
3. Publish main `@ruvector/core` package
4. Publish `ruvector` wrapper package

## Local Development

### Build for Your Platform

```bash
cd npm/packages/core
npm run build:napi
```

This compiles the native module for your current platform.

### Test Locally

```bash
npm test
```

Runs basic smoke tests to verify the module loads and works.

### Build Specific Target

```bash
npm run build:napi -- --target x86_64-unknown-linux-gnu
```

Requires target toolchain installed via `rustup target add`.

## Cross-Compilation

### Linux ARM64 (from Linux x64)

```bash
# Install cross-compiler
sudo apt-get install gcc-aarch64-linux-gnu

# Add Rust target
rustup target add aarch64-unknown-linux-gnu

# Build
CARGO_TARGET_AARCH64_UNKNOWN_LINUX_GNU_LINKER=aarch64-linux-gnu-gcc \
  npm run build:napi -- --target aarch64-unknown-linux-gnu
```

### macOS Universal Binary

Build both architectures and combine:

```bash
# Build x64
npm run build:napi -- --target x86_64-apple-darwin

# Build ARM64
npm run build:napi -- --target aarch64-apple-darwin

# Combine (optional)
lipo -create \
  native/darwin-x64/ruvector.node \
  native/darwin-arm64/ruvector.node \
  -output ruvector-universal.node
```

## Publishing Process

### Automated (Recommended)

Push a version tag:

```bash
# Update version in all package.json files
npm version 0.1.2 --workspace npm

# Commit and tag
git add .
git commit -m "Release v0.1.2"
git tag v0.1.2

# Push with tags
git push origin main --tags
```

GitHub Actions will automatically:
1. Build all platforms
2. Publish platform packages
3. Publish main packages

### Manual

If you need to publish manually:

```bash
# Build locally (linux-x64 only)
cd npm/packages/core
npm run build:napi

# Create and publish platform package
node scripts/publish-platforms.js

# Publish main package
cd ../ruvector
npm publish --access public
```

**Note:** Manual publishing only works for your current platform. Use GitHub Actions for multi-platform releases.

## Troubleshooting

### "Module not found" on Installation

**Cause:** Platform package not published or not installed.

**Solution:**
```bash
# Reinstall with optional dependencies
rm -rf node_modules package-lock.json
npm install
```

### Cross-Compilation Failures

**Linux ARM64:**
```bash
# Missing linker
sudo apt-get install gcc-aarch64-linux-gnu

# Wrong toolchain
rustup target add aarch64-unknown-linux-gnu
```

**macOS ARM64 (from x64):**
```bash
# Requires macOS 11+ with Rosetta
xcode-select --install
rustup target add aarch64-apple-darwin
```

### CI Build Failures

Check the workflow logs in GitHub Actions:
1. Go to repository → Actions tab
2. Select failed workflow run
3. Check specific job logs
4. Look for compilation or linking errors

Common issues:
- Rust toolchain not installed
- Missing system dependencies
- Cargo.lock out of sync
- npm cache corruption

### Platform Not Supported

If you need support for additional platforms:

1. Add to `build-native.yml` matrix:
```yaml
- host: ubuntu-22.04
  target: riscv64gc-unknown-linux-gnu
  build: npm run build:napi -- --target riscv64gc-unknown-linux-gnu
  platform: linux-riscv64
```

2. Add to `platformMap` in `index.js`:
```javascript
'linux': {
  'riscv64': '@ruvector/core-linux-riscv64'
}
```

3. Update `scripts/publish-platforms.js` platforms array.

## Performance Notes

### Build Times

Approximate build times per platform (GitHub Actions):

- Linux x64: 3-5 minutes
- Linux ARM64: 4-6 minutes (cross-compile)
- macOS x64: 4-6 minutes
- macOS ARM64: 4-6 minutes
- Windows x64: 5-7 minutes

Total workflow: ~7-10 minutes (parallel builds)

### Artifact Sizes

Compiled native modules:

- Linux: ~4.3 MB (stripped)
- macOS: ~5.1 MB (includes debug symbols)
- Windows: ~4.8 MB

Published platform packages: 1-2 MB each (compressed)

### Optimization

The build uses `--release` mode with:
- LTO (Link-Time Optimization)
- Strip symbols on Linux/Windows
- Target-specific optimizations

## Security

### NPM Tokens

GitHub Actions requires `NPM_TOKEN` secret:

1. Generate token at https://www.npmjs.com/settings/tokens
2. Add to repository: Settings → Secrets → Actions
3. Name: `NPM_TOKEN`
4. Scope: Automation token (recommended) or Publish token

### Code Signing (Future)

For macOS/Windows code signing:
1. Store certificates in GitHub Secrets
2. Add signing steps to workflow
3. Update notarization for macOS

## Resources

- [NAPI-RS Documentation](https://napi.rs/)
- [GitHub Actions Runners](https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners)
- [Rust Cross-Compilation](https://rust-lang.github.io/rustup/cross-compilation.html)
- [npm Workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces)

## Support

For build issues:
1. Check GitHub Actions logs
2. Review this document
3. Open issue at https://github.com/ruvnet/ruvector/issues
