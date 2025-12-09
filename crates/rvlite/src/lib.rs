use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Import ruvector-core
use ruvector_core::{
    VectorDB, VectorEntry, SearchQuery,
    DistanceMetric,
};
use ruvector_core::types::DbOptions;

#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
    web_sys::console::log_1(&"RvLite v0.1.0 with ruvector-core initialized".into());
}

/// Error type for RvLite
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RvLiteError {
    pub message: String,
    pub kind: ErrorKind,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ErrorKind {
    VectorError,
    SqlError,
    CypherError,
    SparqlError,
    StorageError,
    WasmError,
    NotImplemented,
}

impl From<ruvector_core::RuvectorError> for RvLiteError {
    fn from(e: ruvector_core::RuvectorError) -> Self {
        RvLiteError {
            message: e.to_string(),
            kind: ErrorKind::VectorError,
        }
    }
}

impl From<RvLiteError> for JsValue {
    fn from(e: RvLiteError) -> Self {
        serde_wasm_bindgen::to_value(&e).unwrap_or_else(|_| JsValue::from_str(&e.message))
    }
}

/// Configuration for RvLite database
#[wasm_bindgen]
#[derive(Clone, Serialize, Deserialize)]
pub struct RvLiteConfig {
    /// Vector dimensions
    dimensions: usize,
    /// Distance metric (euclidean, cosine, dotproduct, manhattan)
    distance_metric: String,
}

#[wasm_bindgen]
impl RvLiteConfig {
    #[wasm_bindgen(constructor)]
    pub fn new(dimensions: usize) -> Self {
        RvLiteConfig {
            dimensions,
            distance_metric: "cosine".to_string(),
        }
    }

    /// Set distance metric (euclidean, cosine, dotproduct, manhattan)
    pub fn with_distance_metric(mut self, metric: String) -> Self {
        self.distance_metric = metric;
        self
    }
}

impl RvLiteConfig {
    fn to_db_options(&self) -> DbOptions {
        let metric = match self.distance_metric.to_lowercase().as_str() {
            "euclidean" => DistanceMetric::Euclidean,
            "cosine" => DistanceMetric::Cosine,
            "dotproduct" => DistanceMetric::DotProduct,
            "manhattan" => DistanceMetric::Manhattan,
            _ => DistanceMetric::Cosine,
        };

        DbOptions {
            dimensions: self.dimensions,
            distance_metric: metric,
            storage_path: "memory://".to_string(), // Memory-only for WASM
            hnsw_config: None, // HNSW not available in WASM (uses mmap)
            quantization: None, // Disable quantization for simplicity
        }
    }
}

/// Main RvLite database
#[wasm_bindgen]
pub struct RvLite {
    db: VectorDB,
    config: RvLiteConfig,
}

#[wasm_bindgen]
impl RvLite {
    /// Create a new RvLite database
    #[wasm_bindgen(constructor)]
    pub fn new(config: RvLiteConfig) -> Result<RvLite, JsValue> {
        let db = VectorDB::new(config.to_db_options())
            .map_err(|e| RvLiteError::from(e))?;

        Ok(RvLite {
            db,
            config,
        })
    }

    /// Create with default configuration (384 dimensions, cosine similarity)
    pub fn default() -> Result<RvLite, JsValue> {
        Self::new(RvLiteConfig::new(384))
    }

    /// Check if database is ready
    pub fn is_ready(&self) -> bool {
        true
    }

    /// Get version string
    pub fn get_version(&self) -> String {
        "0.1.0".to_string()
    }

    /// Get enabled features
    pub fn get_features(&self) -> Result<JsValue, JsValue> {
        let features = vec![
            "core",
            "vectors",
            "search",
            "memory-storage",
        ];
        serde_wasm_bindgen::to_value(&features).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Insert a vector with optional metadata
    /// Returns the vector ID
    pub fn insert(&self, vector: Vec<f32>, metadata: Option<JsValue>) -> Result<String, JsValue> {
        let metadata_map = if let Some(meta) = metadata {
            Some(serde_wasm_bindgen::from_value::<HashMap<String, serde_json::Value>>(meta)
                .map_err(|e| RvLiteError {
                    message: format!("Invalid metadata: {}", e),
                    kind: ErrorKind::WasmError,
                })?)
        } else {
            None
        };

        let entry = VectorEntry {
            id: None,
            vector,
            metadata: metadata_map,
        };

        self.db.insert(entry)
            .map_err(|e| RvLiteError::from(e).into())
    }

    /// Insert a vector with a specific ID
    pub fn insert_with_id(&self, id: String, vector: Vec<f32>, metadata: Option<JsValue>) -> Result<(), JsValue> {
        let metadata_map = if let Some(meta) = metadata {
            Some(serde_wasm_bindgen::from_value::<HashMap<String, serde_json::Value>>(meta)
                .map_err(|e| RvLiteError {
                    message: format!("Invalid metadata: {}", e),
                    kind: ErrorKind::WasmError,
                })?)
        } else {
            None
        };

        let entry = VectorEntry {
            id: Some(id),
            vector,
            metadata: metadata_map,
        };

        self.db.insert(entry)
            .map_err(|e| RvLiteError::from(e))?;

        Ok(())
    }

    /// Search for similar vectors
    /// Returns a JavaScript array of search results
    pub fn search(&self, query_vector: Vec<f32>, k: usize) -> Result<JsValue, JsValue> {
        let query = SearchQuery {
            vector: query_vector,
            k,
            filter: None,
            ef_search: None,
        };

        let results = self.db.search(query)
            .map_err(|e| RvLiteError::from(e))?;

        serde_wasm_bindgen::to_value(&results)
            .map_err(|e| RvLiteError {
                message: format!("Failed to serialize results: {}", e),
                kind: ErrorKind::WasmError,
            }.into())
    }

    /// Search with metadata filter
    pub fn search_with_filter(
        &self,
        query_vector: Vec<f32>,
        k: usize,
        filter: JsValue,
    ) -> Result<JsValue, JsValue> {
        let filter_map = serde_wasm_bindgen::from_value::<HashMap<String, serde_json::Value>>(filter)
            .map_err(|e| RvLiteError {
                message: format!("Invalid filter: {}", e),
                kind: ErrorKind::WasmError,
            })?;

        let query = SearchQuery {
            vector: query_vector,
            k,
            filter: Some(filter_map),
            ef_search: None,
        };

        let results = self.db.search(query)
            .map_err(|e| RvLiteError::from(e))?;

        serde_wasm_bindgen::to_value(&results)
            .map_err(|e| RvLiteError {
                message: format!("Failed to serialize results: {}", e),
                kind: ErrorKind::WasmError,
            }.into())
    }

    /// Get a vector by ID
    pub fn get(&self, id: String) -> Result<JsValue, JsValue> {
        let entry = self.db.get(&id)
            .map_err(|e| RvLiteError::from(e))?;

        serde_wasm_bindgen::to_value(&entry)
            .map_err(|e| RvLiteError {
                message: format!("Failed to serialize entry: {}", e),
                kind: ErrorKind::WasmError,
            }.into())
    }

    /// Delete a vector by ID
    pub fn delete(&self, id: String) -> Result<bool, JsValue> {
        self.db.delete(&id)
            .map_err(|e| RvLiteError::from(e).into())
    }

    /// Get the number of vectors in the database
    pub fn len(&self) -> Result<usize, JsValue> {
        self.db.len()
            .map_err(|e| RvLiteError::from(e).into())
    }

    /// Check if database is empty
    pub fn is_empty(&self) -> Result<bool, JsValue> {
        self.db.is_empty()
            .map_err(|e| RvLiteError::from(e).into())
    }

    /// Get configuration
    pub fn get_config(&self) -> Result<JsValue, JsValue> {
        serde_wasm_bindgen::to_value(&self.config)
            .map_err(|e| RvLiteError {
                message: format!("Failed to serialize config: {}", e),
                kind: ErrorKind::WasmError,
            }.into())
    }

    // ===== Query Language Methods (Not Yet Implemented) =====

    /// Execute SQL query (not yet implemented)
    pub async fn sql(&self, _query: String) -> Result<JsValue, JsValue> {
        Err(RvLiteError {
            message: "SQL not yet implemented - coming in Phase 3".to_string(),
            kind: ErrorKind::NotImplemented,
        }.into())
    }

    /// Execute Cypher query (not yet implemented)
    pub async fn cypher(&self, _query: String) -> Result<JsValue, JsValue> {
        Err(RvLiteError {
            message: "Cypher not yet implemented - integrate ruvector-graph-wasm in Phase 2".to_string(),
            kind: ErrorKind::NotImplemented,
        }.into())
    }

    /// Execute SPARQL query (not yet implemented)
    pub async fn sparql(&self, _query: String) -> Result<JsValue, JsValue> {
        Err(RvLiteError {
            message: "SPARQL not yet implemented - extract from ruvector-postgres in Phase 3".to_string(),
            kind: ErrorKind::NotImplemented,
        }.into())
    }
}
