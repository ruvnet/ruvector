# Initialization System Architecture Design

**Project:** Ruvector - High-Performance Rust Vector Database
**Version:** 1.0.0
**Date:** 2025-11-22
**Architect:** SystemArchitect Agent (Swarm: swarm_1763850297134_b5ggmmcmp)

---

## Executive Summary

This document presents a comprehensive architecture for the Ruvector initialization system, designed to provide robust, scalable, and developer-friendly initialization patterns across Rust core, WASM bindings, Node.js bindings, CLI, and MCP server components.

### Key Design Principles
1. **Zero-Configuration Defaults**: Sensible defaults for immediate productivity
2. **Progressive Enhancement**: Start simple, scale complexity as needed
3. **Multi-Environment Support**: Consistent APIs across Rust, WASM, Node.js, and CLI
4. **Fail-Fast Validation**: Early detection of configuration errors
5. **Resource Safety**: Proper cleanup and lifecycle management

---

## 1. System Architecture Overview

### 1.1 Component Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    User-Facing APIs                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Rust API │  │ Node.js  │  │  WASM    │  │   CLI    │   │
│  │          │  │  Binding │  │  Binding │  │          │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                      │
        ┌─────────────▼─────────────────────────┐
        │    Initialization Manager             │
        │  ┌─────────────────────────────────┐  │
        │  │  Configuration Builder          │  │
        │  │  - Defaults                     │  │
        │  │  - Validation                   │  │
        │  │  - Merging                      │  │
        │  └─────────────────────────────────┘  │
        │  ┌─────────────────────────────────┐  │
        │  │  Resource Allocator             │  │
        │  │  - Storage                      │  │
        │  │  - Index                        │  │
        │  │  - Cache                        │  │
        │  └─────────────────────────────────┘  │
        │  ┌─────────────────────────────────┐  │
        │  │  Lifecycle Manager              │  │
        │  │  - Initialization               │  │
        │  │  - Shutdown                     │  │
        │  │  - Error Recovery               │  │
        │  └─────────────────────────────────┘  │
        └───────────────────────────────────────┘
                      │
        ┌─────────────▼─────────────────────────┐
        │         Core Components               │
        │  ┌────────┐ ┌────────┐ ┌────────┐    │
        │  │Storage │ │ Index  │ │ Cache  │    │
        │  │Backend │ │ Engine │ │System  │    │
        │  └────────┘ └────────┘ └────────┘    │
        └───────────────────────────────────────┘
```

### 1.2 Initialization Flow Sequence

```
User Request
    │
    ▼
┌─────────────────────────┐
│ Parse Configuration     │──► Validate inputs
│ (CLI args, env, file)   │──► Apply defaults
└──────────┬──────────────┘──► Merge sources
           │
           ▼
┌─────────────────────────┐
│ Build DbOptions         │──► dimensions
│                         │──► distance_metric
└──────────┬──────────────┘──► storage_path
           │                 ──► hnsw_config
           │                 ──► quantization
           ▼
┌─────────────────────────┐
│ Allocate Resources      │──► Initialize storage
│                         │──► Build index (HNSW/Flat)
└──────────┬──────────────┘──► Setup cache
           │
           ▼
┌─────────────────────────┐
│ Validate System State   │──► Test storage access
│                         │──► Verify dimensions
└──────────┬──────────────┘──► Check index integrity
           │
           ▼
┌─────────────────────────┐
│ Return VectorDB Handle  │──► Ready for operations
│                         │──► Register cleanup
└─────────────────────────┘
```

---

## 2. Component Design Specifications

### 2.1 Configuration Builder

**Purpose**: Construct validated DbOptions from multiple sources

**Interface**:
```rust
pub struct ConfigBuilder {
    dimensions: Option<usize>,
    distance_metric: Option<DistanceMetric>,
    storage_path: Option<String>,
    hnsw_config: Option<HnswConfig>,
    quantization: Option<QuantizationConfig>,
    env_overrides: bool,
}

