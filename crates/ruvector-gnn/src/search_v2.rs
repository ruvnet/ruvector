//! Enhanced Search with Attention Integration (v2)
//!
//! Provides improved search capabilities using pluggable attention backends,
//! including hyperbolic, dual-space, and edge-featured attention.

use crate::attention_backend::{AttentionBackend, AttentionConfig, AttentionMode, create_backend};
use crate::error::Result;
use crate::layer::RuvectorLayer;

/// Configuration for v2 search operations
#[derive(Debug, Clone)]
pub struct SearchConfig {
    /// Attention configuration
    pub attention: AttentionConfig,
    /// Number of top results to return
    pub k: usize,
    /// Temperature for softmax (lower = sharper)
    pub temperature: f32,
    /// Whether to normalize similarity scores
    pub normalize: bool,
    /// Minimum similarity threshold
    pub min_similarity: Option<f32>,
}

impl Default for SearchConfig {
    fn default() -> Self {
        Self {
            attention: AttentionConfig::default(),
            k: 10,
            temperature: 1.0,
            normalize: true,
            min_similarity: None,
        }
    }
}

impl SearchConfig {
    /// Create a new search config with dimension
    pub fn new(dim: usize) -> Self {
        Self {
            attention: AttentionConfig::new(dim),
            ..Default::default()
        }
    }

    /// Set the attention mode
    pub fn with_mode(mut self, mode: AttentionMode) -> Self {
        self.attention.mode = mode;
        self
    }

    /// Set the number of results
    pub fn with_k(mut self, k: usize) -> Self {
        self.k = k;
        self
    }

    /// Set the temperature
    pub fn with_temperature(mut self, temperature: f32) -> Self {
        self.temperature = temperature;
        self.attention.temperature = temperature;
        self
    }

    /// Create hyperbolic search config
    #[cfg(feature = "hyperbolic")]
    pub fn hyperbolic(dim: usize, curvature: f32) -> Self {
        Self {
            attention: AttentionConfig::hyperbolic(dim, curvature),
            ..Default::default()
        }
    }

    /// Create dual-space search config
    #[cfg(feature = "hyperbolic")]
    pub fn dual_space(dim: usize, curvature: f32) -> Self {
        Self {
            attention: AttentionConfig::dual_space(dim, curvature),
            ..Default::default()
        }
    }

    /// Create flash attention search config (memory efficient)
    #[cfg(feature = "flash-attention")]
    pub fn flash(dim: usize, block_size: usize) -> Self {
        Self {
            attention: AttentionConfig::flash(dim, block_size),
            ..Default::default()
        }
    }
}

/// Result of a search operation
#[derive(Debug, Clone)]
pub struct SearchResult {
    /// Indices of top-k results
    pub indices: Vec<usize>,
    /// Attention weights for top-k
    pub weights: Vec<f32>,
    /// Raw similarity scores for top-k
    pub scores: Vec<f32>,
    /// Aggregated output embedding (weighted sum of values)
    pub embedding: Vec<f32>,
}

