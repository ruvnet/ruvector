//! RuvLLM Integration for Commonsense-Augmented Language Models
//!
//! Augment LLM responses with ConceptNet commonsense knowledge.
//!
//! ## Features
//! - Knowledge retrieval for context augmentation
//! - Commonsense fact injection
//! - Reasoning chain generation
//! - Hallucination detection via knowledge grounding
//! - Multi-hop question answering

use crate::api::RelationType;
use crate::gnn::{CommonsenseReasoner, ReasoningQuery, ReasoningResult};
use crate::graph::ConceptNetGraphBuilder;
use crate::numberbatch::Numberbatch;
use crate::sona::CommonsenseSona;
#[allow(unused_imports)]
use std::collections::HashMap;

/// Configuration for RuvLLM commonsense integration
#[derive(Debug, Clone)]
pub struct RuvLLMConfig {
    /// Maximum facts to inject
    pub max_facts: usize,
    /// Minimum relevance score for facts
    pub min_relevance: f32,
    /// Include reasoning chains
    pub include_reasoning: bool,
    /// Maximum reasoning depth
    pub max_reasoning_depth: usize,
    /// Enable hallucination detection
    pub detect_hallucinations: bool,
    /// Confidence threshold for grounding
    pub grounding_threshold: f32,
}

impl Default for RuvLLMConfig {
    fn default() -> Self {
        Self {
            max_facts: 10,
            min_relevance: 0.5,
            include_reasoning: true,
            max_reasoning_depth: 3,
            detect_hallucinations: true,
            grounding_threshold: 0.6,
        }
    }
}

/// A commonsense fact for context augmentation
#[derive(Debug, Clone)]
pub struct CommonsenseFact {
    pub subject: String,
    pub relation: RelationType,
    pub object: String,
    pub confidence: f32,
    pub natural_language: String,
}

impl CommonsenseFact {
    pub fn to_natural_language(&self) -> String {
        let subject = self.subject.split('/').last().unwrap_or(&self.subject).replace('_', " ");
        let object = self.object.split('/').last().unwrap_or(&self.object).replace('_', " ");

        match self.relation {
            RelationType::IsA => format!("{} is a type of {}", subject, object),
            RelationType::HasA => format!("{} has {}", subject, object),
            RelationType::PartOf => format!("{} is part of {}", subject, object),
            RelationType::UsedFor => format!("{} is used for {}", subject, object),
            RelationType::CapableOf => format!("{} can {}", subject, object),
            RelationType::AtLocation => format!("{} is found at {}", subject, object),
            RelationType::Causes => format!("{} causes {}", subject, object),
            RelationType::HasPrerequisite => format!("{} requires {}", subject, object),
            RelationType::HasProperty => format!("{} is {}", subject, object),
            RelationType::RelatedTo => format!("{} is related to {}", subject, object),
            RelationType::SimilarTo => format!("{} is similar to {}", subject, object),
            RelationType::Synonym => format!("{} is the same as {}", subject, object),
            RelationType::Antonym => format!("{} is the opposite of {}", subject, object),
            _ => format!("{} {} {}", subject, format!("{:?}", self.relation).to_lowercase(), object),
        }
    }
}

/// Context augmentation for LLM prompts
#[derive(Debug, Clone)]
pub struct AugmentedContext {
    /// Original query
    pub query: String,
    /// Extracted concepts
    pub concepts: Vec<String>,
    /// Retrieved facts
    pub facts: Vec<CommonsenseFact>,
    /// Reasoning chains (if enabled)
    pub reasoning_chains: Vec<String>,
    /// Formatted context for injection
    pub formatted_context: String,
}

/// Hallucination detection result
#[derive(Debug, Clone)]
pub struct HallucinationResult {
    pub statement: String,
    pub is_grounded: bool,
    pub confidence: f32,
    pub supporting_facts: Vec<CommonsenseFact>,
    pub contradicting_facts: Vec<CommonsenseFact>,
}

/// RuvLLM commonsense augmentation engine
pub struct CommonsenseAugmenter<'a> {
    graph: &'a ConceptNetGraphBuilder,
    numberbatch: Option<&'a Numberbatch>,
    sona: Option<&'a CommonsenseSona>,
    config: RuvLLMConfig,
}

