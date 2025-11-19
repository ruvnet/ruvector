//! Error types for Ruvector

use thiserror::Error;

/// Result type alias for Ruvector operations
pub type Result<T> = std::result::Result<T, RuvectorError>;

/// Main error type for Ruvector
#[derive(Error, Debug)]
pub enum RuvectorError {
    /// Vector dimension mismatch
    #[error("Dimension mismatch: expected {expected}, got {actual}")]
    DimensionMismatch {
        /// Expected dimension
        expected: usize,
        /// Actual dimension
        actual: usize,
    },

    /// Vector not found
    #[error("Vector not found: {0}")]
    VectorNotFound(String),

    /// Invalid parameter
    #[error("Invalid parameter: {0}")]
    InvalidParameter(String),

    /// Storage error
    #[error("Storage error: {0}")]
    StorageError(String),

    /// Index error
    #[error("Index error: {0}")]
    IndexError(String),

    /// Serialization error
    #[error("Serialization error: {0}")]
    SerializationError(String),

    /// IO error
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    /// Database error
    #[error("Database error: {0}")]
    DatabaseError(String),

    /// Other errors
    #[error("Internal error: {0}")]
    Internal(String),
}

impl From<redb::Error> for RuvectorError {
    fn from(err: redb::Error) -> Self {
        RuvectorError::DatabaseError(err.to_string())
    }
}

impl From<redb::DatabaseError> for RuvectorError {
    fn from(err: redb::DatabaseError) -> Self {
        RuvectorError::DatabaseError(err.to_string())
    }
}

impl From<redb::StorageError> for RuvectorError {
    fn from(err: redb::StorageError) -> Self {
        RuvectorError::DatabaseError(err.to_string())
    }
}

impl From<redb::TableError> for RuvectorError {
    fn from(err: redb::TableError) -> Self {
        RuvectorError::DatabaseError(err.to_string())
    }
}

impl From<redb::TransactionError> for RuvectorError {
    fn from(err: redb::TransactionError) -> Self {
        RuvectorError::DatabaseError(err.to_string())
    }
}

impl From<redb::CommitError> for RuvectorError {
    fn from(err: redb::CommitError) -> Self {
        RuvectorError::DatabaseError(err.to_string())
    }
}
