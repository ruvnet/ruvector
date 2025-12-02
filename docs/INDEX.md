# Ruvector Documentation Index

Complete index of all Ruvector documentation.

## Quick Links

- [Getting Started](guide/GETTING_STARTED.md) - Start here!
- [Installation](guide/INSTALLATION.md) - Platform-specific installation
- [API Reference](api/) - Complete API documentation
- [Examples](../examples/) - Working code examples
- [Contributing](development/CONTRIBUTING.md) - How to contribute

## Documentation Structure

```
docs/
├── api/                    # API references
├── architecture/           # System design docs
├── benchmarks/             # Performance benchmarks
├── cloud-architecture/     # Cloud deployment
├── development/            # Developer guides
├── getting-started/        # Quick start guides
├── gnn/                    # GNN/Graph implementation
├── guide/                  # User guides
├── implementation/         # Implementation details
├── integration/            # Integration guides
├── latent-space/           # Research & advanced features
├── optimization/           # Performance optimization
├── project-phases/         # Development phases
├── publishing/             # NPM publishing guides
├── research/               # Research documentation
├── status/                 # Build & deployment status
└── testing/                # Testing documentation
```

## User Guides

### Getting Started
- **[Getting Started Guide](guide/GETTING_STARTED.md)** - Quick introduction to Ruvector
- **[Installation Guide](guide/INSTALLATION.md)** - Installation for Rust, Node.js, WASM, CLI
- **[Basic Tutorial](guide/BASIC_TUTORIAL.md)** - Step-by-step tutorial with examples
- **[Advanced Features Guide](guide/ADVANCED_FEATURES.md)** - Hybrid search, quantization, MMR, filtering

### Migration
- **[Migration from AgenticDB](development/MIGRATION.md)** - Complete migration guide with examples

## Architecture Documentation

- **[System Overview](architecture/SYSTEM_OVERVIEW.md)** - High-level architecture and design
- **[NPM Package Architecture](architecture/NPM_PACKAGE_ARCHITECTURE.md)** - Package structure
- **[Repository Structure](REPO_STRUCTURE.md)** - Codebase organization

### Cloud Architecture
- **[Architecture Overview](cloud-architecture/architecture-overview.md)** - Cloud design
- **[Deployment Guide](cloud-architecture/DEPLOYMENT_GUIDE.md)** - Deployment instructions
- **[Infrastructure Design](cloud-architecture/infrastructure-design.md)** - Infrastructure details
- **[Scaling Strategy](cloud-architecture/scaling-strategy.md)** - Scaling approaches
- **[Performance Optimization](cloud-architecture/PERFORMANCE_OPTIMIZATION_GUIDE.md)** - Cloud performance

## API Reference

### Platform APIs
- **[Rust API](api/RUST_API.md)** - Complete Rust API reference
- **[Node.js API](api/NODEJS_API.md)** - Complete Node.js API reference
- **[Cypher Reference](api/CYPHER_REFERENCE.md)** - Cypher query language

### Feature-Specific APIs
- **[AgenticDB API](getting-started/AGENTICDB_API.md)** - Detailed AgenticDB API documentation
- **[AgenticDB Quickstart](getting-started/AGENTICDB_QUICKSTART.md)** - Quick start guide
- **[WASM API](getting-started/wasm-api.md)** - Browser WASM API
- **[WASM Build Guide](getting-started/wasm-build-guide.md)** - Building for WASM

## GNN & Graph Documentation

- **[Graph Integration Summary](gnn/GRAPH_INTEGRATION_SUMMARY.md)** - Overview of graph features
- **[Graph Validation Checklist](gnn/GRAPH_VALIDATION_CHECKLIST.md)** - Validation guide
- **[GNN Layer Implementation](gnn/gnn-layer-implementation.md)** - Layer details
- **[Graph Attention Implementation](gnn/graph-attention-implementation-summary.md)** - Attention mechanisms
- **[Hyperbolic Attention](gnn/hyperbolic-attention-implementation.md)** - Hyperbolic embeddings
- **[Cypher Parser](gnn/cypher-parser-implementation.md)** - Query parser
- **[CLI Graph Commands](gnn/cli-graph-commands.md)** - CLI usage
- **[Graph WASM Setup](gnn/graph-wasm-setup.md)** - WASM bindings
- **[Node Bindings](gnn/ruvector-gnn-node-bindings.md)** - Node.js bindings
- **[Training Utilities](gnn/training-utilities-implementation.md)** - Training tools

## Integration Guides

- **[Integration Summary](integration/INTEGRATION-SUMMARY.md)** - Integration overview
- **[Psycho-Symbolic Integration](integration/PSYCHO-SYMBOLIC-INTEGRATION.md)** - Symbolic AI integration
- **[Psycho-Synth Quick Start](integration/PSYCHO-SYNTH-QUICK-START.md)** - Quick start guide

## Performance & Benchmarks

- **[Benchmarking Guide](benchmarks/BENCHMARKING_GUIDE.md)** - How to run and interpret benchmarks
- **[Benchmark Comparison](BENCHMARK_COMPARISON.md)** - Performance comparisons

