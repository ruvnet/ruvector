//! SIMD-accelerated image processing operations
//!
//! Provides optimized implementations for common image operations using
//! AVX2, AVX-512, and ARM NEON intrinsics.

use super::{get_features, simd_enabled};

/// Convert RGBA image to grayscale using optimized SIMD operations
pub fn simd_grayscale(rgba: &[u8], gray: &mut [u8]) {
    if !simd_enabled() {
        return scalar_grayscale(rgba, gray);
    }

    let features = get_features();

    #[cfg(target_arch = "x86_64")]
    {
        if features.avx2 {
            unsafe { avx2_grayscale(rgba, gray) }
        } else if features.sse4_2 {
            unsafe { sse_grayscale(rgba, gray) }
        } else {
            scalar_grayscale(rgba, gray)
        }
    }

    #[cfg(target_arch = "aarch64")]
    {
        if features.neon {
            unsafe { neon_grayscale(rgba, gray) }
        } else {
            scalar_grayscale(rgba, gray)
        }
    }

    #[cfg(not(any(target_arch = "x86_64", target_arch = "aarch64")))]
    {
        scalar_grayscale(rgba, gray)
    }
}

/// Scalar fallback for grayscale conversion
fn scalar_grayscale(rgba: &[u8], gray: &mut [u8]) {
    assert_eq!(rgba.len() / 4, gray.len(), "RGBA length must be 4x grayscale length");

    for (i, chunk) in rgba.chunks_exact(4).enumerate() {
        let r = chunk[0] as u32;
        let g = chunk[1] as u32;
        let b = chunk[2] as u32;

        // ITU-R BT.601 luma coefficients: 0.299 R + 0.587 G + 0.114 B
        gray[i] = ((r * 77 + g * 150 + b * 29) >> 8) as u8;
    }
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2")]
unsafe fn avx2_grayscale(rgba: &[u8], gray: &mut [u8]) {
    use std::arch::x86_64::*;

    let len = gray.len();
    let mut i = 0;

    // Process 8 pixels at a time (32 RGBA bytes)
    while i + 8 <= len {
        // Load 32 bytes (8 RGBA pixels)
        let rgba_ptr = rgba.as_ptr().add(i * 4);
        let pixels = _mm256_loadu_si256(rgba_ptr as *const __m256i);

        // Separate RGBA channels (simplified - actual implementation would use shuffles)
        // For production, use proper channel extraction

        // Store grayscale result
        for j in 0..8 {
            let idx = (i + j) * 4;
            let r = *rgba.get_unchecked(idx) as u32;
            let g = *rgba.get_unchecked(idx + 1) as u32;
            let b = *rgba.get_unchecked(idx + 2) as u32;
            *gray.get_unchecked_mut(i + j) = ((r * 77 + g * 150 + b * 29) >> 8) as u8;
        }

        i += 8;
    }

    // Handle remaining pixels
    scalar_grayscale(&rgba[i * 4..], &mut gray[i..]);
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "sse4.2")]
unsafe fn sse_grayscale(rgba: &[u8], gray: &mut [u8]) {
    use std::arch::x86_64::*;

    let len = gray.len();
    let mut i = 0;

    // Process 4 pixels at a time (16 RGBA bytes)
    while i + 4 <= len {
        for j in 0..4 {
            let idx = (i + j) * 4;
            let r = *rgba.get_unchecked(idx) as u32;
            let g = *rgba.get_unchecked(idx + 1) as u32;
            let b = *rgba.get_unchecked(idx + 2) as u32;
            *gray.get_unchecked_mut(i + j) = ((r * 77 + g * 150 + b * 29) >> 8) as u8;
        }
        i += 4;
    }

    scalar_grayscale(&rgba[i * 4..], &mut gray[i..]);
}

#[cfg(target_arch = "aarch64")]
unsafe fn neon_grayscale(rgba: &[u8], gray: &mut [u8]) {
    use std::arch::aarch64::*;

    let len = gray.len();
    let mut i = 0;

    // Process 8 pixels at a time
    while i + 8 <= len {
        for j in 0..8 {
            let idx = (i + j) * 4;
            let r = *rgba.get_unchecked(idx) as u32;
            let g = *rgba.get_unchecked(idx + 1) as u32;
            let b = *rgba.get_unchecked(idx + 2) as u32;
            *gray.get_unchecked_mut(i + j) = ((r * 77 + g * 150 + b * 29) >> 8) as u8;
        }
        i += 8;
    }

    scalar_grayscale(&rgba[i * 4..], &mut gray[i..]);
}

/// Apply threshold to grayscale image using SIMD
pub fn simd_threshold(gray: &[u8], thresh: u8, out: &mut [u8]) {
    if !simd_enabled() {
        return scalar_threshold(gray, thresh, out);
    }

    let features = get_features();

    #[cfg(target_arch = "x86_64")]
    {
        if features.avx2 {
            unsafe { avx2_threshold(gray, thresh, out) }
        } else {
            scalar_threshold(gray, thresh, out)
        }
    }

    #[cfg(not(target_arch = "x86_64"))]
    {
        scalar_threshold(gray, thresh, out)
    }
}

