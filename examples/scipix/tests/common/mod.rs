// Common test utilities
//
// Provides shared functionality for integration tests

pub mod server;
pub mod images;
pub mod latex;
pub mod metrics;
pub mod types;

// Re-export commonly used types and functions
pub use server::TestServer;
pub use images::{generate_simple_equation, generate_fraction, generate_integral, generate_symbol};
pub use latex::{normalize, expressions_match, calculate_similarity};
pub use metrics::{calculate_cer, calculate_wer, calculate_bleu};
pub use types::{OutputFormat, ProcessingOptions, ProcessingResult, CacheStats};
