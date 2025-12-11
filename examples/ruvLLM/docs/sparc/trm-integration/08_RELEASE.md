# Release Preparation

## RuvLLM v2.0.0 Package & Release Guide

---

## 1. Version Strategy

### 1.1 Semantic Versioning

```
v2.0.0 - Major release with TRM integration

Breaking changes:
- New TrmConfig in Config builder
- Extended response type with TrmInfo
- New trajectory format in SONA

New features:
- TRM recursive reasoning engine
- Adaptive K selection
- K prediction learning
- WASM TRM support
```

### 1.2 Package Versions

| Package | Version | Registry |
|---------|---------|----------|
| ruvllm | 2.0.0 | crates.io |
| @ruvector/ruvllm | 2.0.0 | npm |
| ruvector-sona | 0.2.0 | crates.io |
| @ruvector/sona | 0.2.0 | npm |

---

## 2. Cargo Configuration

### 2.1 Cargo.toml Updates

```toml
# examples/ruvLLM/Cargo.toml

[package]
name = "ruvllm"
version = "2.0.0"
edition = "2021"
authors = ["rUv <ruvnet@github.com>"]
license = "MIT OR Apache-2.0"
description = "Self-Optimizing Neural Architecture with TRM Recursive Reasoning"
repository = "https://github.com/ruvnet/ruvector"
documentation = "https://docs.rs/ruvllm"
readme = "README.md"
keywords = ["llm", "neural", "recursive", "reasoning", "sona"]
categories = ["science", "algorithms", "wasm"]

[features]
default = ["storage", "metrics", "trm"]

# Core features
storage = ["ruvector-core/storage"]
metrics = ["prometheus"]

# TRM Recursive Reasoning
trm = []
trm-attention = ["trm"]  # Heavier attention variant

# Real inference (optional)
real-inference = ["candle-core", "candle-nn", "hf-hub"]

# Export capabilities
hf-export = ["ruvector-sona/serde-support"]

# HTTP server
server = ["axum", "tower", "tower-http"]

# WASM support
wasm = ["wasm-bindgen", "js-sys", "web-sys", "getrandom/js"]

# All features
full = ["storage", "metrics", "trm", "trm-attention", "hf-export", "server"]

[dependencies]
# Core dependencies
ruvector-core = { path = "../../crates/ruvector-core", version = "0.2" }
ruvector-sona = { path = "../../crates/sona", version = "0.2" }

# Async runtime
tokio = { version = "1.35", features = ["rt-multi-thread", "macros"], optional = true }

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Error handling
thiserror = "1.0"
anyhow = "1.0"

# Logging
tracing = "0.1"

# Concurrency
parking_lot = "0.12"
rayon = "1.8"

# Metrics (optional)
prometheus = { version = "0.13", optional = true }

# Server (optional)
axum = { version = "0.7", optional = true }
tower = { version = "0.4", optional = true }
tower-http = { version = "0.5", features = ["cors"], optional = true }

# Real inference (optional)
candle-core = { version = "0.3", optional = true }
candle-nn = { version = "0.3", optional = true }
hf-hub = { version = "0.3", optional = true }

# WASM (optional)
wasm-bindgen = { version = "0.2", optional = true }
js-sys = { version = "0.3", optional = true }
web-sys = { version = "0.3", optional = true }
getrandom = { version = "0.2", optional = true }

[dev-dependencies]
criterion = { version = "0.5", features = ["html_reports"] }
tokio-test = "0.4"
pretty_assertions = "1.4"

[[bench]]
name = "trm_recursive"
harness = false

[[bench]]
name = "trm_sona"
harness = false

[package.metadata.docs.rs]
all-features = true
rustdoc-args = ["--cfg", "docsrs"]

[profile.release]
lto = true
codegen-units = 1
panic = "abort"
opt-level = 3

[profile.release-wasm]
inherits = "release"
opt-level = "s"  # Optimize for size in WASM
```

### 2.2 Workspace Configuration

```toml
# Root Cargo.toml additions

[workspace.package]
version = "2.0.0"
edition = "2021"
license = "MIT OR Apache-2.0"
repository = "https://github.com/ruvnet/ruvector"

[workspace.dependencies]
ruvllm = { path = "examples/ruvLLM", version = "2.0" }
```

---

## 3. npm Package Configuration

### 3.1 package.json

