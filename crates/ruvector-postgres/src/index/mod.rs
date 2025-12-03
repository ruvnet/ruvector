//! Index implementations for vector similarity search
//!
//! Provides HNSW and IVFFlat index types compatible with pgvector.
//! Note: Full PostgreSQL Access Method integration is in progress.

mod hnsw;
mod ivfflat;
mod scan;

// Access Method implementations (disabled - requires pgrx API fixes)
// mod hnsw_am;
// mod ivfflat_am;
// mod ivfflat_storage;
// pub mod parallel;
// pub mod bgworker;
// pub mod parallel_ops;

pub use hnsw::*;
pub use ivfflat::*;
pub use scan::*;

use std::sync::atomic::{AtomicUsize, Ordering};

/// Global index memory tracking
static INDEX_MEMORY_BYTES: AtomicUsize = AtomicUsize::new(0);

/// Get total index memory in MB
pub fn get_total_index_memory_mb() -> f64 {
    INDEX_MEMORY_BYTES.load(Ordering::Relaxed) as f64 / (1024.0 * 1024.0)
}

/// Track index memory allocation
pub fn track_index_allocation(bytes: usize) {
    INDEX_MEMORY_BYTES.fetch_add(bytes, Ordering::Relaxed);
}

/// Track index memory deallocation
pub fn track_index_deallocation(bytes: usize) {
    INDEX_MEMORY_BYTES.fetch_sub(bytes, Ordering::Relaxed);
}

/// Index statistics
#[derive(Debug, Clone)]
pub struct IndexStats {
    pub name: String,
    pub index_type: String,
    pub vector_count: i64,
    pub dimensions: i32,
    pub index_size_mb: f64,
    pub fragmentation_pct: f64,
}

/// Get statistics for all indexes
pub fn get_all_index_stats() -> Vec<IndexStats> {
    // This would query PostgreSQL's system catalogs
    // For now, return empty
    Vec::new()
}

/// Maintenance result
#[derive(Debug)]
pub struct MaintenanceStats {
    pub nodes_updated: usize,
    pub connections_optimized: usize,
    pub memory_reclaimed_bytes: usize,
    pub duration_ms: u64,
}

/// Perform index maintenance
pub fn perform_maintenance(_index_name: &str) -> Result<MaintenanceStats, String> {
    // Would perform actual maintenance operations
    Ok(MaintenanceStats {
        nodes_updated: 0,
        connections_optimized: 0,
        memory_reclaimed_bytes: 0,
        duration_ms: 0,
    })
}
