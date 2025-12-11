# Optimization Guide

## TRM + RuvLLM Performance Optimization

---

## 1. Overview

This guide covers optimization strategies for maximizing TRM + RuvLLM performance across different deployment scenarios.

### 1.1 Optimization Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Optimization Priority                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Level 1: Algorithm Optimization (Highest Impact)                   │
│  ├── K prediction accuracy (skip unnecessary iterations)           │
│  ├── Early stopping tuning (confidence threshold)                  │
│  └── Caching strategy (avoid re-computation)                       │
│                                                                     │
│  Level 2: Memory Optimization                                       │
│  ├── Buffer reuse                                                  │
│  ├── Quantization (Q4/Q8)                                          │
│  └── Memory pooling                                                │
│                                                                     │
│  Level 3: Compute Optimization                                      │
│  ├── SIMD vectorization                                            │
│  ├── Cache-friendly data layout                                    │
│  └── Parallel execution                                            │
│                                                                     │
│  Level 4: Platform-Specific (Lowest but Essential)                  │
│  ├── WASM optimizations                                            │
│  ├── Target-specific intrinsics                                    │
│  └── JIT compilation hints                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Algorithm Optimizations

### 2.1 Adaptive K Selection

**Goal**: Use the minimum K needed for each query.

```rust
/// Adaptive K selection based on query complexity
pub struct AdaptiveKSelector {
    /// History of (complexity_score, optimal_k) pairs
    history: Vec<(f32, usize)>,

    /// Regression model for K prediction
    predictor: KPredictor,

    /// Minimum K (never go below)
    min_k: usize,

    /// Maximum K (safety limit)
    max_k: usize,

    /// Confidence threshold for early stopping
    confidence_threshold: f32,
}

impl AdaptiveKSelector {
    /// Compute query complexity score
    pub fn complexity_score(&self, embedding: &[f32]) -> f32 {
        // Entropy-based complexity
        let entropy = self.embedding_entropy(embedding);

        // Variance-based complexity
        let variance = self.embedding_variance(embedding);

        // Combined score
        0.6 * entropy + 0.4 * variance
    }

    fn embedding_entropy(&self, embedding: &[f32]) -> f32 {
        // Normalize to probabilities
        let sum: f32 = embedding.iter().map(|x| x.abs()).sum();
        if sum < 1e-8 { return 0.0; }

        let probs: Vec<f32> = embedding.iter()
            .map(|x| x.abs() / sum)
            .collect();

        // Shannon entropy
        -probs.iter()
            .filter(|&&p| p > 0.0)
            .map(|&p| p * p.ln())
            .sum::<f32>()
    }

    fn embedding_variance(&self, embedding: &[f32]) -> f32 {
        let mean: f32 = embedding.iter().sum::<f32>() / embedding.len() as f32;
        embedding.iter()
            .map(|x| (x - mean).powi(2))
            .sum::<f32>() / embedding.len() as f32
    }

    /// Predict optimal K for query
    pub fn predict_k(&self, embedding: &[f32]) -> usize {
        let complexity = self.complexity_score(embedding);

        // Use SONA patterns if available
        if let Some(pattern_k) = self.predictor.predict_from_patterns(embedding) {
            return pattern_k.clamp(self.min_k, self.max_k);
        }

        // Fallback: linear mapping from complexity
        let k = (complexity * self.max_k as f32).round() as usize;
        k.clamp(self.min_k, self.max_k)
    }
}
```

**Impact**: 20-50% latency reduction by avoiding over-iteration.

### 2.2 Early Stopping Optimization

