//! Main VectorDB interface

use crate::error::Result;
use crate::index::flat::FlatIndex;
use crate::index::hnsw::HnswIndex;
use crate::index::VectorIndex;
use crate::storage::VectorStorage;
use crate::types::*;
use std::sync::Arc;
use parking_lot::RwLock;

/// Main vector database
pub struct VectorDB {
    storage: Arc<VectorStorage>,
    index: Arc<RwLock<Box<dyn VectorIndex>>>,
    options: DbOptions,
}

impl VectorDB {
    /// Create a new vector database with the given options
    pub fn new(options: DbOptions) -> Result<Self> {
        let storage = Arc::new(VectorStorage::new(
            &options.storage_path,
            options.dimensions,
        )?);

        // Choose index based on configuration
        let index: Box<dyn VectorIndex> = if let Some(hnsw_config) = &options.hnsw_config {
            Box::new(HnswIndex::new(
                options.dimensions,
                options.distance_metric,
                hnsw_config.clone(),
            )?)
        } else {
            Box::new(FlatIndex::new(options.dimensions, options.distance_metric))
        };

        Ok(Self {
            storage,
            index: Arc::new(RwLock::new(index)),
            options,
        })
    }

    /// Create with default options
    pub fn with_dimensions(dimensions: usize) -> Result<Self> {
        let mut options = DbOptions::default();
        options.dimensions = dimensions;
        Self::new(options)
    }

    /// Insert a vector entry
    pub fn insert(&self, entry: VectorEntry) -> Result<VectorId> {
        let id = self.storage.insert(&entry)?;

        // Add to index
        let mut index = self.index.write();
        index.add(id.clone(), entry.vector)?;

        Ok(id)
    }

    /// Insert multiple vectors in a batch
    pub fn insert_batch(&self, entries: Vec<VectorEntry>) -> Result<Vec<VectorId>> {
        let ids = self.storage.insert_batch(&entries)?;

        // Add to index
        let mut index = self.index.write();
        let index_entries: Vec<_> = ids
            .iter()
            .zip(entries.iter())
            .map(|(id, entry)| (id.clone(), entry.vector.clone()))
            .collect();

        index.add_batch(index_entries)?;

        Ok(ids)
    }

    /// Search for similar vectors
    pub fn search(&self, query: SearchQuery) -> Result<Vec<SearchResult>> {
        let index = self.index.read();
        let mut results = index.search(&query.vector, query.k)?;

        // Enrich results with full data if needed
        for result in &mut results {
            if let Ok(Some(entry)) = self.storage.get(&result.id) {
                result.vector = Some(entry.vector);
                result.metadata = entry.metadata;
            }
        }

        // Apply metadata filters if specified
        if let Some(filter) = &query.filter {
            results.retain(|r| {
                if let Some(metadata) = &r.metadata {
                    filter.iter().all(|(key, value)| {
                        metadata.get(key).map_or(false, |v| v == value)
                    })
                } else {
                    false
                }
            });
        }

        Ok(results)
    }

    /// Delete a vector by ID
    pub fn delete(&self, id: &str) -> Result<bool> {
        let deleted_storage = self.storage.delete(id)?;

        if deleted_storage {
            let mut index = self.index.write();
            let _ = index.remove(&id.to_string())?;
        }

        Ok(deleted_storage)
    }

    /// Get a vector by ID
    pub fn get(&self, id: &str) -> Result<Option<VectorEntry>> {
        self.storage.get(id)
    }

    /// Get the number of vectors
    pub fn len(&self) -> Result<usize> {
        self.storage.len()
    }

    /// Check if database is empty
    pub fn is_empty(&self) -> Result<bool> {
        self.storage.is_empty()
    }

    /// Get database options
    pub fn options(&self) -> &DbOptions {
        &self.options
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;
    use tempfile::tempdir;

    #[test]
    fn test_vector_db_creation() -> Result<()> {
        let dir = tempdir().unwrap();
        let mut options = DbOptions::default();
        options.storage_path = dir.path().join("test.db").to_string_lossy().to_string();
        options.dimensions = 3;

        let db = VectorDB::new(options)?;
        assert!(db.is_empty()?);

        Ok(())
    }

    #[test]
    fn test_insert_and_search() -> Result<()> {
        let dir = tempdir().unwrap();
        let mut options = DbOptions::default();
        options.storage_path = dir.path().join("test.db").to_string_lossy().to_string();
        options.dimensions = 3;
        options.distance_metric = DistanceMetric::Euclidean; // Use Euclidean for clearer test
        options.hnsw_config = None; // Use flat index for testing

        let db = VectorDB::new(options)?;

        // Insert vectors
        db.insert(VectorEntry {
            id: Some("v1".to_string()),
            vector: vec![1.0, 0.0, 0.0],
            metadata: None,
        })?;

        db.insert(VectorEntry {
            id: Some("v2".to_string()),
            vector: vec![0.0, 1.0, 0.0],
            metadata: None,
        })?;

        db.insert(VectorEntry {
            id: Some("v3".to_string()),
            vector: vec![0.0, 0.0, 1.0],
            metadata: None,
        })?;

        // Search for exact match
        let results = db.search(SearchQuery {
            vector: vec![1.0, 0.0, 0.0],
            k: 2,
            filter: None,
            ef_search: None,
        })?;

        assert!(results.len() >= 1);
        assert_eq!(results[0].id, "v1", "First result should be exact match");
        assert!(results[0].score < 0.01, "Exact match should have ~0 distance");

        Ok(())
    }
}