impl ConfigBuilder {
    pub fn new() -> Self;
    pub fn dimensions(mut self, d: usize) -> Self;
    pub fn distance_metric(mut self, m: DistanceMetric) -> Self;
    pub fn storage_path(mut self, p: String) -> Self;
    pub fn enable_hnsw(mut self, config: HnswConfig) -> Self;
    pub fn enable_quantization(mut self, config: QuantizationConfig) -> Self;
    pub fn with_env_overrides(mut self) -> Self;
    pub fn build(self) -> Result<DbOptions>;
}
```

**Responsibilities**:
- Merge configuration from multiple sources (precedence: explicit > env > defaults)
- Validate configuration constraints
- Apply sensible defaults
- Return validated DbOptions

**Configuration Precedence**:
1. Explicit API parameters (highest priority)
2. Environment variables
3. Configuration file
4. Built-in defaults (lowest priority)

### 2.2 Resource Allocator

**Purpose**: Allocate and initialize core components

**Interface**:
```rust
pub struct ResourceAllocator {
    config: DbOptions,
}

impl ResourceAllocator {
    pub fn new(config: DbOptions) -> Self;
    pub fn allocate_storage(&self) -> Result<Arc<VectorStorage>>;
    pub fn allocate_index(&self, storage: &Arc<VectorStorage>) -> Result<Arc<RwLock<Box<dyn VectorIndex>>>>;
    pub fn allocate_cache(&self) -> Result<Option<Cache>>;
    pub fn cleanup(self) -> Result<()>;
}
```

**Responsibilities**:
- Initialize storage backend (disk or memory)
- Create appropriate index (HNSW vs Flat)
- Setup optional cache layer
- Handle feature-flagged components (WASM vs native)

**Feature Detection Logic**:
```rust
// Determine storage backend
#[cfg(feature = "storage")]
let storage = VectorStorage::new(path, dimensions)?;

#[cfg(not(feature = "storage"))]
let storage = MemoryStorage::new(dimensions)?;

// Determine index type
if hnsw_config.is_some() {
    #[cfg(feature = "hnsw")]
    index = HnswIndex::new(...)?;

    #[cfg(not(feature = "hnsw"))]
    index = FlatIndex::new(...); // WASM fallback
} else {
    index = FlatIndex::new(...);
}
```

### 2.3 Lifecycle Manager

**Purpose**: Manage initialization, operation, and shutdown lifecycle

**Interface**:
```rust
pub struct LifecycleManager {
    state: Arc<RwLock<SystemState>>,
    cleanup_handlers: Vec<Box<dyn FnOnce() -> Result<()>>>,
}

pub enum SystemState {
    Uninitialized,
    Initializing,
    Ready,
    Degraded(String),
    ShuttingDown,
    Shutdown,
}

impl LifecycleManager {
    pub fn new() -> Self;
    pub fn initialize<F: FnOnce() -> Result<VectorDB>>(
        &mut self,
        init_fn: F
    ) -> Result<VectorDB>;
    pub fn register_cleanup<F: FnOnce() -> Result<()> + 'static>(
        &mut self,
        handler: F
    );
    pub fn shutdown(self) -> Result<()>;
    pub fn health_check(&self) -> HealthStatus;
}
```

**Responsibilities**:
- Track system initialization state
- Coordinate ordered shutdown
- Register cleanup handlers
- Provide health monitoring

---

## 3. Multi-Environment Initialization Patterns

### 3.1 Rust Core API

**Pattern 1: Zero-Config Initialization**
```rust
// Default: 384 dimensions, Cosine distance, in-memory
let db = VectorDB::with_dimensions(384)?;
```

**Pattern 2: Builder Pattern**
```rust
let db = VectorDB::builder()
    .dimensions(768)
    .distance_metric(DistanceMetric::Euclidean)
    .storage_path("./embeddings.db")
    .enable_hnsw(HnswConfig::default())
    .enable_quantization(QuantizationConfig::Scalar)
    .build()?;
