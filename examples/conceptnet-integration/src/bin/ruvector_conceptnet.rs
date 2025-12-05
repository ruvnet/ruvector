//! RuVector + ConceptNet Deep Integration
//!
//! Fully optimized ConceptNet loader using RuVector's HNSW index:
//! - HNSW Index for O(log n) similarity search
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

// RuVector imports
use ruvector_core::index::hnsw::HnswIndex;
use ruvector_core::index::VectorIndex;
use ruvector_core::types::{DistanceMetric, HnswConfig, VectorId};

/// RuVector + ConceptNet Deep Integration
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

    /// Skip demo
    #[arg(long)]
    skip_demo: bool,

    /// Quiet mode
    #[arg(short, long)]
    quiet: bool,
}

const NUMBERBATCH_URL: &str = "https://conceptnet.s3.amazonaws.com/downloads/2019/numberbatch/numberbatch-en-19.08.txt.gz";
const DATA_DIR: &str = "data";
const NUMBERBATCH_FILE: &str = "data/numberbatch-en-19.08.txt.gz";
const DIMS: usize = 300;

/// Embeddings with HNSW index
pub struct IndexedEmbeddings {
    /// Raw vectors for retrieval
    vectors: Vec<Vec<f32>>,
    /// Concept names
    concepts: Vec<String>,
    /// Concept -> index
    concept_to_idx: HashMap<String, usize>,
    /// HNSW index for fast search
    hnsw: HnswIndex,
}

impl IndexedEmbeddings {
    pub fn new(hnsw_config: HnswConfig) -> anyhow::Result<Self> {
        let hnsw = HnswIndex::new(DIMS, DistanceMetric::Cosine, hnsw_config)?;
        Ok(Self {
            vectors: Vec::new(),
            concepts: Vec::new(),
            concept_to_idx: HashMap::new(),
            hnsw,
        })
    }

    pub fn len(&self) -> usize {
        self.concepts.len()
    }

    pub fn add(&mut self, concept: String, vector: Vec<f32>) -> anyhow::Result<()> {
        let idx = self.concepts.len();
        let id: VectorId = idx.to_string();

        self.concept_to_idx.insert(concept.clone(), idx);
        self.concepts.push(concept);
        self.vectors.push(vector.clone());

        // Add to HNSW index
        self.hnsw.add(id, vector)?;
        Ok(())
    }

    pub fn get(&self, concept: &str) -> Option<&[f32]> {
        self.concept_to_idx.get(concept).map(|&idx| self.vectors[idx].as_slice())
    }

