# Ruvector Initialization System

Complete guide to initializing and configuring Ruvector for production use.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Configuration](#configuration)
3. [Environment Management](#environment-management)
4. [Database Lifecycle](#database-lifecycle)
5. [Logging and Tracing](#logging-and-tracing)
6. [Graceful Shutdown](#graceful-shutdown)
7. [Best Practices](#best-practices)
8. [API Reference](#api-reference)

## Quick Start

### Basic Initialization

```rust
use ruvector_core::{init, database};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize with defaults from environment
    init()?;

    // Get database instance
    let db = database()?;

    // Use database...

    Ok(())
}
```

### Custom Configuration

```rust
use ruvector_core::{init_with_config, RuvectorConfig, Environment};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Build custom configuration
    let config = RuvectorConfig::builder()
        .environment(Environment::Production)
        .dimensions(1536)
        .storage_path("/data/vectors.db")
        .log_level("info")
        .num_threads(8)
        .build()?;

    // Initialize with custom config
    init_with_config(config)?;

    Ok(())
}
```

## Configuration

### Configuration Builder

The `ConfigBuilder` provides a fluent API for creating configurations:

```rust
let config = RuvectorConfig::builder()
    .environment(Environment::Production)
    .storage_path("/data/production.db")
    .dimensions(768)
    .distance_metric(DistanceMetric::Cosine)
    .enable_hnsw(true)
    .log_level("warn")
    .num_threads(16)
    .enable_simd(true)
    .enable_telemetry(true)
    .build()?;
```

### Configuration Structure

```rust
pub struct RuvectorConfig {
    pub environment: Environment,
    pub database: DatabaseConfig,
    pub logging: LoggingConfig,
    pub performance: PerformanceConfig,
    pub features: FeatureFlags,
}
```

### Database Configuration

```rust
pub struct DatabaseConfig {
    pub storage_path: PathBuf,
    pub dimensions: usize,
    pub distance_metric: DistanceMetric,
    pub enable_hnsw: bool,
    pub hnsw_config: Option<HnswConfig>,
    pub max_size_bytes: Option<usize>,
    pub enable_mmap: bool,
}
```

### Performance Configuration

```rust
pub struct PerformanceConfig {
    pub num_threads: usize,
    pub enable_simd: bool,
    pub batch_size: usize,
    pub cache_size: usize,
    pub enable_cache: bool,
}
```

### Feature Flags

```rust
pub struct FeatureFlags {
    pub telemetry: bool,
    pub experimental: bool,
    pub agenticdb_compat: bool,
    pub quantization: bool,
}
```

## Environment Management

Ruvector supports three environments with different defaults:

### Development

```rust
Environment::Development
```

- Debug logging enabled
- Smaller thread pools
- File-based logging disabled
- Console colors enabled
- Relaxed performance settings

### Production

```rust
Environment::Production
```

- Info-level logging
- JSON structured logging
- Maximum thread utilization
- File-based logging
- Optimized performance
- Size limits enforced

### Testing

```rust
Environment::Testing
```

- Error-level logging only
- Minimal resource usage
- HNSW disabled for speed
- In-memory storage preferred
- No caching

### Environment Detection

```rust
// Automatic detection from RUVECTOR_ENV
let env = Environment::current();

// Manual setting
std::env::set_var("RUVECTOR_ENV", "production");
```

### Environment Variables

Override configuration with environment variables:

```bash
# Environment
export RUVECTOR_ENV=production

# Database
export RUVECTOR_STORAGE_PATH=/data/vectors.db
export RUVECTOR_DIMENSIONS=1536

# Logging
export RUVECTOR_LOG_LEVEL=info

# Performance
export RUVECTOR_NUM_THREADS=16
```

## Database Lifecycle

### Single Database

```rust
use ruvector_core::{init, database};

// Initialize runtime
init()?;

// Get default database
let db = database()?;

// Use database
db.insert(entry)?;
```

### Multiple Named Databases

```rust
use ruvector_core::{init, database_named};

init()?;

// Create separate databases for different purposes
let user_vectors = database_named("users")?;
let product_vectors = database_named("products")?;
let search_vectors = database_named("search")?;

// Each database is independent
user_vectors.insert(user_entry)?;
product_vectors.insert(product_entry)?;
```

### Database Health Check

```rust
use ruvector_core::health_check;

let health = health_check()?;
println!("Initialized: {}", health.initialized);
println!("Database count: {}", health.database_count);
println!("Environment: {:?}", health.environment);
```

## Logging and Tracing

### Log Levels

- `error`: Critical errors only
- `warn`: Warnings and errors
- `info`: Informational messages (production default)
- `debug`: Debug information (development default)
- `trace`: Detailed execution traces

### Console Logging

```rust
let config = RuvectorConfig::builder()
    .log_level("debug")
    .build()?;

init_with_config(config)?;
```

### JSON Logging (Production)

```rust
let config = RuvectorConfig::builder()
    .environment(Environment::Production)
    .build()?;

// Automatically enables JSON logging in production
init_with_config(config)?;
```

### Structured Logging

```rust
use tracing::{info, debug, error};

info!("Database initialized with {} vectors", count);
debug!(vector_id = %id, "Inserting vector");
error!(error = ?e, "Failed to insert vector");
```

## Graceful Shutdown

### Automatic Signal Handling

On Unix systems, Ruvector automatically handles SIGTERM, SIGINT, and SIGQUIT:

```rust
init()?; // Signal handlers registered automatically

// ... application runs ...

// Ctrl+C triggers graceful shutdown
```

### Manual Shutdown

```rust
use ruvector_core::shutdown;

// Explicit shutdown
shutdown()?;
```

### Shutdown Hooks

Register custom cleanup logic:

```rust
use ruvector_core::on_shutdown;

// Register cleanup function
on_shutdown(|| {
    println!("Cleaning up resources...");
    // Close connections
    // Flush buffers
    // Save state
})?;
```

### Multiple Shutdown Hooks

```rust
// First hook
on_shutdown(|| {
    println!("Closing database connections...");
})?;

// Second hook
on_shutdown(|| {
    println!("Flushing metrics...");
})?;

// Third hook
on_shutdown(|| {
    println!("Final cleanup...");
})?;

// All hooks execute in order during shutdown
```

## Best Practices

### 1. Initialize Once

```rust
// ✅ Good: Initialize at application start
fn main() -> Result<()> {
    init()?;
    run_application()?;
    shutdown()
}

// ❌ Bad: Multiple initializations
fn handler() {
    init()?; // Error: already initialized
}
```

### 2. Use Environment-Specific Configs

```rust
// ✅ Good: Different configs per environment
let config = match Environment::current() {
    Environment::Production => RuvectorConfig::builder()
        .log_level("warn")
        .num_threads(16)
        .enable_telemetry(true)
        .build()?,
    Environment::Development => RuvectorConfig::builder()
        .log_level("debug")
        .num_threads(4)
        .build()?,
    _ => RuvectorConfig::default(),
};
```

### 3. Validate Configuration

```rust
// ✅ Good: Validate before use
let config = RuvectorConfig::builder()
    .dimensions(1536)
    .build()?; // Validates automatically

config.validate()?; // Explicit validation
```

### 4. Handle Errors Gracefully

```rust
// ✅ Good: Proper error handling
match init_with_config(config) {
    Ok(_) => println!("Initialized successfully"),
    Err(e) => {
        eprintln!("Initialization failed: {}", e);
        std::process::exit(1);
    }
}
```

### 5. Use Named Databases

```rust
// ✅ Good: Separate concerns
let user_db = database_named("users")?;
let product_db = database_named("products")?;

// ❌ Bad: Everything in default database
let db = database()?;
```

### 6. Register Shutdown Hooks Early

```rust
// ✅ Good: Register hooks after initialization
init()?;

on_shutdown(|| {
    cleanup_resources();
})?;

// ... rest of application
```

## API Reference

### Initialization Functions

```rust
// Initialize with environment defaults
pub fn init() -> Result<()>

// Initialize with custom configuration
pub fn init_with_config(config: RuvectorConfig) -> Result<()>

// Get runtime instance
pub fn runtime() -> Result<Arc<RwLock<RuvectorRuntime>>>

// Get default database
pub fn database() -> Result<Arc<VectorDB>>

// Get named database
pub fn database_named(name: &str) -> Result<Arc<VectorDB>>

// Register shutdown hook
pub fn on_shutdown<F>(hook: F) -> Result<()>
where F: Fn() + Send + Sync + 'static

// Shutdown runtime
pub fn shutdown() -> Result<()>

// Health check
pub fn health_check() -> Result<HealthStatus>
```

### Configuration Types

```rust
pub struct RuvectorConfig { ... }
pub struct ConfigBuilder { ... }
pub struct DatabaseConfig { ... }
pub struct LoggingConfig { ... }
pub struct PerformanceConfig { ... }
pub struct FeatureFlags { ... }

pub enum Environment {
    Development,
    Production,
    Testing,
}

pub struct HealthStatus {
    pub initialized: bool,
    pub database_count: usize,
    pub environment: Environment,
}
```

## Examples

See complete examples:
- [`examples/initialization_demo.rs`](../../examples/initialization_demo.rs) - Full initialization demo
- [`examples/config_demo.rs`](../../examples/config_demo.rs) - Configuration management

## Troubleshooting

### Already Initialized Error

```
Error: Ruvector already initialized
```

**Solution**: Only call `init()` once at application startup.

### Invalid Configuration

```
Error: dimensions must be greater than 0
```

**Solution**: Ensure all configuration values are valid before building.

### Signal Handler Registration Failed

```
Error: Failed to register signals
```

**Solution**: Check that your platform supports Unix signals. Signal handling is optional and only available on Unix systems.

## Next Steps

- [Advanced Features](./ADVANCED_FEATURES.md)
- [Performance Tuning](../optimization/PERFORMANCE_TUNING_GUIDE.md)
- [API Reference](../api/RUST_API.md)