```

**Pattern 3: From Config Object**
```rust
let options = DbOptions {
    dimensions: 1536,
    distance_metric: DistanceMetric::Cosine,
    storage_path: "./vectors.db".to_string(),
    hnsw_config: Some(HnswConfig::default()),
    quantization: None,
};
let db = VectorDB::new(options)?;
```

### 3.2 Node.js Binding

**Pattern 1: Simple Constructor**
```javascript
const db = new VectorDB({ dimensions: 384 });
```

**Pattern 2: Full Configuration**
```javascript
const db = new VectorDB({
  dimensions: 768,
  distanceMetric: 'cosine',
  storagePath: './embeddings.db',
  hnsw: {
    m: 32,
    efConstruction: 200,
    efSearch: 100,
    maxElements: 1_000_000
  },
  quantization: 'scalar'
});
```

**Pattern 3: Async Initialization**
```javascript
const db = await VectorDB.create({
  dimensions: 1536,
  storagePath: './large-dataset.db',
  hnsw: { maxElements: 10_000_000 }
});
```

### 3.3 WASM Binding

**Pattern 1: In-Memory (Browser)**
```javascript
import { VectorDB } from '@ruvector/wasm';

await VectorDB.init(); // Load WASM module
const db = new VectorDB({
  dimensions: 384,
  // No storage_path in browser
});
```

**Pattern 2: With IndexedDB (Future)**
```javascript
const db = new VectorDB({
  dimensions: 768,
  storage: 'indexeddb',
  dbName: 'my-vectors'
});
```

### 3.4 CLI

**Pattern 1: Interactive Init**
```bash
ruvector create --dimensions 384 --path ./my-db.db
```

**Pattern 2: From Config File**
```bash
ruvector --config ./ruvector.toml create
```

**Pattern 3: Environment Variables**
```bash
export RUVECTOR_DIMENSIONS=768
export RUVECTOR_STORAGE_PATH=./embeddings.db
ruvector create
```

### 3.5 MCP Server

**Pattern 1: Initialize from MCP Call**
```json
{
  "method": "tools/call",
  "params": {
    "name": "vector_db_init",
    "arguments": {
      "dimensions": 384,
      "storage_path": "./vectors.db",
      "hnsw": { "m": 32, "ef_construction": 200 }
    }
  }
}
```

---

## 4. Configuration Schema

### 4.1 Core Configuration Structure

```rust
pub struct DbOptions {
    // Required
    pub dimensions: usize,

    // Optional with defaults
    pub distance_metric: DistanceMetric,     // Default: Cosine
    pub storage_path: String,                // Default: ":memory:"
    pub hnsw_config: Option<HnswConfig>,     // Default: Some(HnswConfig::default())
    pub quantization: Option<QuantizationConfig>, // Default: None
}

pub struct HnswConfig {
    pub m: usize,                    // Default: 32
    pub ef_construction: usize,      // Default: 200
    pub ef_search: usize,            // Default: 100
    pub max_elements: usize,         // Default: 10_000_000
}

pub enum QuantizationConfig {
    Scalar,                          // 8-bit quantization
    Product { subvectors: usize },   // Product quantization
}
```

### 4.2 TOML Configuration File Format

```toml
# ruvector.toml

[database]
storage_path = "./vectors.db"
dimensions = 768
distance_metric = "Cosine"

[database.hnsw]
m = 32
ef_construction = 200
ef_search = 100
max_elements = 1_000_000

[database.quantization]
type = "Scalar"

[cli]
progress = true
colors = true
batch_size = 1000

[mcp]
host = "127.0.0.1"
port = 3000
cors = true
```

### 4.3 Environment Variable Schema

```bash
# Core settings
RUVECTOR_DIMENSIONS=768
RUVECTOR_STORAGE_PATH=./embeddings.db
RUVECTOR_DISTANCE_METRIC=cosine

