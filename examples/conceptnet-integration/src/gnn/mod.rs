//! GNN-based Commonsense Reasoning
//!
//! Graph Neural Network layers for learning and reasoning over ConceptNet.
//!
//! ## Features
//! - Knowledge graph embedding learning
//! - Relation-aware message passing
//! - Multi-hop reasoning
//! - Link prediction for missing edges
//! - Commonsense inference
//!
//! ## Architecture
//! ```text
//! ConceptNet Graph
//!       ↓
//! Node Embeddings (Numberbatch or learned)
//!       ↓
//! Relation-Aware GNN Layers
//!       ↓
//! Reasoning Outputs (classification, link prediction, QA)
//! ```

mod layer;
mod reasoning;
mod training;
mod inference;

pub use layer::{
    CommonsenseGNN, GNNConfig, RelationAwareLayer,
    MessagePassingLayer, KnowledgeGraphConv,
};
pub use reasoning::{
    CommonsenseReasoner, ReasoningQuery, ReasoningResult,
    InferenceChain, InferenceStep, ConfidenceScore, QueryType,
};
pub use training::{
    GNNTrainer, TrainingConfig, TrainingMetrics,
    LinkPredictionTask, NodeClassificationTask,
};
pub use inference::{
    CommonsenseInference, InferenceConfig, InferenceResult,
};
