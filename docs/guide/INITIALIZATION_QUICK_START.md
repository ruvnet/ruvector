# Initialization Quick Start

Fast-track guide to getting started with Ruvector's initialization system.

## 30-Second Quick Start

```rust
use ruvector_core::{init, database, VectorEntry};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize
    init()?;

    // Get database
    let db = database()?;

    // Insert vector
    db.insert(VectorEntry {
        id: Some("doc1".to_string()),
        vector: vec![0.1, 0.2, 0.3],
        metadata: None,
    })?;

    Ok(())
}
```

## Common Patterns

### Production Setup

```rust
use ruvector_core::{init_with_config, RuvectorConfig, Environment};

let config = RuvectorConfig::builder()
    .environment(Environment::Production)
    .dimensions(1536)
    .storage_path("/data/vectors.db")
    .log_level("info")
    .num_threads(16)
    .build()?;

init_with_config(config)?;
```

### Development Setup

```rust
let config = RuvectorConfig::builder()
    .environment(Environment::Development)
    .dimensions(768)
    .storage_path("./dev/vectors.db")
    .log_level("debug")
    .enable_hnsw(true)
    .build()?;

init_with_config(config)?;
```

### Multiple Databases

```rust
use ruvector_core::database_named;

let users_db = database_named("users")?;
let products_db = database_named("products")?;
```

### Graceful Shutdown

```rust
use ruvector_core::{on_shutdown, shutdown};

// Register cleanup
on_shutdown(|| {
    println!("Cleaning up...");
})?;

// Later: trigger shutdown
shutdown()?;
```

## Environment Variables

```bash
export RUVECTOR_ENV=production
export RUVECTOR_STORAGE_PATH=/data/vectors.db
export RUVECTOR_DIMENSIONS=1536
export RUVECTOR_LOG_LEVEL=info
export RUVECTOR_NUM_THREADS=16
```

## Configuration Presets

### Minimal (Testing)

```rust
RuvectorConfig::builder()
    .environment(Environment::Testing)
    .dimensions(128)
    .enable_hnsw(false)
    .build()?
```

### Balanced (Development)

```rust
RuvectorConfig::builder()
    .environment(Environment::Development)
    .dimensions(768)
    .enable_hnsw(true)
    .num_threads(4)
    .build()?
```

### Optimized (Production)

```rust
RuvectorConfig::builder()
    .environment(Environment::Production)
    .dimensions(1536)
    .enable_hnsw(true)
    .enable_simd(true)
    .num_threads(16)
    .enable_telemetry(true)
    .build()?
```

## Complete Example

```rust
use ruvector_core::{
    init_with_config, database, on_shutdown, shutdown,
    RuvectorConfig, Environment, VectorEntry, SearchQuery,
};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1. Configure
    let config = RuvectorConfig::builder()
        .environment(Environment::Production)
        .dimensions(1536)
        .storage_path("/data/vectors.db")
        .build()?;

    // 2. Initialize
    init_with_config(config)?;

    // 3. Setup cleanup
    on_shutdown(|| {
        println!("Shutting down gracefully...");
    })?;

    // 4. Use database
    let db = database()?;

    db.insert(VectorEntry {
        id: Some("doc1".to_string()),
        vector: vec![0.1; 1536],
        metadata: None,
    })?;

    let results = db.search(SearchQuery {
        vector: vec![0.1; 1536],
        k: 10,
        filter: None,
        ef_search: None,
    })?;

    println!("Found {} results", results.len());

    // 5. Shutdown
    shutdown()?;

    Ok(())
}
```

## Next Steps

- **Full Documentation**: [INITIALIZATION.md](./INITIALIZATION.md)
- **API Reference**: [../api/RUST_API.md](../api/RUST_API.md)
- **Examples**:
  - [examples/initialization_demo.rs](../../examples/initialization_demo.rs)
  - [examples/config_demo.rs](../../examples/config_demo.rs)
