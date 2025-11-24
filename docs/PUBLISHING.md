# Publishing Tiny Dancer Crates to Crates.io

This guide walks you through publishing the ruvector-tiny-dancer crates to crates.io.

## Prerequisites

1. **Crates.io Account**: Create an account at https://crates.io
2. **API Token**: Generate a token at https://crates.io/me
3. **Ownership**: You must have ownership or be part of the team for existing crates

## Quick Start

### 1. Set Up API Key

```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env and add your API token
# CRATES_API_KEY=your-actual-token-here
```

**Security Note**: Never commit `.env` to version control. It's already in `.gitignore`.

### 2. Run the Publishing Script

```bash
# From project root
./scripts/publish-tiny-dancer.sh
```

The script will:
- ✓ Load your API key from `.env`
- ✓ Verify each crate with `cargo publish --dry-run`
- ✓ Prompt for confirmation before publishing
- ✓ Publish crates in correct dependency order:
  1. `ruvector-tiny-dancer-core` (base library)
  2. `ruvector-tiny-dancer-wasm` (WASM bindings)
  3. `ruvector-tiny-dancer-node` (Node.js bindings)
- ✓ Wait between publishes for crates.io to process

## Manual Publishing

If you prefer to publish manually:

### Step 1: Publish Core Library

```bash
cd crates/ruvector-tiny-dancer-core

# Dry run to verify
cargo publish --dry-run --token $CRATES_API_KEY

# If successful, publish
cargo publish --token $CRATES_API_KEY

# Wait 30-60 seconds for crates.io to process
```

### Step 2: Publish WASM Bindings

```bash
cd ../ruvector-tiny-dancer-wasm

# Dry run
cargo publish --dry-run --token $CRATES_API_KEY

# Publish
cargo publish --token $CRATES_API_KEY
```

### Step 3: Publish Node.js Bindings

```bash
cd ../ruvector-tiny-dancer-node

# Dry run
cargo publish --dry-run --token $CRATES_API_KEY

# Publish
cargo publish --token $CRATES_API_KEY
```

## Pre-Publishing Checklist

Before publishing, ensure:

- [ ] All tests pass: `cargo test --all`
- [ ] Benchmarks compile: `cargo bench --no-run --all`
- [ ] Documentation builds: `cargo doc --no-deps`
- [ ] Version numbers are correct in `Cargo.toml`
- [ ] README.md is up to date
- [ ] CHANGELOG.md includes latest changes
- [ ] Examples work correctly
- [ ] License is specified (MIT)
- [ ] Repository URL is correct

Run checks:

```bash
# Test all crates
cargo test --all

# Check documentation
cargo doc --no-deps --open

# Verify package contents
cargo package --list --manifest-path crates/ruvector-tiny-dancer-core/Cargo.toml
```

## Versioning

The project uses workspace versioning (currently `0.1.1`):

```toml
[workspace.package]
version = "0.1.1"
```

All three crates share this version. To update:

1. Update version in root `Cargo.toml`
2. Update any internal dependencies if needed
3. Update version references in README files
4. Commit changes
5. Tag the release: `git tag -a v0.1.1 -m "Release v0.1.1"`

## Troubleshooting

### "Crate already published"

If a crate version is already published:
1. Bump the version in root `Cargo.toml`
2. Commit the version change
3. Re-run the publish script

### Authentication Failed

```bash
# Verify your token is set
echo $CRATES_API_KEY

# Re-login to crates.io
cargo login $CRATES_API_KEY
```

### Dependency Resolution Failed

Wait 60 seconds after publishing the core library before publishing dependent crates. Crates.io needs time to index.

### Documentation Warnings

Fix all `cargo doc` warnings before publishing:

```bash
cargo doc --no-deps 2>&1 | grep warning
```

## Post-Publishing

After successful publication:

1. **Verify Publication**:
   - Core: https://crates.io/crates/ruvector-tiny-dancer-core
   - WASM: https://crates.io/crates/ruvector-tiny-dancer-wasm
   - Node: https://crates.io/crates/ruvector-tiny-dancer-node

2. **Check Documentation**:
   - Core: https://docs.rs/ruvector-tiny-dancer-core

3. **Create GitHub Release**:
   ```bash
   git tag -a v0.1.1 -m "Release v0.1.1"
   git push origin v0.1.1
   ```

4. **Update README Badges**: Ensure version badges are correct

5. **Announce**: Update project README, blog, or social media

## Yanking a Release

If you need to yank a problematic release:

```bash
cargo yank --vers 0.1.1 ruvector-tiny-dancer-core
```

## Support

- **Issues**: https://github.com/ruvnet/ruvector/issues
- **Discussions**: https://github.com/ruvnet/ruvector/discussions
- **Documentation**: https://docs.rs/ruvector-tiny-dancer-core

---

**Note**: The publishing script uses `jq` for JSON parsing. Install it if needed:
- Ubuntu/Debian: `sudo apt-get install jq`
- macOS: `brew install jq`
- Windows: Download from https://stedolan.github.io/jq/