### Optimization Guides
- **[Performance Tuning Guide](optimization/PERFORMANCE_TUNING_GUIDE.md)** - Detailed optimization guide
- **[Build Optimization](optimization/BUILD_OPTIMIZATION.md)** - Compilation optimizations
- **[Optimization Results](optimization/OPTIMIZATION_RESULTS.md)** - Benchmark results
- **[Implementation Summary](optimization/IMPLEMENTATION_SUMMARY.md)** - Optimization implementation

## Implementation Documentation

### Implementation Details
- **[Implementation Summary](implementation/IMPLEMENTATION_SUMMARY.md)** - Overall implementation
- **[Improvement Roadmap](implementation/IMPROVEMENT_ROADMAP.md)** - Future plans
- **[Security Fixes Summary](implementation/SECURITY_FIXES_SUMMARY.md)** - Security improvements
- **[Overflow Fixes](implementation/overflow_fixes_verification.md)** - Bug fixes

### Phase Summaries
- **[Phase 2: HNSW](project-phases/phase2_hnsw_implementation.md)** - HNSW integration
- **[Phase 3: AgenticDB](project-phases/PHASE3_SUMMARY.md)** - AgenticDB layer
- **[Phase 4: Advanced Features](project-phases/phase4-implementation-summary.md)** - Product quantization, hybrid search
- **[Phase 5: Multi-Platform](project-phases/phase5-implementation-summary.md)** - Node.js, WASM, CLI
- **[Phase 6: Advanced](project-phases/PHASE6_SUMMARY.md)** - Future features

## Publishing & Deployment

- **[Publishing Guide](publishing/PUBLISHING-GUIDE.md)** - How to publish packages
- **[NPM Publishing](publishing/NPM_PUBLISHING.md)** - NPM-specific guide
- **[NPM Token Setup](publishing/NPM_TOKEN_SETUP.md)** - Authentication setup
- **[Package Validation](publishing/PACKAGE-VALIDATION-REPORT.md)** - Validation report
- **[Publishing Status](publishing/PUBLISHING.md)** - Current status

### Status Reports
- **[All Packages Status](status/ALL_PACKAGES_STATUS.md)** - Package overview
- **[Build Process](status/BUILD_PROCESS.md)** - Build documentation
- **[Build Summary](status/BUILD_SUMMARY.md)** - Build results
- **[Current Status](status/CURRENT_STATUS.md)** - Project status
- **[Deployment Status](status/DEPLOYMENT_STATUS.md)** - Deployment state

## Development

- **[Contributing Guide](development/CONTRIBUTING.md)** - How to contribute
- **[Security](development/SECURITY.md)** - Security guidelines
- **[Migration Guide](development/MIGRATION.md)** - Migration documentation
- **[NPM Package Review](development/NPM_PACKAGE_REVIEW.md)** - Package review
- **[Fixing Compilation Errors](development/FIXING_COMPILATION_ERRORS.md)** - Troubleshooting

## Testing

- **[Test Suite Summary](testing/TDD_TEST_SUITE_SUMMARY.md)** - Testing strategy
- **[Integration Testing Report](testing/integration-testing-report.md)** - Integration tests

## Research & Advanced Features

### Latent Space
- **[Implementation Roadmap](latent-space/implementation-roadmap.md)** - Development plan
- **[GNN Architecture Analysis](latent-space/gnn-architecture-analysis.md)** - Architecture deep-dive
- **[Attention Mechanisms Research](latent-space/attention-mechanisms-research.md)** - Research notes
- **[Advanced Architectures](latent-space/advanced-architectures.md)** - Advanced designs
- **[Optimization Strategies](latent-space/optimization-strategies.md)** - Optimization approaches

### GNN v2 Research
- **[Master Plan](research/gnn-v2/00-master-plan.md)** - GNN v2 overview
- **[GNN Guided Routing](research/gnn-v2/01-gnn-guided-routing.md)** - Routing research
- **[Incremental Graph Learning](research/gnn-v2/02-incremental-graph-learning.md)** - Learning approaches
- **[Neuro-Symbolic Query](research/gnn-v2/03-neuro-symbolic-query.md)** - Query processing
- **[Hyperbolic Embeddings](research/gnn-v2/04-hyperbolic-embeddings.md)** - Embedding research

## Project Information

- **[README](README.md)** - Documentation overview
- **[Technical Plan](TECHNICAL_PLAN.md)** - Technical roadmap
- **[Project README](../README.md)** - Project overview
- **[CHANGELOG](../CHANGELOG.md)** - Version history
- **[LICENSE](../LICENSE)** - MIT License

## Documentation Statistics

- **Total directories**: 17+
- **Total documentation files**: 120+ markdown files
- **User guides**: 4 comprehensive guides
- **API references**: 3 platform APIs
- **Code examples**: 7+ working examples
- **Languages covered**: Rust, JavaScript/TypeScript, WASM

## Getting Help

### Resources
- **Documentation**: This index and linked guides
- **Examples**: [../examples/](../examples/) directory
- **API docs**: `cargo doc --no-deps --open`
- **Benchmarks**: `cargo bench`

### Support Channels
- **GitHub Issues**: [Report bugs or request features](https://github.com/ruvnet/ruvector/issues)
- **GitHub Discussions**: [Ask questions](https://github.com/ruvnet/ruvector/discussions)
- **Pull Requests**: [Contribute code](https://github.com/ruvnet/ruvector/pulls)

---

**Last Updated**: 2025-12-01
**Version**: 0.1.19
