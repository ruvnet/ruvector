//! SIMD-optimized distance metrics using SimSIMD

use crate::types::DistanceMetric;
use crate::error::{Result, RuvectorError};

/// Calculate distance between two vectors using the specified metric
#[inline]
pub fn distance(a: &[f32], b: &[f32], metric: DistanceMetric) -> Result<f32> {
    if a.len() != b.len() {
        return Err(RuvectorError::DimensionMismatch {
            expected: a.len(),
            actual: b.len(),
        });
    }

    match metric {
        DistanceMetric::Euclidean => Ok(euclidean_distance(a, b)),
        DistanceMetric::Cosine => Ok(cosine_distance(a, b)),
        DistanceMetric::DotProduct => Ok(dot_product_distance(a, b)),
        DistanceMetric::Manhattan => Ok(manhattan_distance(a, b)),
    }
}

/// Euclidean (L2) distance using SimSIMD
#[inline]
pub fn euclidean_distance(a: &[f32], b: &[f32]) -> f32 {
    // Use SimSIMD for optimal SIMD performance
    (simsimd::SpatialSimilarity::sqeuclidean(a, b)
        .expect("SimSIMD euclidean failed")
        .sqrt()) as f32
}

/// Cosine distance (1 - cosine_similarity) using SimSIMD
#[inline]
pub fn cosine_distance(a: &[f32], b: &[f32]) -> f32 {
    // SimSIMD returns cosine similarity, convert to distance
    let similarity = simsimd::SpatialSimilarity::cosine(a, b)
        .expect("SimSIMD cosine failed");
    (1.0 - similarity) as f32
}

/// Dot product distance (negative for maximization) using SimSIMD
#[inline]
pub fn dot_product_distance(a: &[f32], b: &[f32]) -> f32 {
    // Return negative dot product for distance minimization
    let dot = simsimd::SpatialSimilarity::dot(a, b)
        .expect("SimSIMD dot product failed");
    (-dot) as f32
}

/// Manhattan (L1) distance
#[inline]
pub fn manhattan_distance(a: &[f32], b: &[f32]) -> f32 {
    a.iter()
        .zip(b.iter())
        .map(|(x, y)| (x - y).abs())
        .sum()
}

/// Batch distance calculation optimized with Rayon
pub fn batch_distances(
    query: &[f32],
    vectors: &[Vec<f32>],
    metric: DistanceMetric,
) -> Result<Vec<f32>> {
    use rayon::prelude::*;

    vectors
        .par_iter()
        .map(|v| distance(query, v, metric))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_euclidean_distance() {
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![4.0, 5.0, 6.0];
        let dist = euclidean_distance(&a, &b);
        assert!((dist - 5.196).abs() < 0.01);
    }

    #[test]
    fn test_cosine_distance() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![0.0, 1.0, 0.0];
        let dist = cosine_distance(&a, &b);
        assert!((dist - 1.0).abs() < 0.01); // Orthogonal vectors
    }

    #[test]
    fn test_dot_product_distance() {
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![4.0, 5.0, 6.0];
        let dist = dot_product_distance(&a, &b);
        assert!((dist + 32.0).abs() < 0.01); // -(4 + 10 + 18) = -32
    }

    #[test]
    fn test_manhattan_distance() {
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![4.0, 5.0, 6.0];
        let dist = manhattan_distance(&a, &b);
        assert!((dist - 9.0).abs() < 0.01); // |1-4| + |2-5| + |3-6| = 9
    }

    #[test]
    fn test_dimension_mismatch() {
        let a = vec![1.0, 2.0];
        let b = vec![1.0, 2.0, 3.0];
        let result = distance(&a, &b, DistanceMetric::Euclidean);
        assert!(result.is_err());
    }
}
