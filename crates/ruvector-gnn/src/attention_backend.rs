//! Attention Backend Trait and Implementations
//!
//! Provides a pluggable attention mechanism for GNN layers, integrating
//! with ruvector-attention when available.

use crate::error::Result;

/// Attention computation mode
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum AttentionMode {
    /// Standard scaled dot-product attention
    Standard,
    /// Hyperbolic attention using Poincaré ball model
    #[cfg(feature = "hyperbolic")]
    Hyperbolic { curvature: f32 },
    /// Dual-space attention (Euclidean + Hyperbolic)
    #[cfg(feature = "hyperbolic")]
    DualSpace {
        curvature: f32,
        euclidean_weight: f32,
        hyperbolic_weight: f32,
    },
    /// Edge-featured graph attention (GATv2)
    #[cfg(feature = "edge-featured")]
    EdgeFeatured { edge_dim: usize, num_heads: usize },
    /// Flash attention for memory efficiency
    #[cfg(feature = "flash-attention")]
    Flash { block_size: usize },
    /// Mixture of Experts attention
    #[cfg(feature = "moe")]
    MoE { num_experts: usize, top_k: usize },
}

impl Default for AttentionMode {
    fn default() -> Self {
        AttentionMode::Standard
    }
}

/// Configuration for attention computation
#[derive(Debug, Clone)]
pub struct AttentionConfig {
    pub mode: AttentionMode,
    pub dim: usize,
    pub num_heads: usize,
    pub temperature: f32,
    pub dropout: f32,
}

impl Default for AttentionConfig {
    fn default() -> Self {
        Self {
            mode: AttentionMode::Standard,
            dim: 64,
            num_heads: 4,
            temperature: 1.0,
            dropout: 0.0,
        }
    }
}

impl AttentionConfig {
    pub fn new(dim: usize) -> Self {
        Self {
            dim,
            ..Default::default()
        }
    }

    pub fn with_mode(mut self, mode: AttentionMode) -> Self {
        self.mode = mode;
        self
    }

    pub fn with_heads(mut self, num_heads: usize) -> Self {
        self.num_heads = num_heads;
        self
    }

    pub fn with_temperature(mut self, temperature: f32) -> Self {
        self.temperature = temperature;
        self
    }

    #[cfg(feature = "hyperbolic")]
    pub fn hyperbolic(dim: usize, curvature: f32) -> Self {
        Self {
            dim,
            mode: AttentionMode::Hyperbolic { curvature },
            ..Default::default()
        }
    }

    #[cfg(feature = "hyperbolic")]
    pub fn dual_space(dim: usize, curvature: f32) -> Self {
        Self {
            dim,
            mode: AttentionMode::DualSpace {
                curvature,
                euclidean_weight: 0.5,
                hyperbolic_weight: 0.5,
            },
            ..Default::default()
        }
    }

    #[cfg(feature = "edge-featured")]
    pub fn edge_featured(dim: usize, edge_dim: usize, num_heads: usize) -> Self {
        Self {
            dim,
            num_heads,
            mode: AttentionMode::EdgeFeatured { edge_dim, num_heads },
            ..Default::default()
        }
    }

    #[cfg(feature = "flash-attention")]
    pub fn flash(dim: usize, block_size: usize) -> Self {
        Self {
            dim,
            mode: AttentionMode::Flash { block_size },
            ..Default::default()
        }
    }

    #[cfg(feature = "moe")]
    pub fn moe(dim: usize, num_experts: usize, top_k: usize) -> Self {
        Self {
            dim,
            mode: AttentionMode::MoE { num_experts, top_k },
            ..Default::default()
        }
    }
}

/// Trait for attention computation backends
pub trait AttentionBackend: Send + Sync {
    /// Compute attention output
    fn compute(
        &self,
        query: &[f32],
        keys: &[&[f32]],
        values: &[&[f32]],
    ) -> Result<Vec<f32>>;