/// Differentiable search using attention mechanisms (v2)
///
/// Enhanced version that supports multiple attention backends:
/// - Standard: Scaled dot-product attention
/// - Hyperbolic: Poincaré ball distance for hierarchical data
/// - Dual-Space: Combined Euclidean + Hyperbolic
/// - Flash: Memory-efficient tiled computation
/// - MoE: Mixture of experts for adaptive attention
///
/// # Arguments
/// * `query` - Query vector
/// * `candidates` - List of candidate vectors to search
/// * `config` - Search configuration
///
/// # Returns
/// SearchResult with indices, weights, scores, and aggregated embedding
pub fn differentiable_search_v2(
    query: &[f32],
    candidates: &[Vec<f32>],
    config: &SearchConfig,
) -> Result<SearchResult> {
    if candidates.is_empty() {
        return Ok(SearchResult {
            indices: vec![],
            weights: vec![],
            scores: vec![],
            embedding: query.to_vec(),
        });
    }

    let k = config.k.min(candidates.len());
    let backend = create_backend(&config.attention);

    // Get candidate refs
    let candidate_refs: Vec<&[f32]> = candidates.iter().map(|c| c.as_slice()).collect();

    // Compute attention weights
    let weights = backend.get_weights(query, &candidate_refs)?;

    // Get top-k by weight
    let mut indexed_weights: Vec<(usize, f32)> = weights
        .iter()
        .copied()
        .enumerate()
        .collect();

    // Sort by weight descending
    indexed_weights.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    // Filter by minimum similarity if set
    let filtered: Vec<(usize, f32)> = if let Some(min_sim) = config.min_similarity {
        indexed_weights.into_iter()
            .filter(|(_, w)| *w >= min_sim)
            .take(k)
            .collect()
    } else {
        indexed_weights.into_iter().take(k).collect()
    };

    let indices: Vec<usize> = filtered.iter().map(|(i, _)| *i).collect();
    let top_weights: Vec<f32> = filtered.iter().map(|(_, w)| *w).collect();

    // Compute scores (raw similarities for analysis)
    let scores: Vec<f32> = indices.iter().map(|&i| {
        query.iter()
            .zip(candidates[i].iter())
            .map(|(q, c)| q * c)
            .sum::<f32>()
    }).collect();

    // Compute aggregated embedding using full attention
    let embedding = backend.compute(query, &candidate_refs, &candidate_refs)?;

    Ok(SearchResult {
        indices,
        weights: top_weights,
        scores,
        embedding,
    })
}

/// Hierarchical forward pass with attention (v2)
///
/// Enhanced version that uses pluggable attention backends for
/// hierarchical navigation through GNN layers.
///
/// # Arguments
/// * `query` - Query vector
/// * `layer_embeddings` - Embeddings organized by layer
/// * `gnn_layers` - GNN layers to process through
/// * `config` - Search configuration
///
/// # Returns
/// Final embedding after hierarchical processing with attention
pub fn hierarchical_forward_v2(
    query: &[f32],
    layer_embeddings: &[Vec<Vec<f32>>],
    gnn_layers: &[RuvectorLayer],
    config: &SearchConfig,
) -> Result<Vec<f32>> {
    if layer_embeddings.is_empty() || gnn_layers.is_empty() {
        return Ok(query.to_vec());
    }

    let backend = create_backend(&config.attention);
    let mut current_embedding = query.to_vec();

    // Process through each layer
    for (layer_idx, (embeddings, gnn_layer)) in
        layer_embeddings.iter().zip(gnn_layers.iter()).enumerate()
    {
        if embeddings.is_empty() {
            continue;
        }

        // Use attention-based search
        let search_result = differentiable_search_v2(
            &current_embedding,
            embeddings,
            &SearchConfig {
                k: 5.min(embeddings.len()),
                ..config.clone()
            },
        )?;

        // Get neighbor embeddings and weights
        let neighbor_embs: Vec<Vec<f32>> = search_result.indices
            .iter()
            .map(|&idx| embeddings[idx].clone())
            .collect();

        // Aggregate using attention weights
        let mut aggregated = vec![0.0f32; current_embedding.len()];
        for (idx, &weight) in search_result.indices.iter().zip(search_result.weights.iter()) {
            for (i, &val) in embeddings[*idx].iter().enumerate() {
                if i < aggregated.len() {
                    aggregated[i] += weight * val;
                }
            }
        }

        // Combine with current embedding (residual connection)
        let combined: Vec<f32> = current_embedding
            .iter()
            .zip(&aggregated)
            .map(|(curr, agg)| (curr + agg) / 2.0)
            .collect();

        // Apply GNN layer
        current_embedding = gnn_layer.forward(
            &combined,
            &neighbor_embs,
            &search_result.weights,
        );
    }

    Ok(current_embedding)
}

