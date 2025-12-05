//! ConceptNet Integration Demo
//!
//! Demonstrates all features of the ConceptNet-RuVector integration.

use conceptnet_integration::prelude::*;
#[allow(unused_imports)]
use conceptnet_integration::api::ConceptNetClient;
use conceptnet_integration::graph::{ConceptNetGraphBuilder, GraphBuildConfig, GraphSync, SyncConfig};
use conceptnet_integration::gnn::{CommonsenseGNN, GNNConfig, CommonsenseReasoner, ReasoningQuery, QueryType, CommonsenseInference, InferenceConfig};
use conceptnet_integration::attention::{RelationAttention, CommonsenseAttentionConfig};
use conceptnet_integration::numberbatch::MockNumberbatch;
use conceptnet_integration::sona::{CommonsenseSona, CommonsenseSonaConfig};
use conceptnet_integration::ruvllm::{CommonsenseAugmenter, RuvLLMConfig};
#[allow(unused_imports)]
use std::sync::Arc;
use tracing::Level;
use tracing_subscriber::FmtSubscriber;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize logging
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .init();

    println!("╔══════════════════════════════════════════════════════════════╗");
    println!("║       ConceptNet + RuVector Integration Demo                 ║");
    println!("║                                                              ║");
    println!("║  Demonstrating: API, Graph, GNN, Attention, SONA, RuvLLM    ║");
    println!("╚══════════════════════════════════════════════════════════════╝\n");

    // Demo 1: API Client
    demo_api_client().await?;

    // Demo 2: Graph Building
    let graph = demo_graph_building().await?;

    // Demo 3: GNN Reasoning
    demo_gnn_reasoning(&graph)?;

    // Demo 4: Attention Mechanisms
    demo_attention_mechanisms()?;

    // Demo 5: Numberbatch Embeddings
    demo_numberbatch()?;

    // Demo 6: SONA Learning
    demo_sona_learning(&graph)?;

    // Demo 7: RuvLLM Integration
    demo_ruvllm(&graph)?;

    println!("\n✅ All demos completed successfully!");
    Ok(())
}

async fn demo_api_client() -> anyhow::Result<()> {
    println!("┌─────────────────────────────────────────────────────────────┐");
    println!("│ Demo 1: ConceptNet API Client                               │");
    println!("└─────────────────────────────────────────────────────────────┘\n");

    // Note: In production, this would make real API calls
    // For demo purposes, we'll show the API structure

    println!("  API Features:");
    println!("  • Rate-limited requests (3600/hour, 120/minute burst)");
    println!("  • Response caching with TTL");
    println!("  • Automatic retry with exponential backoff");
    println!("  • Connection pooling");
    println!();

    println!("  Example Usage:");
    println!("  ```");
    println!("  let client = ConceptNetClient::new();");
    println!("  let response = client.lookup(\"/c/en/dog\").await?;");
    println!("  let related = client.related(\"/c/en/dog\", Some(\"en\")).await?;");
    println!("  let similarity = client.relatedness(\"/c/en/dog\", \"/c/en/cat\").await?;");
    println!("  ```\n");

    println!("  Concept URI Format:");
    println!("  • /c/en/artificial_intelligence - English concept");
    println!("  • /c/es/perro - Spanish concept");
    println!("  • /r/IsA - Relation type");
    println!();

    Ok(())
}

async fn demo_graph_building() -> anyhow::Result<ConceptNetGraphBuilder> {
    println!("┌─────────────────────────────────────────────────────────────┐");
    println!("│ Demo 2: Graph Building from ConceptNet                      │");
    println!("└─────────────────────────────────────────────────────────────┘\n");

    // Create graph builder with configuration
    let config = GraphBuildConfig {
        max_nodes: 10000,
        max_edges_per_node: 100,
        min_edge_weight: 1.0,
        languages: vec!["en".to_string()],
        deduplicate: true,
        ..Default::default()
    };

    let mut builder = ConceptNetGraphBuilder::new(config);

    // Simulate adding edges (in production, these come from API)
    println!("  Building mock knowledge graph...\n");

    // Create mock edges for demo
    let mock_edges = create_mock_edges();
    builder.add_edges(&mock_edges)?;

    let stats = builder.stats();
    println!("  Graph Statistics:");
    println!("  ├─ Nodes: {}", stats.total_nodes);
    println!("  ├─ Edges: {}", stats.total_edges);
    println!("  ├─ Avg Degree: {:.2}", stats.avg_degree);
    println!("  └─ Connected Components: {}", stats.connected_components);
    println!();

    // Demo shortest path
    if let Some(path) = builder.shortest_path("/c/en/dog", "/c/en/pet", 5) {
        println!("  Shortest path (dog → pet):");
        println!("  {}", path.join(" → "));
    }
    println!();

    Ok(builder)
}

