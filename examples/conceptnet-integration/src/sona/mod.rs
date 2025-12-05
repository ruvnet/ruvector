//! SONA Integration for Commonsense Learning
//!
//! Self-Optimizing Neural Architecture for learning from ConceptNet patterns.
//!
//! ## Features
//! - Pattern extraction from knowledge graph queries
//! - Trajectory learning from reasoning chains
//! - ReasoningBank for strategy optimization
//! - Continual learning without catastrophic forgetting
//! - Export learned patterns for transfer

use crate::api::RelationType;
use crate::gnn::{InferenceChain, ReasoningResult};
use std::collections::{HashMap, VecDeque};

/// Configuration for SONA commonsense learning
#[derive(Debug, Clone)]
pub struct CommonsenseSonaConfig {
    /// Hidden dimension for LoRA layers
    pub hidden_dim: usize,
    /// Embedding dimension
    pub embedding_dim: usize,
    /// MicroLoRA rank for instant learning
    pub micro_lora_rank: usize,
    /// BaseLoRA rank for background learning
    pub base_lora_rank: usize,
    /// EWC regularization strength
    pub ewc_lambda: f32,
    /// Pattern similarity threshold
    pub pattern_threshold: f32,
    /// Maximum patterns in ReasoningBank
    pub max_patterns: usize,
    /// Trajectory buffer size
    pub trajectory_buffer_size: usize,
}

impl Default for CommonsenseSonaConfig {
    fn default() -> Self {
        Self {
            hidden_dim: 256,
            embedding_dim: 300, // Numberbatch dimension
            micro_lora_rank: 2,
            base_lora_rank: 8,
            ewc_lambda: 0.4,
            pattern_threshold: 0.7,
            max_patterns: 10000,
            trajectory_buffer_size: 1000,
        }
    }
}

/// A commonsense reasoning pattern
#[derive(Debug, Clone)]
pub struct CommonsensePattern {
    pub id: String,
    pub pattern_type: PatternType,
    pub relations: Vec<RelationType>,
    pub embedding: Vec<f32>,
    pub success_rate: f32,
    pub usage_count: usize,
    pub examples: Vec<PatternExample>,
}

/// Type of commonsense pattern
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum PatternType {
    /// A → IsA → B → IsA → C (taxonomic chain)
    TaxonomicChain,
    /// A → Causes → B → Causes → C (causal chain)
    CausalChain,
    /// A → HasPrerequisite → B (prerequisite)
    Prerequisite,
    /// A → UsedFor → B (purpose)
    Purpose,
    /// A → AtLocation → B (spatial)
    Spatial,
    /// A → HasProperty → B (property)
    Property,
    /// A ← IsA ← B, A ← IsA ← C → common B,C (common ancestor)
    CommonAncestor,
    /// Mixed relation types
    Mixed,
}

/// An example of a pattern
#[derive(Debug, Clone)]
pub struct PatternExample {
    pub concepts: Vec<String>,
    pub confidence: f32,
    pub timestamp: u64,
}

/// A reasoning trajectory for learning
#[derive(Debug, Clone)]
pub struct ReasoningTrajectory {
    pub id: String,
    pub query: String,
    pub steps: Vec<TrajectoryStep>,
    pub final_score: f32,
    pub timestamp: u64,
}

/// A step in a reasoning trajectory
#[derive(Debug, Clone)]
pub struct TrajectoryStep {
    pub concept: String,
    pub embedding: Vec<f32>,
    pub relation: RelationType,
    pub score: f32,
}

/// ReasoningBank for storing learned strategies
pub struct CommonsenseReasoningBank {
    patterns: HashMap<String, CommonsensePattern>,
    pattern_embeddings: Vec<(String, Vec<f32>)>,
    relation_statistics: HashMap<RelationType, RelationStats>,
}

/// Statistics for a relation type
#[derive(Debug, Clone, Default)]
pub struct RelationStats {
    pub total_uses: usize,
    pub successful_uses: usize,
    pub avg_confidence: f32,
    pub common_sources: Vec<String>,
    pub common_targets: Vec<String>,
}

