//! # Ruvector Core
//!
//! High-performance Rust-native vector database with HNSW indexing and SIMD-optimized operations.
//!
//! ## Features
//!
//! - **HNSW Indexing**: O(log n) search with 95%+ recall
//! - **SIMD Optimizations**: 4-16x faster distance calculations
//! - **Quantization**: 4-32x memory compression
//! - **Zero-copy Memory**: Memory-mapped vectors for instant loading
//! - **AgenticDB Compatible**: Drop-in replacement with 10-100x speedup

#![warn(missing_docs)]
#![warn(clippy::all)]

pub mod advanced_features;

// AgenticDB requires storage feature
#[cfg(feature = "storage")]
pub mod agenticdb;

pub mod distance;
pub mod error;
pub mod index;
pub mod quantization;

// Storage backends - conditional compilation based on features
#[cfg(feature = "storage")]
pub mod storage;

#[cfg(not(feature = "storage"))]
pub mod storage_memory;

#[cfg(not(feature = "storage"))]
pub use storage_memory as storage;

pub mod types;
pub mod vector_db;

// Initialization and configuration
pub mod config;
pub mod init;

// Performance optimization modules
pub mod arena;
pub mod cache_optimized;
pub mod lockfree;
pub mod simd_intrinsics;

/// Advanced techniques: hypergraphs, learned indexes, neural hashing, TDA (Phase 6)
pub mod advanced;

// Re-exports
pub use advanced_features::{
    BM25, ConformalConfig, ConformalPredictor, EnhancedPQ, FilterExpression, FilterStrategy,
    FilteredSearch, HybridConfig, HybridSearch, MMRConfig, MMRSearch, PQConfig, PredictionSet,
};

#[cfg(feature = "storage")]
pub use agenticdb::AgenticDB;

pub use error::{Result, RuvectorError};
pub use types::{DistanceMetric, VectorEntry, VectorId, SearchQuery, SearchResult};
pub use vector_db::VectorDB;

// Configuration and initialization exports
pub use config::{
    RuvectorConfig, ConfigBuilder, Environment, DatabaseConfig,
    LoggingConfig, PerformanceConfig, FeatureFlags,
};
pub use init::{
    init, init_with_config, runtime, database, database_named,
    on_shutdown, shutdown, health_check, HealthStatus,
};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version() {
        assert_eq!(env!("CARGO_PKG_VERSION"), "0.1.0");
    }
}
