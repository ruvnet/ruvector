//! Storage layer with redb for metadata and memory-mapped vectors

use crate::error::{Result, RuvectorError};
use crate::types::{VectorEntry, VectorId};
use redb::{Database, ReadableTable, ReadableTableMetadata, TableDefinition};
use bincode::config;
use serde_json;
use std::path::Path;

const VECTORS_TABLE: TableDefinition<&str, &[u8]> = TableDefinition::new("vectors");
const METADATA_TABLE: TableDefinition<&str, &str> = TableDefinition::new("metadata");

/// Storage backend for vector database
pub struct VectorStorage {
    db: Database,
    dimensions: usize,
}

impl VectorStorage {
    /// Create or open a vector storage at the given path
    pub fn new<P: AsRef<Path>>(path: P, dimensions: usize) -> Result<Self> {
        let db = Database::create(path)?;

        // Initialize tables
        let write_txn = db.begin_write()?;
        {
            let _ = write_txn.open_table(VECTORS_TABLE)?;
            let _ = write_txn.open_table(METADATA_TABLE)?;
        }
        write_txn.commit()?;

        Ok(Self { db, dimensions })
    }

    /// Insert a vector entry
    pub fn insert(&self, entry: &VectorEntry) -> Result<VectorId> {
        if entry.vector.len() != self.dimensions {
            return Err(RuvectorError::DimensionMismatch {
                expected: self.dimensions,
                actual: entry.vector.len(),
            });
        }

        let id = entry.id.clone().unwrap_or_else(|| {
            uuid::Uuid::new_v4().to_string()
        });

        let write_txn = self.db.begin_write()?;
        {
            let mut table = write_txn.open_table(VECTORS_TABLE)?;

            // Serialize vector data
            let vector_data = bincode::encode_to_vec(&entry.vector, config::standard())
                .map_err(|e| RuvectorError::SerializationError(e.to_string()))?;

            table.insert(id.as_str(), vector_data.as_slice())?;

            // Store metadata if present
            if let Some(metadata) = &entry.metadata {
                let mut meta_table = write_txn.open_table(METADATA_TABLE)?;
                let metadata_json = serde_json::to_string(metadata)
                    .map_err(|e| RuvectorError::SerializationError(e.to_string()))?;
                meta_table.insert(id.as_str(), metadata_json.as_str())?;
            }
        }
        write_txn.commit()?;

        Ok(id)
    }

    /// Insert multiple vectors in a batch
    pub fn insert_batch(&self, entries: &[VectorEntry]) -> Result<Vec<VectorId>> {
        let write_txn = self.db.begin_write()?;
        let mut ids = Vec::with_capacity(entries.len());

        {
            let mut table = write_txn.open_table(VECTORS_TABLE)?;
            let mut meta_table = write_txn.open_table(METADATA_TABLE)?;

            for entry in entries {
                if entry.vector.len() != self.dimensions {
                    return Err(RuvectorError::DimensionMismatch {
                        expected: self.dimensions,
                        actual: entry.vector.len(),
                    });
                }

                let id = entry.id.clone().unwrap_or_else(|| {
                    uuid::Uuid::new_v4().to_string()
                });

                // Serialize and insert vector
                let vector_data = bincode::encode_to_vec(&entry.vector, config::standard())
                    .map_err(|e| RuvectorError::SerializationError(e.to_string()))?;
                table.insert(id.as_str(), vector_data.as_slice())?;

                // Insert metadata if present
                if let Some(metadata) = &entry.metadata {
                    let metadata_json = serde_json::to_string(metadata)
                        .map_err(|e| RuvectorError::SerializationError(e.to_string()))?;
                    meta_table.insert(id.as_str(), metadata_json.as_str())?;
                }

                ids.push(id);
            }
        }

        write_txn.commit()?;
        Ok(ids)
    }

