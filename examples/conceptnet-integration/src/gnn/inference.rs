//! GNN Inference for Commonsense Reasoning
//!
//! Production-ready inference pipeline for knowledge graph queries.

use super::layer::{CommonsenseGNN, GNNConfig};
use super::reasoning::{CommonsenseReasoner, ReasoningQuery, ReasoningResult};
use crate::api::RelationType;
use crate::graph::ConceptNetGraphBuilder;
use std::collections::HashMap;
#[allow(unused_imports)]
use std::sync::Arc;

/// Inference configuration
#[derive(Debug, Clone)]
pub struct InferenceConfig {
    /// Maximum batch size
    pub batch_size: usize,
    /// Cache inference results
    pub cache_enabled: bool,
    /// Cache TTL in seconds
    pub cache_ttl_seconds: u64,
    /// Confidence threshold for results
    pub confidence_threshold: f32,
    /// Maximum results per query
    pub max_results: usize,
    /// Use approximate inference for speed
    pub approximate: bool,
}

impl Default for InferenceConfig {
    fn default() -> Self {
        Self {
            batch_size: 32,
            cache_enabled: true,
            cache_ttl_seconds: 300,
            confidence_threshold: 0.3,
            max_results: 10,
            approximate: false,
        }
    }
}

/// Result of inference
#[derive(Debug, Clone)]
pub struct InferenceResult {
    pub query: String,
    pub answers: Vec<InferenceAnswer>,
    pub confidence: f32,
    pub latency_ms: u64,
    pub cache_hit: bool,
}

/// An answer from inference
#[derive(Debug, Clone)]
pub struct InferenceAnswer {
    pub concept: String,
    pub label: String,
    pub score: f32,
    pub relation: Option<RelationType>,
    pub explanation: String,
}

/// Commonsense inference engine
pub struct CommonsenseInference<'a> {
    graph: &'a ConceptNetGraphBuilder,
    gnn: CommonsenseGNN,
    embeddings: HashMap<String, Vec<f32>>,
    config: InferenceConfig,
    cache: HashMap<u64, (InferenceResult, std::time::Instant)>,
}

impl<'a> CommonsenseInference<'a> {
    /// Create a new inference engine
    pub fn new(
        graph: &'a ConceptNetGraphBuilder,
        gnn_config: GNNConfig,
        config: InferenceConfig,
    ) -> Self {
        Self {
            graph,
            gnn: CommonsenseGNN::new(gnn_config),
            embeddings: HashMap::new(),
            config,
            cache: HashMap::new(),
        }
    }

    /// Load pre-trained embeddings
    pub fn load_embeddings(&mut self, embeddings: HashMap<String, Vec<f32>>) {
        self.embeddings = embeddings;
    }

    /// Run inference for a natural language query
    pub fn infer(&mut self, query: &str) -> InferenceResult {
        let start = std::time::Instant::now();

        // Check cache
        let cache_key = Self::hash_query(query);
        if self.config.cache_enabled {
            if let Some((cached, timestamp)) = self.cache.get(&cache_key) {
                if timestamp.elapsed().as_secs() < self.config.cache_ttl_seconds {
                    let mut result = cached.clone();
                    result.cache_hit = true;
                    result.latency_ms = start.elapsed().as_millis() as u64;
                    return result;
                }
            }
        }

        // Parse query into reasoning query
        let reasoning_query = self.parse_query(query);

        // Execute reasoning
        let reasoner = CommonsenseReasoner::new(self.graph, GNNConfig::default());
        let reasoning_result = reasoner.reason(&reasoning_query);

        // Convert to inference result
        let mut result = self.convert_result(query, &reasoning_result);
        result.latency_ms = start.elapsed().as_millis() as u64;

        // Cache result
        if self.config.cache_enabled {
            self.cache.insert(cache_key, (result.clone(), std::time::Instant::now()));
        }

        result
    }

    /// Batch inference for multiple queries
    pub fn infer_batch(&mut self, queries: &[&str]) -> Vec<InferenceResult> {
        queries.iter().map(|q| self.infer(q)).collect()
    }

    /// Link prediction inference
    pub fn predict_link(
        &self,
        head: &str,
        relation: RelationType,
        k: usize,
    ) -> Vec<InferenceAnswer> {
        let mut candidates = Vec::new();

        let head_emb = match self.embeddings.get(head) {
            Some(e) => e,
            None => return vec![],
        };

        for (uri, emb) in &self.embeddings {
            if uri == head {
                continue;
            }

            let score = self.gnn.predict_link(head_emb, emb, &relation);
            if score >= self.config.confidence_threshold {
                candidates.push(InferenceAnswer {
                    concept: uri.clone(),
                    label: self.get_label(uri),
                    score,
                    relation: Some(relation),
                    explanation: format!(
                        "{} {:?} {} (confidence: {:.2})",
                        self.get_label(head),
                        relation,
                        self.get_label(uri),
                        score
                    ),
                });
            }
        }

        candidates.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
        candidates.truncate(k);
        candidates
    }

    /// Find similar concepts
    pub fn find_similar(&self, concept: &str, k: usize) -> Vec<InferenceAnswer> {
        let emb = match self.embeddings.get(concept) {
            Some(e) => e,
            None => return vec![],
        };

        let mut similar = Vec::new();

        for (uri, other_emb) in &self.embeddings {
            if uri == concept {
                continue;
            }

            let score = self.gnn.compute_similarity(emb, other_emb);
            if score >= self.config.confidence_threshold {
                similar.push(InferenceAnswer {
                    concept: uri.clone(),
                    label: self.get_label(uri),
                    score,
                    relation: Some(RelationType::SimilarTo),
                    explanation: format!(
                        "{} is similar to {} (similarity: {:.2})",
                        self.get_label(concept),
                        self.get_label(uri),
                        score
                    ),
                });
            }
        }

        similar.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
        similar.truncate(k);
        similar
    }

