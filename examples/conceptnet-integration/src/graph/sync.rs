//! Graph Synchronization with ConceptNet API
//!
//! Incremental sync, bulk loading, and change detection.

use crate::api::{ConceptNetClient, Edge, QueryParams};
use super::builder::{ConceptNetGraphBuilder, GraphBuildConfig, GraphBuildError};
use std::collections::HashSet;
use std::sync::Arc;
use tokio::sync::Semaphore;
use tracing::{info, warn};

/// Configuration for graph synchronization
#[derive(Debug, Clone)]
pub struct SyncConfig {
    /// Maximum concurrent API requests
    pub max_concurrent_requests: usize,
    /// Batch size for bulk loading
    pub batch_size: usize,
    /// Maximum edges per concept
    pub max_edges_per_concept: usize,
    /// Languages to sync
    pub languages: Vec<String>,
    /// Enable incremental sync
    pub incremental: bool,
    /// Save checkpoints during sync
    pub checkpoint_interval: usize,
}

impl Default for SyncConfig {
    fn default() -> Self {
        Self {
            max_concurrent_requests: 5,
            batch_size: 100,
            max_edges_per_concept: 200,
            languages: vec!["en".to_string()],
            incremental: true,
            checkpoint_interval: 1000,
        }
    }
}

/// Statistics from sync operation
#[derive(Debug, Clone, Default)]
pub struct SyncStats {
    pub concepts_processed: usize,
    pub edges_added: usize,
    pub edges_skipped: usize,
    pub api_calls: usize,
    pub errors: usize,
    pub duration_ms: u64,
}

/// Graph synchronization engine
pub struct GraphSync {
    client: Arc<ConceptNetClient>,
    config: SyncConfig,
}

impl GraphSync {
    /// Create a new sync engine
    pub fn new(client: Arc<ConceptNetClient>, config: SyncConfig) -> Self {
        Self { client, config }
    }

    /// Sync a list of seed concepts and their neighborhoods
    pub async fn sync_concepts(
        &self,
        builder: &mut ConceptNetGraphBuilder,
        seed_concepts: &[String],
    ) -> Result<SyncStats, GraphBuildError> {
        let start = std::time::Instant::now();
        let mut stats = SyncStats::default();
        let semaphore = Arc::new(Semaphore::new(self.config.max_concurrent_requests));
        let mut processed: HashSet<String> = HashSet::new();

        // Process in batches
        for batch in seed_concepts.chunks(self.config.batch_size) {
            let futures: Vec<_> = batch
                .iter()
                .filter(|c| !processed.contains(*c))
                .map(|concept| {
                    let client = self.client.clone();
                    let semaphore = semaphore.clone();
                    let concept = concept.clone();
                    let max_edges = self.config.max_edges_per_concept;

                    async move {
                        let _permit = semaphore.acquire().await.unwrap();
                        let result = client.get_all_edges(&concept, max_edges).await;
                        (concept, result)
                    }
                })
                .collect();

            let results = futures::future::join_all(futures).await;

            for (concept, result) in results {
                stats.api_calls += 1;
                processed.insert(concept.clone());

                match result {
                    Ok(edges) => {
                        for edge in &edges {
                            match builder.add_edge(edge) {
                                Ok(_) => stats.edges_added += 1,
                                Err(_) => stats.edges_skipped += 1,
                            }
                        }
                        stats.concepts_processed += 1;
                        info!("Synced concept {} with {} edges", concept, edges.len());
                    }
                    Err(e) => {
                        warn!("Failed to sync {}: {}", concept, e);
                        stats.errors += 1;
                    }
                }
            }

            // Checkpoint
            if stats.concepts_processed % self.config.checkpoint_interval == 0 {
                info!(
                    "Checkpoint: {} concepts, {} edges",
                    stats.concepts_processed, stats.edges_added
                );
            }
        }

        stats.duration_ms = start.elapsed().as_millis() as u64;
        Ok(stats)
    }

    /// Expand graph by following edges from existing nodes
    pub async fn expand_neighborhood(
        &self,
        builder: &mut ConceptNetGraphBuilder,
        hops: usize,
    ) -> Result<SyncStats, GraphBuildError> {
        let start = std::time::Instant::now();
        let mut stats = SyncStats::default();

        let mut frontier: HashSet<String> = builder.nodes().map(|n| n.uri.clone()).collect();
        let mut visited: HashSet<String> = frontier.clone();

        for hop in 0..hops {
            info!("Expanding hop {}/{}, frontier size: {}", hop + 1, hops, frontier.len());

            let concepts: Vec<_> = frontier.drain().collect();
            let hop_stats = self.sync_concepts(builder, &concepts).await?;

            stats.concepts_processed += hop_stats.concepts_processed;
            stats.edges_added += hop_stats.edges_added;
            stats.edges_skipped += hop_stats.edges_skipped;
            stats.api_calls += hop_stats.api_calls;
            stats.errors += hop_stats.errors;

            // Find new frontier (neighbors not yet visited)
            for node in builder.nodes() {
                if !visited.contains(&node.uri) {
                    frontier.insert(node.uri.clone());
                    visited.insert(node.uri.clone());
                }
            }

            if frontier.is_empty() {
                info!("No new concepts to expand");
                break;
            }
        }

        stats.duration_ms = start.elapsed().as_millis() as u64;
        Ok(stats)
    }