```json
{
  "name": "@ruvector/ruvllm",
  "version": "2.0.0",
  "description": "Self-Optimizing Neural Architecture with TRM Recursive Reasoning",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "files": [
    "dist",
    "wasm",
    "README.md",
    "LICENSE-MIT",
    "LICENSE-APACHE"
  ],
  "scripts": {
    "build": "npm run build:wasm && npm run build:js",
    "build:wasm": "wasm-pack build --target web --out-dir wasm",
    "build:js": "tsup src/index.ts --format cjs,esm --dts",
    "test": "vitest",
    "prepublishOnly": "npm run build"
  },
  "keywords": [
    "llm",
    "neural",
    "recursive",
    "reasoning",
    "sona",
    "trm",
    "wasm",
    "ai"
  ],
  "author": "rUv <ruvnet@github.com>",
  "license": "MIT OR Apache-2.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/ruvnet/ruvector.git",
    "directory": "examples/ruvLLM"
  },
  "homepage": "https://github.com/ruvnet/ruvector/tree/main/examples/ruvLLM",
  "bugs": {
    "url": "https://github.com/ruvnet/ruvector/issues"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "@types/node": "^20.0.0"
  },
  "peerDependencies": {
    "@ruvector/core": "^0.2.0"
  }
}
```

### 3.2 TypeScript Definitions

```typescript
// src/index.ts

export interface TrmConfig {
  hiddenDim: number;
  embeddingDim: number;
  maxK: number;
  defaultK: number;
  latentIterations: number;
  useAttention: boolean;
  numHeads: number;
  confidenceThreshold: number;
}

export interface TrmResult {
  answer: Float32Array;
  confidence: number;
  iterationsUsed: number;
  earlyStopped: boolean;
  latencyMs: number;
}

export interface TrmInfo {
  iterationsUsed: number;
  predictedK: number;
  kWasPredicted: boolean;
  earlyStopped: boolean;
  confidence: number;
}

export interface RuvLLMConfig {
  embeddingDim?: number;
  trm?: TrmConfig;
  learningEnabled?: boolean;
}

export interface QueryResponse {
  text: string;
  confidence: number;
  latencyMs: number;
  trm?: TrmInfo;
}

export class RuvLLM {
  constructor(config?: RuvLLMConfig);

  async query(text: string): Promise<QueryResponse>;
  async reason(embedding: Float32Array, k?: number): Promise<TrmResult>;
  async feedback(requestId: string, feedback: Feedback): Promise<void>;
  forceLearn(): void;
  stats(): Stats;
}

// WASM bindings
export class WasmRuvLLM {
  constructor(config?: RuvLLMConfig);

  query(text: string): QueryResponse;
  reason(embedding: Float32Array, k?: number): TrmResult;
  feedback(requestId: string, quality: number): void;
  stats(): Stats;
}
```

---

## 4. CI/CD Pipeline

### 4.1 GitHub Actions Workflow

```yaml
# .github/workflows/release.yml

name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build-rust:
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            target: x86_64-unknown-linux-gnu
          - os: ubuntu-latest
            target: aarch64-unknown-linux-gnu
          - os: macos-latest
            target: x86_64-apple-darwin
          - os: macos-latest
            target: aarch64-apple-darwin
          - os: windows-latest
            target: x86_64-pc-windows-msvc

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}

      - name: Build
        run: |
          cd examples/ruvLLM
          cargo build --release --target ${{ matrix.target }} --features full

      - name: Run Tests
        run: |
          cd examples/ruvLLM
          cargo test --release --features full

      - name: Upload Artifact
        uses: actions/upload-artifact@v3
        with:
          name: ruvllm-${{ matrix.target }}
          path: target/${{ matrix.target }}/release/libruvllm.*

  build-wasm:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Install wasm-pack
        run: curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

      - name: Build WASM
        run: |
          cd examples/ruvLLM
          wasm-pack build --target web --features wasm

      - name: Upload WASM Artifact
        uses: actions/upload-artifact@v3
        with:
          name: ruvllm-wasm
          path: examples/ruvLLM/pkg/

  publish-crates:
    needs: [build-rust, build-wasm]
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Publish ruvector-sona
        run: |
          cd crates/sona
          cargo publish --token ${{ secrets.CRATES_IO_TOKEN }}

      - name: Wait for crates.io
        run: sleep 30

      - name: Publish ruvllm
        run: |
          cd examples/ruvLLM
          cargo publish --token ${{ secrets.CRATES_IO_TOKEN }}

  publish-npm:
    needs: [build-rust, build-wasm]
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - name: Download WASM Artifact
        uses: actions/download-artifact@v3
        with:
          name: ruvllm-wasm
          path: examples/ruvLLM/wasm/

      - name: Build npm Package
        run: |
          cd examples/ruvLLM
          npm ci
          npm run build

      - name: Publish to npm
        run: |
          cd examples/ruvLLM
          npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

  create-release:
    needs: [publish-crates, publish-npm]
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Download All Artifacts
        uses: actions/download-artifact@v3
        with:
          path: artifacts/

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: artifacts/**/*
          body_path: CHANGELOG.md
          draft: false
          prerelease: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 5. Release Checklist

### 5.1 Pre-Release

```markdown
## Pre-Release Checklist

