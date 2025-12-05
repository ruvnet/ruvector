//! Commonsense Reasoning with GNNs
//!
//! High-level reasoning interface for answering commonsense questions.

use super::layer::{CommonsenseGNN, GNNConfig};
use crate::api::RelationType;
use crate::graph::{ConceptNetGraphBuilder, GraphEdge};
use std::collections::{HashMap, HashSet, VecDeque};

/// A commonsense reasoning query
#[derive(Debug, Clone)]
pub struct ReasoningQuery {
    /// The question type
    pub query_type: QueryType,
    /// Subject concept
    pub subject: String,
    /// Predicate/relation (optional)
    pub predicate: Option<RelationType>,
    /// Object concept (optional, for verification)
    pub object: Option<String>,
    /// Context concepts for disambiguation
    pub context: Vec<String>,
    /// Maximum reasoning depth
    pub max_depth: usize,
}

/// Types of reasoning queries
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum QueryType {
    /// What is X?
    Definition,
    /// What can X do?
    Capability,
    /// Where is X found?
    Location,
    /// What is X used for?
    Purpose,
    /// What causes X?
    Cause,
    /// What does X cause?
    Effect,
    /// Is X a Y?
    Verification,
    /// What are properties of X?
    Properties,
    /// How are X and Y related?
    Relationship,
    /// What is similar to X?
    Similarity,
    /// Why does X happen?
    Explanation,
}

impl ReasoningQuery {
    pub fn definition(concept: &str) -> Self {
        Self {
            query_type: QueryType::Definition,
            subject: concept.to_string(),
            predicate: Some(RelationType::IsA),
            object: None,
            context: vec![],
            max_depth: 3,
        }
    }

    pub fn capability(concept: &str) -> Self {
        Self {
            query_type: QueryType::Capability,
            subject: concept.to_string(),
            predicate: Some(RelationType::CapableOf),
            object: None,
            context: vec![],
            max_depth: 2,
        }
    }

    pub fn purpose(concept: &str) -> Self {
        Self {
            query_type: QueryType::Purpose,
            subject: concept.to_string(),
            predicate: Some(RelationType::UsedFor),
            object: None,
            context: vec![],
            max_depth: 2,
        }
    }

    pub fn verify(subject: &str, object: &str, relation: RelationType) -> Self {
        Self {
            query_type: QueryType::Verification,
            subject: subject.to_string(),
            predicate: Some(relation),
            object: Some(object.to_string()),
            context: vec![],
            max_depth: 4,
        }
    }

    pub fn relationship(concept1: &str, concept2: &str) -> Self {
        Self {
            query_type: QueryType::Relationship,
            subject: concept1.to_string(),
            predicate: None,
            object: Some(concept2.to_string()),
            context: vec![],
            max_depth: 4,
        }
    }

    pub fn with_context(mut self, context: Vec<String>) -> Self {
        self.context = context;
        self
    }
}

/// Result of a reasoning query
#[derive(Debug, Clone)]
pub struct ReasoningResult {
    /// The original query
    pub query: ReasoningQuery,
    /// Primary answer concepts
    pub answers: Vec<AnswerConcept>,
    /// Inference chains supporting the answer
    pub inference_chains: Vec<InferenceChain>,
    /// Overall confidence in the answer
    pub confidence: ConfidenceScore,
    /// Natural language explanation
    pub explanation: String,
}

/// An answer concept with confidence
#[derive(Debug, Clone)]
pub struct AnswerConcept {
    pub uri: String,
    pub label: String,
    pub confidence: f32,
    pub relation: RelationType,
    pub support_count: usize,
}

/// A chain of inferences leading to an answer
#[derive(Debug, Clone)]
pub struct InferenceChain {
    pub steps: Vec<InferenceStep>,
    pub confidence: f32,
}

/// A single inference step
#[derive(Debug, Clone)]
pub struct InferenceStep {
    pub from_concept: String,
    pub to_concept: String,
    pub relation: RelationType,
    pub confidence: f32,
    pub rule_applied: Option<String>,
}