    /// Compute attention with edge features (for graph attention)
    fn compute_with_edges(
        &self,
        query: &[f32],
        keys: &[&[f32]],
        values: &[&[f32]],
        edges: &[&[f32]],
    ) -> Result<Vec<f32>> {
        // Default implementation ignores edges
        self.compute(query, keys, values)
    }

    /// Get attention weights for analysis
    fn get_weights(
        &self,
        query: &[f32],
        keys: &[&[f32]],
    ) -> Result<Vec<f32>>;

    /// Dimension of the attention output
    fn dim(&self) -> usize;

    /// Name of the backend for debugging
    fn name(&self) -> &'static str;
}

/// Standard scaled dot-product attention backend
pub struct StandardAttention {
    dim: usize,
    scale: f32,
    temperature: f32,
}

impl StandardAttention {
    pub fn new(dim: usize, temperature: f32) -> Self {
        Self {
            dim,
            scale: 1.0 / (dim as f32).sqrt(),
            temperature,
        }
    }
}

impl AttentionBackend for StandardAttention {
    fn compute(
        &self,
        query: &[f32],
        keys: &[&[f32]],
        values: &[&[f32]],
    ) -> Result<Vec<f32>> {
        if keys.is_empty() || values.is_empty() {
            return Ok(query.to_vec());
        }

        let weights = self.get_weights(query, keys)?;

        // Weighted sum of values
        let value_dim = values[0].len();
        let mut output = vec![0.0f32; value_dim];

        for (w, v) in weights.iter().zip(values.iter()) {
            for (o, &vi) in output.iter_mut().zip(v.iter()) {
                *o += w * vi;
            }
        }

        Ok(output)
    }

    fn get_weights(
        &self,
        query: &[f32],
        keys: &[&[f32]],
    ) -> Result<Vec<f32>> {
        if keys.is_empty() {
            return Ok(vec![]);
        }

        // Compute scores
        let scores: Vec<f32> = keys
            .iter()
            .map(|k| {
                query.iter()
                    .zip(k.iter())
                    .map(|(q, ki)| q * ki)
                    .sum::<f32>() * self.scale / self.temperature
            })
            .collect();

        // Softmax
        let max_score = scores.iter().copied().fold(f32::NEG_INFINITY, f32::max);
        let exp_scores: Vec<f32> = scores.iter().map(|&s| (s - max_score).exp()).collect();
        let sum: f32 = exp_scores.iter().sum::<f32>().max(1e-10);

        Ok(exp_scores.iter().map(|&e| e / sum).collect())
    }

    fn dim(&self) -> usize {
        self.dim
    }

    fn name(&self) -> &'static str {
        "StandardAttention"
    }
}

// Hyperbolic attention backend using ruvector-attention
#[cfg(feature = "hyperbolic")]
pub struct HyperbolicAttentionBackend {
    inner: ruvector_attention::HyperbolicAttention,
    dim: usize,
}

#[cfg(feature = "hyperbolic")]
impl HyperbolicAttentionBackend {
    pub fn new(dim: usize, curvature: f32) -> Self {
        let config = ruvector_attention::HyperbolicAttentionConfig {
            dim,
            curvature,
            adaptive_curvature: false,
            temperature: 1.0,
            frechet_max_iter: 50,
            frechet_tol: 1e-5,
        };
        Self {
            inner: ruvector_attention::HyperbolicAttention::new(config),
            dim,
        }
    }
}

#[cfg(feature = "hyperbolic")]
impl AttentionBackend for HyperbolicAttentionBackend {
    fn compute(
        &self,
        query: &[f32],
        keys: &[&[f32]],
        values: &[&[f32]],
    ) -> Result<Vec<f32>> {
        use ruvector_attention::Attention;

        self.inner
            .compute(query, keys, values)
            .map_err(|e| crate::error::GnnError::AttentionError(e.to_string()))
    }

    fn get_weights(
        &self,
        query: &[f32],
        keys: &[&[f32]],
    ) -> Result<Vec<f32>> {
        Ok(self.inner.compute_weights(query, keys))
    }

    fn dim(&self) -> usize {
        self.dim
    }