### Code Quality
- [ ] All tests passing (`cargo test --all-features`)
- [ ] No clippy warnings (`cargo clippy --all-features`)
- [ ] No security vulnerabilities (`cargo audit`)
- [ ] Code formatted (`cargo fmt --check`)

### Documentation
- [ ] README.md updated
- [ ] CHANGELOG.md updated
- [ ] API docs complete (`cargo doc`)
- [ ] SPARC docs finalized
- [ ] Attribution verified

### Versioning
- [ ] Cargo.toml version bumped
- [ ] package.json version bumped
- [ ] Git tag created
- [ ] CHANGELOG version header added

### Testing
- [ ] Unit tests >80% coverage
- [ ] Integration tests passing
- [ ] Benchmark targets met
- [ ] WASM tests passing
- [ ] Cross-platform builds verified
```

### 5.2 Release Commands

```bash
#!/bin/bash
# scripts/release.sh

set -e

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "Usage: ./scripts/release.sh <version>"
    exit 1
fi

echo "Releasing RuvLLM v$VERSION"

# 1. Update versions
sed -i "s/^version = .*/version = \"$VERSION\"/" examples/ruvLLM/Cargo.toml
sed -i "s/\"version\": .*/\"version\": \"$VERSION\",/" examples/ruvLLM/package.json

# 2. Update CHANGELOG
DATE=$(date +%Y-%m-%d)
sed -i "s/\[Unreleased\]/[$VERSION] - $DATE/" CHANGELOG.md

# 3. Commit version bump
git add -A
git commit -m "chore: release v$VERSION"

# 4. Create tag
git tag -a "v$VERSION" -m "Release v$VERSION"

# 5. Push
git push origin main
git push origin "v$VERSION"

echo "Release v$VERSION created!"
echo "GitHub Actions will handle publishing to crates.io and npm"
```

---

## 6. Post-Release

### 6.1 Verification

```bash
# Verify crates.io
cargo search ruvllm

# Verify npm
npm view @ruvector/ruvllm

# Verify documentation
open https://docs.rs/ruvllm
```

### 6.2 Announcement Template

```markdown
# RuvLLM v2.0.0 Released!

We're excited to announce RuvLLM v2.0.0, featuring TinyRecursiveModels (TRM) integration!

## Highlights

- **TRM Recursive Reasoning**: Parameter-efficient reasoning with only 7M parameters
- **Adaptive K Selection**: SONA learns optimal recursion depth
- **WASM Support**: Run in browsers with full TRM capabilities
- **45% ARC-AGI-1**: Competitive performance with 100B+ models

## Quick Start

```bash
# Rust
cargo add ruvllm

# npm
npm install @ruvector/ruvllm
```

## Attribution

TRM based on Samsung AI Lab Montreal's research:
https://github.com/SamsungSAILMontreal/TinyRecursiveModels

## Links

- [Documentation](https://docs.rs/ruvllm)
- [GitHub](https://github.com/ruvnet/ruvector)
- [CHANGELOG](https://github.com/ruvnet/ruvector/blob/main/CHANGELOG.md)
```

---

## 7. Support & Maintenance

### 7.1 Issue Templates

```markdown
<!-- .github/ISSUE_TEMPLATE/bug_report.md -->

---
name: Bug Report
about: Report a bug in RuvLLM
---

**Version**:
**Platform**:
**Features enabled**:

**Description**:

**Steps to Reproduce**:
1.
2.
3.

**Expected Behavior**:

**Actual Behavior**:

**Logs/Error Messages**:
```

### 7.2 Version Support Policy

| Version | Status | Support Until |
|---------|--------|---------------|
| 2.0.x | Active | Current |
| 1.x.x | Maintenance | 6 months after 2.0.0 |
| 0.x.x | EOL | - |

---

## Summary

This release guide covers:

1. **Version Strategy**: Semantic versioning with clear breaking changes
2. **Cargo Configuration**: Full feature flag setup for TRM
3. **npm Package**: TypeScript bindings and WASM support
4. **CI/CD**: Automated multi-platform builds and publishing
5. **Release Checklist**: Comprehensive pre-release verification
6. **Post-Release**: Verification and announcement

**Ready for release upon implementation completion!**