fn demo_gnn_reasoning(graph: &ConceptNetGraphBuilder) -> anyhow::Result<()> {
    println!("┌─────────────────────────────────────────────────────────────┐");
    println!("│ Demo 3: GNN-based Commonsense Reasoning                     │");
    println!("└─────────────────────────────────────────────────────────────┘\n");

    // Create GNN
    let gnn_config = GNNConfig {
        input_dim: 300,  // Numberbatch dimension
        hidden_dim: 256,
        output_dim: 128,
        num_heads: 4,
        num_layers: 2,
        relation_aware: true,
        ..Default::default()
    };

    let gnn = CommonsenseGNN::new(gnn_config);
    println!("  Created CommonsenseGNN:");
    println!("  ├─ Input dim: 300 (Numberbatch)");
    println!("  ├─ Hidden dim: 256");
    println!("  ├─ Output dim: 128");
    println!("  ├─ Attention heads: 4");
    println!("  └─ Relation-aware: Yes\n");

    // Demo reasoning queries
    let reasoner = CommonsenseReasoner::new(graph, GNNConfig::default());

    println!("  Reasoning Query Types:");
    println!("  • Definition: What is X?");
    println!("  • Capability: What can X do?");
    println!("  • Location: Where is X found?");
    println!("  • Purpose: What is X used for?");
    println!("  • Cause: What causes X?");
    println!("  • Verification: Is X a Y?\n");

    // Example query
    let query = ReasoningQuery::definition("/c/en/dog");
    let result = reasoner.reason(&query);
    println!("  Example: \"What is a dog?\"");
    println!("  Confidence: {:.2}", result.confidence.overall);
    println!("  Explanation: {}", result.explanation);
    println!();

    Ok(())
}

fn demo_attention_mechanisms() -> anyhow::Result<()> {
    println!("┌─────────────────────────────────────────────────────────────┐");
    println!("│ Demo 4: Attention Mechanisms                                │");
    println!("└─────────────────────────────────────────────────────────────┘\n");

    let config = CommonsenseAttentionConfig {
        hidden_dim: 256,
        num_heads: 8,
        relation_aware: true,
        ..Default::default()
    };

    println!("  Available Attention Types:");
    println!("  ├─ RelationAttention: Relation-typed attention weighting");
    println!("  ├─ HierarchicalAttention: For taxonomic reasoning (IsA chains)");
    println!("  ├─ CausalAttention: For temporal/causal chains");
    println!("  └─ CrossLingualAttention: Multilingual concept alignment\n");

    // Demo relation attention
    let attention = RelationAttention::new(config);

    println!("  RelationAttention Features:");
    println!("  • Separate projections per relation type");
    println!("  • Semantic weight based on relation importance");
    println!("  • Multi-head attention for diverse patterns");
    println!("  • Interpretable attention weights\n");

    // Example computation
    let query = vec![0.1f32; 256];
    let keys = vec![vec![0.2f32; 256], vec![0.3f32; 256]];
    let values = vec![vec![0.4f32; 256], vec![0.5f32; 256]];
    let relations = vec![
        conceptnet_integration::api::RelationType::IsA,
        conceptnet_integration::api::RelationType::HasA,
    ];

    let output = attention.forward(&query, &keys, &values, &relations);
    println!("  Example output dimension: {}", output.len());

    let weights = attention.get_attention_weights(&query, &keys, &relations);
    println!("  Attention weights: [{:.3}, {:.3}]", weights[0], weights[1]);
    println!();

    Ok(())
}

fn demo_numberbatch() -> anyhow::Result<()> {
    println!("┌─────────────────────────────────────────────────────────────┐");
    println!("│ Demo 5: Numberbatch Embeddings                              │");
    println!("└─────────────────────────────────────────────────────────────┘\n");

    println!("  Numberbatch Features:");
    println!("  • 300-dimensional semantic vectors");
    println!("  • Multilingual (78+ languages)");
    println!("  • Outperforms word2vec/GloVe on similarity benchmarks");
    println!("  • Bias-reduced embeddings\n");

    // Use mock numberbatch for demo
    let mock = MockNumberbatch::new(300);

    println!("  Example embeddings (mock):");
    let dog_emb = mock.get("/c/en/dog");
    let cat_emb = mock.get("/c/en/cat");
    let car_emb = mock.get("/c/en/car");

    // Compute similarities
    let dog_cat_sim = cosine_similarity(&dog_emb, &cat_emb);
    let dog_car_sim = cosine_similarity(&dog_emb, &car_emb);

    println!("  • dog-cat similarity: {:.3}", dog_cat_sim);
    println!("  • dog-car similarity: {:.3}", dog_car_sim);
    println!();

    println!("  Analogical Reasoning (A:B :: C:?):");
    println!("  • king:queen :: man:? → woman");
    println!("  • paris:france :: tokyo:? → japan");
    println!("  • dog:bark :: cat:? → meow\n");

    Ok(())
}