impl CommonsenseReasoningBank {
    pub fn new() -> Self {
        Self {
            patterns: HashMap::new(),
            pattern_embeddings: Vec::new(),
            relation_statistics: HashMap::new(),
        }
    }

    /// Add a new pattern
    pub fn add_pattern(&mut self, pattern: CommonsensePattern) {
        self.pattern_embeddings
            .push((pattern.id.clone(), pattern.embedding.clone()));
        self.patterns.insert(pattern.id.clone(), pattern);
    }

    /// Find similar patterns
    pub fn find_similar(&self, embedding: &[f32], k: usize) -> Vec<&CommonsensePattern> {
        let mut similarities: Vec<(&String, f32)> = self
            .pattern_embeddings
            .iter()
            .map(|(id, emb)| (id, Self::cosine_similarity(embedding, emb)))
            .collect();

        similarities.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

        similarities
            .into_iter()
            .take(k)
            .filter_map(|(id, _)| self.patterns.get(id))
            .collect()
    }

    /// Get pattern by ID
    pub fn get(&self, id: &str) -> Option<&CommonsensePattern> {
        self.patterns.get(id)
    }

    /// Update pattern success rate
    pub fn update_success(&mut self, id: &str, success: bool) {
        if let Some(pattern) = self.patterns.get_mut(id) {
            pattern.usage_count += 1;
            let weight = 1.0 / pattern.usage_count as f32;
            pattern.success_rate = pattern.success_rate * (1.0 - weight)
                + (if success { 1.0 } else { 0.0 }) * weight;
        }
    }

    /// Update relation statistics
    pub fn update_relation_stats(
        &mut self,
        relation: RelationType,
        success: bool,
        confidence: f32,
        source: &str,
        target: &str,
    ) {
        let stats = self.relation_statistics.entry(relation).or_default();
        stats.total_uses += 1;
        if success {
            stats.successful_uses += 1;
        }
        stats.avg_confidence = (stats.avg_confidence * (stats.total_uses - 1) as f32 + confidence)
            / stats.total_uses as f32;

        // Track common sources/targets
        if !stats.common_sources.contains(&source.to_string()) && stats.common_sources.len() < 100 {
            stats.common_sources.push(source.to_string());
        }
        if !stats.common_targets.contains(&target.to_string()) && stats.common_targets.len() < 100 {
            stats.common_targets.push(target.to_string());
        }
    }

    /// Get relation statistics
    pub fn get_relation_stats(&self, relation: &RelationType) -> Option<&RelationStats> {
        self.relation_statistics.get(relation)
    }

    /// Get best patterns for a pattern type
    pub fn best_patterns(&self, pattern_type: PatternType, k: usize) -> Vec<&CommonsensePattern> {
        let mut patterns: Vec<_> = self
            .patterns
            .values()
            .filter(|p| p.pattern_type == pattern_type)
            .collect();

        patterns.sort_by(|a, b| {
            let score_a = a.success_rate * (a.usage_count as f32).ln().max(1.0);
            let score_b = b.success_rate * (b.usage_count as f32).ln().max(1.0);
            score_b.partial_cmp(&score_a).unwrap()
        });

        patterns.into_iter().take(k).collect()
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
}

impl Default for CommonsenseReasoningBank {
    fn default() -> Self {
        Self::new()
    }
}

/// SONA engine for commonsense learning
pub struct CommonsenseSona {
    config: CommonsenseSonaConfig,
    reasoning_bank: CommonsenseReasoningBank,
    trajectory_buffer: VecDeque<ReasoningTrajectory>,
    micro_lora: LoRALayer,
    base_lora: LoRALayer,
    ewc_fisher: HashMap<String, Vec<f32>>,
}

impl CommonsenseSona {
    /// Create a new SONA engine
    pub fn new(config: CommonsenseSonaConfig) -> Self {
        Self {
            micro_lora: LoRALayer::new(config.embedding_dim, config.hidden_dim, config.micro_lora_rank),
            base_lora: LoRALayer::new(config.embedding_dim, config.hidden_dim, config.base_lora_rank),
            reasoning_bank: CommonsenseReasoningBank::new(),
            trajectory_buffer: VecDeque::with_capacity(config.trajectory_buffer_size),
            ewc_fisher: HashMap::new(),
            config,
        }
    }