```rust
/// Optimized early stopping with confidence tracking
pub struct EarlyStopOptimizer {
    /// Window of recent confidence values
    confidence_window: CircularBuffer<f32>,

    /// Convergence threshold (stop if delta < this)
    convergence_threshold: f32,

    /// Minimum iterations before stopping
    min_iterations: usize,

    /// Look-back window size
    window_size: usize,
}

impl EarlyStopOptimizer {
    pub fn should_stop(
        &mut self,
        iteration: usize,
        current_confidence: f32,
    ) -> bool {
        self.confidence_window.push(current_confidence);

        // Never stop before minimum
        if iteration < self.min_iterations {
            return false;
        }

        // Check absolute threshold
        if current_confidence >= 0.95 {
            return true;
        }

        // Check convergence (plateauing)
        if self.confidence_window.len() >= self.window_size {
            let recent: Vec<f32> = self.confidence_window.last_n(self.window_size);
            let delta = recent.last().unwrap() - recent.first().unwrap();

            // If confidence isn't improving, stop
            if delta.abs() < self.convergence_threshold {
                return true;
            }
        }

        false
    }
}
```

**Impact**: 10-30% latency reduction for queries that converge quickly.

### 2.3 Caching Strategy

```rust
/// Multi-level caching for TRM results
pub struct TrmCache {
    /// L1: Exact match cache (embedding hash -> result)
    exact_cache: LruCache<u64, CachedResult>,

    /// L2: Similarity cache (HNSW lookup for similar queries)
    similarity_cache: HnswIndex,

    /// Similarity threshold for cache hits
    similarity_threshold: f32,
}

impl TrmCache {
    /// Try to get cached result
    pub fn get(&self, embedding: &[f32]) -> Option<CacheHit> {
        let hash = self.hash_embedding(embedding);

        // L1: Exact match
        if let Some(result) = self.exact_cache.get(&hash) {
            return Some(CacheHit::Exact(result.clone()));
        }

        // L2: Similar match
        let neighbors = self.similarity_cache.search(embedding, 1);
        if let Some((neighbor_id, similarity)) = neighbors.first() {
            if *similarity >= self.similarity_threshold {
                if let Some(result) = self.exact_cache.get(&(*neighbor_id as u64)) {
                    return Some(CacheHit::Similar {
                        result: result.clone(),
                        similarity: *similarity,
                    });
                }
            }
        }

        None
    }

    fn hash_embedding(&self, embedding: &[f32]) -> u64 {
        use std::hash::{Hash, Hasher};
        use std::collections::hash_map::DefaultHasher;

        let mut hasher = DefaultHasher::new();
        for &x in embedding {
            // Quantize to reduce hash collisions from floating point
            let quantized = (x * 1000.0).round() as i32;
            quantized.hash(&mut hasher);
        }
        hasher.finish()
    }
}
```

**Impact**: 10-100x speedup for repeated or similar queries.

---

## 3. Memory Optimizations

### 3.1 Buffer Reuse

```rust
/// Pre-allocated buffer pool to avoid allocations during inference
pub struct TrmBufferPool {
    /// Latent state buffers
    latent_buffers: Vec<Vec<f32>>,

    /// Answer buffers
    answer_buffers: Vec<Vec<f32>>,

    /// Scratch space for matrix operations
    scratch: Vec<f32>,

    /// Current allocation indices
    latent_idx: AtomicUsize,
    answer_idx: AtomicUsize,
}

impl TrmBufferPool {
    pub fn new(hidden_dim: usize, answer_dim: usize, pool_size: usize) -> Self {
        Self {
            latent_buffers: (0..pool_size)
                .map(|_| vec![0.0; hidden_dim])
                .collect(),
            answer_buffers: (0..pool_size)
                .map(|_| vec![0.0; answer_dim])
                .collect(),
            scratch: vec![0.0; hidden_dim * 4],  // For intermediate computations
            latent_idx: AtomicUsize::new(0),
            answer_idx: AtomicUsize::new(0),
        }
    }

    /// Borrow a latent buffer (returns to pool when dropped)
    pub fn borrow_latent(&self) -> LatentBufferGuard {
        let idx = self.latent_idx.fetch_add(1, Ordering::SeqCst) % self.latent_buffers.len();
        LatentBufferGuard {
            buffer: &self.latent_buffers[idx],
            pool: self,
            idx,
        }
    }
}
```

