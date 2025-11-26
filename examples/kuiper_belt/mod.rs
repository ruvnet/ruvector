//! # Kuiper Belt Clustering Analysis Module
//!
//! Self-learning density-based spatial clustering for Trans-Neptunian Objects.
//!
//! ## Features
//! - DBSCAN clustering optimized for orbital parameter space
//! - AgenticDB integration for self-learning pattern discovery
//! - Topological Data Analysis for cluster quality assessment
//! - Novel discovery detection for potential new dynamical families

pub mod kuiper_cluster;
pub mod kbo_data;
pub mod inclination_analysis;
pub mod aphelion_clustering;
pub mod eccentricity_analysis;
pub mod perihelion_analysis;
pub mod kozai_lidov_mechanism;
pub mod anti_alignment_analysis;

pub use kuiper_cluster::{
    KuiperBeltObject,
    DBSCANClusterer,
    SelfLearningAnalyzer,
    Cluster,
    ClusterSignificance,
    ClusteringResult,
    AnalysisResult,
    LearnedPattern,
};

pub use kbo_data::{get_kbo_data, get_sample_kbos};
pub use inclination_analysis::analyze_inclination_anomalies;
pub use aphelion_clustering::{
    AphelionClusterer,
    AphelionClusteringResult,
    AphelionBin,
    EstimatedPlanet,
};
pub use eccentricity_analysis::{
    analyze_eccentricity_pumping,
    get_analysis_summary,
    EccentricityAnalysis,
    HighEccentricityObject,
    EccentricityStats,
    PerturberEstimate,
};
pub use perihelion_analysis::{
    analyze_argument_of_perihelion,
    generate_report,
    ClusteringAnalysis,
    HighQObject,
};
pub use kozai_lidov_mechanism::{
    analyze_kozai_lidov_mechanism,
    get_kozai_analysis_report,
    KozaiLidovAnalysis,
    KozaiCandidate,
    PerturberParameters,
};
pub use anti_alignment_analysis::{
    analyze_anti_alignment,
    generate_anti_alignment_report,
    AntiAlignmentAnalysis,
    AntiAlignmentObject,
};