impl<'a> CommonsenseAugmenter<'a> {
    /// Create a new augmenter
    pub fn new(graph: &'a ConceptNetGraphBuilder, config: RuvLLMConfig) -> Self {
        Self {
            graph,
            numberbatch: None,
            sona: None,
            config,
        }
    }

    /// Set Numberbatch embeddings
    pub fn with_numberbatch(mut self, nb: &'a Numberbatch) -> Self {
        self.numberbatch = Some(nb);
        self
    }

    /// Set SONA for learned patterns
    pub fn with_sona(mut self, sona: &'a CommonsenseSona) -> Self {
        self.sona = Some(sona);
        self
    }

    /// Augment a query with commonsense context
    pub fn augment(&self, query: &str) -> AugmentedContext {
        // Extract concepts from query
        let concepts = self.extract_concepts(query);

        // Retrieve relevant facts
        let facts = self.retrieve_facts(&concepts);

        // Generate reasoning chains if enabled
        let reasoning_chains = if self.config.include_reasoning {
            self.generate_reasoning_chains(&concepts)
        } else {
            vec![]
        };

        // Format context
        let formatted_context = self.format_context(&facts, &reasoning_chains);

        AugmentedContext {
            query: query.to_string(),
            concepts,
            facts,
            reasoning_chains,
            formatted_context,
        }
    }

    /// Generate a prompt with commonsense context
    pub fn generate_prompt(&self, query: &str, system_prompt: Option<&str>) -> String {
        let context = self.augment(query);

        let system = system_prompt.unwrap_or(
            "You are a helpful assistant with access to commonsense knowledge."
        );

        if context.formatted_context.is_empty() {
            format!(
                "{}\n\nUser: {}\nAssistant:",
                system, query
            )
        } else {
            format!(
                "{}\n\n## Relevant Knowledge\n{}\n\nUser: {}\nAssistant:",
                system, context.formatted_context, query
            )
        }
    }

    /// Check if a statement is grounded in commonsense knowledge
    pub fn check_grounding(&self, statement: &str) -> HallucinationResult {
        let concepts = self.extract_concepts(statement);
        let facts = self.retrieve_facts(&concepts);

        // Check for supporting facts
        let mut supporting = Vec::new();
        let mut contradicting = Vec::new();

        for fact in &facts {
            let statement_lower = statement.to_lowercase();
            let fact_text = fact.to_natural_language().to_lowercase();

            // Simple semantic overlap check
            let subject = fact.subject.split('/').last().unwrap_or("").to_lowercase();
            let object = fact.object.split('/').last().unwrap_or("").to_lowercase();

            let has_subject = statement_lower.contains(&subject);
            let has_object = statement_lower.contains(&object);

            if has_subject && has_object {
                // Check for contradiction (antonym or negation)
                if fact.relation == RelationType::Antonym
                    || statement_lower.contains("not")
                    || statement_lower.contains("never")
                {
                    contradicting.push(fact.clone());
                } else {
                    supporting.push(fact.clone());
                }
            }
        }

        let is_grounded = !supporting.is_empty() && contradicting.is_empty();
        let confidence = if is_grounded {
            supporting.iter().map(|f| f.confidence).sum::<f32>() / supporting.len() as f32
        } else if !contradicting.is_empty() {
            0.0
        } else {
            0.5 // Unknown
        };

        HallucinationResult {
            statement: statement.to_string(),
            is_grounded,
            confidence,
            supporting_facts: supporting,
            contradicting_facts: contradicting,
        }
    }

    /// Answer a question using commonsense reasoning
    pub fn answer_question(&self, question: &str) -> QuestionAnswer {
        let concepts = self.extract_concepts(question);
        let question_type = self.classify_question(question);

        let (answer, facts, confidence) = match question_type {
            QuestionType::Definition => self.answer_definition(&concepts),
            QuestionType::Capability => self.answer_capability(&concepts),
            QuestionType::Location => self.answer_location(&concepts),
            QuestionType::Purpose => self.answer_purpose(&concepts),
            QuestionType::Cause => self.answer_cause(&concepts),
            QuestionType::Comparison => self.answer_comparison(&concepts),
            QuestionType::YesNo => self.answer_yes_no(question, &concepts),
            QuestionType::Other => self.answer_generic(&concepts),
        };

        QuestionAnswer {
            question: question.to_string(),
            answer,
            supporting_facts: facts,
            confidence,
            question_type,
        }
    }