    fn name(&self) -> &'static str {
        "HyperbolicAttention"
    }
}

// Dual-space attention backend
#[cfg(feature = "hyperbolic")]
pub struct DualSpaceAttentionBackend {
    inner: ruvector_attention::DualSpaceAttention,
    dim: usize,
}

#[cfg(feature = "hyperbolic")]
impl DualSpaceAttentionBackend {
    pub fn new(dim: usize, curvature: f32, euclidean_weight: f32, hyperbolic_weight: f32) -> Self {
        let config = ruvector_attention::DualSpaceConfig::builder()
            .dim(dim)
            .curvature(curvature)
            .euclidean_weight(euclidean_weight)
            .hyperbolic_weight(hyperbolic_weight)
            .build();
        Self {
            inner: ruvector_attention::DualSpaceAttention::new(config),
            dim,
        }
    }
}

#[cfg(feature = "hyperbolic")]
impl AttentionBackend for DualSpaceAttentionBackend {
    fn compute(
        &self,
        query: &[f32],
        keys: &[&[f32]],
        values: &[&[f32]],
    ) -> Result<Vec<f32>> {
        use ruvector_attention::Attention;

        self.inner
            .compute(query, keys, values)
            .map_err(|e| crate::error::GnnError::AttentionError(e.to_string()))
    }

    fn get_weights(
        &self,
        query: &[f32],
        keys: &[&[f32]],
    ) -> Result<Vec<f32>> {
        // Dual space doesn't directly expose weights, compute manually
        let (euc, hyp) = self.inner.get_space_contributions(query, keys);
        // Combine and normalize
        let combined: Vec<f32> = euc.iter().zip(hyp.iter())
            .map(|(e, h)| (e + h) / 2.0)
            .collect();

        let max_score = combined.iter().copied().fold(f32::NEG_INFINITY, f32::max);
        let exp_scores: Vec<f32> = combined.iter().map(|&s| (s - max_score).exp()).collect();
        let sum: f32 = exp_scores.iter().sum::<f32>().max(1e-10);

        Ok(exp_scores.iter().map(|&e| e / sum).collect())
    }

    fn dim(&self) -> usize {
        self.dim
    }

    fn name(&self) -> &'static str {
        "DualSpaceAttention"
    }
}

// Edge-featured attention backend (GATv2)
#[cfg(feature = "edge-featured")]
pub struct EdgeFeaturedAttentionBackend {
    inner: ruvector_attention::EdgeFeaturedAttention,
    dim: usize,
    edge_dim: usize,
}

#[cfg(feature = "edge-featured")]
impl EdgeFeaturedAttentionBackend {
    pub fn new(dim: usize, edge_dim: usize, num_heads: usize) -> Self {
        let config = ruvector_attention::EdgeFeaturedConfig::builder()
            .node_dim(dim)
            .edge_dim(edge_dim)
            .num_heads(num_heads)
            .build();
        Self {
            inner: ruvector_attention::EdgeFeaturedAttention::new(config),
            dim,
            edge_dim,
        }
    }
}

#[cfg(feature = "edge-featured")]
impl AttentionBackend for EdgeFeaturedAttentionBackend {
    fn compute(
        &self,
        query: &[f32],
        keys: &[&[f32]],
        values: &[&[f32]],
    ) -> Result<Vec<f32>> {
        use ruvector_attention::Attention;

        self.inner
            .compute(query, keys, values)
            .map_err(|e| crate::error::GnnError::AttentionError(e.to_string()))
    }

    fn compute_with_edges(
        &self,
        query: &[f32],
        keys: &[&[f32]],
        values: &[&[f32]],
        edges: &[&[f32]],
    ) -> Result<Vec<f32>> {
        self.inner
            .compute_with_edges(query, keys, values, edges)
            .map_err(|e| crate::error::GnnError::AttentionError(e.to_string()))
    }

