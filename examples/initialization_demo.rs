//! Demonstration of Ruvector initialization system
//!
//! This example shows how to:
//! - Initialize Ruvector with configuration
//! - Use environment-based settings
//! - Create multiple database instances
//! - Register shutdown hooks
//! - Perform health checks

use ruvector_core::{
    init_with_config, database, database_named, on_shutdown, health_check, shutdown,
    RuvectorConfig, Environment, VectorEntry, SearchQuery,
};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== Ruvector Initialization Demo ===\n");

    // Example 1: Initialize with builder pattern
    println!("1. Creating configuration with builder...");
    let config = RuvectorConfig::builder()
        .environment(Environment::Development)
        .dimensions(384) // Smaller embeddings for demo
        .storage_path("./demo_ruvector.db")
        .log_level("info")
        .num_threads(4)
        .enable_hnsw(true)
        .enable_telemetry(false)
        .build()?;

    println!("   ✓ Configuration created");
    println!("   - Environment: {:?}", config.environment);
    println!("   - Dimensions: {}", config.database.dimensions);
    println!("   - Storage path: {:?}", config.database.storage_path);

    // Example 2: Initialize Ruvector runtime
    println!("\n2. Initializing Ruvector runtime...");
    init_with_config(config)?;
    println!("   ✓ Runtime initialized");

    // Example 3: Register shutdown hook
    println!("\n3. Registering shutdown hook...");
    on_shutdown(|| {
        println!("   🔔 Shutdown hook executed - cleaning up resources");
    })?;
    println!("   ✓ Shutdown hook registered");

    // Example 4: Get default database
    println!("\n4. Getting default database...");
    let db = database()?;
    println!("   ✓ Database acquired");
    println!("   - Empty: {}", db.is_empty()?);

    // Example 5: Insert some vectors
    println!("\n5. Inserting sample vectors...");
    let vectors = vec![
        VectorEntry {
            id: Some("vec1".to_string()),
            vector: vec![0.1, 0.2, 0.3, 0.4],
            metadata: None,
        },
        VectorEntry {
            id: Some("vec2".to_string()),
            vector: vec![0.5, 0.6, 0.7, 0.8],
            metadata: None,
        },
        VectorEntry {
            id: Some("vec3".to_string()),
            vector: vec![0.9, 0.8, 0.7, 0.6],
            metadata: None,
        },
    ];

    for entry in vectors {
        db.insert(entry)?;
    }
    println!("   ✓ Inserted 3 vectors");
    println!("   - Total vectors: {}", db.len()?);

    // Example 6: Search for similar vectors
    println!("\n6. Searching for similar vectors...");
    let query = SearchQuery {
        vector: vec![0.1, 0.2, 0.3, 0.4],
        k: 2,
        filter: None,
        ef_search: None,
    };

    let results = db.search(query)?;
    println!("   ✓ Found {} results:", results.len());
    for (i, result) in results.iter().enumerate() {
        println!("      {}. ID: {}, Score: {:.4}", i + 1, result.id, result.score);
    }

    // Example 7: Create a named database
    println!("\n7. Creating named database 'analytics'...");
    let analytics_db = database_named("analytics")?;
    println!("   ✓ Analytics database created");
    println!("   - Empty: {}", analytics_db.is_empty()?);

    // Example 8: Health check
    println!("\n8. Running health check...");
    let health = health_check()?;
    println!("   ✓ Health check passed");
    println!("   - Initialized: {}", health.initialized);
    println!("   - Database count: {}", health.database_count);
    println!("   - Environment: {:?}", health.environment);

    // Example 9: Graceful shutdown
    println!("\n9. Initiating graceful shutdown...");
    shutdown()?;
    println!("   ✓ Shutdown complete");

    println!("\n=== Demo Complete ===");
    Ok(())
}