/// Confidence score with breakdown
#[derive(Debug, Clone)]
pub struct ConfidenceScore {
    pub overall: f32,
    pub direct_evidence: f32,
    pub inferred_evidence: f32,
    pub embedding_similarity: f32,
    pub source_quality: f32,
}

impl ConfidenceScore {
    pub fn new(direct: f32, inferred: f32, similarity: f32, quality: f32) -> Self {
        let overall = 0.4 * direct + 0.3 * inferred + 0.2 * similarity + 0.1 * quality;
        Self {
            overall,
            direct_evidence: direct,
            inferred_evidence: inferred,
            embedding_similarity: similarity,
            source_quality: quality,
        }
    }
}

/// Commonsense reasoner using GNN
pub struct CommonsenseReasoner<'a> {
    graph: &'a ConceptNetGraphBuilder,
    gnn: CommonsenseGNN,
    embeddings: HashMap<String, Vec<f32>>,
}

impl<'a> CommonsenseReasoner<'a> {
    /// Create a new reasoner
    pub fn new(graph: &'a ConceptNetGraphBuilder, config: GNNConfig) -> Self {
        let gnn = CommonsenseGNN::new(config);
        let embeddings = HashMap::new();

        Self {
            graph,
            gnn,
            embeddings,
        }
    }

    /// Load embeddings for nodes
    pub fn load_embeddings(&mut self, embeddings: HashMap<String, Vec<f32>>) {
        self.embeddings = embeddings;
    }

    /// Execute a reasoning query
    pub fn reason(&self, query: &ReasoningQuery) -> ReasoningResult {
        match query.query_type {
            QueryType::Definition => self.reason_definition(query),
            QueryType::Capability => self.reason_capability(query),
            QueryType::Location => self.reason_location(query),
            QueryType::Purpose => self.reason_purpose(query),
            QueryType::Cause => self.reason_cause(query),
            QueryType::Effect => self.reason_effect(query),
            QueryType::Verification => self.reason_verification(query),
            QueryType::Properties => self.reason_properties(query),
            QueryType::Relationship => self.reason_relationship(query),
            QueryType::Similarity => self.reason_similarity(query),
            QueryType::Explanation => self.reason_explanation(query),
        }
    }

    /// Answer: What is X?
    fn reason_definition(&self, query: &ReasoningQuery) -> ReasoningResult {
        let mut answers = Vec::new();
        let mut chains = Vec::new();

        // Direct IsA relations
        for edge in self.graph.get_outgoing_edges(&query.subject) {
            if edge.relation == RelationType::IsA || edge.relation == RelationType::InstanceOf {
                let confidence = self.compute_edge_confidence(edge);
                answers.push(AnswerConcept {
                    uri: edge.target_id.clone(),
                    label: self.get_label(&edge.target_id),
                    confidence,
                    relation: edge.relation,
                    support_count: 1,
                });

                chains.push(InferenceChain {
                    steps: vec![InferenceStep {
                        from_concept: query.subject.clone(),
                        to_concept: edge.target_id.clone(),
                        relation: edge.relation,
                        confidence,
                        rule_applied: None,
                    }],
                    confidence,
                });
            }
        }

        // Transitive closure (X IsA Y, Y IsA Z → X IsA Z)
        self.expand_transitive(&query.subject, &mut answers, &mut chains, query.max_depth);

        answers.sort_by(|a, b| b.confidence.partial_cmp(&a.confidence).unwrap());

        let confidence = self.aggregate_confidence(&answers, &chains);
        let explanation = self.generate_explanation(query, &answers);

        ReasoningResult {
            query: query.clone(),
            answers,
            inference_chains: chains,
            confidence,
            explanation,
        }
    }

    fn reason_capability(&self, query: &ReasoningQuery) -> ReasoningResult {
        self.reason_by_relation(query, &[RelationType::CapableOf])
    }