    /// Sync by relation type
    pub async fn sync_by_relation(
        &self,
        builder: &mut ConceptNetGraphBuilder,
        concept: &str,
        relation: &str,
    ) -> Result<SyncStats, GraphBuildError> {
        let start = std::time::Instant::now();
        let mut stats = SyncStats::default();

        let params = QueryParams::new()
            .with_node(concept)
            .with_rel(&format!("/r/{}", relation))
            .with_limit(self.config.max_edges_per_concept);

        stats.api_calls += 1;
        match self.client.query(params).await {
            Ok(response) => {
                for edge in &response.edges {
                    match builder.add_edge(edge) {
                        Ok(_) => stats.edges_added += 1,
                        Err(_) => stats.edges_skipped += 1,
                    }
                }
                stats.concepts_processed = 1;
            }
            Err(e) => {
                warn!("Failed to sync {} via {}: {}", concept, relation, e);
                stats.errors += 1;
            }
        }

        stats.duration_ms = start.elapsed().as_millis() as u64;
        Ok(stats)
    }

    /// Load a predefined domain (e.g., "science", "food", "emotions")
    pub async fn sync_domain(
        &self,
        builder: &mut ConceptNetGraphBuilder,
        domain: &str,
    ) -> Result<SyncStats, GraphBuildError> {
        let seed_concepts = Self::domain_seeds(domain);
        info!("Syncing domain '{}' with {} seed concepts", domain, seed_concepts.len());
        self.sync_concepts(builder, &seed_concepts).await
    }

    /// Get seed concepts for common domains
    fn domain_seeds(domain: &str) -> Vec<String> {
        let seeds: Vec<&str> = match domain.to_lowercase().as_str() {
            "science" => vec![
                "/c/en/science",
                "/c/en/physics",
                "/c/en/chemistry",
                "/c/en/biology",
                "/c/en/mathematics",
                "/c/en/computer_science",
                "/c/en/astronomy",
                "/c/en/geology",
                "/c/en/experiment",
                "/c/en/hypothesis",
                "/c/en/theory",
                "/c/en/research",
            ],
            "technology" => vec![
                "/c/en/technology",
                "/c/en/computer",
                "/c/en/software",
                "/c/en/hardware",
                "/c/en/internet",
                "/c/en/artificial_intelligence",
                "/c/en/machine_learning",
                "/c/en/robot",
                "/c/en/algorithm",
                "/c/en/data",
            ],
            "emotions" => vec![
                "/c/en/emotion",
                "/c/en/happiness",
                "/c/en/sadness",
                "/c/en/anger",
                "/c/en/fear",
                "/c/en/love",
                "/c/en/joy",
                "/c/en/surprise",
                "/c/en/disgust",
                "/c/en/anxiety",
            ],
            "food" => vec![
                "/c/en/food",
                "/c/en/cooking",
                "/c/en/restaurant",
                "/c/en/meal",
                "/c/en/breakfast",
                "/c/en/dinner",
                "/c/en/vegetable",
                "/c/en/fruit",
                "/c/en/meat",
                "/c/en/dessert",
            ],
            "animals" => vec![
                "/c/en/animal",
                "/c/en/mammal",
                "/c/en/bird",
                "/c/en/fish",
                "/c/en/reptile",
                "/c/en/insect",
                "/c/en/dog",
                "/c/en/cat",
                "/c/en/wildlife",
                "/c/en/pet",
            ],
            "music" => vec![
                "/c/en/music",
                "/c/en/song",
                "/c/en/instrument",
                "/c/en/guitar",
                "/c/en/piano",
                "/c/en/singing",
                "/c/en/concert",
                "/c/en/rhythm",
                "/c/en/melody",
                "/c/en/musician",
            ],
            "health" => vec![
                "/c/en/health",
                "/c/en/medicine",
                "/c/en/doctor",
                "/c/en/hospital",
                "/c/en/disease",
                "/c/en/exercise",
                "/c/en/nutrition",
                "/c/en/sleep",
                "/c/en/mental_health",
                "/c/en/wellness",
            ],
            _ => {
                // Handle unknown domains by constructing the URI dynamically
                return vec![format!("/c/en/{}", domain.replace(' ', "_"))];
            }
        };
        seeds.into_iter().map(|s| s.to_string()).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_domain_seeds() {
        let science = GraphSync::domain_seeds("science");
        assert!(!science.is_empty());
        assert!(science.contains(&"/c/en/science".to_string()));
    }
}