    fn get_weights(
        &self,
        query: &[f32],
        keys: &[&[f32]],
    ) -> Result<Vec<f32>> {
        // Edge-featured attention needs edge info for proper weights
        // Fall back to standard scoring
        let scale = 1.0 / (self.dim as f32).sqrt();
        let scores: Vec<f32> = keys
            .iter()
            .map(|k| {
                query.iter()
                    .zip(k.iter())
                    .map(|(q, ki)| q * ki)
                    .sum::<f32>() * scale
            })
            .collect();

        let max_score = scores.iter().copied().fold(f32::NEG_INFINITY, f32::max);
        let exp_scores: Vec<f32> = scores.iter().map(|&s| (s - max_score).exp()).collect();
        let sum: f32 = exp_scores.iter().sum::<f32>().max(1e-10);

        Ok(exp_scores.iter().map(|&e| e / sum).collect())
    }

    fn dim(&self) -> usize {
        self.dim
    }

    fn name(&self) -> &'static str {
        "EdgeFeaturedAttention"
    }
}

// Flash attention backend
#[cfg(feature = "flash-attention")]
pub struct FlashAttentionBackend {
    inner: ruvector_attention::FlashAttention,
    dim: usize,
}

#[cfg(feature = "flash-attention")]
impl FlashAttentionBackend {
    pub fn new(dim: usize, block_size: usize) -> Self {
        Self {
            inner: ruvector_attention::FlashAttention::new(dim, block_size),
            dim,
        }
    }
}

#[cfg(feature = "flash-attention")]
impl AttentionBackend for FlashAttentionBackend {
    fn compute(
        &self,
        query: &[f32],
        keys: &[&[f32]],
        values: &[&[f32]],
    ) -> Result<Vec<f32>> {
        use ruvector_attention::Attention;

        self.inner
            .compute(query, keys, values)
            .map_err(|e| crate::error::GnnError::AttentionError(e.to_string()))
    }

    fn get_weights(
        &self,
        query: &[f32],
        keys: &[&[f32]],
    ) -> Result<Vec<f32>> {
        // Flash attention doesn't materialize weights, approximate
        let scale = 1.0 / (self.dim as f32).sqrt();
        let scores: Vec<f32> = keys
            .iter()
            .map(|k| {
                query.iter()
                    .zip(k.iter())
                    .map(|(q, ki)| q * ki)
                    .sum::<f32>() * scale
            })
            .collect();

        let max_score = scores.iter().copied().fold(f32::NEG_INFINITY, f32::max);
        let exp_scores: Vec<f32> = scores.iter().map(|&s| (s - max_score).exp()).collect();
        let sum: f32 = exp_scores.iter().sum::<f32>().max(1e-10);

        Ok(exp_scores.iter().map(|&e| e / sum).collect())
    }

    fn dim(&self) -> usize {
        self.dim
    }

    fn name(&self) -> &'static str {
        "FlashAttention"
    }
}

// MoE attention backend
#[cfg(feature = "moe")]
pub struct MoEAttentionBackend {
    inner: ruvector_attention::MoEAttention,
    dim: usize,
}

#[cfg(feature = "moe")]
impl MoEAttentionBackend {
    pub fn new(dim: usize, num_experts: usize, top_k: usize) -> Self {
        let config = ruvector_attention::MoEConfig::builder()
            .dim(dim)
            .num_experts(num_experts)
            .top_k(top_k)
            .build();
        Self {
            inner: ruvector_attention::MoEAttention::new(config),
            dim,
        }
    }
}

#[cfg(feature = "moe")]
impl AttentionBackend for MoEAttentionBackend {
    fn compute(
        &self,
        query: &[f32],
        keys: &[&[f32]],
        values: &[&[f32]],
    ) -> Result<Vec<f32>> {
        use ruvector_attention::Attention;

        self.inner
            .compute(query, keys, values)
            .map_err(|e| crate::error::GnnError::AttentionError(e.to_string()))
    }