    /// Get a vector by ID
    pub fn get(&self, id: &str) -> Result<Option<VectorEntry>> {
        let read_txn = self.db.begin_read()?;
        let table = read_txn.open_table(VECTORS_TABLE)?;

        let Some(vector_data) = table.get(id)? else {
            return Ok(None);
        };

        let (vector, _): (Vec<f32>, usize) = bincode::decode_from_slice(vector_data.value(), config::standard())
            .map_err(|e| RuvectorError::SerializationError(e.to_string()))?;

        // Try to get metadata
        let meta_table = read_txn.open_table(METADATA_TABLE)?;
        let metadata = if let Some(meta_data) = meta_table.get(id)? {
            let meta_str = meta_data.value();
            Some(serde_json::from_str(meta_str)
                .map_err(|e| RuvectorError::SerializationError(e.to_string()))?)
        } else {
            None
        };

        Ok(Some(VectorEntry {
            id: Some(id.to_string()),
            vector,
            metadata,
        }))
    }

    /// Delete a vector by ID
    pub fn delete(&self, id: &str) -> Result<bool> {
        let write_txn = self.db.begin_write()?;
        let mut deleted = false;

        {
            let mut table = write_txn.open_table(VECTORS_TABLE)?;
            deleted = table.remove(id)?.is_some();

            let mut meta_table = write_txn.open_table(METADATA_TABLE)?;
            let _ = meta_table.remove(id)?;
        }

        write_txn.commit()?;
        Ok(deleted)
    }

    /// Get the number of vectors stored
    pub fn len(&self) -> Result<usize> {
        let read_txn = self.db.begin_read()?;
        let table = read_txn.open_table(VECTORS_TABLE)?;
        Ok(table.len()? as usize)
    }

    /// Check if storage is empty
    pub fn is_empty(&self) -> Result<bool> {
        Ok(self.len()? == 0)
    }

    /// Get all vector IDs
    pub fn all_ids(&self) -> Result<Vec<VectorId>> {
        let read_txn = self.db.begin_read()?;
        let table = read_txn.open_table(VECTORS_TABLE)?;

        let mut ids = Vec::new();
        let iter = table.iter()?;
        for item in iter {
            let (key, _) = item?;
            ids.push(key.value().to_string());
        }

        Ok(ids)
    }
}

// Add uuid dependency
use uuid;

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_insert_and_get() -> Result<()> {
        let dir = tempdir().unwrap();
        let storage = VectorStorage::new(dir.path().join("test.db"), 3)?;

        let entry = VectorEntry {
            id: Some("test1".to_string()),
            vector: vec![1.0, 2.0, 3.0],
            metadata: None,
        };

        let id = storage.insert(&entry)?;
        assert_eq!(id, "test1");

        let retrieved = storage.get("test1")?;
        assert!(retrieved.is_some());
        let retrieved = retrieved.unwrap();
        assert_eq!(retrieved.vector, vec![1.0, 2.0, 3.0]);

        Ok(())
    }

    #[test]
    fn test_batch_insert() -> Result<()> {
        let dir = tempdir().unwrap();
        let storage = VectorStorage::new(dir.path().join("test.db"), 3)?;

        let entries = vec![
            VectorEntry {
                id: None,
                vector: vec![1.0, 2.0, 3.0],
                metadata: None,
            },
            VectorEntry {
                id: None,
                vector: vec![4.0, 5.0, 6.0],
                metadata: None,
            },
        ];

        let ids = storage.insert_batch(&entries)?;
        assert_eq!(ids.len(), 2);
        assert_eq!(storage.len()?, 2);

        Ok(())
    }

    #[test]
    fn test_delete() -> Result<()> {
        let dir = tempdir().unwrap();
        let storage = VectorStorage::new(dir.path().join("test.db"), 3)?;

        let entry = VectorEntry {
            id: Some("test1".to_string()),
            vector: vec![1.0, 2.0, 3.0],
            metadata: None,
        };

        storage.insert(&entry)?;
        assert_eq!(storage.len()?, 1);

        let deleted = storage.delete("test1")?;
        assert!(deleted);
        assert_eq!(storage.len()?, 0);

        Ok(())
    }
}