    /// Begin a new reasoning trajectory
    pub fn begin_trajectory(&self, query: &str) -> TrajectoryBuilder {
        TrajectoryBuilder::new(query)
    }

    /// End a trajectory and learn from it
    pub fn end_trajectory(&mut self, trajectory: ReasoningTrajectory) {
        // Add to buffer
        if self.trajectory_buffer.len() >= self.config.trajectory_buffer_size {
            self.trajectory_buffer.pop_front();
        }
        self.trajectory_buffer.push_back(trajectory.clone());

        // Extract pattern from trajectory
        if let Some(pattern) = self.extract_pattern(&trajectory) {
            self.reasoning_bank.add_pattern(pattern);
        }

        // Update relation statistics
        for step in &trajectory.steps {
            self.reasoning_bank.update_relation_stats(
                step.relation,
                trajectory.final_score > 0.5,
                step.score,
                &step.concept,
                &step.concept, // Simplified
            );
        }

        // Instant learning with MicroLoRA
        self.instant_learn(&trajectory);
    }

    /// Learn from a reasoning result
    pub fn learn_from_result(&mut self, result: &ReasoningResult) {
        // Convert to trajectory
        for chain in &result.inference_chains {
            let trajectory = self.chain_to_trajectory(chain, &result.query.subject);
            self.end_trajectory(trajectory);
        }
    }

    /// Apply learned transformations to embedding
    pub fn transform(&self, embedding: &[f32]) -> Vec<f32> {
        let mut result = embedding.to_vec();

        // Apply MicroLoRA
        let micro_output = self.micro_lora.forward(embedding);
        for (i, val) in micro_output.iter().enumerate() {
            if i < result.len() {
                result[i] += val;
            }
        }

        // Apply BaseLoRA
        let base_output = self.base_lora.forward(&result);
        for (i, val) in base_output.iter().enumerate() {
            if i < result.len() {
                result[i] += val;
            }
        }

        result
    }

    /// Get reasoning suggestions for a query
    pub fn suggest_strategy(&self, query_embedding: &[f32]) -> Vec<&CommonsensePattern> {
        self.reasoning_bank.find_similar(query_embedding, 5)
    }

    /// Run background learning loop
    pub fn background_learn(&mut self) {
        if self.trajectory_buffer.len() < 10 {
            return;
        }

        // Aggregate trajectories into patterns
        let patterns = self.aggregate_patterns();

        // Update BaseLoRA
        for pattern in &patterns {
            self.base_lora.update(&pattern.embedding, pattern.success_rate);
        }

        // Update EWC Fisher information
        self.update_fisher();
    }

    /// Export learned patterns
    pub fn export_patterns(&self) -> Vec<CommonsensePattern> {
        self.reasoning_bank.patterns.values().cloned().collect()
    }

    /// Import patterns from another SONA instance
    pub fn import_patterns(&mut self, patterns: Vec<CommonsensePattern>) {
        for pattern in patterns {
            self.reasoning_bank.add_pattern(pattern);
        }
    }

    // Private methods

    fn extract_pattern(&self, trajectory: &ReasoningTrajectory) -> Option<CommonsensePattern> {
        if trajectory.steps.is_empty() {
            return None;
        }

        let relations: Vec<RelationType> = trajectory.steps.iter().map(|s| s.relation).collect();
        let pattern_type = Self::infer_pattern_type(&relations);

        // Compute pattern embedding as centroid
        let embedding = self.compute_centroid(&trajectory.steps);

        Some(CommonsensePattern {
            id: uuid::Uuid::new_v4().to_string(),
            pattern_type,
            relations,
            embedding,
            success_rate: trajectory.final_score,
            usage_count: 1,
            examples: vec![PatternExample {
                concepts: trajectory.steps.iter().map(|s| s.concept.clone()).collect(),
                confidence: trajectory.final_score,
                timestamp: trajectory.timestamp,
            }],
        })
    }

