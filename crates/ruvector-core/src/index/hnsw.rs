//! HNSW (Hierarchical Navigable Small World) index implementation

use crate::distance::distance;
use crate::error::{Result, RuvectorError};
use crate::index::VectorIndex;
use crate::types::{DistanceMetric, HnswConfig, SearchResult, VectorId};
use dashmap::DashMap;
use parking_lot::RwLock;
use std::sync::Arc;

/// HNSW index wrapper
pub struct HnswIndex {
    inner: Arc<RwLock<HnswInner>>,
    config: HnswConfig,
    metric: DistanceMetric,
    dimensions: usize,
}

struct HnswInner {
    vectors: DashMap<VectorId, Vec<f32>>,
    // HNSW graph will be integrated here
    id_to_idx: DashMap<VectorId, usize>,
    idx_to_id: DashMap<usize, VectorId>,
    next_idx: usize,
}

impl HnswIndex {
    /// Create a new HNSW index
    pub fn new(dimensions: usize, metric: DistanceMetric, config: HnswConfig) -> Result<Self> {
        Ok(Self {
            inner: Arc::new(RwLock::new(HnswInner {
                vectors: DashMap::new(),
                id_to_idx: DashMap::new(),
                idx_to_id: DashMap::new(),
                next_idx: 0,
            })),
            config,
            metric,
            dimensions,
        })
    }

    /// Get configuration
    pub fn config(&self) -> &HnswConfig {
        &self.config
    }
}

impl VectorIndex for HnswIndex {
    fn add(&mut self, id: VectorId, vector: Vec<f32>) -> Result<()> {
        if vector.len() != self.dimensions {
            return Err(RuvectorError::DimensionMismatch {
                expected: self.dimensions,
                actual: vector.len(),
            });
        }

        let mut inner = self.inner.write();
        let idx = inner.next_idx;
        inner.next_idx += 1;

        inner.vectors.insert(id.clone(), vector);
        inner.id_to_idx.insert(id.clone(), idx);
        inner.idx_to_id.insert(idx, id);

        // TODO: Integrate with hnsw_rs library
        Ok(())
    }

    fn add_batch(&mut self, entries: Vec<(VectorId, Vec<f32>)>) -> Result<()> {
        // Validate all dimensions first
        for (_, vector) in &entries {
            if vector.len() != self.dimensions {
                return Err(RuvectorError::DimensionMismatch {
                    expected: self.dimensions,
                    actual: vector.len(),
                });
            }
        }

        let mut inner = self.inner.write();

        for (id, vector) in entries {
            let idx = inner.next_idx;
            inner.next_idx += 1;

            inner.vectors.insert(id.clone(), vector);
            inner.id_to_idx.insert(id.clone(), idx);
            inner.idx_to_id.insert(idx, id);
        }

        Ok(())
    }

    fn search(&self, query: &[f32], k: usize) -> Result<Vec<SearchResult>> {
        if query.len() != self.dimensions {
            return Err(RuvectorError::DimensionMismatch {
                expected: self.dimensions,
                actual: query.len(),
            });
        }

        let inner = self.inner.read();

        // TODO: Use HNSW graph search
        // For now, use brute force
        use rayon::prelude::*;

        let mut results: Vec<_> = inner
            .vectors
            .iter()
            .par_bridge()
            .map(|entry| {
                let id = entry.key().clone();
                let vector = entry.value();
                let dist = distance(query, vector, self.metric)?;
                Ok((id, dist))
            })
            .collect::<Result<Vec<_>>>()?;

        results.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap());
        results.truncate(k);

        Ok(results
            .into_iter()
            .map(|(id, score)| SearchResult {
                id,
                score,
                vector: None,
                metadata: None,
            })
            .collect())
    }

    fn remove(&mut self, id: &VectorId) -> Result<bool> {
        let inner = self.inner.write();
        let removed = inner.vectors.remove(id).is_some();

        if removed {
            if let Some((_, idx)) = inner.id_to_idx.remove(id) {
                inner.idx_to_id.remove(&idx);
            }
        }

        Ok(removed)
    }

    fn len(&self) -> usize {
        self.inner.read().vectors.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hnsw_index_creation() -> Result<()> {
        let config = HnswConfig::default();
        let index = HnswIndex::new(128, DistanceMetric::Cosine, config)?;
        assert_eq!(index.len(), 0);
        Ok(())
    }
}
