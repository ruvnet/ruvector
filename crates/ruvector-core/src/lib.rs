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

pub mod distance;
pub mod error;
pub mod index;
pub mod quantization;
pub mod storage;
pub mod types;
pub mod vector_db;

// Re-exports
pub use error::{Result, RuvectorError};
pub use types::{DistanceMetric, VectorEntry, VectorId, SearchQuery, SearchResult};
pub use vector_db::VectorDB;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version() {
        assert_eq!(env!("CARGO_PKG_VERSION"), "0.1.0");
    }
}
