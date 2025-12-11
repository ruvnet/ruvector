// SQL query engine module for rvlite
// Provides SQL interface for vector database operations with WASM compatibility

mod ast;
mod parser;
mod executor;

pub use ast::*;
pub use parser::{SqlParser, ParseError};
pub use executor::{SqlEngine, ExecutionResult};

#[cfg(test)]
mod tests;