    /// Answer a specific question type
    pub fn answer_question(&mut self, question_type: QuestionType, subject: &str) -> InferenceResult {
        let query = match question_type {
            QuestionType::WhatIs => format!("what is {}", subject),
            QuestionType::WhatCanDo => format!("what can {} do", subject),
            QuestionType::WhereIs => format!("where is {}", subject),
            QuestionType::WhatUsedFor => format!("what is {} used for", subject),
            QuestionType::WhatCauses => format!("what causes {}", subject),
            QuestionType::WhatHas => format!("what does {} have", subject),
        };

        self.infer(&query)
    }

    /// Clear inference cache
    pub fn clear_cache(&mut self) {
        self.cache.clear();
    }

    // Helper methods

    fn parse_query(&self, query: &str) -> ReasoningQuery {
        let lower = query.to_lowercase();

        // Simple pattern matching for query parsing
        if lower.starts_with("what is ") {
            let concept = self.extract_concept(&lower[8..]);
            ReasoningQuery::definition(&concept)
        } else if lower.contains("can ") && lower.contains(" do") {
            let concept = self.extract_concept_between(&lower, "can ", " do");
            ReasoningQuery::capability(&concept)
        } else if lower.starts_with("where is ") {
            let concept = self.extract_concept(&lower[9..]);
            ReasoningQuery {
                query_type: super::reasoning::QueryType::Location,
                subject: concept,
                predicate: Some(RelationType::AtLocation),
                object: None,
                context: vec![],
                max_depth: 2,
            }
        } else if lower.contains("used for") {
            let concept = if lower.starts_with("what is ") {
                self.extract_concept_between(&lower, "what is ", " used for")
            } else {
                self.extract_concept(&lower)
            };
            ReasoningQuery::purpose(&concept)
        } else if lower.contains("causes ") {
            let concept = self.extract_concept(&lower.replace("what causes ", ""));
            ReasoningQuery {
                query_type: super::reasoning::QueryType::Cause,
                subject: concept,
                predicate: Some(RelationType::Causes),
                object: None,
                context: vec![],
                max_depth: 3,
            }
        } else if lower.contains(" have") || lower.contains(" has") {
            let concept = self.extract_concept_between(&lower, "does ", " have");
            ReasoningQuery {
                query_type: super::reasoning::QueryType::Properties,
                subject: concept,
                predicate: Some(RelationType::HasA),
                object: None,
                context: vec![],
                max_depth: 2,
            }
        } else if lower.contains("similar to") {
            let concept = self.extract_concept_between(&lower, "similar to ", "");
            ReasoningQuery {
                query_type: super::reasoning::QueryType::Similarity,
                subject: concept,
                predicate: Some(RelationType::SimilarTo),
                object: None,
                context: vec![],
                max_depth: 2,
            }
        } else {
            // Default: treat as definition query
            let concept = self.extract_concept(&lower);
            ReasoningQuery::definition(&concept)
        }
    }

    fn extract_concept(&self, text: &str) -> String {
        let cleaned = text
            .trim()
            .trim_matches(|c: char| c == '?' || c == '.' || c == '!')
            .replace(' ', "_")
            .to_lowercase();

        format!("/c/en/{}", cleaned)
    }

    fn extract_concept_between(&self, text: &str, start: &str, end: &str) -> String {
        let after_start = text.find(start).map(|i| &text[i + start.len()..]).unwrap_or(text);
        let before_end = if end.is_empty() {
            after_start
        } else {
            after_start.find(end).map(|i| &after_start[..i]).unwrap_or(after_start)
        };
        self.extract_concept(before_end)
    }

    fn convert_result(&self, query: &str, result: &ReasoningResult) -> InferenceResult {
        let answers: Vec<InferenceAnswer> = result
            .answers
            .iter()
            .filter(|a| a.confidence >= self.config.confidence_threshold)
            .take(self.config.max_results)
            .map(|a| InferenceAnswer {
                concept: a.uri.clone(),
                label: a.label.clone(),
                score: a.confidence,
                relation: Some(a.relation),
                explanation: format!("{:?}: {}", a.relation, a.label),
            })
            .collect();

        InferenceResult {
            query: query.to_string(),
            answers,
            confidence: result.confidence.overall,
            latency_ms: 0,
            cache_hit: false,
        }
    }

    fn get_label(&self, uri: &str) -> String {
        self.graph
            .get_node(uri)
            .map(|n| n.label.clone())
            .unwrap_or_else(|| {
                uri.split('/')
                    .last()
                    .unwrap_or(uri)
                    .replace('_', " ")
            })
    }

    fn hash_query(query: &str) -> u64 {
        use std::hash::{Hash, Hasher};
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        query.hash(&mut hasher);
        hasher.finish()
    }
}

/// Types of questions for direct answering
#[derive(Debug, Clone, Copy)]
pub enum QuestionType {
    WhatIs,
    WhatCanDo,
    WhereIs,
    WhatUsedFor,
    WhatCauses,
    WhatHas,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_query_parsing() {
        let graph = ConceptNetGraphBuilder::default_config();
        let inference = CommonsenseInference::new(
            &graph,
            GNNConfig::default(),
            InferenceConfig::default(),
        );

        let query = inference.parse_query("what is a dog?");
        assert_eq!(query.subject, "/c/en/a_dog");
    }
}