    fn reason_location(&self, query: &ReasoningQuery) -> ReasoningResult {
        self.reason_by_relation(query, &[RelationType::AtLocation, RelationType::LocatedNear])
    }

    fn reason_purpose(&self, query: &ReasoningQuery) -> ReasoningResult {
        self.reason_by_relation(query, &[RelationType::UsedFor])
    }

    fn reason_cause(&self, query: &ReasoningQuery) -> ReasoningResult {
        // Look for what causes the subject
        let mut answers = Vec::new();
        let mut chains = Vec::new();

        // Incoming Causes edges
        for edge in self.graph.get_incoming_edges(&query.subject) {
            if edge.relation == RelationType::Causes {
                let confidence = self.compute_edge_confidence(edge);
                answers.push(AnswerConcept {
                    uri: edge.source_id.clone(),
                    label: self.get_label(&edge.source_id),
                    confidence,
                    relation: edge.relation,
                    support_count: 1,
                });

                chains.push(InferenceChain {
                    steps: vec![InferenceStep {
                        from_concept: edge.source_id.clone(),
                        to_concept: query.subject.clone(),
                        relation: edge.relation,
                        confidence,
                        rule_applied: None,
                    }],
                    confidence,
                });
            }
        }

        // HasPrerequisite as implicit cause
        for edge in self.graph.get_outgoing_edges(&query.subject) {
            if edge.relation == RelationType::HasPrerequisite {
                let confidence = self.compute_edge_confidence(edge) * 0.8;
                answers.push(AnswerConcept {
                    uri: edge.target_id.clone(),
                    label: self.get_label(&edge.target_id),
                    confidence,
                    relation: edge.relation,
                    support_count: 1,
                });
            }
        }

        answers.sort_by(|a, b| b.confidence.partial_cmp(&a.confidence).unwrap());
        let confidence = self.aggregate_confidence(&answers, &chains);
        let explanation = self.generate_explanation(query, &answers);

        ReasoningResult {
            query: query.clone(),
            answers,
            inference_chains: chains,
            confidence,
            explanation,
        }
    }

    fn reason_effect(&self, query: &ReasoningQuery) -> ReasoningResult {
        self.reason_by_relation(query, &[RelationType::Causes, RelationType::HasSubevent])
    }

    fn reason_verification(&self, query: &ReasoningQuery) -> ReasoningResult {
        let target = query.object.as_ref().unwrap();
        let relation = query.predicate.unwrap_or(RelationType::RelatedTo);

        // Check direct edge
        let mut direct_evidence = 0.0;
        for edge in self.graph.get_outgoing_edges(&query.subject) {
            if edge.target_id == *target && edge.relation == relation {
                direct_evidence = self.compute_edge_confidence(edge);
                break;
            }
        }

        // Check transitive path
        let path = self.find_path(&query.subject, target, query.max_depth);
        let inferred_evidence = path.as_ref().map(|p| p.confidence).unwrap_or(0.0);

        // Check embedding similarity
        let similarity = self.compute_embedding_similarity(&query.subject, target);

        let confidence = ConfidenceScore::new(direct_evidence, inferred_evidence, similarity, 0.8);

        let verified = confidence.overall > 0.5;
        let explanation = if verified {
            format!(
                "Yes, {} {} {} (confidence: {:.2})",
                self.get_label(&query.subject),
                format!("{:?}", relation).to_lowercase(),
                self.get_label(target),
                confidence.overall
            )
        } else {
            format!(
                "No strong evidence that {} {} {}",
                self.get_label(&query.subject),
                format!("{:?}", relation).to_lowercase(),
                self.get_label(target)
            )
        };

        ReasoningResult {
            query: query.clone(),
            answers: if verified {
                vec![AnswerConcept {
                    uri: target.clone(),
                    label: self.get_label(target),
                    confidence: confidence.overall,
                    relation,
                    support_count: 1,
                }]
            } else {
                vec![]
            },
            inference_chains: path.into_iter().collect(),
            confidence,
            explanation,
        }
    }

