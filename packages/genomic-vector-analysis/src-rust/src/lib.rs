use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use ndarray::{Array1, Array2};

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

/// High-performance k-mer embedding using Rust
#[wasm_bindgen]
pub struct KmerEmbedder {
    k: usize,
    dimensions: usize,
}

#[wasm_bindgen]
impl KmerEmbedder {
    #[wasm_bindgen(constructor)]
    pub fn new(k: usize, dimensions: usize) -> KmerEmbedder {
        KmerEmbedder { k, dimensions }
    }

    /// Generate k-mer embedding from DNA sequence
    pub fn embed(&self, sequence: &str) -> Vec<f32> {
        let kmers = self.extract_kmers(sequence);
        let mut embedding = vec![0.0f32; self.dimensions];

        // Simple frequency-based embedding
        for kmer in kmers {
            let hash = self.hash_kmer(&kmer);
            let idx = hash % self.dimensions;
            embedding[idx] += 1.0;
        }

        // Normalize
        let sum: f32 = embedding.iter().sum();
        if sum > 0.0 {
            embedding.iter_mut().for_each(|x| *x /= sum);
        }

        embedding
    }

    fn extract_kmers(&self, sequence: &str) -> Vec<String> {
        let seq_upper = sequence.to_uppercase();
        let chars: Vec<char> = seq_upper.chars().collect();

        if chars.len() < self.k {
            return vec![];
        }

        (0..=chars.len() - self.k)
            .map(|i| chars[i..i + self.k].iter().collect())
            .collect()
    }

    fn hash_kmer(&self, kmer: &str) -> usize {
        kmer.bytes()
            .enumerate()
            .fold(0usize, |acc, (i, byte)| {
                acc.wrapping_add((byte as usize).wrapping_mul(31usize.pow(i as u32)))
            })
    }
}

/// High-performance similarity search operations
#[wasm_bindgen]
pub struct SimilarityCalculator;

#[wasm_bindgen]
impl SimilarityCalculator {
    #[wasm_bindgen(constructor)]
    pub fn new() -> SimilarityCalculator {
        SimilarityCalculator
    }

    /// Cosine similarity between two vectors
    pub fn cosine_similarity(&self, a: Vec<f32>, b: Vec<f32>) -> f32 {
        if a.len() != b.len() {
            return 0.0;
        }

        let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
        let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
        let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

        if norm_a == 0.0 || norm_b == 0.0 {
            return 0.0;
        }

        dot_product / (norm_a * norm_b)
    }

    /// Euclidean distance between two vectors
    pub fn euclidean_distance(&self, a: Vec<f32>, b: Vec<f32>) -> f32 {
        if a.len() != b.len() {
            return f32::MAX;
        }

        a.iter()
            .zip(b.iter())
            .map(|(x, y)| (x - y).powi(2))
            .sum::<f32>()
            .sqrt()
    }

    /// Hamming distance for binary vectors
    pub fn hamming_distance(&self, a: Vec<u8>, b: Vec<u8>) -> u32 {
        if a.len() != b.len() {
            return u32::MAX;
        }

        a.iter()
            .zip(b.iter())
            .filter(|(x, y)| x != y)
            .count() as u32
    }

    /// Batch cosine similarity (optimized for multiple comparisons)
    pub fn batch_cosine_similarity(&self, query: Vec<f32>, vectors: Vec<f32>, dim: usize) -> Vec<f32> {
        let num_vectors = vectors.len() / dim;
        let mut results = Vec::with_capacity(num_vectors);

        for i in 0..num_vectors {
            let start = i * dim;
            let end = start + dim;
            let vector = vectors[start..end].to_vec();
            results.push(self.cosine_similarity(query.clone(), vector));
        }

        results
    }
}

/// Product quantization for memory-efficient vector storage
#[wasm_bindgen]
pub struct ProductQuantizer {
    subvectors: usize,
    clusters_per_subvector: usize,
}

#[wasm_bindgen]
impl ProductQuantizer {
    #[wasm_bindgen(constructor)]
    pub fn new(subvectors: usize, clusters_per_subvector: usize) -> ProductQuantizer {
        ProductQuantizer {
            subvectors,
            clusters_per_subvector,
        }
    }

    /// Quantize a vector into compact representation
    pub fn quantize(&self, vector: Vec<f32>) -> Vec<u8> {
        let subvector_size = vector.len() / self.subvectors;
        let mut quantized = Vec::with_capacity(self.subvectors);

        for i in 0..self.subvectors {
            let start = i * subvector_size;
            let end = start + subvector_size;
            let subvec = &vector[start..end];

            // Simple quantization: map to cluster ID
            let cluster_id = (subvec.iter().sum::<f32>() * 10.0) as u8 % self.clusters_per_subvector as u8;
            quantized.push(cluster_id);
        }

        quantized
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_kmer_embedding() {
        let embedder = KmerEmbedder::new(3, 64);
        let sequence = "ATCGATCGATCG";
        let embedding = embedder.embed(sequence);

        assert_eq!(embedding.len(), 64);
        assert!((embedding.iter().sum::<f32>() - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_cosine_similarity() {
        let calc = SimilarityCalculator::new();
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![1.0, 0.0, 0.0];
        let similarity = calc.cosine_similarity(a, b);

        assert!((similarity - 1.0).abs() < 0.001);
    }
}
