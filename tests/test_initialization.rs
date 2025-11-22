//! Integration tests for initialization system

use ruvector_core::{
    init, init_with_config, database, database_named, on_shutdown,
    health_check, shutdown, RuvectorConfig, Environment,
    VectorEntry, SearchQuery,
};

#[test]
fn test_basic_initialization() {
    // Clean up any previous state
    let _ = shutdown();

    // Initialize with defaults
    let result = init();
    assert!(result.is_ok(), "Initialization should succeed");

    // Verify health
    let health = health_check().unwrap();
    assert!(health.initialized, "Runtime should be initialized");

    // Cleanup
    shutdown().unwrap();
}

#[test]
fn test_custom_configuration() {
    let _ = shutdown();

    // Create custom config
    let config = RuvectorConfig::builder()
        .environment(Environment::Testing)
        .dimensions(128)
        .storage_path("./test_custom.db")
        .log_level("error")
        .num_threads(2)
        .enable_hnsw(false)
        .build()
        .unwrap();

    // Initialize
    init_with_config(config).unwrap();

    // Verify
    let health = health_check().unwrap();
    assert_eq!(health.environment, Environment::Testing);

    shutdown().unwrap();
}

#[test]
fn test_database_creation() {
    let _ = shutdown();

    let config = RuvectorConfig::builder()
        .environment(Environment::Testing)
        .dimensions(3)
        .storage_path("./test_db_creation.db")
        .build()
        .unwrap();

    init_with_config(config).unwrap();

    // Get default database
    let db = database().unwrap();
    assert!(db.is_empty().unwrap());

    // Insert a vector
    let entry = VectorEntry {
        id: Some("test1".to_string()),
        vector: vec![1.0, 2.0, 3.0],
        metadata: None,
    };

    db.insert(entry).unwrap();
    assert_eq!(db.len().unwrap(), 1);

    shutdown().unwrap();
}

#[test]
fn test_multiple_databases() {
    let _ = shutdown();

    let config = RuvectorConfig::builder()
        .environment(Environment::Testing)
        .dimensions(2)
        .storage_path("./test_multi.db")
        .build()
        .unwrap();

    init_with_config(config).unwrap();

    // Create multiple named databases
    let db1 = database_named("database1").unwrap();
    let db2 = database_named("database2").unwrap();

    // Verify they're separate
    db1.insert(VectorEntry {
        id: Some("v1".to_string()),
        vector: vec![1.0, 2.0],
        metadata: None,
    }).unwrap();

    assert_eq!(db1.len().unwrap(), 1);
    assert_eq!(db2.len().unwrap(), 0);

    // Verify health shows 2 databases
    let health = health_check().unwrap();
    assert_eq!(health.database_count, 2);

    shutdown().unwrap();
}

#[test]
fn test_shutdown_hooks() {
    let _ = shutdown();

    let config = RuvectorConfig::builder()
        .environment(Environment::Testing)
        .dimensions(2)
        .storage_path("./test_hooks.db")
        .build()
        .unwrap();

    init_with_config(config).unwrap();

    // Register shutdown hook
    use std::sync::Arc;
    use std::sync::atomic::{AtomicBool, Ordering};

    let hook_called = Arc::new(AtomicBool::new(false));
    let hook_called_clone = Arc::clone(&hook_called);

    on_shutdown(move || {
        hook_called_clone.store(true, Ordering::SeqCst);
    }).unwrap();

    // Trigger shutdown
    shutdown().unwrap();

    // Verify hook was called
    assert!(hook_called.load(Ordering::SeqCst), "Shutdown hook should be called");
}

#[test]
fn test_configuration_validation() {
    // Test invalid dimensions
    let mut config = RuvectorConfig::default();
    config.database.dimensions = 0;
    assert!(config.validate().is_err());

    // Test invalid threads
    config.database.dimensions = 128;
    config.performance.num_threads = 0;
    assert!(config.validate().is_err());

    // Test valid config
    config.performance.num_threads = 4;
    assert!(config.validate().is_ok());
}

#[test]
fn test_environment_detection() {
    // Test current environment detection
    let env = Environment::current();
    assert!(matches!(
        env,
        Environment::Development | Environment::Production | Environment::Testing
    ));

    // Test environment checks
    assert_eq!(Environment::Development.is_development(), true);
    assert_eq!(Environment::Production.is_production(), true);
    assert_eq!(Environment::Testing.is_testing(), true);
}

#[test]
fn test_config_builder() {
    let config = RuvectorConfig::builder()
        .environment(Environment::Testing)
        .dimensions(256)
        .storage_path("./test_builder.db")
        .log_level("debug")
        .num_threads(8)
        .enable_hnsw(true)
        .enable_simd(true)
        .enable_telemetry(false)
        .build()
        .unwrap();

    assert_eq!(config.database.dimensions, 256);
    assert_eq!(config.performance.num_threads, 8);
    assert_eq!(config.database.enable_hnsw, true);
    assert_eq!(config.performance.enable_simd, true);
    assert_eq!(config.features.telemetry, false);
}

#[test]
fn test_health_check() {
    let _ = shutdown();

    let config = RuvectorConfig::builder()
        .environment(Environment::Testing)
        .dimensions(2)
        .storage_path("./test_health.db")
        .build()
        .unwrap();

    init_with_config(config).unwrap();

    let health = health_check().unwrap();
    assert!(health.initialized);
    assert_eq!(health.environment, Environment::Testing);
    assert_eq!(health.database_count, 0);

    // Create a database
    let _db = database().unwrap();

    let health2 = health_check().unwrap();
    assert_eq!(health2.database_count, 1);

    shutdown().unwrap();
}

#[test]
fn test_double_initialization_fails() {
    let _ = shutdown();

    let config = RuvectorConfig::builder()
        .environment(Environment::Testing)
        .dimensions(2)
        .storage_path("./test_double.db")
        .build()
        .unwrap();

    // First initialization should succeed
    assert!(init_with_config(config.clone()).is_ok());

    // Second initialization should fail
    assert!(init_with_config(config).is_err());

    shutdown().unwrap();
}

#[test]
fn test_database_before_init_fails() {
    let _ = shutdown();

    // Trying to get database before init should fail
    let result = database();
    assert!(result.is_err());
}

#[test]
fn test_config_file_save_load() {
    use std::path::PathBuf;

    let config = RuvectorConfig::builder()
        .environment(Environment::Production)
        .dimensions(768)
        .storage_path("/data/vectors.db")
        .build()
        .unwrap();

    let temp_path = PathBuf::from("./config/test_config.json");

    // Create directory
    if let Some(parent) = temp_path.parent() {
        std::fs::create_dir_all(parent).ok();
    }

    // Save
    config.save_to_file(&temp_path).unwrap();

    // Load
    let loaded = RuvectorConfig::from_file(&temp_path).unwrap();

    assert_eq!(loaded.database.dimensions, 768);
    assert_eq!(loaded.environment, Environment::Production);

    // Cleanup
    std::fs::remove_file(&temp_path).ok();
}
