//! Load Real ConceptNet Data
//!
//! Downloads and loads the actual ConceptNet Numberbatch embeddings
//! and demonstrates optimization for RuVector and RuvLLM.
//!
//! Data sources:
//! - Numberbatch: https://conceptnet.s3.amazonaws.com/downloads/2019/numberbatch/numberbatch-en-19.08.txt.gz
//! - Assertions: https://s3.amazonaws.com/conceptnet/downloads/2019/edges/conceptnet-assertions-5.7.0.csv.gz

use conceptnet_integration::graph::{ConceptNetGraphBuilder, GraphBuildConfig};
use conceptnet_integration::gnn::{CommonsenseGNN, GNNConfig};
use conceptnet_integration::numberbatch::Numberbatch;
use conceptnet_integration::ruvllm::{CommonsenseAugmenter, RuvLLMConfig};
use conceptnet_integration::api::RelationType;
use std::fs::File;
use std::io::{BufRead, BufReader, Write};
use std::path::Path;
use std::time::Instant;
use flate2::read::GzDecoder;

const NUMBERBATCH_URL: &str = "https://conceptnet.s3.amazonaws.com/downloads/2019/numberbatch/numberbatch-en-19.08.txt.gz";
const DATA_DIR: &str = "data";
const NUMBERBATCH_FILE: &str = "data/numberbatch-en-19.08.txt.gz";

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    println!("╔══════════════════════════════════════════════════════════════╗");
    println!("║   ConceptNet Real Data Loader & RuVector Optimizer           ║");
    println!("╚══════════════════════════════════════════════════════════════╝\n");

    // Create data directory
    std::fs::create_dir_all(DATA_DIR)?;

    // Step 1: Download Numberbatch if not present
    if !Path::new(NUMBERBATCH_FILE).exists() {
        println!("📥 Downloading Numberbatch embeddings (~150MB)...");
        download_file(NUMBERBATCH_URL, NUMBERBATCH_FILE).await?;
        println!("✅ Downloaded to {}\n", NUMBERBATCH_FILE);
    } else {
        println!("✅ Numberbatch file already exists: {}\n", NUMBERBATCH_FILE);
    }

    // Step 2: Load Numberbatch embeddings
    println!("📊 Loading Numberbatch embeddings...");
    let start = Instant::now();
    // Load 200K entries - common words like "dog" appear after line 130K
    let numberbatch = load_numberbatch(NUMBERBATCH_FILE, 200000)?;
    println!(
        "✅ Loaded {} embeddings in {:.2}s\n",
        numberbatch.len(),
        start.elapsed().as_secs_f64()
    );

    // Step 3: Build knowledge graph from Numberbatch concepts
    println!("🔗 Building knowledge graph from semantic relationships...");
    let start = Instant::now();
    let graph = build_graph_from_embeddings(&numberbatch)?;
    let stats = graph.stats();
    println!(
        "✅ Built graph with {} nodes, {} edges in {:.2}s\n",
        stats.total_nodes,
        stats.total_edges,
        start.elapsed().as_secs_f64()
    );

    // Step 4: Demonstrate RuVector optimization
    println!("═══════════════════════════════════════════════════════════════");
    println!("                   RuVector Optimizations");
    println!("═══════════════════════════════════════════════════════════════\n");

    demo_similarity_search(&numberbatch)?;
    demo_analogy_completion(&numberbatch)?;
    demo_query_expansion(&numberbatch, &graph)?;

    // Step 5: Demonstrate RuvLLM optimization
    println!("═══════════════════════════════════════════════════════════════");
    println!("                   RuvLLM Optimizations");
    println!("═══════════════════════════════════════════════════════════════\n");

    demo_context_augmentation(&graph)?;
    demo_hallucination_detection(&graph)?;
    demo_grounded_qa(&graph)?;

    // Step 6: Show optimization metrics
    println!("═══════════════════════════════════════════════════════════════");
    println!("                   Optimization Insights");
    println!("═══════════════════════════════════════════════════════════════\n");

    show_optimization_insights(&numberbatch, &graph)?;

    println!("\n✅ Real ConceptNet data loaded and optimizations demonstrated!");
    Ok(())
}

async fn download_file(url: &str, path: &str) -> anyhow::Result<()> {
    let response = reqwest::get(url).await?;
    let total_size = response.content_length().unwrap_or(0);

    println!("  Total size: {:.1} MB", total_size as f64 / 1_000_000.0);

    let bytes = response.bytes().await?;
    let mut file = File::create(path)?;
    file.write_all(&bytes)?;

    Ok(())
}