    fn infer_pattern_type(relations: &[RelationType]) -> PatternType {
        if relations.is_empty() {
            return PatternType::Mixed;
        }

        // Check for pure chains
        if relations.iter().all(|r| *r == RelationType::IsA) {
            return PatternType::TaxonomicChain;
        }
        if relations.iter().all(|r| *r == RelationType::Causes) {
            return PatternType::CausalChain;
        }
        if relations.iter().all(|r| *r == RelationType::HasPrerequisite) {
            return PatternType::Prerequisite;
        }
        if relations.iter().all(|r| *r == RelationType::UsedFor) {
            return PatternType::Purpose;
        }
        if relations.iter().all(|r| *r == RelationType::AtLocation || *r == RelationType::LocatedNear) {
            return PatternType::Spatial;
        }
        if relations.iter().all(|r| *r == RelationType::HasProperty || *r == RelationType::HasA) {
            return PatternType::Property;
        }

        PatternType::Mixed
    }

    fn compute_centroid(&self, steps: &[TrajectoryStep]) -> Vec<f32> {
        if steps.is_empty() {
            return vec![0.0; self.config.embedding_dim];
        }

        let mut centroid = vec![0.0; self.config.embedding_dim];
        for step in steps {
            for (i, val) in step.embedding.iter().enumerate() {
                if i < centroid.len() {
                    centroid[i] += val;
                }
            }
        }

        let n = steps.len() as f32;
        for val in &mut centroid {
            *val /= n;
        }

        centroid
    }

    fn instant_learn(&mut self, trajectory: &ReasoningTrajectory) {
        // Update MicroLoRA with trajectory
        for step in &trajectory.steps {
            self.micro_lora.update(&step.embedding, step.score);
        }
    }

    fn aggregate_patterns(&self) -> Vec<CommonsensePattern> {
        // Simple aggregation: find frequently occurring relation sequences
        let mut patterns = Vec::new();

        // Group trajectories by pattern type
        let mut by_type: HashMap<PatternType, Vec<&ReasoningTrajectory>> = HashMap::new();
        for traj in &self.trajectory_buffer {
            let relations: Vec<RelationType> = traj.steps.iter().map(|s| s.relation).collect();
            let ptype = Self::infer_pattern_type(&relations);
            by_type.entry(ptype).or_default().push(traj);
        }

        // Create aggregated patterns
        for (ptype, trajectories) in by_type {
            if trajectories.len() < 3 {
                continue;
            }

            let avg_score = trajectories.iter().map(|t| t.final_score).sum::<f32>()
                / trajectories.len() as f32;

            let mut embedding = vec![0.0; self.config.embedding_dim];
            for traj in &trajectories {
                let traj_emb = self.compute_centroid(&traj.steps);
                for (i, val) in traj_emb.iter().enumerate() {
                    if i < embedding.len() {
                        embedding[i] += val;
                    }
                }
            }
            for val in &mut embedding {
                *val /= trajectories.len() as f32;
            }

            patterns.push(CommonsensePattern {
                id: uuid::Uuid::new_v4().to_string(),
                pattern_type: ptype,
                relations: trajectories[0].steps.iter().map(|s| s.relation).collect(),
                embedding,
                success_rate: avg_score,
                usage_count: trajectories.len(),
                examples: vec![],
            });
        }

        patterns
    }

    fn update_fisher(&mut self) {
        // Simplified Fisher information update for EWC
        // In practice, this would compute gradients of log-likelihood
        for pattern in self.reasoning_bank.patterns.values() {
            let fisher: Vec<f32> = pattern
                .embedding
                .iter()
                .map(|e| e * e * pattern.success_rate)
                .collect();
            self.ewc_fisher.insert(pattern.id.clone(), fisher);
        }
    }