**Impact**: Eliminates allocation overhead (~1-5% overall speedup).

### 3.2 Quantization

```rust
/// Q4 quantization for weight matrices
pub struct Q4Weights {
    /// Quantized weights (4-bit packed)
    data: Vec<u8>,

    /// Scale factors per block
    scales: Vec<f32>,

    /// Zero points per block
    zeros: Vec<f32>,

    /// Block size
    block_size: usize,

    /// Original dimensions
    rows: usize,
    cols: usize,
}

impl Q4Weights {
    /// Quantize from f32 weights
    pub fn from_f32(weights: &[f32], rows: usize, cols: usize) -> Self {
        let block_size = 32;
        let num_blocks = (rows * cols + block_size - 1) / block_size;

        let mut data = Vec::with_capacity((rows * cols + 1) / 2);
        let mut scales = Vec::with_capacity(num_blocks);
        let mut zeros = Vec::with_capacity(num_blocks);

        for block in weights.chunks(block_size) {
            let min = block.iter().fold(f32::INFINITY, |a, &b| a.min(b));
            let max = block.iter().fold(f32::NEG_INFINITY, |a, &b| a.max(b));

            let scale = (max - min) / 15.0;  // 4-bit = 16 levels
            let zero = min;

            scales.push(scale);
            zeros.push(zero);

            // Pack two 4-bit values per byte
            for chunk in block.chunks(2) {
                let v0 = ((chunk[0] - zero) / scale).round().clamp(0.0, 15.0) as u8;
                let v1 = if chunk.len() > 1 {
                    ((chunk[1] - zero) / scale).round().clamp(0.0, 15.0) as u8
                } else {
                    0
                };
                data.push((v1 << 4) | v0);
            }
        }

        Self { data, scales, zeros, block_size, rows, cols }
    }

    /// Dequantize and multiply in one pass (cache-efficient)
    pub fn matmul_dequant(&self, input: &[f32], output: &mut [f32]) {
        // Optimized dequantization during matmul
        // Processes one block at a time to stay in cache
        // ...
    }
}
```

**Impact**: 4x memory reduction, 10-20% speedup from better cache utilization.

### 3.3 Memory Layout Optimization

```rust
/// Cache-friendly matrix layout
#[repr(C, align(64))]  // 64-byte alignment for cache lines
pub struct AlignedMatrix {
    data: Vec<f32>,
    rows: usize,
    cols: usize,
    stride: usize,  // Padded to cache line boundary
}

impl AlignedMatrix {
    pub fn new(rows: usize, cols: usize) -> Self {
        // Pad columns to 16-float boundary (64 bytes / 4 bytes per float)
        let stride = (cols + 15) & !15;

        Self {
            data: vec![0.0; rows * stride],
            rows,
            cols,
            stride,
        }
    }

    /// Access element (row-major, cache-friendly for row iteration)
    #[inline(always)]
    pub fn get(&self, row: usize, col: usize) -> f32 {
        self.data[row * self.stride + col]
    }

    #[inline(always)]
    pub fn set(&mut self, row: usize, col: usize, value: f32) {
        self.data[row * self.stride + col] = value;
    }
}
```

**Impact**: 5-15% speedup from reduced cache misses.

---

## 4. Compute Optimizations

### 4.1 SIMD Vectorization