    fn reason_properties(&self, query: &ReasoningQuery) -> ReasoningResult {
        self.reason_by_relation(query, &[RelationType::HasProperty, RelationType::HasA])
    }

    fn reason_relationship(&self, query: &ReasoningQuery) -> ReasoningResult {
        let target = query.object.as_ref().unwrap();

        let mut answers = Vec::new();
        let mut chains = Vec::new();

        // Find all direct relations
        for edge in self.graph.get_node_edges(&query.subject) {
            let other = if edge.source_id == query.subject {
                &edge.target_id
            } else {
                &edge.source_id
            };

            if other == target {
                let confidence = self.compute_edge_confidence(edge);
                answers.push(AnswerConcept {
                    uri: format!("{:?}", edge.relation),
                    label: format!("{:?}", edge.relation),
                    confidence,
                    relation: edge.relation,
                    support_count: 1,
                });
            }
        }

        // Find path if no direct relation
        if answers.is_empty() {
            if let Some(path) = self.find_path(&query.subject, target, query.max_depth) {
                chains.push(path);
            }
        }

        let confidence = self.aggregate_confidence(&answers, &chains);
        let explanation = self.generate_explanation(query, &answers);

        ReasoningResult {
            query: query.clone(),
            answers,
            inference_chains: chains,
            confidence,
            explanation,
        }
    }

    fn reason_similarity(&self, query: &ReasoningQuery) -> ReasoningResult {
        let mut answers = Vec::new();

        // Use embedding similarity
        if let Some(subject_emb) = self.embeddings.get(&query.subject) {
            for (uri, emb) in &self.embeddings {
                if uri == &query.subject {
                    continue;
                }

                let similarity = CommonsenseGNN::new(GNNConfig::default())
                    .compute_similarity(subject_emb, emb);

                if similarity > 0.5 {
                    answers.push(AnswerConcept {
                        uri: uri.clone(),
                        label: self.get_label(uri),
                        confidence: similarity,
                        relation: RelationType::SimilarTo,
                        support_count: 1,
                    });
                }
            }
        }

        // Also check SimilarTo and Synonym relations
        for edge in self.graph.get_node_edges(&query.subject) {
            if edge.relation == RelationType::SimilarTo || edge.relation == RelationType::Synonym {
                let other = if edge.source_id == query.subject {
                    &edge.target_id
                } else {
                    &edge.source_id
                };

                let confidence = self.compute_edge_confidence(edge);
                answers.push(AnswerConcept {
                    uri: other.clone(),
                    label: self.get_label(other),
                    confidence,
                    relation: edge.relation,
                    support_count: 1,
                });
            }
        }

        answers.sort_by(|a, b| b.confidence.partial_cmp(&a.confidence).unwrap());
        answers.dedup_by(|a, b| a.uri == b.uri);

        let confidence = self.aggregate_confidence(&answers, &[]);
        let explanation = self.generate_explanation(query, &answers);

        ReasoningResult {
            query: query.clone(),
            answers,
            inference_chains: vec![],
            confidence,
            explanation,
        }
    }

    fn reason_explanation(&self, query: &ReasoningQuery) -> ReasoningResult {
        // Combine cause and prerequisite reasoning
        let mut answers = Vec::new();
        let mut chains = Vec::new();

        let cause_result = self.reason_cause(query);
        let prereq_result = self.reason_by_relation(query, &[RelationType::HasPrerequisite]);

        answers.extend(cause_result.answers);
        answers.extend(prereq_result.answers);
        chains.extend(cause_result.inference_chains);
        chains.extend(prereq_result.inference_chains);

        answers.sort_by(|a, b| b.confidence.partial_cmp(&a.confidence).unwrap());
        answers.dedup_by(|a, b| a.uri == b.uri);

        let confidence = self.aggregate_confidence(&answers, &chains);
        let explanation = self.generate_explanation(query, &answers);

        ReasoningResult {
            query: query.clone(),
            answers,
            inference_chains: chains,
            confidence,
            explanation,
        }
    }