    /// Get commonsense suggestions for a topic
    pub fn get_suggestions(&self, topic: &str) -> Vec<Suggestion> {
        let uri = self.concept_uri(topic);
        let mut suggestions = Vec::new();

        // Get related concepts
        for edge in self.graph.get_node_edges(&uri) {
            let other = if edge.source_id == uri {
                &edge.target_id
            } else {
                &edge.source_id
            };

            let label = self.get_label(other);
            let suggestion_type = match edge.relation {
                RelationType::IsA => SuggestionType::Category,
                RelationType::UsedFor => SuggestionType::Usage,
                RelationType::AtLocation => SuggestionType::Location,
                RelationType::RelatedTo => SuggestionType::Related,
                RelationType::SimilarTo => SuggestionType::Similar,
                _ => SuggestionType::Other,
            };

            suggestions.push(Suggestion {
                text: label,
                suggestion_type,
                relevance: edge.confidence as f32,
            });
        }

        suggestions.sort_by(|a, b| b.relevance.partial_cmp(&a.relevance).unwrap());
        suggestions.truncate(10);
        suggestions
    }

    // Private methods

    fn extract_concepts(&self, text: &str) -> Vec<String> {
        let lowercase_text = text.to_lowercase();
        let words: Vec<&str> = lowercase_text
            .split(|c: char| !c.is_alphanumeric() && c != '_')
            .filter(|w| w.len() > 2)
            .collect();

        let stop_words = [
            "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
            "have", "has", "had", "do", "does", "did", "will", "would", "could",
            "should", "may", "might", "must", "can", "what", "where", "when",
            "why", "how", "which", "who", "whom", "this", "that", "these",
            "those", "am", "for", "and", "nor", "but", "or", "yet", "so",
        ];

        words
            .into_iter()
            .filter(|w| !stop_words.contains(w))
            .map(|w| self.concept_uri(w))
            .filter(|uri| self.graph.get_node(uri).is_some())
            .collect()
    }

    fn retrieve_facts(&self, concepts: &[String]) -> Vec<CommonsenseFact> {
        let mut facts = Vec::new();

        for concept in concepts {
            for edge in self.graph.get_node_edges(concept) {
                if edge.confidence < self.config.min_relevance as f64 {
                    continue;
                }

                let fact = CommonsenseFact {
                    subject: edge.source_id.clone(),
                    relation: edge.relation,
                    object: edge.target_id.clone(),
                    confidence: edge.confidence as f32,
                    natural_language: String::new(), // Will be computed on demand
                };

                facts.push(fact);
            }
        }

        // Sort by confidence and deduplicate
        facts.sort_by(|a, b| b.confidence.partial_cmp(&a.confidence).unwrap());
        facts.truncate(self.config.max_facts);
        facts
    }

    fn generate_reasoning_chains(&self, concepts: &[String]) -> Vec<String> {
        let mut chains = Vec::new();

        if concepts.len() < 2 {
            return chains;
        }

        // Find paths between concept pairs
        for i in 0..concepts.len() {
            for j in (i + 1)..concepts.len() {
                if let Some(path) = self.graph.shortest_path(
                    &concepts[i],
                    &concepts[j],
                    self.config.max_reasoning_depth,
                ) {
                    let chain = path
                        .iter()
                        .map(|uri| self.get_label(uri))
                        .collect::<Vec<_>>()
                        .join(" → ");
                    chains.push(chain);
                }
            }
        }

        chains.truncate(5);
        chains
    }