    fn chain_to_trajectory(&self, chain: &InferenceChain, subject: &str) -> ReasoningTrajectory {
        let steps: Vec<TrajectoryStep> = chain
            .steps
            .iter()
            .map(|step| TrajectoryStep {
                concept: step.to_concept.clone(),
                embedding: vec![0.0; self.config.embedding_dim], // Would need actual embeddings
                relation: step.relation,
                score: step.confidence,
            })
            .collect();

        ReasoningTrajectory {
            id: uuid::Uuid::new_v4().to_string(),
            query: subject.to_string(),
            steps,
            final_score: chain.confidence,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        }
    }
}

/// Builder for reasoning trajectories
pub struct TrajectoryBuilder {
    query: String,
    steps: Vec<TrajectoryStep>,
    start_time: u64,
}

impl TrajectoryBuilder {
    pub fn new(query: &str) -> Self {
        Self {
            query: query.to_string(),
            steps: Vec::new(),
            start_time: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        }
    }

    pub fn add_step(
        &mut self,
        concept: &str,
        embedding: Vec<f32>,
        relation: RelationType,
        score: f32,
    ) {
        self.steps.push(TrajectoryStep {
            concept: concept.to_string(),
            embedding,
            relation,
            score,
        });
    }

    pub fn build(self, final_score: f32) -> ReasoningTrajectory {
        ReasoningTrajectory {
            id: uuid::Uuid::new_v4().to_string(),
            query: self.query,
            steps: self.steps,
            final_score,
            timestamp: self.start_time,
        }
    }
}

/// Simple LoRA layer for adaptation
struct LoRALayer {
    a: Vec<f32>, // input_dim x rank
    b: Vec<f32>, // rank x output_dim
    input_dim: usize,
    output_dim: usize,
    rank: usize,
}

impl LoRALayer {
    fn new(input_dim: usize, output_dim: usize, rank: usize) -> Self {
        use rand::Rng;
        let mut rng = rand::thread_rng();
        let scale = (2.0 / (input_dim + rank) as f32).sqrt();

        Self {
            a: (0..input_dim * rank).map(|_| rng.gen_range(-scale..scale)).collect(),
            b: vec![0.0; rank * output_dim], // Initialize B to zero
            input_dim,
            output_dim,
            rank,
        }
    }

    fn forward(&self, input: &[f32]) -> Vec<f32> {
        // Compute A * input
        let mut hidden = vec![0.0; self.rank];
        for r in 0..self.rank {
            for i in 0..self.input_dim.min(input.len()) {
                hidden[r] += input[i] * self.a[r * self.input_dim + i];
            }
        }

        // Compute B * hidden
        let mut output = vec![0.0; self.output_dim];
        for o in 0..self.output_dim {
            for r in 0..self.rank {
                output[o] += hidden[r] * self.b[o * self.rank + r];
            }
        }

        output
    }

    fn update(&mut self, input: &[f32], target_score: f32) {
        // Simplified update: adjust B weights based on input pattern
        let learning_rate = 0.01 * target_score;

        // Compute A * input
        let mut hidden = vec![0.0; self.rank];
        for r in 0..self.rank {
            for i in 0..self.input_dim.min(input.len()) {
                hidden[r] += input[i] * self.a[r * self.input_dim + i];
            }
        }

        // Update B
        for o in 0..self.output_dim {
            for r in 0..self.rank {
                self.b[o * self.rank + r] += learning_rate * hidden[r];
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sona_trajectory() {
        let config = CommonsenseSonaConfig::default();
        let mut sona = CommonsenseSona::new(config);

        let mut builder = sona.begin_trajectory("what is a dog");
        builder.add_step("/c/en/dog", vec![0.1; 300], RelationType::IsA, 0.9);
        builder.add_step("/c/en/animal", vec![0.2; 300], RelationType::IsA, 0.8);

        let trajectory = builder.build(0.85);
        sona.end_trajectory(trajectory);

        assert!(!sona.reasoning_bank.patterns.is_empty());
    }
}