    // Helper methods

    fn reason_by_relation(
        &self,
        query: &ReasoningQuery,
        relations: &[RelationType],
    ) -> ReasoningResult {
        let mut answers = Vec::new();
        let mut chains = Vec::new();

        for edge in self.graph.get_outgoing_edges(&query.subject) {
            if relations.contains(&edge.relation) {
                let confidence = self.compute_edge_confidence(edge);
                answers.push(AnswerConcept {
                    uri: edge.target_id.clone(),
                    label: self.get_label(&edge.target_id),
                    confidence,
                    relation: edge.relation,
                    support_count: 1,
                });

                chains.push(InferenceChain {
                    steps: vec![InferenceStep {
                        from_concept: query.subject.clone(),
                        to_concept: edge.target_id.clone(),
                        relation: edge.relation,
                        confidence,
                        rule_applied: None,
                    }],
                    confidence,
                });
            }
        }

        answers.sort_by(|a, b| b.confidence.partial_cmp(&a.confidence).unwrap());
        let confidence = self.aggregate_confidence(&answers, &chains);
        let explanation = self.generate_explanation(query, &answers);

        ReasoningResult {
            query: query.clone(),
            answers,
            inference_chains: chains,
            confidence,
            explanation,
        }
    }

    fn expand_transitive(
        &self,
        start: &str,
        answers: &mut Vec<AnswerConcept>,
        chains: &mut Vec<InferenceChain>,
        max_depth: usize,
    ) {
        let mut visited: HashSet<String> = HashSet::new();
        let mut queue: VecDeque<(String, Vec<InferenceStep>, f32)> = VecDeque::new();

        visited.insert(start.to_string());

        for edge in self.graph.get_outgoing_edges(start) {
            if edge.relation == RelationType::IsA {
                let conf = self.compute_edge_confidence(edge);
                queue.push_back((
                    edge.target_id.clone(),
                    vec![InferenceStep {
                        from_concept: start.to_string(),
                        to_concept: edge.target_id.clone(),
                        relation: edge.relation,
                        confidence: conf,
                        rule_applied: None,
                    }],
                    conf,
                ));
            }
        }

        while let Some((current, path, path_conf)) = queue.pop_front() {
            if path.len() > max_depth || visited.contains(&current) {
                continue;
            }
            visited.insert(current.clone());

            for edge in self.graph.get_outgoing_edges(&current) {
                if edge.relation == RelationType::IsA && !visited.contains(&edge.target_id) {
                    let edge_conf = self.compute_edge_confidence(edge);
                    let new_conf = path_conf * edge_conf * 0.9; // Decay

                    let mut new_path = path.clone();
                    new_path.push(InferenceStep {
                        from_concept: current.clone(),
                        to_concept: edge.target_id.clone(),
                        relation: edge.relation,
                        confidence: edge_conf,
                        rule_applied: Some("transitivity".to_string()),
                    });

                    answers.push(AnswerConcept {
                        uri: edge.target_id.clone(),
                        label: self.get_label(&edge.target_id),
                        confidence: new_conf,
                        relation: RelationType::IsA,
                        support_count: 1,
                    });

                    chains.push(InferenceChain {
                        steps: new_path.clone(),
                        confidence: new_conf,
                    });

                    queue.push_back((edge.target_id.clone(), new_path, new_conf));
                }
            }
        }
    }

