//! Initialization module for Ruvector
//!
//! Provides a centralized initialization system with:
//! - Logging and tracing setup
//! - Configuration loading
//! - Database connection management
//! - Graceful shutdown handling
//! - Health checks

use crate::config::{RuvectorConfig, LoggingConfig};
use crate::error::{Result, RuvectorError};
use crate::vector_db::VectorDB;
use once_cell::sync::OnceCell;
use parking_lot::RwLock;
use std::sync::Arc;
use std::collections::HashMap;
use tracing_subscriber::{EnvFilter, fmt, prelude::*};

/// Global Ruvector instance holder
static RUVECTOR_INSTANCE: OnceCell<Arc<RwLock<RuvectorRuntime>>> = OnceCell::new();

/// Main runtime for Ruvector with lifecycle management
pub struct RuvectorRuntime {
    config: RuvectorConfig,
    databases: HashMap<String, Arc<VectorDB>>,
    shutdown_hooks: Vec<Box<dyn Fn() + Send + Sync>>,
    initialized: bool,
}

impl RuvectorRuntime {
    /// Create a new runtime with the given configuration
    fn new(config: RuvectorConfig) -> Self {
        Self {
            config,
            databases: HashMap::new(),
            shutdown_hooks: Vec::new(),
            initialized: false,
        }
    }

    /// Check if runtime is initialized
    pub fn is_initialized(&self) -> bool {
        self.initialized
    }

    /// Get configuration
    pub fn config(&self) -> &RuvectorConfig {
        &self.config
    }

    /// Get or create a database instance
    pub fn database(&mut self, name: &str) -> Result<Arc<VectorDB>> {
        if let Some(db) = self.databases.get(name) {
            return Ok(Arc::clone(db));
        }

        // Create new database instance
        let db_options = self.config.to_db_options();
        let db = VectorDB::new(db_options)?;
        let db_arc = Arc::new(db);

        self.databases.insert(name.to_string(), Arc::clone(&db_arc));
        Ok(db_arc)
    }

    /// Register a shutdown hook
    pub fn on_shutdown<F>(&mut self, hook: F)
    where
        F: Fn() + Send + Sync + 'static,
    {
        self.shutdown_hooks.push(Box::new(hook));
    }

    /// Execute shutdown hooks
    fn shutdown(&mut self) {
        tracing::info!("Executing shutdown hooks...");
        for hook in &self.shutdown_hooks {
            hook();
        }
        self.databases.clear();
        self.initialized = false;
        tracing::info!("Shutdown complete");
    }
}

/// Initialize Ruvector with default configuration
pub fn init() -> Result<()> {
    let config = RuvectorConfig::from_env()?;
    init_with_config(config)
}

/// Initialize Ruvector with custom configuration
pub fn init_with_config(config: RuvectorConfig) -> Result<()> {
    // Validate configuration
    config.validate()?;

    // Initialize logging first
    init_logging(&config.logging)?;

    tracing::info!("Initializing Ruvector runtime");
    tracing::debug!("Configuration: {:?}", config);

    // Create runtime
    let mut runtime = RuvectorRuntime::new(config);
    runtime.initialized = true;

    // Store global instance
    if RUVECTOR_INSTANCE.set(Arc::new(RwLock::new(runtime))).is_err() {
        return Err(RuvectorError::Configuration(
            "Ruvector already initialized".to_string(),
        ));
    }

    // Register signal handlers for graceful shutdown
    #[cfg(unix)]
    register_signal_handlers()?;

    tracing::info!("Ruvector runtime initialized successfully");
    Ok(())
}

/// Initialize logging subsystem
fn init_logging(config: &LoggingConfig) -> Result<()> {
    // Parse log level
    let env_filter = EnvFilter::try_from_default_env()
        .or_else(|_| EnvFilter::try_new(&config.level))
        .map_err(|e| {
            RuvectorError::Configuration(format!("Invalid log level: {}", e))
        })?;

    // Build subscriber
    let fmt_layer = if config.json_format {
        fmt::layer().json().with_filter(env_filter)
    } else {
        fmt::layer()
            .with_ansi(config.enable_colors)
            .with_filter(env_filter)
    };

    // Initialize global subscriber
    tracing_subscriber::registry()
        .with(fmt_layer)
        .try_init()
        .map_err(|e| {
            RuvectorError::Configuration(format!("Failed to initialize logging: {}", e))
        })?;

    Ok(())
}