    fn format_context(&self, facts: &[CommonsenseFact], chains: &[String]) -> String {
        let mut parts = Vec::new();

        if !facts.is_empty() {
            let fact_strs: Vec<String> = facts
                .iter()
                .take(self.config.max_facts)
                .map(|f| format!("- {}", f.to_natural_language()))
                .collect();
            parts.push(format!("Facts:\n{}", fact_strs.join("\n")));
        }

        if !chains.is_empty() {
            parts.push(format!("Connections:\n{}", chains.join("\n")));
        }

        parts.join("\n\n")
    }

    fn classify_question(&self, question: &str) -> QuestionType {
        let lower = question.to_lowercase();

        if lower.starts_with("what is") || lower.contains("define") {
            QuestionType::Definition
        } else if lower.contains("can ") && lower.contains(" do") {
            QuestionType::Capability
        } else if lower.starts_with("where") {
            QuestionType::Location
        } else if lower.contains("used for") || lower.contains("purpose") {
            QuestionType::Purpose
        } else if lower.starts_with("why") || lower.contains("cause") {
            QuestionType::Cause
        } else if lower.contains("difference") || lower.contains("compare") || lower.contains("vs") {
            QuestionType::Comparison
        } else if lower.starts_with("is ") || lower.starts_with("are ") || lower.starts_with("do ") {
            QuestionType::YesNo
        } else {
            QuestionType::Other
        }
    }

    fn answer_definition(&self, concepts: &[String]) -> (String, Vec<CommonsenseFact>, f32) {
        if concepts.is_empty() {
            return ("I don't have information about that.".to_string(), vec![], 0.0);
        }

        let concept = &concepts[0];
        let mut facts = Vec::new();

        for edge in self.graph.get_outgoing_edges(concept) {
            if edge.relation == RelationType::IsA {
                facts.push(CommonsenseFact {
                    subject: edge.source_id.clone(),
                    relation: edge.relation,
                    object: edge.target_id.clone(),
                    confidence: edge.confidence as f32,
                    natural_language: String::new(),
                });
            }
        }

        if facts.is_empty() {
            return (format!("I don't have a definition for {}.", self.get_label(concept)), vec![], 0.3);
        }

        let types: Vec<String> = facts.iter().map(|f| self.get_label(&f.object)).collect();
        let answer = format!("{} is a {}.", self.get_label(concept), types.join(", "));
        let confidence = facts.iter().map(|f| f.confidence).sum::<f32>() / facts.len() as f32;

        (answer, facts, confidence)
    }

    fn answer_capability(&self, concepts: &[String]) -> (String, Vec<CommonsenseFact>, f32) {
        if concepts.is_empty() {
            return ("I need to know what you're asking about.".to_string(), vec![], 0.0);
        }

        let concept = &concepts[0];
        let mut facts = Vec::new();

        for edge in self.graph.get_outgoing_edges(concept) {
            if edge.relation == RelationType::CapableOf {
                facts.push(CommonsenseFact {
                    subject: edge.source_id.clone(),
                    relation: edge.relation,
                    object: edge.target_id.clone(),
                    confidence: edge.confidence as f32,
                    natural_language: String::new(),
                });
            }
        }

        if facts.is_empty() {
            return (format!("I don't know what {} can do.", self.get_label(concept)), vec![], 0.3);
        }

        let capabilities: Vec<String> = facts.iter().map(|f| self.get_label(&f.object)).collect();
        let answer = format!("{} can {}.", self.get_label(concept), capabilities.join(", "));
        let confidence = facts.iter().map(|f| f.confidence).sum::<f32>() / facts.len() as f32;

        (answer, facts, confidence)
    }

    fn answer_location(&self, concepts: &[String]) -> (String, Vec<CommonsenseFact>, f32) {
        if concepts.is_empty() {
            return ("I need to know what you're looking for.".to_string(), vec![], 0.0);
        }

        let concept = &concepts[0];
        let mut facts = Vec::new();

        for edge in self.graph.get_outgoing_edges(concept) {
            if edge.relation == RelationType::AtLocation {
                facts.push(CommonsenseFact {
                    subject: edge.source_id.clone(),
                    relation: edge.relation,
                    object: edge.target_id.clone(),
                    confidence: edge.confidence as f32,
                    natural_language: String::new(),
                });
            }
        }

        if facts.is_empty() {
            return (format!("I don't know where {} is found.", self.get_label(concept)), vec![], 0.3);
        }

        let locations: Vec<String> = facts.iter().map(|f| self.get_label(&f.object)).collect();
        let answer = format!("{} can be found at {}.", self.get_label(concept), locations.join(", "));
        let confidence = facts.iter().map(|f| f.confidence).sum::<f32>() / facts.len() as f32;

        (answer, facts, confidence)
    }