    fn find_path(&self, start: &str, end: &str, max_depth: usize) -> Option<InferenceChain> {
        let mut visited: HashSet<String> = HashSet::new();
        let mut queue: VecDeque<(String, Vec<InferenceStep>, f32)> = VecDeque::new();

        visited.insert(start.to_string());
        queue.push_back((start.to_string(), vec![], 1.0));

        while let Some((current, path, conf)) = queue.pop_front() {
            if path.len() > max_depth {
                continue;
            }

            for edge in self.graph.get_node_edges(&current) {
                let next = if edge.source_id == current {
                    &edge.target_id
                } else {
                    &edge.source_id
                };

                if *next == end {
                    let edge_conf = self.compute_edge_confidence(edge);
                    let mut final_path = path.clone();
                    final_path.push(InferenceStep {
                        from_concept: current.clone(),
                        to_concept: next.clone(),
                        relation: edge.relation,
                        confidence: edge_conf,
                        rule_applied: None,
                    });

                    return Some(InferenceChain {
                        steps: final_path,
                        confidence: conf * edge_conf,
                    });
                }

                if !visited.contains(next) {
                    visited.insert(next.clone());
                    let edge_conf = self.compute_edge_confidence(edge);
                    let mut new_path = path.clone();
                    new_path.push(InferenceStep {
                        from_concept: current.clone(),
                        to_concept: next.clone(),
                        relation: edge.relation,
                        confidence: edge_conf,
                        rule_applied: None,
                    });
                    queue.push_back((next.clone(), new_path, conf * edge_conf));
                }
            }
        }

        None
    }

    fn compute_edge_confidence(&self, edge: &crate::graph::GraphEdge) -> f32 {
        (edge.confidence as f32).min(1.0)
    }

    fn compute_embedding_similarity(&self, uri1: &str, uri2: &str) -> f32 {
        match (self.embeddings.get(uri1), self.embeddings.get(uri2)) {
            (Some(e1), Some(e2)) => {
                self.gnn.compute_similarity(e1, e2)
            }
            _ => 0.0,
        }
    }

    fn aggregate_confidence(
        &self,
        answers: &[AnswerConcept],
        chains: &[InferenceChain],
    ) -> ConfidenceScore {
        let direct = answers
            .iter()
            .map(|a| a.confidence)
            .max_by(|a, b| a.partial_cmp(b).unwrap())
            .unwrap_or(0.0);

        let inferred = chains
            .iter()
            .filter(|c| c.steps.len() > 1)
            .map(|c| c.confidence)
            .max_by(|a, b| a.partial_cmp(b).unwrap())
            .unwrap_or(0.0);

        ConfidenceScore::new(direct, inferred, 0.5, 0.8)
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

    fn generate_explanation(&self, query: &ReasoningQuery, answers: &[AnswerConcept]) -> String {
        if answers.is_empty() {
            return format!("No information found about {}", self.get_label(&query.subject));
        }

        let subject_label = self.get_label(&query.subject);
        let top_answers: Vec<_> = answers.iter().take(3).collect();

        match query.query_type {
            QueryType::Definition => {
                let types: Vec<_> = top_answers.iter().map(|a| a.label.as_str()).collect();
                format!("{} is a {}", subject_label, types.join(", "))
            }
            QueryType::Capability => {
                let caps: Vec<_> = top_answers.iter().map(|a| a.label.as_str()).collect();
                format!("{} can {}", subject_label, caps.join(", "))
            }
            QueryType::Purpose => {
                let uses: Vec<_> = top_answers.iter().map(|a| a.label.as_str()).collect();
                format!("{} is used for {}", subject_label, uses.join(", "))
            }
            _ => {
                let items: Vec<_> = top_answers
                    .iter()
                    .map(|a| format!("{} ({:.2})", a.label, a.confidence))
                    .collect();
                format!("{}: {}", subject_label, items.join(", "))
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_reasoning_query_builder() {
        let query = ReasoningQuery::definition("/c/en/dog")
            .with_context(vec!["/c/en/pet".to_string()]);

        assert_eq!(query.query_type, QueryType::Definition);
        assert_eq!(query.subject, "/c/en/dog");
        assert!(!query.context.is_empty());
    }
}
