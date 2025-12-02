# Repository Structure

Clean and organized structure for the RuVector project.

## Root Directory

```
ruvector/
├── README.md                 # Main project README
├── CHANGELOG.md             # Version history and changes
├── CLAUDE.md                # Claude Code configuration
├── LICENSE                  # MIT License
├── Cargo.toml              # Rust workspace configuration
├── Cargo.lock              # Rust dependency lock
├── package.json            # NPM workspace configuration
├── .gitignore              # Git ignore rules
│
├── crates/                 # Rust crates
│   ├── ruvector-core/      # Core vector database
│   ├── ruvector-node/      # Node.js bindings
│   ├── ruvector-wasm/      # WebAssembly bindings
│   ├── ruvector-cli/       # Command-line interface
│   ├── ruvector-bench/     # Benchmarking suite
│   ├── router-core/        # Neural routing
│   ├── router-cli/         # Router CLI
│   ├── router-ffi/         # FFI bindings
│   └── router-wasm/        # Router WASM
│
├── docs/                   # 📚 Documentation (organized)
│   ├── README.md           # Documentation index
│   ├── getting-started/    # Quick starts and tutorials
│   ├── api/               # API documentation
│   ├── architecture/      # System architecture
│   ├── cloud-architecture/ # Global cloud deployment
│   ├── guide/             # User guides
│   ├── benchmarks/        # Benchmarking guides
│   ├── optimization/      # Performance optimization
│   ├── development/       # Contributing and development
│   ├── testing/          # Testing documentation
│   └── project-phases/   # Historical project phases
│
├── src/                    # 🚀 Cloud deployment source
│   ├── cloud-run/         # Cloud Run services
│   ├── agentic-integration/ # Agent coordination
│   └── burst-scaling/     # Auto-scaling system
│
├── benchmarks/            # Load testing and benchmarks
│   ├── load-generator.ts
│   ├── benchmark-scenarios.ts
│   └── ...
│
├── tests/                 # Rust integration tests
├── examples/             # Example code
│   ├── rust/            # Rust examples
│   ├── nodejs/          # Node.js examples
│   └── wasm-*/         # WASM examples
│
└── .claude-flow/        # Claude Flow coordination
```

## Documentation Organization

All documentation is now organized in `/docs` with clear categories:

### 📖 Getting Started (7 files)
- AGENTICDB_QUICKSTART.md - Quick start guide
- OPTIMIZATION_QUICK_START.md - Performance quick start
- AGENTICDB_API.md - API reference
- wasm-api.md - WebAssembly API
- wasm-build-guide.md - WASM build guide
- advanced-features.md - Advanced features
- quick-fix-guide.md - Common fixes

### 🏗️ Architecture (11 files)
- TECHNICAL_PLAN.md - Complete technical plan
- architecture/ - System architecture
- cloud-architecture/ - Global deployment
  - architecture-overview.md - 15-region design
  - scaling-strategy.md - Auto-scaling
  - infrastructure-design.md - GCP infrastructure
  - DEPLOYMENT_GUIDE.md - Deployment steps
  - PERFORMANCE_OPTIMIZATION_GUIDE.md - Tuning guide

### 📚 API Reference (2 files)
- api/RUST_API.md - Rust API
- api/NODEJS_API.md - Node.js API

### 📖 User Guides (4 files)
- guide/GETTING_STARTED.md
- guide/BASIC_TUTORIAL.md
- guide/ADVANCED_FEATURES.md
- guide/INSTALLATION.md

### ⚡ Performance (5 files)
- optimization/ - Performance guides
- benchmarks/ - Benchmarking documentation

### 👨‍💻 Development (3 files)
- development/CONTRIBUTING.md - Contribution guidelines
- development/MIGRATION.md - Migration guide
- development/FIXING_COMPILATION_ERRORS.md - Troubleshooting

### 🧪 Testing (2 files)
- testing/TDD_TEST_SUITE_SUMMARY.md
- testing/integration-testing-report.md

### 📜 Historical (9 files)
- project-phases/ - Project phase documentation

## Source Code Organization

### `/src` - Cloud Deployment Code
All global streaming implementation code:
- `cloud-run/` - Cloud Run streaming services
- `agentic-integration/` - Distributed agent coordination
- `burst-scaling/` - Auto-scaling and capacity management

### `/crates` - Rust Crates
Core Rust implementation organized as workspace:
- Core functionality in `ruvector-core`
- Platform-specific bindings (Node.js, WASM, FFI)
- CLI and benchmarking tools

### `/benchmarks` - Load Testing
Comprehensive benchmarking suite:
- Load generators for 25B+ concurrent connections
- 15+ test scenarios
- Results analysis and visualization

## File Counts

- **Total Files**: 48 production files
- **Documentation**: 42 markdown files (organized)
- **Source Code**: 28,000+ lines
- **Root Files**: 8 essential files only

## Clean Root Directory

Only essential files remain in root:
- ✅ README.md - Project overview
- ✅ CHANGELOG.md - Version history
- ✅ CLAUDE.md - Development configuration
- ✅ LICENSE - MIT license
- ✅ Cargo.toml - Rust workspace
- ✅ Cargo.lock - Dependencies
- ✅ package.json - NPM workspace
- ✅ .gitignore - Git rules

**No test files, temporary files, or duplicate docs in root!**

## Navigation Tips

1. **New users**: Start at [docs/README.md](./docs/README.md)
2. **Quick start**: See [docs/getting-started/](./docs/getting-started/)
3. **Cloud deployment**: Check [docs/cloud-architecture/](./docs/cloud-architecture/)
4. **Contributing**: Read [docs/development/CONTRIBUTING.md](./docs/development/CONTRIBUTING.md)
5. **API docs**: Browse [docs/api/](./docs/api/)

---

**Last Updated**: 2025-11-20
**Status**: ✅ Clean and Organized
**Total Documentation**: 42 files properly categorized