    fn answer_purpose(&self, concepts: &[String]) -> (String, Vec<CommonsenseFact>, f32) {
        if concepts.is_empty() {
            return ("I need more context.".to_string(), vec![], 0.0);
        }

        let concept = &concepts[0];
        let mut facts = Vec::new();

        for edge in self.graph.get_outgoing_edges(concept) {
            if edge.relation == RelationType::UsedFor {
                facts.push(CommonsenseFact {
                    subject: edge.source_id.clone(),
                    relation: edge.relation,
                    object: edge.target_id.clone(),
                    confidence: edge.confidence as f32,
                    natural_language: String::new(),
                });
            }
        }

        if facts.is_empty() {
            return (format!("I don't know what {} is used for.", self.get_label(concept)), vec![], 0.3);
        }

        let uses: Vec<String> = facts.iter().map(|f| self.get_label(&f.object)).collect();
        let answer = format!("{} is used for {}.", self.get_label(concept), uses.join(", "));
        let confidence = facts.iter().map(|f| f.confidence).sum::<f32>() / facts.len() as f32;

        (answer, facts, confidence)
    }

    fn answer_cause(&self, concepts: &[String]) -> (String, Vec<CommonsenseFact>, f32) {
        if concepts.is_empty() {
            return ("I need to know what effect you're asking about.".to_string(), vec![], 0.0);
        }

        let concept = &concepts[0];
        let mut facts = Vec::new();

        // Check incoming Causes edges
        for edge in self.graph.get_incoming_edges(concept) {
            if edge.relation == RelationType::Causes {
                facts.push(CommonsenseFact {
                    subject: edge.source_id.clone(),
                    relation: edge.relation,
                    object: edge.target_id.clone(),
                    confidence: edge.confidence as f32,
                    natural_language: String::new(),
                });
            }
        }

        if facts.is_empty() {
            return (format!("I don't know what causes {}.", self.get_label(concept)), vec![], 0.3);
        }

        let causes: Vec<String> = facts.iter().map(|f| self.get_label(&f.subject)).collect();
        let answer = format!("{} can be caused by {}.", self.get_label(concept), causes.join(", "));
        let confidence = facts.iter().map(|f| f.confidence).sum::<f32>() / facts.len() as f32;

        (answer, facts, confidence)
    }

    fn answer_comparison(&self, concepts: &[String]) -> (String, Vec<CommonsenseFact>, f32) {
        if concepts.len() < 2 {
            return ("I need two things to compare.".to_string(), vec![], 0.0);
        }

        let similarities = self.find_common_properties(&concepts[0], &concepts[1]);
        let differences = self.find_differences(&concepts[0], &concepts[1]);

        let mut answer = format!(
            "Comparing {} and {}:\n",
            self.get_label(&concepts[0]),
            self.get_label(&concepts[1])
        );

        if !similarities.is_empty() {
            answer.push_str(&format!("Both: {}\n", similarities.join(", ")));
        }
        if !differences.is_empty() {
            answer.push_str(&format!("Differences: {}", differences.join(", ")));
        }

        (answer, vec![], 0.7)
    }

    fn answer_yes_no(&self, question: &str, concepts: &[String]) -> (String, Vec<CommonsenseFact>, f32) {
        let grounding = self.check_grounding(question);

        if grounding.is_grounded {
            (format!("Yes, based on: {}",
                grounding.supporting_facts.iter()
                    .map(|f| f.to_natural_language())
                    .collect::<Vec<_>>()
                    .join("; ")),
             grounding.supporting_facts,
             grounding.confidence)
        } else if !grounding.contradicting_facts.is_empty() {
            (format!("No, because: {}",
                grounding.contradicting_facts.iter()
                    .map(|f| f.to_natural_language())
                    .collect::<Vec<_>>()
                    .join("; ")),
             grounding.contradicting_facts,
             1.0 - grounding.confidence)
        } else {
            ("I'm not sure based on my knowledge.".to_string(), vec![], 0.5)
        }
    }

