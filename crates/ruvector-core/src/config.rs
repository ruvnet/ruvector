//! Configuration module for Ruvector initialization
//!
//! Provides environment-aware configuration management with support for:
//! - Multiple environments (development, production, testing)
//! - Environment variable overrides
//! - Type-safe configuration builders
//! - Validation and defaults

use crate::error::{Result, RuvectorError};
use crate::types::{DbOptions, DistanceMetric, HnswConfig};
use serde::{Deserialize, Serialize};
use std::env;
use std::path::PathBuf;

/// Runtime environment
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Environment {
    /// Development environment with debug settings
    Development,
    /// Production environment with optimized settings
    Production,
    /// Testing environment with isolated settings
    Testing,
}

impl Environment {
    /// Get current environment from RUVECTOR_ENV or default to Development
    pub fn current() -> Self {
        match env::var("RUVECTOR_ENV")
            .unwrap_or_else(|_| "development".to_string())
            .to_lowercase()
            .as_str()
        {
            "production" | "prod" => Environment::Production,
            "testing" | "test" => Environment::Testing,
            _ => Environment::Development,
        }
    }

    /// Check if running in development mode
    pub fn is_development(&self) -> bool {
        matches!(self, Environment::Development)
    }

    /// Check if running in production mode
    pub fn is_production(&self) -> bool {
        matches!(self, Environment::Production)
    }

    /// Check if running in testing mode
    pub fn is_testing(&self) -> bool {
        matches!(self, Environment::Testing)
    }
}

/// Global configuration for Ruvector
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuvectorConfig {
    /// Runtime environment
    pub environment: Environment,

    /// Database configuration
    pub database: DatabaseConfig,

    /// Logging configuration
    pub logging: LoggingConfig,

    /// Performance tuning
    pub performance: PerformanceConfig,

    /// Feature flags
    pub features: FeatureFlags,
}

/// Database configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseConfig {
    /// Base storage path
    pub storage_path: PathBuf,

    /// Vector dimensions
    pub dimensions: usize,

    /// Distance metric
    pub distance_metric: DistanceMetric,

    /// Enable HNSW indexing
    pub enable_hnsw: bool,

    /// HNSW configuration
    pub hnsw_config: Option<HnswConfig>,

    /// Maximum database size in bytes
    pub max_size_bytes: Option<usize>,

    /// Enable memory mapping
    pub enable_mmap: bool,
}

/// Logging configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingConfig {
    /// Log level (error, warn, info, debug, trace)
    pub level: String,

    /// Enable JSON structured logging
    pub json_format: bool,

    /// Log to file path (None for stdout only)
    pub file_path: Option<PathBuf>,

    /// Enable ANSI colors in console output
    pub enable_colors: bool,
}

/// Performance configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceConfig {
    /// Number of worker threads for parallel operations
    pub num_threads: usize,

    /// Enable SIMD optimizations
    pub enable_simd: bool,

    /// Batch size for bulk operations
    pub batch_size: usize,

    /// Cache size in number of entries
    pub cache_size: usize,

    /// Enable query result caching
    pub enable_cache: bool,
}

/// Feature flags for optional functionality
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureFlags {
    /// Enable telemetry and metrics collection
    pub telemetry: bool,

    /// Enable experimental features
    pub experimental: bool,

    /// Enable agenticdb compatibility layer
    pub agenticdb_compat: bool,

    /// Enable quantization
    pub quantization: bool,
}

impl Default for RuvectorConfig {
    fn default() -> Self {
        let env = Environment::current();

        Self {
            environment: env,
            database: DatabaseConfig::default_for_env(env),
            logging: LoggingConfig::default_for_env(env),
            performance: PerformanceConfig::default_for_env(env),
            features: FeatureFlags::default(),
        }
    }
}

