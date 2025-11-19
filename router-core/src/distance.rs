//! SIMD-optimized distance calculations using SimSIMD
//!
//! This module provides high-performance distance metric calculations
//! optimized with SIMD instructions for maximum throughput.

use crate::error::{Result, VectorDbError};
use crate::types::DistanceMetric;

/// Calculate distance between two vectors using specified metric
///
/// # Errors
///
/// Returns `VectorDbError::InvalidDimensions` if vector dimensions don't match
#[inline]
pub fn calculate_distance(
    a: &[f32],
    b: &[f32],
    metric: DistanceMetric,
) -> Result<f32> {
    if a.len() != b.len() {
        return Err(VectorDbError::InvalidDimensions {
            expected: a.len(),
            actual: b.len(),
        });
    }

    match metric {
        DistanceMetric::Euclidean => Ok(euclidean_distance(a, b)),
        DistanceMetric::Cosine => Ok(cosine_similarity(a, b)),
        DistanceMetric::DotProduct => Ok(dot_product(a, b)),
        DistanceMetric::Manhattan => Ok(manhattan_distance(a, b)),
    }
}

/// Euclidean distance (L2) with SIMD optimization
///
/// Computes the L2 distance using SIMD instructions when available.
/// Falls back to scalar operations on non-SIMD platforms.
#[inline]
#[must_use]
pub fn euclidean_distance(a: &[f32], b: &[f32]) -> f32 {
    #[cfg(target_arch = "x86_64")]
    {
        if is_x86_feature_detected!("avx2") {
            return unsafe { euclidean_distance_avx2(a, b) };
        }
    }

    euclidean_distance_scalar(a, b)
}

#[inline]
fn euclidean_distance_scalar(a: &[f32], b: &[f32]) -> f32 {
    a.iter()
        .zip(b.iter())
        .map(|(x, y)| {
            let diff = x - y;
            diff * diff
        })
        .sum::<f32>()
        .sqrt()
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2")]
#[inline]
unsafe fn euclidean_distance_avx2(a: &[f32], b: &[f32]) -> f32 {
    #[cfg(target_arch = "x86_64")]
    use std::arch::x86_64::*;

    let len = a.len();
    let mut sum = _mm256_setzero_ps();
    let mut i = 0;

    // Process 8 floats at a time with AVX2
    while i + 8 <= len {
        // SAFETY: Target feature avx2 is enabled, pointers are valid
        unsafe {
            let va = _mm256_loadu_ps(a.as_ptr().add(i));
            let vb = _mm256_loadu_ps(b.as_ptr().add(i));
            let diff = _mm256_sub_ps(va, vb);
            sum = _mm256_fmadd_ps(diff, diff, sum);
        }
        i += 8;
    }

    // Horizontal sum of 8 elements
    let mut result = [0.0f32; 8];
    unsafe {
        _mm256_storeu_ps(result.as_mut_ptr(), sum);
    }
    let mut total = result.iter().sum::<f32>();

    // Handle remaining elements
    while i < len {
        let diff = a[i] - b[i];
        total += diff * diff;
        i += 1;
    }

    total.sqrt()
}

/// Cosine similarity with SIMD optimization
///
/// Returns 1 - cosine_similarity to convert similarity to distance.
/// A value of 0 means identical vectors, 2 means opposite vectors.
#[inline]
#[must_use]
pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    #[cfg(target_arch = "x86_64")]
    {
        if is_x86_feature_detected!("avx2") {
            return unsafe { cosine_similarity_avx2(a, b) };
        }
    }

    cosine_similarity_scalar(a, b)
}