# HNSW settings
RUVECTOR_HNSW_M=32
RUVECTOR_HNSW_EF_CONSTRUCTION=200
RUVECTOR_HNSW_EF_SEARCH=100

# MCP server settings
RUVECTOR_MCP_HOST=0.0.0.0
RUVECTOR_MCP_PORT=3000
```

---

## 5. Validation and Error Handling

### 5.1 Validation Rules

**Dimension Validation**:
- Must be > 0
- Recommended: 128, 256, 384, 512, 768, 1024, 1536 (common embedding sizes)
- Warning if not power of 2 (SIMD optimization hint)

**HNSW Validation**:
- `m` range: 4-64 (optimal: 16-32)
- `ef_construction` ≥ `m`
- `ef_search` ≥ k (search k value)
- `max_elements` < 2^32

**Storage Validation**:
- Path writeable (if disk storage)
- Sufficient disk space (warning if < 1GB free)
- No conflicting processes accessing same file

**Quantization Validation**:
- `dimensions` must be divisible by `subvectors` (for PQ)
- Scalar quantization: dimensions * 1 byte (8-bit)
- Product quantization: dimensions / subvectors * 1 byte per subvector

### 5.2 Error Recovery Strategies

**Error Categories**:

1. **Configuration Errors** (fail-fast)
   - Invalid dimensions
   - Invalid HNSW parameters
   - Malformed config file
   - Action: Return error immediately

2. **Resource Errors** (graceful degradation)
   - Insufficient memory
   - Disk full
   - Action: Fall back to smaller config or in-memory

3. **Feature Errors** (feature detection)
   - HNSW not available (WASM)
   - Storage not available (WASM)
   - Action: Automatically fall back to available features

4. **State Errors** (recovery)
   - Corrupted index
   - Partial initialization
   - Action: Attempt cleanup and reinitialize

**Recovery Decision Tree**:
```
Error Detected
    │
    ├─► Configuration Error ──► Fail Fast (return Err)
    │
    ├─► HNSW Unavailable (WASM) ──► Fall back to FlatIndex
    │
    ├─► Storage Unavailable ──► Use MemoryStorage
    │
    ├─► Insufficient Memory ──► Reduce max_elements
    │
    └─► Corrupted State ──► Cleanup + Reinitialize
```

### 5.3 Error Types

```rust
#[derive(Debug, thiserror::Error)]
pub enum InitializationError {
    #[error("Invalid dimensions: {0}")]
    InvalidDimensions(usize),

    #[error("Invalid HNSW parameter: {0}")]
    InvalidHnswConfig(String),

