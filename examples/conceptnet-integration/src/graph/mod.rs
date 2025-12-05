//! ConceptNet Graph Integration with RuVector Graph Database
//!
//! Maps ConceptNet's knowledge graph structure to RuVector's property graph model,
//! enabling hybrid vector-graph queries, Cypher support, and distributed storage.
//!
//! ## Features
//! - Bidirectional mapping: ConceptNet edges ↔ RuVector graph
//! - Hyperedge support for N-ary relations
//! - Incremental loading and sync
//! - Cypher query generation
//! - Vector-graph hybrid queries
//!
//! ## Architecture
//! ```text
//! ConceptNet API → Edges → GraphBuilder → RuVector GraphDB
//!                              ↓
//!                     Vector Embeddings → HNSW Index
//!                              ↓
//!                     Hybrid Query Engine
//! ```

mod builder;
mod query;
mod hybrid;
mod sync;

pub use builder::{ConceptNetGraphBuilder, GraphBuildConfig, GraphBuildError, GraphNode, GraphEdge};
pub use query::{CommonsenseQuery, QueryResult, ReasoningPath};
pub use hybrid::{HybridQueryEngine, HybridQueryConfig};
pub use sync::{GraphSync, SyncConfig, SyncStats};