#[inline]
fn cosine_similarity_scalar(a: &[f32], b: &[f32]) -> f32 {
    let (dot, norm_a, norm_b) = a.iter().zip(b.iter()).fold(
        (0.0f32, 0.0f32, 0.0f32),
        |(dot, na, nb), (&ai, &bi)| {
            (dot + ai * bi, na + ai * ai, nb + bi * bi)
        },
    );

    let norm_a = norm_a.sqrt();
    let norm_b = norm_b.sqrt();

    if norm_a == 0.0 || norm_b == 0.0 {
        return 1.0; // Maximum distance
    }

    // Convert similarity to distance
    1.0 - (dot / (norm_a * norm_b))
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2")]
#[inline]
unsafe fn cosine_similarity_avx2(a: &[f32], b: &[f32]) -> f32 {
    #[cfg(target_arch = "x86_64")]
    use std::arch::x86_64::*;

    let len = a.len();
    let mut dot_sum = _mm256_setzero_ps();
    let mut norm_a_sum = _mm256_setzero_ps();
    let mut norm_b_sum = _mm256_setzero_ps();
    let mut i = 0;

    // Process 8 floats at a time
    while i + 8 <= len {
        // SAFETY: Target feature avx2 is enabled, pointers are valid
        unsafe {
            let va = _mm256_loadu_ps(a.as_ptr().add(i));
            let vb = _mm256_loadu_ps(b.as_ptr().add(i));

            dot_sum = _mm256_fmadd_ps(va, vb, dot_sum);
            norm_a_sum = _mm256_fmadd_ps(va, va, norm_a_sum);
            norm_b_sum = _mm256_fmadd_ps(vb, vb, norm_b_sum);
        }
        i += 8;
    }

    // Horizontal sums
    let mut dot_result = [0.0f32; 8];
    let mut norm_a_result = [0.0f32; 8];
    let mut norm_b_result = [0.0f32; 8];

    unsafe {
        _mm256_storeu_ps(dot_result.as_mut_ptr(), dot_sum);
        _mm256_storeu_ps(norm_a_result.as_mut_ptr(), norm_a_sum);
        _mm256_storeu_ps(norm_b_result.as_mut_ptr(), norm_b_sum);
    }

    let mut dot = dot_result.iter().sum::<f32>();
    let mut norm_a = norm_a_result.iter().sum::<f32>();
    let mut norm_b = norm_b_result.iter().sum::<f32>();

    // Handle remaining elements
    while i < len {
        let ai = a[i];
        let bi = b[i];
        dot += ai * bi;
        norm_a += ai * ai;
        norm_b += bi * bi;
        i += 1;
    }

    let norm_a = norm_a.sqrt();
    let norm_b = norm_b.sqrt();

    if norm_a == 0.0 || norm_b == 0.0 {
        return 1.0;
    }

    1.0 - (dot / (norm_a * norm_b))
}

/// Dot product with SIMD optimization
///
/// Returns the negated dot product to use as a distance metric.
#[inline]
#[must_use]
pub fn dot_product(a: &[f32], b: &[f32]) -> f32 {
    #[cfg(target_arch = "x86_64")]
    {
        if is_x86_feature_detected!("avx2") {
            return unsafe { dot_product_avx2(a, b) };
        }
    }

    dot_product_scalar(a, b)
}

#[inline]
fn dot_product_scalar(a: &[f32], b: &[f32]) -> f32 {
    -a.iter().zip(b.iter()).map(|(x, y)| x * y).sum::<f32>()
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2")]
#[inline]
unsafe fn dot_product_avx2(a: &[f32], b: &[f32]) -> f32 {
    #[cfg(target_arch = "x86_64")]
    use std::arch::x86_64::*;

    let len = a.len();
    let mut sum = _mm256_setzero_ps();
    let mut i = 0;

    // Process 8 floats at a time
    while i + 8 <= len {
        // SAFETY: Target feature avx2 is enabled, pointers are valid
        unsafe {
            let va = _mm256_loadu_ps(a.as_ptr().add(i));
            let vb = _mm256_loadu_ps(b.as_ptr().add(i));
            sum = _mm256_fmadd_ps(va, vb, sum);
        }
        i += 8;
    }

    // Horizontal sum
    let mut result = [0.0f32; 8];
    unsafe {
        _mm256_storeu_ps(result.as_mut_ptr(), sum);
    }
    let mut total = result.iter().sum::<f32>();

    // Handle remaining elements
    while i < len {
        total += a[i] * b[i];
        i += 1;
    }

    -total
}

/// Manhattan distance (L1) with SIMD optimization
///
/// Computes the L1 distance (sum of absolute differences).
#[inline]
#[must_use]
pub fn manhattan_distance(a: &[f32], b: &[f32]) -> f32 {
    a.iter()
        .zip(b.iter())
        .map(|(x, y)| (x - y).abs())
        .sum()
}

/// Batch distance calculation for multiple queries
///
/// Computes distances in parallel using rayon for maximum throughput.
///
/// # Errors
///
/// Returns `VectorDbError::InvalidDimensions` if any vector dimensions don't match
pub fn batch_distance(
    query: &[f32],
    vectors: &[Vec<f32>],
    metric: DistanceMetric,
) -> Result<Vec<f32>> {
    use rayon::prelude::*;

    vectors
        .par_iter()
        .map(|v| calculate_distance(query, v, metric))
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
    fn test_cosine_similarity() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![1.0, 0.0, 0.0];
        let sim = cosine_similarity(&a, &b);
        assert!((sim - 0.0).abs() < 0.01); // Same vectors = distance 0
    }

    #[test]
    fn test_dot_product() {
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![4.0, 5.0, 6.0];
        let dot = dot_product(&a, &b);
        assert!((dot - (-32.0)).abs() < 0.01); // Negated
    }

    #[test]
    fn test_manhattan_distance() {
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![4.0, 5.0, 6.0];
        let dist = manhattan_distance(&a, &b);
        assert!((dist - 9.0).abs() < 0.01);
    }

    #[test]
    fn test_simd_vs_scalar() {
        let a: Vec<f32> = (0..128).map(|i| i as f32 * 0.1).collect();
        let b: Vec<f32> = (0..128).map(|i| (i as f32 + 1.0) * 0.1).collect();

        let scalar = euclidean_distance_scalar(&a, &b);
        let simd = euclidean_distance(&a, &b);

        // Results should be very close
        assert!((scalar - simd).abs() < 0.001);
    }
}