impl DatabaseConfig {
    fn default_for_env(env: Environment) -> Self {
        let storage_path = match env {
            Environment::Production => PathBuf::from("./data/ruvector.db"),
            Environment::Testing => PathBuf::from("./tmp/test_ruvector.db"),
            Environment::Development => PathBuf::from("./dev/ruvector.db"),
        };

        Self {
            storage_path,
            dimensions: 1536, // Default for OpenAI embeddings
            distance_metric: DistanceMetric::Cosine,
            enable_hnsw: !env.is_testing(), // Disable in tests for speed
            hnsw_config: Some(HnswConfig::default()),
            max_size_bytes: if env.is_production() {
                Some(100 * 1024 * 1024 * 1024) // 100GB limit in production
            } else {
                None
            },
            enable_mmap: !env.is_testing(),
        }
    }
}

impl LoggingConfig {
    fn default_for_env(env: Environment) -> Self {
        Self {
            level: match env {
                Environment::Production => "info".to_string(),
                Environment::Testing => "error".to_string(),
                Environment::Development => "debug".to_string(),
            },
            json_format: env.is_production(),
            file_path: if env.is_production() {
                Some(PathBuf::from("./logs/ruvector.log"))
            } else {
                None
            },
            enable_colors: !env.is_production(),
        }
    }
}

impl PerformanceConfig {
    fn default_for_env(env: Environment) -> Self {
        let num_cpus = num_cpus::get();

        Self {
            num_threads: if env.is_production() {
                num_cpus
            } else {
                (num_cpus / 2).max(1)
            },
            enable_simd: true,
            batch_size: if env.is_production() { 1000 } else { 100 },
            cache_size: if env.is_production() { 10000 } else { 1000 },
            enable_cache: !env.is_testing(),
        }
    }
}

impl Default for FeatureFlags {
    fn default() -> Self {
        Self {
            telemetry: false,
            experimental: false,
            agenticdb_compat: true,
            quantization: true,
        }
    }
}

impl RuvectorConfig {
    /// Create a new configuration builder
    pub fn builder() -> ConfigBuilder {
        ConfigBuilder::new()
    }

    /// Load configuration from environment variables
    pub fn from_env() -> Result<Self> {
        let mut config = Self::default();

        // Override with environment variables
        if let Ok(val) = env::var("RUVECTOR_STORAGE_PATH") {
            config.database.storage_path = PathBuf::from(val);
        }

        if let Ok(val) = env::var("RUVECTOR_DIMENSIONS") {
            config.database.dimensions = val.parse().map_err(|_| {
                RuvectorError::Configuration("Invalid RUVECTOR_DIMENSIONS".to_string())
            })?;
        }

        if let Ok(val) = env::var("RUVECTOR_LOG_LEVEL") {
            config.logging.level = val;
        }

        if let Ok(val) = env::var("RUVECTOR_NUM_THREADS") {
            config.performance.num_threads = val.parse().map_err(|_| {
                RuvectorError::Configuration("Invalid RUVECTOR_NUM_THREADS".to_string())
            })?;
        }

        Ok(config)
    }

    /// Load configuration from JSON file
    pub fn from_file(path: impl Into<PathBuf>) -> Result<Self> {
        let path = path.into();
        let content = std::fs::read_to_string(&path).map_err(|e| {
            RuvectorError::Configuration(format!("Failed to read config file: {}", e))
        })?;

        serde_json::from_str(&content).map_err(|e| {
            RuvectorError::Configuration(format!("Failed to parse config: {}", e))
        })
    }

    /// Save configuration to JSON file
    pub fn save_to_file(&self, path: impl Into<PathBuf>) -> Result<()> {
        let path = path.into();
        let content = serde_json::to_string_pretty(self).map_err(|e| {
            RuvectorError::Configuration(format!("Failed to serialize config: {}", e))
        })?;

        std::fs::write(&path, content).map_err(|e| {
            RuvectorError::Configuration(format!("Failed to write config file: {}", e))
        })?;

        Ok(())
    }