/// Compute similarity using the configured attention backend
pub fn attention_similarity(
    query: &[f32],
    candidates: &[Vec<f32>],
    config: &AttentionConfig,
) -> Result<Vec<f32>> {
    let backend = create_backend(config);
    let candidate_refs: Vec<&[f32]> = candidates.iter().map(|c| c.as_slice()).collect();
    backend.get_weights(query, &candidate_refs)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_differentiable_search_v2() {
        let query = vec![1.0, 0.0, 0.0, 0.0];
        let candidates = vec![
            vec![1.0, 0.0, 0.0, 0.0], // Perfect match
            vec![0.9, 0.1, 0.0, 0.0], // Close match
            vec![0.0, 1.0, 0.0, 0.0], // Orthogonal
            vec![-1.0, 0.0, 0.0, 0.0], // Opposite
        ];

        let config = SearchConfig::new(4).with_k(3);
        let result = differentiable_search_v2(&query, &candidates, &config).unwrap();

        assert_eq!(result.indices.len(), 3);
        assert_eq!(result.weights.len(), 3);

        // First result should be the perfect match
        assert_eq!(result.indices[0], 0);

        // Weights should be ordered descending
        assert!(result.weights[0] >= result.weights[1]);
        assert!(result.weights[1] >= result.weights[2]);
    }

    #[test]
    fn test_search_config_builder() {
        let config = SearchConfig::new(64)
            .with_k(10)
            .with_temperature(0.5);

        assert_eq!(config.k, 10);
        assert_eq!(config.temperature, 0.5);
        assert_eq!(config.attention.dim, 64);
    }

    #[test]
    fn test_hierarchical_forward_v2() {
        let query = vec![1.0, 0.0];

        let layer_embeddings = vec![
            vec![vec![1.0, 0.0], vec![0.0, 1.0]],
        ];

        let gnn_layers = vec![
            RuvectorLayer::new(2, 2, 1, 0.0),
        ];

        let config = SearchConfig::new(2);
        let result = hierarchical_forward_v2(
            &query,
            &layer_embeddings,
            &gnn_layers,
            &config,
        ).unwrap();

        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_empty_candidates() {
        let query = vec![1.0, 0.0, 0.0];
        let candidates: Vec<Vec<f32>> = vec![];

        let config = SearchConfig::new(3);
        let result = differentiable_search_v2(&query, &candidates, &config).unwrap();

        assert!(result.indices.is_empty());
        assert_eq!(result.embedding, query);
    }

    #[test]
    fn test_min_similarity_filter() {
        let query = vec![1.0, 0.0, 0.0, 0.0];
        let candidates = vec![
            vec![1.0, 0.0, 0.0, 0.0], // High similarity
            vec![0.0, 1.0, 0.0, 0.0], // Low similarity
            vec![0.0, 0.0, 1.0, 0.0], // Low similarity
        ];

        let config = SearchConfig {
            attention: AttentionConfig::new(4),
            k: 10,
            temperature: 1.0,
            normalize: true,
            min_similarity: Some(0.3), // Filter low weights
        };

        let result = differentiable_search_v2(&query, &candidates, &config).unwrap();

        // Should only return high-similarity results
        assert!(!result.indices.is_empty());
        for &w in &result.weights {
            assert!(w >= 0.3);
        }
    }

    #[test]
    fn test_attention_similarity() {
        let query = vec![1.0, 0.0, 0.0, 0.0];
        let candidates = vec![
            vec![1.0, 0.0, 0.0, 0.0],
            vec![0.0, 1.0, 0.0, 0.0],
        ];

        let config = AttentionConfig::new(4);
        let similarities = attention_similarity(&query, &candidates, &config).unwrap();

        assert_eq!(similarities.len(), 2);
        assert!(similarities[0] > similarities[1]); // First is more similar
    }
}