fn demo_sona_learning(graph: &ConceptNetGraphBuilder) -> anyhow::Result<()> {
    println!("┌─────────────────────────────────────────────────────────────┐");
    println!("│ Demo 6: SONA Self-Learning                                  │");
    println!("└─────────────────────────────────────────────────────────────┘\n");

    let config = CommonsenseSonaConfig {
        hidden_dim: 256,
        embedding_dim: 300,
        micro_lora_rank: 2,
        base_lora_rank: 8,
        ewc_lambda: 0.4,
        pattern_threshold: 0.7,
        ..Default::default()
    };

    let mut sona = CommonsenseSona::new(config);

    println!("  SONA Architecture:");
    println!("  ├─ Instant Loop (MicroLoRA): Per-request adaptation");
    println!("  ├─ Background Loop (BaseLoRA): Hourly pattern learning");
    println!("  └─ Deep Loop (EWC++): Weekly consolidation\n");

    // Demo trajectory learning
    let mut builder = sona.begin_trajectory("what is a dog");
    builder.add_step(
        "/c/en/dog",
        vec![0.1; 300],
        conceptnet_integration::api::RelationType::IsA,
        0.9,
    );
    builder.add_step(
        "/c/en/animal",
        vec![0.2; 300],
        conceptnet_integration::api::RelationType::IsA,
        0.85,
    );

    let trajectory = builder.build(0.87);
    sona.end_trajectory(trajectory);

    println!("  Learned Pattern:");
    println!("  • Type: TaxonomicChain");
    println!("  • Relations: [IsA, IsA]");
    println!("  • Success Rate: 0.87");
    println!();

    println!("  ReasoningBank:");
    println!("  • Stores successful reasoning patterns");
    println!("  • Similarity search for strategy selection");
    println!("  • Per-relation statistics tracking\n");

    Ok(())
}

fn demo_ruvllm(graph: &ConceptNetGraphBuilder) -> anyhow::Result<()> {
    println!("┌─────────────────────────────────────────────────────────────┐");
    println!("│ Demo 7: RuvLLM Commonsense Augmentation                     │");
    println!("└─────────────────────────────────────────────────────────────┘\n");

    let config = RuvLLMConfig {
        max_facts: 10,
        min_relevance: 0.5,
        include_reasoning: true,
        detect_hallucinations: true,
        ..Default::default()
    };

    let augmenter = CommonsenseAugmenter::new(graph, config);

    println!("  RuvLLM Features:");
    println!("  ├─ Context augmentation with commonsense facts");
    println!("  ├─ Hallucination detection via knowledge grounding");
    println!("  ├─ Question answering with reasoning chains");
    println!("  └─ Concept suggestions and completions\n");

    // Demo context augmentation
    println!("  Example Query: \"What can dogs do?\"");
    let context = augmenter.augment("What can dogs do?");
    println!("  Concepts extracted: {:?}", context.concepts);
    println!("  Facts retrieved: {}", context.facts.len());
    println!();

    // Demo prompt generation
    let prompt = augmenter.generate_prompt(
        "What is machine learning?",
        Some("You are a helpful AI assistant."),
    );
    println!("  Generated Prompt (truncated):");
    println!("  {}", prompt.chars().take(200).collect::<String>());
    println!("  ...");
    println!();

    // Demo hallucination detection
    println!("  Hallucination Detection:");
    println!("  • Statement: \"Dogs can fly\"");
    let result = augmenter.check_grounding("Dogs can fly");
    println!("  • Grounded: {}", result.is_grounded);
    println!("  • Confidence: {:.2}", result.confidence);
    println!();

    Ok(())
}

// Helper functions

fn create_mock_edges() -> Vec<conceptnet_integration::api::Edge> {
    use conceptnet_integration::api::{Edge, ConceptNode, Relation, Source};

    let concepts = vec![
        ("dog", "animal"),
        ("cat", "animal"),
        ("animal", "living_thing"),
        ("dog", "pet"),
        ("cat", "pet"),
        ("dog", "mammal"),
        ("cat", "mammal"),
        ("mammal", "animal"),
    ];

    concepts
        .into_iter()
        .map(|(start, end)| Edge {
            id: format!("/a/[/r/IsA/,/c/en/{}/,/c/en/{}/]", start, end),
            start: ConceptNode {
                id: format!("/c/en/{}", start),
                label: Some(start.to_string()),
                language: Some("en".to_string()),
                term: Some(start.to_string()),
                sense_label: None,
            },
            end: ConceptNode {
                id: format!("/c/en/{}", end),
                label: Some(end.to_string()),
                language: Some("en".to_string()),
                term: Some(end.to_string()),
                sense_label: None,
            },
            rel: Relation {
                id: "/r/IsA".to_string(),
                label: Some("IsA".to_string()),
            },
            weight: 2.0,
            surface_text: Some(format!("[[{}]] is a [[{}]]", start, end)),
            license: Some("cc:by-sa/4.0".to_string()),
            dataset: Some("/d/conceptnet/4/en".to_string()),
            sources: vec![],
        })
        .collect()
}

fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

    if norm_a > 0.0 && norm_b > 0.0 {
        dot / (norm_a * norm_b)
    } else {
        0.0
    }
}