    fn get_weights(
        &self,
        query: &[f32],
        keys: &[&[f32]],
    ) -> Result<Vec<f32>> {
        // MoE uses routing, approximate weights
        let scale = 1.0 / (self.dim as f32).sqrt();
        let scores: Vec<f32> = keys
            .iter()
            .map(|k| {
                query.iter()
                    .zip(k.iter())
                    .map(|(q, ki)| q * ki)
                    .sum::<f32>() * scale
            })
            .collect();

        let max_score = scores.iter().copied().fold(f32::NEG_INFINITY, f32::max);
        let exp_scores: Vec<f32> = scores.iter().map(|&s| (s - max_score).exp()).collect();
        let sum: f32 = exp_scores.iter().sum::<f32>().max(1e-10);

        Ok(exp_scores.iter().map(|&e| e / sum).collect())
    }

    fn dim(&self) -> usize {
        self.dim
    }

    fn name(&self) -> &'static str {
        "MoEAttention"
    }
}

/// Create an attention backend from configuration
pub fn create_backend(config: &AttentionConfig) -> Box<dyn AttentionBackend> {
    match config.mode {
        AttentionMode::Standard => {
            Box::new(StandardAttention::new(config.dim, config.temperature))
        }
        #[cfg(feature = "hyperbolic")]
        AttentionMode::Hyperbolic { curvature } => {
            Box::new(HyperbolicAttentionBackend::new(config.dim, curvature))
        }
        #[cfg(feature = "hyperbolic")]
        AttentionMode::DualSpace { curvature, euclidean_weight, hyperbolic_weight } => {
            Box::new(DualSpaceAttentionBackend::new(
                config.dim, curvature, euclidean_weight, hyperbolic_weight
            ))
        }
        #[cfg(feature = "edge-featured")]
        AttentionMode::EdgeFeatured { edge_dim, num_heads } => {
            Box::new(EdgeFeaturedAttentionBackend::new(config.dim, edge_dim, num_heads))
        }
        #[cfg(feature = "flash-attention")]
        AttentionMode::Flash { block_size } => {
            Box::new(FlashAttentionBackend::new(config.dim, block_size))
        }
        #[cfg(feature = "moe")]
        AttentionMode::MoE { num_experts, top_k } => {
            Box::new(MoEAttentionBackend::new(config.dim, num_experts, top_k))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_standard_attention() {
        let attn = StandardAttention::new(4, 1.0);

        let query = vec![1.0, 0.0, 0.0, 0.0];
        let keys = vec![
            vec![1.0, 0.0, 0.0, 0.0],
            vec![0.0, 1.0, 0.0, 0.0],
        ];
        let values = vec![
            vec![1.0, 0.0, 0.0, 0.0],
            vec![0.0, 1.0, 0.0, 0.0],
        ];

        let keys_refs: Vec<&[f32]> = keys.iter().map(|k| k.as_slice()).collect();
        let values_refs: Vec<&[f32]> = values.iter().map(|v| v.as_slice()).collect();

        let result = attn.compute(&query, &keys_refs, &values_refs).unwrap();
        assert_eq!(result.len(), 4);

        // First key matches query better, so output should be weighted toward first value
        assert!(result[0] > result[1]);
    }

    #[test]
    fn test_attention_weights() {
        let attn = StandardAttention::new(4, 1.0);

        let query = vec![1.0, 0.0, 0.0, 0.0];
        let keys = vec![
            vec![1.0, 0.0, 0.0, 0.0],
            vec![0.0, 1.0, 0.0, 0.0],
            vec![0.5, 0.5, 0.0, 0.0],
        ];

        let keys_refs: Vec<&[f32]> = keys.iter().map(|k| k.as_slice()).collect();

        let weights = attn.get_weights(&query, &keys_refs).unwrap();
        assert_eq!(weights.len(), 3);

        // Weights should sum to 1
        let sum: f32 = weights.iter().sum();
        assert!((sum - 1.0).abs() < 1e-6);

        // First key should have highest weight
        assert!(weights[0] > weights[1]);
        assert!(weights[0] > weights[2]);
    }

    #[test]
    fn test_create_backend() {
        let config = AttentionConfig::new(64);
        let backend = create_backend(&config);
        assert_eq!(backend.name(), "StandardAttention");
        assert_eq!(backend.dim(), 64);
    }
}