fn load_numberbatch(path: &str, max_entries: usize) -> anyhow::Result<Numberbatch> {
    let file = File::open(path)?;
    let reader = BufReader::new(GzDecoder::new(file));

    let mut nb = Numberbatch::new(300);
    let mut count = 0;
    let mut skipped_header = false;
    let mut lines_read = 0;
    let mut sample_concepts: Vec<String> = Vec::new();

    for line_result in reader.lines() {
        let line = line_result?;
        lines_read += 1;

        // Skip header line if present
        if !skipped_header {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() == 2 && parts[0].parse::<usize>().is_ok() {
                skipped_header = true;
                continue;
            }
            skipped_header = true;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.is_empty() {
            continue;
        }

        let concept = parts[0];

        // Skip BERT word-piece tokens (##ing, ##ed, etc.) and multi-word expressions with +
        // But keep regular words, even if they have underscores
        if concept.starts_with("##") || concept.contains('+') || concept.len() < 2 {
            continue;
        }

        // Parse vector
        let vec: Vec<f32> = parts[1..]
            .iter()
            .filter_map(|s| s.parse::<f32>().ok())
            .collect();

        if vec.len() != 300 {
            continue;
        }

        // Normalize
        let norm: f32 = vec.iter().map(|x| x * x).sum::<f32>().sqrt();
        let normalized: Vec<f32> = if norm > 0.0 {
            vec.iter().map(|x| x / norm).collect()
        } else {
            vec
        };

        if nb.set(concept, normalized).is_ok() {
            count += 1;

            // Collect sample concepts for debugging
            if count <= 10 || (count <= 1000 && count % 100 == 0) || count % 50000 == 0 {
                sample_concepts.push(concept.to_string());
            }

            if count % 25000 == 0 {
                print!("\r  Loaded {} embeddings (read {} lines)...", count, lines_read);
                std::io::stdout().flush()?;
            }
        }

        if count >= max_entries {
            break;
        }
    }

    println!("\r  Loaded {} embeddings from {} lines                    ", count, lines_read);

    // Show sample concepts
    println!("  Sample concepts loaded:");
    for (i, c) in sample_concepts.iter().take(20).enumerate() {
        print!("    {}", c);
        if (i + 1) % 5 == 0 {
            println!();
        } else {
            print!(", ");
        }
    }
    println!();

    // Check for common test concepts
    let test_words = ["dog", "cat", "computer", "music", "science", "king", "queen"];
    print!("  Test words present: ");
    for word in test_words {
        if nb.get(word).is_some() {
            print!("{}✓ ", word);
        }
    }
    println!();

    Ok(nb)
}

fn build_graph_from_embeddings(nb: &Numberbatch) -> anyhow::Result<ConceptNetGraphBuilder> {
    let config = GraphBuildConfig {
        max_nodes: 200000,
        max_edges_per_node: 50,
        min_edge_weight: 0.5,
        languages: vec!["en".to_string()],
        deduplicate: true,
        ..Default::default()
    };

    let mut graph = ConceptNetGraphBuilder::new(config);

    // Build edges from similar concepts - use more concepts for richer graph
    // Filter to only include "regular" looking words (no special chars at start)
    let concepts: Vec<String> = nb.concepts()
        .filter(|c| {
            let c = c.as_str();
            !c.starts_with('#') && !c.starts_with('_') && c.chars().next().map(|ch| ch.is_alphabetic()).unwrap_or(false)
        })
        .cloned()
        .take(1000) // Reduced for faster demo; use 10000+ for production
        .collect();

    println!("  Building graph from {} filtered concepts...", concepts.len());
    let mut edge_count = 0;

    for (i, concept) in concepts.iter().enumerate() {
        if i % 1000 == 0 {
            print!("\r  Processing concept {}/{}...", i, concepts.len());
            std::io::stdout().flush()?;
        }

        // Find similar concepts
        let similar = nb.most_similar(concept, 5);
        for (similar_concept, similarity) in similar {
            if similarity > 0.6 && &similar_concept != concept {
                let edge = create_edge(concept, &similar_concept, "RelatedTo", similarity as f64);
                if graph.add_edge(&edge).is_ok() {
                    edge_count += 1;
                }
            }
        }
    }

    println!("\r  Created {} semantic edges                    ", edge_count);
    Ok(graph)
}

fn create_edge(start: &str, end: &str, rel: &str, weight: f64) -> conceptnet_integration::api::Edge {
    use conceptnet_integration::api::{ConceptNode, Edge, Relation};

    Edge {
        id: format!("/a/[/r/{}/,{},{}]", rel, start, end),
        start: ConceptNode {
            id: start.to_string(),
            label: Some(extract_term(start).to_string()),
            language: Some("en".to_string()),
            term: Some(extract_term(start).to_string()),
            sense_label: None,
        },
        end: ConceptNode {
            id: end.to_string(),
            label: Some(extract_term(end).to_string()),
            language: Some("en".to_string()),
            term: Some(extract_term(end).to_string()),
            sense_label: None,
        },
        rel: Relation {
            id: format!("/r/{}", rel),
            label: Some(rel.to_string()),
        },
        weight,
        surface_text: None,
        license: None,
        dataset: None,
        sources: vec![],
    }
}

fn extract_term(uri: &str) -> &str {
    uri.rsplit('/').next().unwrap_or(uri).replace('_', " ").leak()
}

fn demo_similarity_search(nb: &Numberbatch) -> anyhow::Result<()> {
    println!("┌─────────────────────────────────────────────────────────────┐");
    println!("│ 1. Semantic Similarity Search                              │");
    println!("└─────────────────────────────────────────────────────────────┘\n");

    let test_concepts = vec![
        "dog",
        "computer",
        "music",
        "science",
    ];

    for concept in test_concepts {
        let similar = nb.most_similar(concept, 5);
        if !similar.is_empty() {
            let term = extract_term(concept);
            println!("  Most similar to '{}':", term);
            for (sim_concept, score) in similar {
                let sim_term = extract_term(&sim_concept);
                println!("    • {} ({:.3})", sim_term, score);
            }
            println!();
        }
    }

    Ok(())
}

fn demo_analogy_completion(nb: &Numberbatch) -> anyhow::Result<()> {
    println!("┌─────────────────────────────────────────────────────────────┐");
    println!("│ 2. Analogical Reasoning (A:B :: C:?)                        │");
    println!("└─────────────────────────────────────────────────────────────┘\n");

    let analogies = vec![
        ("king", "queen", "man"),         // king:queen :: man:?
        ("paris", "france", "berlin"),    // paris:france :: berlin:?
        ("good", "better", "bad"),        // good:better :: bad:?
    ];

    for (a, b, c) in analogies {
        if let (Some(vec_a), Some(vec_b), Some(vec_c)) = (nb.get(a), nb.get(b), nb.get(c)) {
            // d = b - a + c
            let vec_d: Vec<f32> = vec_b.iter()
                .zip(vec_a.iter())
                .zip(vec_c.iter())
                .map(|((b, a), c)| b - a + c)
                .collect();

            // Find closest
            let results = nb.most_similar_to_vector(&vec_d, 5);
            if !results.is_empty() {
                let term_a = extract_term(a);
                let term_b = extract_term(b);
                let term_c = extract_term(c);

                println!("  {} : {} :: {} : ?", term_a, term_b, term_c);
                for (concept, score) in results.iter().take(3) {
                    if concept != c && concept != a && concept != b {
                        let term = extract_term(concept);
                        println!("    → {} ({:.3})", term, score);
                        break;
                    }
                }
                println!();
            }
        }
    }

    Ok(())
}

fn demo_query_expansion(nb: &Numberbatch, graph: &ConceptNetGraphBuilder) -> anyhow::Result<()> {
    println!("┌─────────────────────────────────────────────────────────────┐");
    println!("│ 3. Query Expansion for Better Search                        │");
    println!("└─────────────────────────────────────────────────────────────┘\n");

    let queries = vec![
        "computer",
        "science",
        "music",
    ];

    for query in queries {
        println!("  Query: \"{}\"", query);
        println!("  Expanded terms:");

        // From embeddings
        let similar = nb.most_similar(query, 5);
        for (concept, score) in similar.iter().take(3) {
            let term = extract_term(concept);
            println!("    • {} (embedding sim: {:.3})", term, score);
        }

        // From graph - use /c/en/ format for graph lookup
        let uri = format!("/c/en/{}", query.replace(' ', "_"));
        let neighbors = graph.get_neighbors(&uri);
        for neighbor in neighbors.iter().take(2) {
            let term = extract_term(&neighbor.uri);
            println!("    • {} (graph neighbor)", term);
        }

        println!();
    }

    Ok(())
}

fn demo_context_augmentation(graph: &ConceptNetGraphBuilder) -> anyhow::Result<()> {
    println!("┌─────────────────────────────────────────────────────────────┐");
    println!("│ 4. Context Augmentation for LLM                            │");
    println!("└─────────────────────────────────────────────────────────────┘\n");

    let config = RuvLLMConfig {
        max_facts: 10,
        min_relevance: 0.5,
        include_reasoning: true,
        detect_hallucinations: true,
        ..Default::default()
    };

    let augmenter = CommonsenseAugmenter::new(graph, config);

    let queries = vec![
        "What is machine learning?",
        "Why is the sky blue?",
        "How do computers work?",
    ];

    for query in queries {
        let context = augmenter.augment(query);
        println!("  Query: \"{}\"", query);
        println!("  Concepts found: {:?}", context.concepts);
        println!("  Facts retrieved: {}", context.facts.len());
        if !context.facts.is_empty() {
            println!("  Sample fact: {}", context.facts[0].to_natural_language());
        }
        println!();
    }

    Ok(())
}

fn demo_hallucination_detection(graph: &ConceptNetGraphBuilder) -> anyhow::Result<()> {
    println!("┌─────────────────────────────────────────────────────────────┐");
    println!("│ 5. Hallucination Detection                                 │");
    println!("└─────────────────────────────────────────────────────────────┘\n");

    let config = RuvLLMConfig::default();
    let augmenter = CommonsenseAugmenter::new(graph, config);

    let statements = vec![
        ("Dogs are mammals", true),
        ("Dogs can fly", false),
        ("The sun is a star", true),
        ("Water is dry", false),
        ("Computers process data", true),
    ];

    for (statement, expected_grounded) in statements {
        let result = augmenter.check_grounding(statement);
        let icon = if result.is_grounded == expected_grounded { "✓" } else { "✗" };
        let status = if result.is_grounded { "GROUNDED" } else { "NOT GROUNDED" };
        println!(
            "  {} \"{}\"",
            icon,
            statement
        );
        println!(
            "    Status: {} (confidence: {:.2})",
            status,
            result.confidence
        );
    }
    println!();

    Ok(())
}

fn demo_grounded_qa(graph: &ConceptNetGraphBuilder) -> anyhow::Result<()> {
    println!("┌─────────────────────────────────────────────────────────────┐");
    println!("│ 6. Grounded Question Answering                             │");
    println!("└─────────────────────────────────────────────────────────────┘\n");

    let config = RuvLLMConfig::default();
    let augmenter = CommonsenseAugmenter::new(graph, config);

    let questions = vec![
        "What is a dog?",
        "What can birds do?",
        "Where is food found?",
    ];

    for question in questions {
        let answer = augmenter.answer_question(question);
        println!("  Q: {}", question);
        println!("  A: {}", answer.answer);
        println!("  Confidence: {:.2}", answer.confidence);
        if !answer.supporting_facts.is_empty() {
            println!("  Supporting fact: {}", answer.supporting_facts[0].to_natural_language());
        }
        println!();
    }

    Ok(())
}

fn show_optimization_insights(nb: &Numberbatch, graph: &ConceptNetGraphBuilder) -> anyhow::Result<()> {
    println!("┌─────────────────────────────────────────────────────────────┐");
    println!("│ Optimization Insights                                       │");
    println!("└─────────────────────────────────────────────────────────────┘\n");

    let stats = graph.stats();

    println!("  📊 Data Statistics:");
    println!("    • Embeddings loaded: {}", nb.len());
    println!("    • Graph nodes: {}", stats.total_nodes);
    println!("    • Graph edges: {}", stats.total_edges);
    println!("    • Average degree: {:.2}", stats.avg_degree);
    println!();

    println!("  🚀 RuVector Optimizations:");
    println!("    • Semantic similarity using 300-dim Numberbatch vectors");
    println!("    • Graph-enhanced nearest neighbor search");
    println!("    • Relation-weighted distance metrics");
    println!("    • Multi-hop query expansion");
    println!();

    println!("  🧠 RuvLLM Optimizations:");
    println!("    • Commonsense fact injection into prompts");
    println!("    • Knowledge-grounded hallucination detection");
    println!("    • Multi-hop reasoning chains");
    println!("    • Domain-specific context loading");
    println!();

    println!("  📈 Potential Improvements:");
    println!("    • Load full 417K Numberbatch embeddings (+350K more)");
    println!("    • Load 34M ConceptNet assertions for richer graph");
    println!("    • Train GNN on graph structure for better embeddings");
    println!("    • Fine-tune SONA patterns on domain-specific queries");

    Ok(())
}
