//! SONA (Self-Optimizing Neural Architecture)
//!
//! A lightweight adaptive learning system with ReasoningBank integration.
//!
//! ## Features
//!
//! - **Micro-LoRA**: Ultra-low rank (1-2) LoRA for instant learning
//! - **Base-LoRA**: Standard LoRA for background learning
//! - **EWC++**: Elastic Weight Consolidation to prevent catastrophic forgetting
//! - **ReasoningBank**: Pattern extraction and similarity search
//! - **Three Learning Loops**: Instant, Background, and Coordination loops
//! - **WASM Support**: Run in browsers and edge devices (enable `wasm` feature)
//!
//! ## Example
//!
//! ```rust,ignore
//! use sona::{SonaEngine, SonaConfig};
//!
//! // Create engine
//! let engine = SonaEngine::new(SonaConfig {
//!     hidden_dim: 256,
//!     embedding_dim: 256,
//!     ..Default::default()
//! });
//!
//! // Begin trajectory
//! let mut builder = engine.begin_trajectory(vec![0.1; 256]);
//! builder.add_step(vec![0.5; 256], vec![], 0.8);
//!
//! // End trajectory
//! engine.end_trajectory(builder, 0.85);
//!
//! // Apply learned transformations
//! let input = vec![1.0; 256];
//! let mut output = vec![0.0; 256];
//! engine.apply_micro_lora(&input, &mut output);
//! ```
//!
//! ## WASM Usage
//!
//! Enable the `wasm` feature and build with:
//! ```bash
//! wasm-pack build --target web --features wasm
//! ```

#![warn(missing_docs)]

pub mod types;
pub mod lora;
pub mod trajectory;
pub mod ewc;
pub mod reasoning_bank;
pub mod loops;
pub mod engine;

#[cfg(feature = "serde-support")]
pub mod export;

#[cfg(feature = "wasm")]
pub mod wasm;

#[cfg(feature = "napi")]
pub mod napi_simple;

// Re-export main types
pub use types::{
    LearningSignal, QueryTrajectory, TrajectoryStep,
    LearnedPattern, PatternType, SignalMetadata, SonaConfig,
};
pub use lora::{MicroLoRA, BaseLoRA, LoRAEngine, LoRALayer};
pub use trajectory::{TrajectoryBuffer, TrajectoryBuilder, TrajectoryIdGen};
pub use ewc::{EwcConfig, EwcPlusPlus, TaskFisher};
pub use reasoning_bank::{ReasoningBank, PatternConfig};
pub use loops::{InstantLoop, BackgroundLoop, LoopCoordinator};
pub use engine::SonaEngine;

#[cfg(feature = "serde-support")]
pub use export::{
    HuggingFaceExporter, ExportConfig, ExportResult, ExportError, ExportType,
    SafeTensorsExporter, DatasetExporter, HuggingFaceHub,
    PretrainConfig, PretrainPipeline,
};

#[cfg(feature = "wasm")]
pub use wasm::WasmSonaEngine;