    fn answer_generic(&self, concepts: &[String]) -> (String, Vec<CommonsenseFact>, f32) {
        let facts = self.retrieve_facts(concepts);
        if facts.is_empty() {
            return ("I don't have specific information about that.".to_string(), vec![], 0.3);
        }

        let fact_texts: Vec<String> = facts.iter().map(|f| f.to_natural_language()).collect();
        let answer = format!("Here's what I know: {}", fact_texts.join(". "));
        let confidence = facts.iter().map(|f| f.confidence).sum::<f32>() / facts.len() as f32;

        (answer, facts, confidence)
    }

    fn find_common_properties(&self, concept1: &str, concept2: &str) -> Vec<String> {
        let props1: std::collections::HashSet<_> = self.graph.get_outgoing_edges(concept1)
            .iter()
            .filter(|e| e.relation == RelationType::IsA || e.relation == RelationType::HasProperty)
            .map(|e| e.target_id.clone())
            .collect();

        let props2: std::collections::HashSet<_> = self.graph.get_outgoing_edges(concept2)
            .iter()
            .filter(|e| e.relation == RelationType::IsA || e.relation == RelationType::HasProperty)
            .map(|e| e.target_id.clone())
            .collect();

        props1.intersection(&props2)
            .map(|uri| self.get_label(uri))
            .collect()
    }

    fn find_differences(&self, concept1: &str, concept2: &str) -> Vec<String> {
        let mut differences = Vec::new();

        let props1: std::collections::HashSet<_> = self.graph.get_outgoing_edges(concept1)
            .iter()
            .map(|e| (e.relation, e.target_id.clone()))
            .collect();

        let props2: std::collections::HashSet<_> = self.graph.get_outgoing_edges(concept2)
            .iter()
            .map(|e| (e.relation, e.target_id.clone()))
            .collect();

        for (rel, target) in props1.difference(&props2).take(5) {
            differences.push(format!("{} {} {}",
                self.get_label(concept1),
                format!("{:?}", rel).to_lowercase(),
                self.get_label(target)));
        }

        differences
    }

    fn concept_uri(&self, term: &str) -> String {
        if term.starts_with("/c/") {
            term.to_string()
        } else {
            format!("/c/en/{}", term.replace(' ', "_").to_lowercase())
        }
    }

    fn get_label(&self, uri: &str) -> String {
        self.graph
            .get_node(uri)
            .map(|n| n.label.clone())
            .unwrap_or_else(|| {
                uri.split('/').last().unwrap_or(uri).replace('_', " ")
            })
    }
}

/// Answer to a question
#[derive(Debug, Clone)]
pub struct QuestionAnswer {
    pub question: String,
    pub answer: String,
    pub supporting_facts: Vec<CommonsenseFact>,
    pub confidence: f32,
    pub question_type: QuestionType,
}

/// Type of question
#[derive(Debug, Clone, Copy)]
pub enum QuestionType {
    Definition,
    Capability,
    Location,
    Purpose,
    Cause,
    Comparison,
    YesNo,
    Other,
}

/// A suggestion based on commonsense
#[derive(Debug, Clone)]
pub struct Suggestion {
    pub text: String,
    pub suggestion_type: SuggestionType,
    pub relevance: f32,
}

/// Type of suggestion
#[derive(Debug, Clone, Copy)]
pub enum SuggestionType {
    Category,
    Usage,
    Location,
    Related,
    Similar,
    Other,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fact_natural_language() {
        let fact = CommonsenseFact {
            subject: "/c/en/dog".to_string(),
            relation: RelationType::IsA,
            object: "/c/en/animal".to_string(),
            confidence: 0.9,
            natural_language: String::new(),
        };

        assert_eq!(fact.to_natural_language(), "dog is a type of animal");
    }
}