```rust
/// AVX2-optimized matrix multiplication
#[cfg(target_arch = "x86_64")]
pub mod simd_avx2 {
    use std::arch::x86_64::*;

    /// Matrix multiply with AVX2 (8 floats at a time)
    #[target_feature(enable = "avx2")]
    #[target_feature(enable = "fma")]
    pub unsafe fn matmul_avx2(
        a: &[f32],  // [M, K]
        b: &[f32],  // [K, N]
        c: &mut [f32],  // [M, N]
        m: usize,
        k: usize,
        n: usize,
    ) {
        const TILE_M: usize = 6;
        const TILE_N: usize = 16;
        const TILE_K: usize = 256;

        // Tiled matrix multiplication
        for m_tile in (0..m).step_by(TILE_M) {
            for n_tile in (0..n).step_by(TILE_N) {
                // Initialize accumulators
                let mut acc = [[_mm256_setzero_ps(); 2]; TILE_M];

                for k_tile in (0..k).step_by(TILE_K) {
                    let k_end = (k_tile + TILE_K).min(k);

                    for kk in k_tile..k_end {
                        for mi in 0..TILE_M.min(m - m_tile) {
                            let a_val = _mm256_broadcast_ss(&a[(m_tile + mi) * k + kk]);

                            for ni in 0..2 {
                                if n_tile + ni * 8 < n {
                                    let b_vec = _mm256_loadu_ps(
                                        &b[kk * n + n_tile + ni * 8]
                                    );
                                    acc[mi][ni] = _mm256_fmadd_ps(a_val, b_vec, acc[mi][ni]);
                                }
                            }
                        }
                    }
                }

                // Store results
                for mi in 0..TILE_M.min(m - m_tile) {
                    for ni in 0..2 {
                        if n_tile + ni * 8 < n {
                            let dst = &mut c[(m_tile + mi) * n + n_tile + ni * 8];
                            let old = _mm256_loadu_ps(dst);
                            let new = _mm256_add_ps(old, acc[mi][ni]);
                            _mm256_storeu_ps(dst, new);
                        }
                    }
                }
            }
        }
    }

    /// SIMD GELU activation
    #[target_feature(enable = "avx2")]
    pub unsafe fn gelu_avx2(data: &mut [f32]) {
        let sqrt_2_over_pi = _mm256_set1_ps(0.7978845608);
        let coeff = _mm256_set1_ps(0.044715);
        let one = _mm256_set1_ps(1.0);
        let half = _mm256_set1_ps(0.5);

        for chunk in data.chunks_exact_mut(8) {
            let x = _mm256_loadu_ps(chunk.as_ptr());

            // GELU(x) = 0.5 * x * (1 + tanh(sqrt(2/pi) * (x + 0.044715 * x^3)))
            let x3 = _mm256_mul_ps(_mm256_mul_ps(x, x), x);
            let inner = _mm256_fmadd_ps(coeff, x3, x);
            let inner = _mm256_mul_ps(sqrt_2_over_pi, inner);

            // tanh approximation
            let tanh = fast_tanh_avx2(inner);

            let result = _mm256_mul_ps(
                half,
                _mm256_mul_ps(x, _mm256_add_ps(one, tanh))
            );

            _mm256_storeu_ps(chunk.as_mut_ptr(), result);
        }
    }

    #[inline(always)]
    unsafe fn fast_tanh_avx2(x: __m256) -> __m256 {
        // Pade approximation for tanh
        let x2 = _mm256_mul_ps(x, x);
        let a = _mm256_fmadd_ps(
            _mm256_set1_ps(0.0049),
            x2,
            _mm256_set1_ps(0.04)
        );
        let a = _mm256_fmadd_ps(a, x2, _mm256_set1_ps(0.2));
        let a = _mm256_fmadd_ps(a, x2, one);
        let a = _mm256_mul_ps(a, x);

        let b = _mm256_fmadd_ps(
            _mm256_set1_ps(0.0015),
            x2,
            _mm256_set1_ps(0.06)
        );
        let b = _mm256_fmadd_ps(b, x2, _mm256_set1_ps(0.45));
        let b = _mm256_fmadd_ps(b, x2, one);

        _mm256_div_ps(a, b)
    }
}
```

**Impact**: 3-5x speedup for matrix operations.

### 4.2 Parallel Execution