    #[error("Storage initialization failed: {0}")]
    StorageError(#[from] StorageError),

    #[error("Index initialization failed: {0}")]
    IndexError(#[from] IndexError),

    #[error("Configuration conflict: {0}")]
    ConfigConflict(String),

    #[error("Feature not available: {0}")]
    FeatureUnavailable(String),

    #[error("Insufficient resources: {0}")]
    InsufficientResources(String),
}
```

---

## 6. Performance Considerations

### 6.1 Initialization Time Budget

**Target Metrics**:
- Small DB (< 10K vectors): < 100ms initialization
- Medium DB (10K-1M vectors): < 1s initialization
- Large DB (> 1M vectors): < 10s initialization

**Optimization Strategies**:
1. **Lazy Initialization**: Defer heavy operations until first use
2. **Parallel Resource Allocation**: Initialize storage and index concurrently
3. **Memory-Mapped Files**: Instant loading of existing databases
4. **Index Caching**: Persist HNSW graph structure

### 6.2 Memory Footprint

**Baseline Memory Requirements**:
```
Base overhead: ~10MB (Rust runtime + allocator)
Storage (per vector): dimensions * 4 bytes + metadata
HNSW index: vectors * m * 2 * 8 bytes (graph connections)
Cache: configurable (default: 100MB)
```

**Example Calculation** (1M vectors, 768 dimensions, HNSW m=32):
```
Vectors: 1M * 768 * 4 = 3,072 MB
HNSW graph: 1M * 32 * 2 * 8 = 512 MB
Metadata: ~100 MB
Total: ~3.7 GB
```

### 6.3 Startup Optimization

**Cold Start** (first time):
1. Create storage file
2. Initialize empty HNSW index
3. Ready in < 100ms

**Warm Start** (existing DB):
1. Memory-map storage file
2. Load HNSW graph structure
3. Ready in < 1s (even for 1M+ vectors)

---

## 7. Security Considerations

### 7.1 Path Traversal Prevention

```rust
pub fn validate_storage_path(path: &str) -> Result<PathBuf> {
    let canonical = std::fs::canonicalize(path)
        .or_else(|_| {
            // Path doesn't exist yet, validate parent
            let parent = Path::new(path).parent()
                .ok_or(InitializationError::InvalidPath)?;
            std::fs::canonicalize(parent)
        })?;

    // Ensure path is within allowed directories
    ensure_safe_path(&canonical)?;

    Ok(canonical)
}
```

### 7.2 Resource Limits

**Default Limits**:
- Max dimensions: 16,384
- Max vectors: 100M (adjustable)
- Max file size: 100GB (configurable)
- Max concurrent connections (MCP): 100

**DoS Prevention**:
- Rate limiting on initialization requests
- Memory allocation limits
- Timeout on initialization (default: 60s)

### 7.3 Data Validation

**Input Sanitization**:
- Validate vector dimensions match config
- Reject NaN/Infinity values in vectors
- Sanitize metadata keys (prevent injection)

---

## 8. Testing Strategy

### 8.1 Unit Tests

**Configuration Builder Tests**:
- Default value application
- Environment variable parsing
- Configuration file loading
- Precedence ordering
- Validation logic

**Resource Allocator Tests**:
- Storage initialization (disk and memory)
- Index creation (HNSW and Flat)
- Feature detection (WASM vs native)
- Cleanup and resource release

**Lifecycle Manager Tests**:
- State transitions
- Cleanup handler registration
- Shutdown ordering
- Error recovery

### 8.2 Integration Tests

**End-to-End Initialization**:
- Rust API initialization
- Node.js binding initialization
- WASM binding initialization
- CLI initialization
- MCP server initialization

**Cross-Environment Tests**:
- Same config across all environments
- Feature parity validation
- Performance consistency

### 8.3 Error Scenario Tests

- Invalid configuration
- Insufficient resources
- Corrupted state
- Feature unavailability
- Partial initialization
- Concurrent initialization

---

## 9. Migration and Backward Compatibility

### 9.1 Version Migration

**Database Format Versions**:
```rust
pub enum DbVersion {
    V1_0,  // Initial release
    V1_1,  // Added quantization
    V2_0,  // Breaking: New HNSW format
}

pub fn migrate(from: DbVersion, to: DbVersion) -> Result<()> {
    match (from, to) {
        (DbVersion::V1_0, DbVersion::V1_1) => migrate_1_0_to_1_1()?,
        (DbVersion::V1_1, DbVersion::V2_0) => migrate_1_1_to_2_0()?,
        _ => return Err(MigrationError::UnsupportedPath),
    }
    Ok(())
}
```

### 9.2 Configuration Evolution

**Deprecation Policy**:
- Mark deprecated options in v1.x
- Provide migration warnings
- Remove in v2.0
- Maintain shim layer for 2 major versions

---

## 10. Monitoring and Observability

### 10.1 Initialization Metrics

**Telemetry Points**:
- Initialization duration
- Configuration source (default/env/file)
- Features enabled (HNSW/quantization/etc)
- Resource allocation (memory/disk)
- Errors encountered

**Logging Levels**:
```rust
// ERROR: Initialization failed
log::error!("Failed to initialize VectorDB: {}", err);

// WARN: Fallback to degraded mode
log::warn!("HNSW unavailable, using FlatIndex");

// INFO: Successful initialization
log::info!("VectorDB initialized: {} dims, {} vectors", dims, count);

// DEBUG: Configuration details
log::debug!("Config: {:?}", options);

// TRACE: Step-by-step initialization
log::trace!("Step 1: Creating storage...");
```

### 10.2 Health Checks

```rust
pub struct HealthStatus {
    pub state: SystemState,
    pub storage_ok: bool,
    pub index_ok: bool,
    pub vector_count: usize,
    pub memory_usage: usize,
    pub disk_usage: Option<usize>,
}

impl VectorDB {
    pub fn health_check(&self) -> HealthStatus {
        // Verify storage accessible
        // Check index integrity
        // Report resource usage
    }
}
```

---

## 11. Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Implement ConfigBuilder
- [ ] Implement ResourceAllocator
- [ ] Implement LifecycleManager
- [ ] Add validation logic
- [ ] Unit tests for all components

### Phase 2: Multi-Environment Support (Week 3-4)
- [ ] Rust API patterns
- [ ] Node.js binding initialization
- [ ] WASM binding initialization
- [ ] CLI initialization flow
- [ ] Integration tests

### Phase 3: Advanced Features (Week 5-6)
- [ ] Error recovery strategies
- [ ] Configuration file support
- [ ] Environment variable parsing
- [ ] Migration system
- [ ] Performance optimization

### Phase 4: Production Readiness (Week 7-8)
- [ ] Security hardening
- [ ] Monitoring and telemetry
- [ ] Documentation
- [ ] Example projects
- [ ] Performance benchmarks

---

## 12. Risk Assessment and Mitigation

### 12.1 Technical Risks

**Risk 1: WASM Feature Limitations**
- **Impact**: Medium
- **Probability**: High
- **Mitigation**: Clear documentation of WASM constraints, automatic fallback to available features

**Risk 2: Configuration Complexity**
- **Impact**: Medium
- **Probability**: Medium
- **Mitigation**: Strong defaults, builder pattern, validation with helpful errors

**Risk 3: Resource Exhaustion**
- **Impact**: High
- **Probability**: Low
- **Mitigation**: Resource limits, validation, graceful degradation

**Risk 4: Breaking API Changes**
- **Impact**: High
- **Probability**: Low
- **Mitigation**: Semantic versioning, deprecation warnings, migration tools

### 12.2 Operational Risks

**Risk 5: Initialization Performance**
- **Impact**: Medium
- **Probability**: Medium
- **Mitigation**: Lazy initialization, benchmarking, optimization targets

**Risk 6: Backward Compatibility**
- **Impact**: High
- **Probability**: Medium
- **Mitigation**: Version detection, automatic migration, compatibility testing

---

## 13. Decision Records (ADRs)

### ADR-001: Use Builder Pattern for Configuration

**Context**: Multiple initialization patterns needed across environments

**Decision**: Implement builder pattern alongside direct DbOptions construction

**Rationale**:
- Fluent API improves developer experience
- Type safety at compile time
- Backward compatible with DbOptions struct
- Enables incremental configuration

**Consequences**:
- Additional API surface area
- Minor code duplication
- Better ergonomics outweigh complexity

---

### ADR-002: Automatic Feature Detection

**Context**: WASM builds lack HNSW and disk storage

**Decision**: Automatically fall back to available features

**Rationale**:
- Better user experience (no manual feature selection)
- Reduces configuration errors
- Clear logging of fallbacks

**Consequences**:
- Slightly more complex initialization logic
- Potential confusion if fallback is unexpected
- Mitigated by clear logging

---

### ADR-003: Configuration Precedence Order

**Context**: Multiple configuration sources (CLI, env, file, defaults)

**Decision**: Explicit > Environment > File > Defaults

**Rationale**:
- Matches common practice (Docker, AWS CLI, etc)
- Predictable behavior
- Allows overrides at deployment time

**Consequences**:
- Must document precedence clearly
- Potential for unexpected overrides if env vars set globally

---

## 14. References and Dependencies

### External Dependencies
- `clap`: CLI argument parsing
- `toml`: Configuration file parsing
- `serde`: Serialization framework
- `tracing`: Structured logging
- `anyhow/thiserror`: Error handling

### Internal Dependencies
- `ruvector-core`: Core vector database
- `ruvector-storage`: Storage backends
- `ruvector-index`: Index implementations

### Standards and Specifications
- TOML specification: https://toml.io/
- MCP specification: https://modelcontextprotocol.io/
- Semantic Versioning: https://semver.org/

---

## Appendix A: Code Examples

### Example 1: Complete Rust Initialization

```rust
use ruvector_core::{VectorDB, DbOptions, HnswConfig, DistanceMetric};

fn main() -> anyhow::Result<()> {
    // Method 1: Zero-config
    let db1 = VectorDB::with_dimensions(384)?;

    // Method 2: Builder pattern
    let db2 = VectorDB::builder()
        .dimensions(768)
        .distance_metric(DistanceMetric::Cosine)
        .storage_path("./embeddings.db")
        .enable_hnsw(HnswConfig {
            m: 32,
            ef_construction: 200,
            ef_search: 100,
            max_elements: 1_000_000,
        })
        .build()?;

    // Method 3: From config
    let options = DbOptions {
        dimensions: 1536,
        distance_metric: DistanceMetric::Euclidean,
        storage_path: "./vectors.db".to_string(),
        hnsw_config: Some(HnswConfig::default()),
        quantization: None,
    };
    let db3 = VectorDB::new(options)?;

    Ok(())
}
```

### Example 2: Node.js with Error Handling

```javascript
const { VectorDB } = require('@ruvector/node');

async function initializeDB() {
  try {
    const db = await VectorDB.create({
      dimensions: 768,
      storagePath: './embeddings.db',
      hnsw: {
        m: 32,
        efConstruction: 200,
        efSearch: 100
      }
    });

    console.log('Database initialized successfully');
    return db;
  } catch (err) {
    if (err.code === 'INVALID_DIMENSIONS') {
      console.error('Invalid dimensions specified');
    } else if (err.code === 'STORAGE_ERROR') {
      console.error('Failed to initialize storage:', err.message);
    } else {
      console.error('Unexpected error:', err);
    }
    throw err;
  }
}
```

---

## Appendix B: Configuration Templates

### Template 1: Development Configuration

```toml
# ruvector-dev.toml
[database]
storage_path = ":memory:"  # In-memory for fast iteration
dimensions = 384
distance_metric = "Cosine"

[database.hnsw]
m = 16                    # Smaller for dev
ef_construction = 100
ef_search = 50
max_elements = 100_000

[cli]
progress = true
colors = true
batch_size = 100

[mcp]
host = "127.0.0.1"
port = 3000
```

### Template 2: Production Configuration

```toml
# ruvector-prod.toml
[database]
storage_path = "/var/lib/ruvector/vectors.db"
dimensions = 1536
distance_metric = "Cosine"

[database.hnsw]
m = 32
ef_construction = 400     # Higher for better quality
ef_search = 200
max_elements = 100_000_000

[database.quantization]
type = "Scalar"           # Reduce memory by 4x

[cli]
progress = false          # No TTY in production
colors = false
batch_size = 10000

[mcp]
host = "0.0.0.0"
port = 3000
cors = false
```

---

**End of Architecture Document**

*This document serves as the authoritative reference for the Ruvector initialization system design. All implementation work should align with the specifications outlined herein.*
