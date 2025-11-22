//! Configuration management demo
//!
//! Shows different ways to load and manage configuration

use ruvector_core::{RuvectorConfig, Environment, DistanceMetric};
use std::path::PathBuf;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== Ruvector Configuration Demo ===\n");

    // Example 1: Default configuration
    println!("1. Default configuration:");
    let default_config = RuvectorConfig::default();
    println!("   Environment: {:?}", default_config.environment);
    println!("   Dimensions: {}", default_config.database.dimensions);
    println!("   Log level: {}", default_config.logging.level);
    println!("   Threads: {}", default_config.performance.num_threads);

    // Example 2: Builder pattern
    println!("\n2. Building custom configuration:");
    let custom_config = RuvectorConfig::builder()
        .environment(Environment::Production)
        .dimensions(768)
        .storage_path("/data/production.db")
        .distance_metric(DistanceMetric::Cosine)
        .log_level("warn")
        .num_threads(8)
        .enable_hnsw(true)
        .enable_simd(true)
        .enable_telemetry(true)
        .build()?;

    println!("   Environment: {:?}", custom_config.environment);
    println!("   Dimensions: {}", custom_config.database.dimensions);
    println!("   Distance metric: {:?}", custom_config.database.distance_metric);
    println!("   HNSW enabled: {}", custom_config.database.enable_hnsw);

    // Example 3: Environment-specific defaults
    println!("\n3. Environment-specific configurations:");

    for env in [Environment::Development, Environment::Production, Environment::Testing] {
        let config = RuvectorConfig::builder()
            .environment(env)
            .dimensions(1536)
            .build()?;

        println!("\n   {:?} environment:", env);
        println!("     - Storage path: {:?}", config.database.storage_path);
        println!("     - Log level: {}", config.logging.level);
        println!("     - JSON logging: {}", config.logging.json_format);
        println!("     - HNSW enabled: {}", config.database.enable_hnsw);
        println!("     - Threads: {}", config.performance.num_threads);
    }

    // Example 4: Save and load from file
    println!("\n4. Saving configuration to file:");
    let temp_path = PathBuf::from("./config/demo_config.json");

    // Create directory if it doesn't exist
    if let Some(parent) = temp_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    custom_config.save_to_file(&temp_path)?;
    println!("   ✓ Saved to {:?}", temp_path);

    println!("\n5. Loading configuration from file:");
    let loaded_config = RuvectorConfig::from_file(&temp_path)?;
    println!("   ✓ Loaded from {:?}", temp_path);
    println!("   Dimensions: {}", loaded_config.database.dimensions);
    println!("   Environment: {:?}", loaded_config.environment);

    // Example 6: Configuration validation
    println!("\n6. Configuration validation:");
    let mut invalid_config = RuvectorConfig::default();
    invalid_config.database.dimensions = 0; // Invalid!

    match invalid_config.validate() {
        Ok(_) => println!("   ✓ Configuration is valid"),
        Err(e) => println!("   ✗ Validation failed: {}", e),
    }

    // Example 7: Environment variable override
    println!("\n7. Environment variable support:");
    println!("   Set these environment variables to override defaults:");
    println!("   - RUVECTOR_ENV=production");
    println!("   - RUVECTOR_STORAGE_PATH=/custom/path.db");
    println!("   - RUVECTOR_DIMENSIONS=1536");
    println!("   - RUVECTOR_LOG_LEVEL=debug");
    println!("   - RUVECTOR_NUM_THREADS=16");

    // Example 8: Feature flags
    println!("\n8. Feature flags:");
    println!("   Telemetry: {}", custom_config.features.telemetry);
    println!("   Experimental: {}", custom_config.features.experimental);
    println!("   AgenticDB compat: {}", custom_config.features.agenticdb_compat);
    println!("   Quantization: {}", custom_config.features.quantization);

    // Cleanup
    let _ = std::fs::remove_file(&temp_path);

    println!("\n=== Demo Complete ===");
    Ok(())
}