    /// Validate configuration
    pub fn validate(&self) -> Result<()> {
        if self.database.dimensions == 0 {
            return Err(RuvectorError::Configuration(
                "dimensions must be greater than 0".to_string(),
            ));
        }

        if self.performance.num_threads == 0 {
            return Err(RuvectorError::Configuration(
                "num_threads must be greater than 0".to_string(),
            ));
        }

        if self.performance.batch_size == 0 {
            return Err(RuvectorError::Configuration(
                "batch_size must be greater than 0".to_string(),
            ));
        }

        Ok(())
    }

    /// Convert to DbOptions for VectorDB
    pub fn to_db_options(&self) -> DbOptions {
        DbOptions {
            storage_path: self.database.storage_path.to_string_lossy().to_string(),
            dimensions: self.database.dimensions,
            distance_metric: self.database.distance_metric,
            hnsw_config: if self.database.enable_hnsw {
                self.database.hnsw_config.clone()
            } else {
                None
            },
        }
    }
}

/// Builder for RuvectorConfig
pub struct ConfigBuilder {
    config: RuvectorConfig,
}

impl ConfigBuilder {
    /// Create a new builder with defaults
    pub fn new() -> Self {
        Self {
            config: RuvectorConfig::default(),
        }
    }

    /// Set environment
    pub fn environment(mut self, env: Environment) -> Self {
        self.config.environment = env;
        self
    }

    /// Set storage path
    pub fn storage_path(mut self, path: impl Into<PathBuf>) -> Self {
        self.config.database.storage_path = path.into();
        self
    }

    /// Set vector dimensions
    pub fn dimensions(mut self, dims: usize) -> Self {
        self.config.database.dimensions = dims;
        self
    }

    /// Set distance metric
    pub fn distance_metric(mut self, metric: DistanceMetric) -> Self {
        self.config.database.distance_metric = metric;
        self
    }

    /// Enable/disable HNSW indexing
    pub fn enable_hnsw(mut self, enable: bool) -> Self {
        self.config.database.enable_hnsw = enable;
        self
    }

    /// Set log level
    pub fn log_level(mut self, level: impl Into<String>) -> Self {
        self.config.logging.level = level.into();
        self
    }

    /// Set number of worker threads
    pub fn num_threads(mut self, threads: usize) -> Self {
        self.config.performance.num_threads = threads;
        self
    }

    /// Enable/disable SIMD optimizations
    pub fn enable_simd(mut self, enable: bool) -> Self {
        self.config.performance.enable_simd = enable;
        self
    }

    /// Enable/disable telemetry
    pub fn enable_telemetry(mut self, enable: bool) -> Self {
        self.config.features.telemetry = enable;
        self
    }

    /// Build and validate configuration
    pub fn build(self) -> Result<RuvectorConfig> {
        self.config.validate()?;
        Ok(self.config)
    }
}

impl Default for ConfigBuilder {
    fn default() -> Self {
        Self::new()
    }
}

// Helper function to get CPU count
mod num_cpus {
    pub fn get() -> usize {
        std::thread::available_parallelism()
            .map(|n| n.get())
            .unwrap_or(4)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_environment_detection() {
        let env = Environment::current();
        assert!(matches!(
            env,
            Environment::Development | Environment::Production | Environment::Testing
        ));
    }

    #[test]
    fn test_default_config() {
        let config = RuvectorConfig::default();
        assert!(config.validate().is_ok());
        assert_eq!(config.database.dimensions, 1536);
    }

    #[test]
    fn test_config_builder() {
        let config = RuvectorConfig::builder()
            .dimensions(768)
            .storage_path("./test.db")
            .log_level("info")
            .num_threads(4)
            .build()
            .unwrap();

        assert_eq!(config.database.dimensions, 768);
        assert_eq!(config.performance.num_threads, 4);
    }

    #[test]
    fn test_validation() {
        let mut config = RuvectorConfig::default();
        config.database.dimensions = 0;
        assert!(config.validate().is_err());
    }
}