/// Register Unix signal handlers for graceful shutdown
#[cfg(unix)]
fn register_signal_handlers() -> Result<()> {
    use signal_hook::consts::signal::*;
    use signal_hook::iterator::Signals;
    use std::thread;

    let mut signals = Signals::new(&[SIGTERM, SIGINT, SIGQUIT])
        .map_err(|e| RuvectorError::Configuration(format!("Failed to register signals: {}", e)))?;

    thread::spawn(move || {
        for sig in signals.forever() {
            tracing::warn!("Received signal: {:?}, initiating shutdown", sig);
            let _ = shutdown();
            std::process::exit(0);
        }
    });

    Ok(())
}

/// Get the global Ruvector runtime
pub fn runtime() -> Result<Arc<RwLock<RuvectorRuntime>>> {
    RUVECTOR_INSTANCE
        .get()
        .cloned()
        .ok_or_else(|| RuvectorError::Configuration("Ruvector not initialized".to_string()))
}

/// Get or create the default database
pub fn database() -> Result<Arc<VectorDB>> {
    let runtime = runtime()?;
    let mut runtime_guard = runtime.write();
    runtime_guard.database("default")
}

/// Get or create a named database
pub fn database_named(name: &str) -> Result<Arc<VectorDB>> {
    let runtime = runtime()?;
    let mut runtime_guard = runtime.write();
    runtime_guard.database(name)
}

/// Register a shutdown hook
pub fn on_shutdown<F>(hook: F) -> Result<()>
where
    F: Fn() + Send + Sync + 'static,
{
    let runtime = runtime()?;
    let mut runtime_guard = runtime.write();
    runtime_guard.on_shutdown(hook);
    Ok(())
}

/// Shutdown Ruvector runtime
pub fn shutdown() -> Result<()> {
    tracing::info!("Shutting down Ruvector runtime");

    if let Some(runtime) = RUVECTOR_INSTANCE.get() {
        let mut runtime_guard = runtime.write();
        runtime_guard.shutdown();
    }

    Ok(())
}

/// Health check for the runtime
pub fn health_check() -> Result<HealthStatus> {
    let runtime = runtime()?;
    let runtime_guard = runtime.read();

    Ok(HealthStatus {
        initialized: runtime_guard.is_initialized(),
        database_count: runtime_guard.databases.len(),
        environment: runtime_guard.config.environment,
    })
}

/// Health status information
#[derive(Debug, Clone)]
pub struct HealthStatus {
    /// Whether runtime is initialized
    pub initialized: bool,
    /// Number of active databases
    pub database_count: usize,
    /// Current environment
    pub environment: crate::config::Environment,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::Environment;

    #[test]
    fn test_init_and_shutdown() {
        // Clean up any previous state
        let _ = shutdown();

        // Initialize with test config
        let config = RuvectorConfig::builder()
            .environment(Environment::Testing)
            .dimensions(128)
            .storage_path("./test_init.db")
            .build()
            .unwrap();

        assert!(init_with_config(config).is_ok());

        // Verify initialization
        let health = health_check().unwrap();
        assert!(health.initialized);

        // Shutdown
        assert!(shutdown().is_ok());
    }

    #[test]
    fn test_database_creation() {
        // Clean up any previous state
        let _ = shutdown();

        // Initialize
        let config = RuvectorConfig::builder()
            .environment(Environment::Testing)
            .dimensions(128)
            .storage_path("./test_db.db")
            .build()
            .unwrap();

        init_with_config(config).unwrap();

        // Get database
        let db = database().unwrap();
        assert!(db.is_empty().unwrap());

        // Cleanup
        let _ = shutdown();
    }
}
