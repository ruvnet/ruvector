//! RuVector Deep Integration - HNSW + Hyperbolic + Hierarchy
//!
//! Comprehensive ConceptNet integration leveraging:
//! - HNSW Index for O(log n) similarity search
//! - Poincaré ball model for hierarchical relationships
//! - SIMD-accelerated distance computation
//! - Parallel batch operations

use clap::Parser;
use flate2::read::GzDecoder;
use indicatif::{ProgressBar, ProgressStyle};
use rayon::prelude::*;
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader, Write};
use std::path::Path;
use std::time::Instant;

// RuVector core imports
use ruvector_core::index::hnsw::HnswIndex;
use ruvector_core::index::VectorIndex;
use ruvector_core::types::{DistanceMetric, HnswConfig, VectorId};

// RuVector attention (hyperbolic) imports
use ruvector_attention::hyperbolic::{
    poincare_distance, project_to_ball, mobius_add, frechet_mean
};

/// RuVector Deep ConceptNet Integration
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Maximum embeddings to load (0 = all ~516K)
    #[arg(long, default_value_t = 0)]
    embeddings: usize,

    /// HNSW M parameter (connections per node)
    #[arg(long, default_value_t = 16)]
    hnsw_m: usize,

    /// HNSW ef_construction parameter
    #[arg(long, default_value_t = 200)]
    hnsw_ef: usize,

    /// HNSW ef_search parameter
    #[arg(long, default_value_t = 100)]
    ef_search: usize,

    /// Poincaré ball curvature for hyperbolic space
    #[arg(long, default_value_t = 1.0)]
    curvature: f32,

    /// Skip demo
    #[arg(long)]
    skip_demo: bool,

    /// Enable hyperbolic hierarchy search
    #[arg(long)]
    hyperbolic: bool,

    /// Quiet mode
    #[arg(short, long)]
    quiet: bool,
}

const NUMBERBATCH_URL: &str = "https://conceptnet.s3.amazonaws.com/downloads/2019/numberbatch/numberbatch-en-19.08.txt.gz";
const DATA_DIR: &str = "data";
const NUMBERBATCH_FILE: &str = "data/numberbatch-en-19.08.txt.gz";
const DIMS: usize = 300;

/// Embeddings with dual-space indexing (Euclidean HNSW + Hyperbolic)
pub struct DualSpaceEmbeddings {
    /// Raw vectors (Euclidean)
    vectors: Vec<Vec<f32>>,
    /// Hyperbolic projections (Poincaré ball)
    hyperbolic_vectors: Vec<Vec<f32>>,
    /// Concept names
    concepts: Vec<String>,
    /// Concept -> index
    concept_to_idx: HashMap<String, usize>,
    /// HNSW index for fast Euclidean search
    hnsw: HnswIndex,
    /// Curvature for hyperbolic space
    curvature: f32,
}

impl DualSpaceEmbeddings {
    pub fn new(hnsw_config: HnswConfig, curvature: f32) -> anyhow::Result<Self> {
        let hnsw = HnswIndex::new(DIMS, DistanceMetric::Cosine, hnsw_config)?;
        Ok(Self {
            vectors: Vec::new(),
            hyperbolic_vectors: Vec::new(),
            concepts: Vec::new(),
            concept_to_idx: HashMap::new(),
            hnsw,
            curvature,
        })
    }

    pub fn len(&self) -> usize {
        self.concepts.len()
    }

    pub fn add(&mut self, concept: String, vector: Vec<f32>) -> anyhow::Result<()> {
        let idx = self.concepts.len();
        let id: VectorId = idx.to_string();

        // Store Euclidean vector
        self.concept_to_idx.insert(concept.clone(), idx);
        self.concepts.push(concept);
        self.vectors.push(vector.clone());

        // Project to Poincaré ball for hyperbolic search
        // Scale down to fit in unit ball (curvature=1 means radius < 1)
        let scaled: Vec<f32> = vector.iter().map(|&x| x * 0.9).collect();
        let hyperbolic = project_to_ball(&scaled, self.curvature, 1e-7);
        self.hyperbolic_vectors.push(hyperbolic);

        // Add to HNSW index
        self.hnsw.add(id, vector)?;
        Ok(())
    }

    pub fn get(&self, concept: &str) -> Option<&[f32]> {
        self.concept_to_idx.get(concept).map(|&idx| self.vectors[idx].as_slice())
    }