```rust
/// Parallel TRM execution for batch processing
pub struct ParallelTrmExecutor {
    /// Thread pool
    pool: ThreadPool,

    /// Per-thread TRM engines
    engines: Vec<TrmEngine>,
}

impl ParallelTrmExecutor {
    pub fn new(config: TrmConfig, num_threads: usize) -> Self {
        Self {
            pool: ThreadPoolBuilder::new()
                .num_threads(num_threads)
                .build()
                .unwrap(),
            engines: (0..num_threads)
                .map(|_| TrmEngine::new(config.clone()))
                .collect(),
        }
    }

    /// Process batch of queries in parallel
    pub fn reason_batch(
        &self,
        queries: &[(Vec<f32>, Vec<f32>)],  // (question, initial_answer)
        k: usize,
    ) -> Vec<TrmResult> {
        self.pool.install(|| {
            queries.par_iter()
                .enumerate()
                .map(|(i, (question, answer))| {
                    let engine_idx = i % self.engines.len();
                    // Note: Need interior mutability for engines
                    unsafe {
                        let engine = &mut *(&self.engines[engine_idx] as *const _ as *mut TrmEngine);
                        engine.reason(question, answer, Some(k))
                    }
                })
                .collect()
        })
    }
}
```

**Impact**: Near-linear scaling with CPU cores for batch processing.

---

## 5. WASM-Specific Optimizations

### 5.1 SIMD128 for WASM

```rust
#[cfg(target_arch = "wasm32")]
pub mod simd_wasm {
    use std::arch::wasm32::*;

    /// WASM SIMD128 matrix multiply (4 floats at a time)
    pub fn matmul_simd128(a: &[f32], b: &[f32], c: &mut [f32], m: usize, k: usize, n: usize) {
        for i in 0..m {
            for j in (0..n).step_by(4) {
                let mut acc = f32x4_splat(0.0);

                for kk in 0..k {
                    let a_val = f32x4_splat(a[i * k + kk]);
                    let b_vec = v128_load(&b[kk * n + j] as *const f32 as *const v128);
                    acc = f32x4_add(acc, f32x4_mul(a_val, b_vec));
                }

                v128_store(&mut c[i * n + j] as *mut f32 as *mut v128, acc);
            }
        }
    }
}
```

### 5.2 Memory Pool for WASM

```rust
#[cfg(target_arch = "wasm32")]
pub struct WasmMemoryPool {
    /// Single large allocation
    buffer: Vec<f32>,

    /// Allocation offset
    offset: usize,

    /// High water mark for reset
    high_water: usize,
}

impl WasmMemoryPool {
    pub fn new(size: usize) -> Self {
        Self {
            buffer: vec![0.0; size],
            offset: 0,
            high_water: 0,
        }
    }

    pub fn alloc(&mut self, count: usize) -> &mut [f32] {
        let start = self.offset;
        self.offset += count;
        self.high_water = self.high_water.max(self.offset);

        &mut self.buffer[start..start + count]
    }

    pub fn reset(&mut self) {
        self.offset = 0;
    }
}
```

**Impact**: Eliminates GC pressure in WASM environments.

---

## 6. Optimization Checklist

### Before Release

- [ ] Run profiler to identify hotspots
- [ ] Enable all SIMD paths (AVX2, SSE4.1, SIMD128)
- [ ] Verify buffer reuse is working
- [ ] Test Q4 quantization accuracy
- [ ] Benchmark caching effectiveness
- [ ] Verify K prediction is reducing iterations
- [ ] Test early stopping is triggering appropriately
- [ ] Profile memory allocations
- [ ] Verify parallel execution scales

### Performance Targets

| Optimization | Expected Gain | Verified |
|--------------|---------------|----------|
| K prediction | 20-50% | [ ] |
| Early stopping | 10-30% | [ ] |
| Caching | 10-100x (hits) | [ ] |
| SIMD | 3-5x | [ ] |
| Quantization | 10-20% | [ ] |
| Buffer reuse | 1-5% | [ ] |
| Memory layout | 5-15% | [ ] |
| Parallel batch | Linear | [ ] |

---

**Next**: [08_RELEASE.md](./08_RELEASE.md) - Package Preparation & Release