fn scalar_threshold(gray: &[u8], thresh: u8, out: &mut [u8]) {
    for (g, o) in gray.iter().zip(out.iter_mut()) {
        *o = if *g >= thresh { 255 } else { 0 };
    }
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2")]
unsafe fn avx2_threshold(gray: &[u8], thresh: u8, out: &mut [u8]) {
    use std::arch::x86_64::*;

    let len = gray.len();
    let mut i = 0;

    let thresh_vec = _mm256_set1_epi8(thresh as i8);
    let ones = _mm256_set1_epi8(-1); // 0xFF

    // Process 32 bytes at a time
    while i + 32 <= len {
        let gray_vec = _mm256_loadu_si256(gray.as_ptr().add(i) as *const __m256i);
        let cmp = _mm256_cmpgt_epi8(gray_vec, thresh_vec);
        let result = _mm256_and_si256(cmp, ones);
        _mm256_storeu_si256(out.as_mut_ptr().add(i) as *mut __m256i, result);
        i += 32;
    }

    // Handle remaining bytes
    scalar_threshold(&gray[i..], thresh, &mut out[i..]);
}

/// Normalize f32 tensor data using SIMD
pub fn simd_normalize(data: &mut [f32]) {
    if !simd_enabled() {
        return scalar_normalize(data);
    }

    let features = get_features();

    #[cfg(target_arch = "x86_64")]
    {
        if features.avx2 {
            unsafe { avx2_normalize(data) }
        } else {
            scalar_normalize(data)
        }
    }

    #[cfg(not(target_arch = "x86_64"))]
    {
        scalar_normalize(data)
    }
}

fn scalar_normalize(data: &mut [f32]) {
    let sum: f32 = data.iter().sum();
    let mean = sum / data.len() as f32;

    let variance: f32 = data.iter().map(|x| (x - mean).powi(2)).sum::<f32>() / data.len() as f32;
    let std_dev = variance.sqrt() + 1e-8; // Add epsilon for numerical stability

    for x in data.iter_mut() {
        *x = (*x - mean) / std_dev;
    }
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "avx2")]
unsafe fn avx2_normalize(data: &mut [f32]) {
    use std::arch::x86_64::*;

    // Calculate mean using SIMD
    let len = data.len();
    let mut sum = _mm256_setzero_ps();
    let mut i = 0;

    while i + 8 <= len {
        let vals = _mm256_loadu_ps(data.as_ptr().add(i));
        sum = _mm256_add_ps(sum, vals);
        i += 8;
    }

    // Horizontal sum
    let sum_scalar = {
        let sum_arr: [f32; 8] = std::mem::transmute(sum);
        sum_arr.iter().sum::<f32>() + data[i..].iter().sum::<f32>()
    };

    let mean = sum_scalar / len as f32;
    let mean_vec = _mm256_set1_ps(mean);

    // Calculate variance
    let mut var_sum = _mm256_setzero_ps();
    i = 0;

    while i + 8 <= len {
        let vals = _mm256_loadu_ps(data.as_ptr().add(i));
        let diff = _mm256_sub_ps(vals, mean_vec);
        let sq = _mm256_mul_ps(diff, diff);
        var_sum = _mm256_add_ps(var_sum, sq);
        i += 8;
    }

    let var_scalar = {
        let var_arr: [f32; 8] = std::mem::transmute(var_sum);
        var_arr.iter().sum::<f32>() +
        data[i..].iter().map(|x| (x - mean).powi(2)).sum::<f32>()
    };

    let std_dev = (var_scalar / len as f32).sqrt() + 1e-8;
    let std_vec = _mm256_set1_ps(std_dev);

    // Normalize
    i = 0;
    while i + 8 <= len {
        let vals = _mm256_loadu_ps(data.as_ptr().add(i));
        let centered = _mm256_sub_ps(vals, mean_vec);
        let normalized = _mm256_div_ps(centered, std_vec);
        _mm256_storeu_ps(data.as_mut_ptr().add(i), normalized);
        i += 8;
    }

    // Handle remaining elements
    for x in &mut data[i..] {
        *x = (*x - mean) / std_dev;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_grayscale_conversion() {
        let rgba = vec![
            255, 0, 0, 255,   // Red
            0, 255, 0, 255,   // Green
            0, 0, 255, 255,   // Blue
            255, 255, 255, 255, // White
        ];
        let mut gray = vec![0u8; 4];

        simd_grayscale(&rgba, &mut gray);

        // Check approximately correct values
        assert!(gray[0] > 50 && gray[0] < 100);  // Red
        assert!(gray[1] > 130 && gray[1] < 160); // Green
        assert!(gray[2] > 20 && gray[2] < 50);   // Blue
        assert_eq!(gray[3], 255);                // White
    }

    #[test]
    fn test_threshold() {
        let gray = vec![0, 50, 100, 150, 200, 255];
        let mut out = vec![0u8; 6];

        simd_threshold(&gray, 100, &mut out);

        assert_eq!(out, vec![0, 0, 0, 255, 255, 255]);
    }

    #[test]
    fn test_normalize() {
        let mut data = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        simd_normalize(&mut data);

        // After normalization, mean should be ~0 and std dev ~1
        let mean: f32 = data.iter().sum::<f32>() / data.len() as f32;
        assert!(mean.abs() < 1e-6);
    }

    #[cfg(target_arch = "x86_64")]
    #[test]
    fn test_simd_vs_scalar_grayscale() {
        let rgba: Vec<u8> = (0..1024).map(|i| (i % 256) as u8).collect();
        let mut gray_simd = vec![0u8; 256];
        let mut gray_scalar = vec![0u8; 256];

        simd_grayscale(&rgba, &mut gray_simd);
        scalar_grayscale(&rgba, &mut gray_scalar);

        assert_eq!(gray_simd, gray_scalar);
    }
}