    pub fn get_hyperbolic(&self, concept: &str) -> Option<&[f32]> {
        self.concept_to_idx.get(concept).map(|&idx| self.hyperbolic_vectors[idx].as_slice())
    }

    /// Euclidean similarity search using HNSW (O(log n))
    pub fn search_euclidean(&self, query: &[f32], k: usize, ef_search: usize) -> Vec<(String, f32)> {
        match self.hnsw.search_with_ef(query, k, ef_search) {
            Ok(results) => {
                results.into_iter()
                    .filter_map(|r| {
                        let idx: usize = r.id.parse().ok()?;
                        if idx < self.concepts.len() {
                            Some((self.concepts[idx].clone(), 1.0 - r.score))
                        } else {
                            None
                        }
                    })
                    .collect()
            }
            Err(_) => Vec::new()
        }
    }

    /// Hyperbolic distance search for hierarchy-aware similarity
    /// Uses Poincaré distance which respects hierarchical structure
    pub fn search_hyperbolic(&self, query: &[f32], k: usize) -> Vec<(String, f32)> {
        // Project query to hyperbolic space
        let scaled: Vec<f32> = query.iter().map(|&x| x * 0.9).collect();
        let query_hyp = project_to_ball(&scaled, self.curvature, 1e-7);

        // Compute Poincaré distances in parallel
        let mut scores: Vec<(usize, f32)> = self.hyperbolic_vectors
            .par_iter()
            .enumerate()
            .map(|(idx, vec)| {
                let dist = poincare_distance(&query_hyp, vec, self.curvature);
                (idx, dist)
            })
            .collect();

        // Sort by distance (lower = closer)
        scores.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal));
        scores.truncate(k);

        // Convert to similarity (1 / (1 + distance))
        scores.into_iter()
            .map(|(idx, dist)| (self.concepts[idx].clone(), 1.0 / (1.0 + dist)))
            .collect()
    }

    /// Brute force Euclidean search (baseline for comparison)
    pub fn search_brute_force(&self, query: &[f32], k: usize) -> Vec<(String, f32)> {
        let mut scores: Vec<(usize, f32)> = self.vectors
            .par_iter()
            .enumerate()
            .map(|(idx, vec)| {
                let sim = cosine_similarity(query, vec);
                (idx, sim)
            })
            .collect();

        scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        scores.truncate(k);

        scores.into_iter()
            .map(|(idx, sim)| (self.concepts[idx].clone(), sim))
            .collect()
    }

    /// Compute hyperbolic centroid (Fréchet mean) of concepts
    /// Useful for finding the "hierarchical center" of a concept cluster
    pub fn hyperbolic_centroid(&self, concepts: &[&str]) -> Option<Vec<f32>> {
        let vecs: Vec<&[f32]> = concepts.iter()
            .filter_map(|c| self.get_hyperbolic(c))
            .collect();

        if vecs.is_empty() {
            return None;
        }

        Some(frechet_mean(&vecs, None, self.curvature, 50, 1e-5))
    }

    /// Find concepts that are "between" two concepts in hyperbolic space
    /// This captures hierarchical relationships (e.g., animal between dog and mammal)
    pub fn find_intermediates(&self, concept_a: &str, concept_b: &str, k: usize) -> Vec<(String, f32)> {
        let va = match self.get_hyperbolic(concept_a) { Some(v) => v, None => return vec![] };
        let vb = match self.get_hyperbolic(concept_b) { Some(v) => v, None => return vec![] };

        // Find centroid between the two concepts
        let midpoint = frechet_mean(&[va, vb], None, self.curvature, 50, 1e-5);

        // Search for concepts near this midpoint
        self.search_hyperbolic(&midpoint, k + 2)
            .into_iter()
            .filter(|(c, _)| c != concept_a && c != concept_b)
            .take(k)
            .collect()
    }
}