    /// Search using HNSW (O(log n))
    pub fn search(&self, query: &[f32], k: usize, ef_search: usize) -> Vec<(String, f32)> {
        match self.hnsw.search_with_ef(query, k, ef_search) {
            Ok(results) => {
                results.into_iter()
                    .filter_map(|r| {
                        let idx: usize = r.id.parse().ok()?;
                        if idx < self.concepts.len() {
                            // Score is distance, convert to similarity
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

    /// Brute force search (baseline for comparison)
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
    println!("║   RuVector + ConceptNet Deep Integration                         ║");
    println!("╚══════════════════════════════════════════════════════════════════╝\n");

    println!("  🔧 Configuration:");
    println!("    • HNSW: M={}, ef_construction={}, ef_search={}",
             args.hnsw_m, args.hnsw_ef, args.ef_search);
    println!("    • Embeddings: {}", if args.embeddings == 0 { "ALL".to_string() } else { args.embeddings.to_string() });
    println!();

    std::fs::create_dir_all(DATA_DIR)?;

    // Download if needed
    if !Path::new(NUMBERBATCH_FILE).exists() {
        println!("📥 Downloading Numberbatch embeddings...");
        download_file(NUMBERBATCH_URL, NUMBERBATCH_FILE).await?;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Step 1: Load embeddings into HNSW index
    // ═══════════════════════════════════════════════════════════════════════
    println!("📊 Loading Numberbatch embeddings with HNSW indexing...");
    let start = Instant::now();

    let max_entries = if args.embeddings == 0 { usize::MAX } else { args.embeddings };

    let hnsw_config = HnswConfig {
        m: args.hnsw_m,
        ef_construction: args.hnsw_ef,
        ef_search: args.ef_search,
        max_elements: max_entries.min(600_000),
        ..Default::default()
    };

    let embeddings = load_embeddings_with_hnsw(NUMBERBATCH_FILE, max_entries, hnsw_config, args.quiet)?;

    let load_time = start.elapsed();
    println!(
        "✅ Loaded {} embeddings with HNSW index in {:.2}s ({:.0}/sec)\n",
        embeddings.len(),
        load_time.as_secs_f64(),
        embeddings.len() as f64 / load_time.as_secs_f64()
    );

    // ═══════════════════════════════════════════════════════════════════════
    // Step 2: Benchmark comparisons
    // ═══════════════════════════════════════════════════════════════════════
    if !args.skip_demo {
        println!("═══════════════════════════════════════════════════════════════════");
        println!("                   Search Performance Comparison");
        println!("═══════════════════════════════════════════════════════════════════\n");

        benchmark_search(&embeddings, args.ef_search)?;

        println!("\n═══════════════════════════════════════════════════════════════════");
        println!("                   Semantic Search Demo");
        println!("═══════════════════════════════════════════════════════════════════\n");

        demo_semantic_search(&embeddings, args.ef_search)?;

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

    let memory_usage = embeddings.len() * DIMS * 4 / 1_000_000;
    println!("  📊 Data:");
    println!("    • Concepts: {}", embeddings.len());
    println!("    • Memory: {} MB (vectors)", memory_usage);
    println!();

    println!("  🚀 RuVector Features:");
    println!("    ✓ HNSW Index - O(log n) search complexity");
    println!("    ✓ SIMD distance metrics (AVX2/AVX-512)");
    println!("    ✓ Parallel batch operations (Rayon)");
    println!();

    println!("✅ RuVector + ConceptNet integration complete!");
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

fn load_embeddings_with_hnsw(
    path: &str,
    max_entries: usize,
    hnsw_config: HnswConfig,
    quiet: bool
) -> anyhow::Result<IndexedEmbeddings> {
    let file = File::open(path)?;
    let reader = BufReader::with_capacity(1024 * 1024, GzDecoder::new(file));

    let mut embeddings = IndexedEmbeddings::new(hnsw_config)?;
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

fn benchmark_search(embeddings: &IndexedEmbeddings, ef_search: usize) -> anyhow::Result<()> {
    let test_words = ["dog", "computer", "science"];
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
                let _ = embeddings.search(query, 10, ef_search);
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
            let _ = embeddings.search(query, 10, ef_search);
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

fn demo_semantic_search(embeddings: &IndexedEmbeddings, ef_search: usize) -> anyhow::Result<()> {
    let test_words = ["king", "music", "artificial_intelligence", "love", "science"];

    for word in test_words {
        if let Some(query) = embeddings.get(word) {
            let results = embeddings.search(query, 8, ef_search);

            if !results.is_empty() {
                println!("  🔍 Most similar to '{}':", word);
                for (concept, score) in results.iter().take(5) {
                    if concept != word {
                        println!("      • {} ({:.3})", concept, score);
                    }
                }
                println!();
            }
        }
    }

    Ok(())
}

fn demo_analogy(embeddings: &IndexedEmbeddings, ef_search: usize) -> anyhow::Result<()> {
    let analogies = [
        ("king", "man", "woman", "queen"),
        ("paris", "france", "berlin", "germany"),
        ("good", "better", "bad", "worse"),
    ];

    for (a, b, c, expected) in analogies {
        if let (Some(va), Some(vb), Some(vc)) = (embeddings.get(a), embeddings.get(b), embeddings.get(c)) {
            // d = a - b + c
            let mut result = vec![0.0f32; DIMS];
            for i in 0..DIMS {
                result[i] = va[i] - vb[i] + vc[i];
            }
            // Normalize
            let norm: f32 = result.iter().map(|x| x * x).sum::<f32>().sqrt();
            if norm > 0.0 {
                for x in &mut result { *x /= norm; }
            }

            let similar = embeddings.search(&result, 10, ef_search);
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