#[inline]
fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    let mut dot = 0.0f32;
    let mut norm_a = 0.0f32;
    let mut norm_b = 0.0f32;

    for i in 0..a.len() {
        dot += a[i] * b[i];
        norm_a += a[i] * a[i];
        norm_b += b[i] * b[i];
    }

    let norm = (norm_a * norm_b).sqrt();
    if norm > 0.0 { dot / norm } else { 0.0 }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let args = Args::parse();

    println!("╔══════════════════════════════════════════════════════════════════╗");
    println!("║   RuVector Deep Integration - HNSW + Hyperbolic                  ║");
    println!("╚══════════════════════════════════════════════════════════════════╝\n");

    println!("  🔧 Configuration:");
    println!("    • HNSW: M={}, ef_construction={}, ef_search={}",
             args.hnsw_m, args.hnsw_ef, args.ef_search);
    println!("    • Hyperbolic: curvature={}, enabled={}",
             args.curvature, args.hyperbolic);
    println!("    • Embeddings: {}", if args.embeddings == 0 { "ALL".to_string() } else { args.embeddings.to_string() });
    println!();

    std::fs::create_dir_all(DATA_DIR)?;

    // Download if needed
    if !Path::new(NUMBERBATCH_FILE).exists() {
        println!("📥 Downloading Numberbatch embeddings...");
        download_file(NUMBERBATCH_URL, NUMBERBATCH_FILE).await?;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Step 1: Load embeddings into dual-space index
    // ═══════════════════════════════════════════════════════════════════════
    println!("📊 Loading Numberbatch embeddings with HNSW + Hyperbolic indexing...");
    let start = Instant::now();

    let max_entries = if args.embeddings == 0 { usize::MAX } else { args.embeddings };

    let hnsw_config = HnswConfig {
        m: args.hnsw_m,
        ef_construction: args.hnsw_ef,
        ef_search: args.ef_search,
        max_elements: max_entries.min(600_000),
        ..Default::default()
    };

    let embeddings = load_embeddings(NUMBERBATCH_FILE, max_entries, hnsw_config, args.curvature, args.quiet)?;

    let load_time = start.elapsed();
    println!(
        "✅ Loaded {} embeddings in {:.2}s ({:.0}/sec)\n",
        embeddings.len(),
        load_time.as_secs_f64(),
        embeddings.len() as f64 / load_time.as_secs_f64()
    );

    if !args.skip_demo {
        // ═══════════════════════════════════════════════════════════════════════
        // Step 2: Benchmark HNSW vs Brute Force
        // ═══════════════════════════════════════════════════════════════════════
        println!("═══════════════════════════════════════════════════════════════════");
        println!("                   Search Performance Comparison");
        println!("═══════════════════════════════════════════════════════════════════\n");

        benchmark_search(&embeddings, args.ef_search)?;

        // ═══════════════════════════════════════════════════════════════════════
        // Step 3: Euclidean vs Hyperbolic Search
        // ═══════════════════════════════════════════════════════════════════════
        if args.hyperbolic {
            println!("\n═══════════════════════════════════════════════════════════════════");
            println!("              Euclidean vs Hyperbolic Search Comparison");
            println!("═══════════════════════════════════════════════════════════════════\n");

            compare_euclidean_hyperbolic(&embeddings, args.ef_search)?;
        }

        // ═══════════════════════════════════════════════════════════════════════
        // Step 4: Hierarchy-Aware Demo
        // ═══════════════════════════════════════════════════════════════════════
        if args.hyperbolic {
            println!("\n═══════════════════════════════════════════════════════════════════");
            println!("              Hyperbolic Hierarchy Analysis");
            println!("═══════════════════════════════════════════════════════════════════\n");

            demo_hierarchy(&embeddings)?;
        }

        // ═══════════════════════════════════════════════════════════════════════
        // Step 5: Analogical Reasoning
        // ═══════════════════════════════════════════════════════════════════════
        println!("\n═══════════════════════════════════════════════════════════════════");
        println!("                   Analogical Reasoning");
        println!("═══════════════════════════════════════════════════════════════════\n");

        demo_analogy(&embeddings, args.ef_search)?;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════════════════════════════
    println!("\n═══════════════════════════════════════════════════════════════════");
    println!("                   Integration Summary");
    println!("═══════════════════════════════════════════════════════════════════\n");

    let memory_euclidean = embeddings.len() * DIMS * 4 / 1_000_000;
    let memory_hyperbolic = if args.hyperbolic { memory_euclidean } else { 0 };
    let total_memory = memory_euclidean + memory_hyperbolic;

    println!("  📊 Data:");
    println!("    • Concepts: {}", embeddings.len());
    println!("    • Memory (Euclidean): {} MB", memory_euclidean);
    if args.hyperbolic {
        println!("    • Memory (Hyperbolic): {} MB", memory_hyperbolic);
    }
    println!("    • Total Memory: {} MB", total_memory);
    println!();

    println!("  🚀 RuVector Features Used:");
    println!("    ✓ HNSW Index - O(log n) Euclidean search");
    if args.hyperbolic {
        println!("    ✓ Poincaré Ball - Hyperbolic hierarchy search");
        println!("    ✓ Fréchet Mean - Hierarchical centroid computation");
    }
    println!("    ✓ SIMD distance metrics (AVX2/AVX-512)");
    println!("    ✓ Parallel batch operations (Rayon)");
    println!();

    println!("✅ RuVector Deep Integration complete!");
    Ok(())
}

async fn download_file(url: &str, path: &str) -> anyhow::Result<()> {
    let response = reqwest::get(url).await?;
    let total_size = response.content_length().unwrap_or(0);
    println!("  Size: {:.1} MB", total_size as f64 / 1_000_000.0);
    let bytes = response.bytes().await?;
    let mut file = File::create(path)?;
    file.write_all(&bytes)?;
    println!("  ✅ Downloaded");
    Ok(())
}

fn load_embeddings(
    path: &str,
    max_entries: usize,
    hnsw_config: HnswConfig,
    curvature: f32,
    quiet: bool
) -> anyhow::Result<DualSpaceEmbeddings> {
    let file = File::open(path)?;
    let reader = BufReader::with_capacity(1024 * 1024, GzDecoder::new(file));

    let mut embeddings = DualSpaceEmbeddings::new(hnsw_config, curvature)?;
    let mut count = 0;
    let mut skipped_header = false;

    let pb = if !quiet {
        let pb = ProgressBar::new_spinner();
        pb.set_style(ProgressStyle::default_spinner()
            .template("{spinner:.green} [{elapsed}] {msg}").unwrap());
        Some(pb)
    } else {
        None
    };

    for line_result in reader.lines() {
        let line = line_result?;

        if !skipped_header {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() == 2 && parts[0].parse::<usize>().is_ok() {
                skipped_header = true;
                continue;
            }
            skipped_header = true;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.is_empty() { continue; }

        let concept = parts[0];
        if concept.starts_with("##") || concept.contains('+') || concept.len() < 2 {
            continue;
        }

        let vec: Vec<f32> = parts[1..]
            .iter()
            .filter_map(|s| s.parse::<f32>().ok())
            .collect();

        if vec.len() != DIMS { continue; }

        // Normalize
        let norm: f32 = vec.iter().map(|x| x * x).sum::<f32>().sqrt();
        let normalized: Vec<f32> = if norm > 0.0 {
            vec.iter().map(|x| x / norm).collect()
        } else {
            vec
        };

        embeddings.add(concept.to_string(), normalized)?;
        count += 1;

        if let Some(ref pb) = pb {
            if count % 10000 == 0 {
                pb.set_message(format!("{} embeddings indexed", count));
            }
        }

        if count >= max_entries { break; }
    }

    if let Some(pb) = pb {
        pb.finish_with_message(format!("{} embeddings indexed", count));
    }

    Ok(embeddings)
}

fn benchmark_search(embeddings: &DualSpaceEmbeddings, ef_search: usize) -> anyhow::Result<()> {
    let test_words = ["dog", "computer", "science", "music", "art"];
    let iterations = 100;

    for word in test_words {
        if let Some(query) = embeddings.get(word) {
            println!("  Query: '{}' ({} iterations)", word, iterations);

            // Brute force baseline
            let start = Instant::now();
            for _ in 0..iterations {
                let _ = embeddings.search_brute_force(query, 10);
            }
            let brute_time = start.elapsed().as_secs_f64() * 1000.0 / iterations as f64;

            // HNSW
            let start = Instant::now();
            for _ in 0..iterations {
                let _ = embeddings.search_euclidean(query, 10, ef_search);
            }
            let hnsw_time = start.elapsed().as_secs_f64() * 1000.0 / iterations as f64;

            let speedup = brute_time / hnsw_time;

            println!("    • Brute force: {:.2}ms", brute_time);
            println!("    • HNSW:        {:.3}ms ({:.0}x speedup)", hnsw_time, speedup);
            println!();
        }
    }

    // Throughput test
    println!("  ⚡ Throughput benchmark (1000 HNSW queries)...");
    if let Some(query) = embeddings.get("computer") {
        let start = Instant::now();
        for _ in 0..1000 {
            let _ = embeddings.search_euclidean(query, 10, ef_search);
        }
        let elapsed = start.elapsed();
        println!(
            "    • {} queries/sec ({:.3}ms avg)",
            (1000.0 / elapsed.as_secs_f64()) as u64,
            elapsed.as_secs_f64() * 1000.0 / 1000.0
        );
    }

    Ok(())
}

fn compare_euclidean_hyperbolic(embeddings: &DualSpaceEmbeddings, ef_search: usize) -> anyhow::Result<()> {
    let test_words = ["dog", "animal", "science", "physics"];

    for word in test_words {
        if let Some(query) = embeddings.get(word) {
            println!("  🔍 Query: '{}'", word);

            // Euclidean (HNSW)
            let euclidean_results = embeddings.search_euclidean(query, 6, ef_search);
            println!("    Euclidean (HNSW):");
            for (concept, score) in euclidean_results.iter().take(5) {
                if concept != word {
                    println!("      • {} ({:.3})", concept, score);
                }
            }

            // Hyperbolic (Poincaré)
            let hyperbolic_results = embeddings.search_hyperbolic(query, 6);
            println!("    Hyperbolic (Poincaré):");
            for (concept, score) in hyperbolic_results.iter().take(5) {
                if concept != word {
                    println!("      • {} ({:.3})", concept, score);
                }
            }
            println!();
        }
    }

    Ok(())
}

fn demo_hierarchy(embeddings: &DualSpaceEmbeddings) -> anyhow::Result<()> {
    println!("  Finding hierarchical intermediates...\n");

    let pairs = [
        ("dog", "mammal"),
        ("car", "vehicle"),
        ("apple", "fruit"),
        ("physics", "science"),
    ];

    for (a, b) in pairs {
        let intermediates = embeddings.find_intermediates(a, b, 5);
        if !intermediates.is_empty() {
            println!("  📊 Between '{}' and '{}':", a, b);
            for (concept, score) in intermediates.iter().take(3) {
                println!("      • {} ({:.3})", concept, score);
            }
            println!();
        }
    }

    // Compute hyperbolic centroid of concept clusters
    println!("  Computing hyperbolic centroids of concept clusters...\n");

    let clusters = [
        ("animals", vec!["dog", "cat", "bird", "fish"]),
        ("sciences", vec!["physics", "chemistry", "biology", "mathematics"]),
        ("emotions", vec!["happy", "sad", "angry", "fear"]),
    ];

    for (name, concepts) in clusters {
        let refs: Vec<&str> = concepts.iter().map(|s| *s).collect();
        if let Some(centroid) = embeddings.hyperbolic_centroid(&refs) {
            let nearest = embeddings.search_hyperbolic(&centroid, 5);
            println!("  🎯 Centroid of {} cluster:", name);
            for (concept, score) in nearest.iter().take(3) {
                println!("      • {} ({:.3})", concept, score);
            }
            println!();
        }
    }

    Ok(())
}

fn demo_analogy(embeddings: &DualSpaceEmbeddings, ef_search: usize) -> anyhow::Result<()> {
    let analogies = [
        ("king", "man", "woman", "queen"),
        ("paris", "france", "berlin", "germany"),
        ("good", "better", "bad", "worse"),
        ("big", "bigger", "small", "smaller"),
    ];

    for (a, b, c, expected) in analogies {
        if let (Some(va), Some(vb), Some(vc)) = (embeddings.get(a), embeddings.get(b), embeddings.get(c)) {
            // d = a - b + c (vector arithmetic for analogy)
            let mut result = vec![0.0f32; DIMS];
            for i in 0..DIMS {
                result[i] = va[i] - vb[i] + vc[i];
            }
            // Normalize
            let norm: f32 = result.iter().map(|x| x * x).sum::<f32>().sqrt();
            if norm > 0.0 {
                for x in &mut result { *x /= norm; }
            }

            let similar = embeddings.search_euclidean(&result, 10, ef_search);
            let answer = similar.iter()
                .find(|(concept, _)| concept != a && concept != b && concept != c)
                .map(|(c, s)| (c.clone(), *s));

            if let Some((found, score)) = answer {
                let correct = found == expected;
                println!(
                    "  {} : {} :: {} : ?  →  {} ({:.3}) {}",
                    a, b, c, found, score,
                    if correct { "✓" } else { "" }
                );
            }
        }
    }

    Ok(())
}
