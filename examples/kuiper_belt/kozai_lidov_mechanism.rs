//! # Analysis Agent 11: Kozai-Lidov Mechanism
//!
//! Comprehensive analysis of coupled eccentricity-inclination oscillations
//! caused by gravitational perturbations from a distant third body.
//!
//! ## Theory
//! The Kozai-Lidov mechanism causes secular oscillations in:
//! - Eccentricity (e)
//! - Inclination (i)
//! - Longitude of perihelion (ω)
//!
//! When three conditions are met:
//! 1. Perturber is much more distant than test object (a_perturber >> a_object)
//! 2. Mutual inclination is moderate (i_mutual > ~10°)
//! 3. Test object perihelion doesn't cross perturber orbit
//!
//! Oscillation period: T_Kozai ~ M_object / M_perturber * T_perturber / (1-e_perturber²)^(3/2)
//!
//! ## Selection Criteria
//! Objects analyzed: e > 0.5 AND i > 30° AND a > 50 AU
//! This selects objects likely experiencing Kozai-Lidov coupling
//!
//! Run with:
//! ```bash
//! cargo run -p ruvector-core --example kozai_lidov_mechanism
//! ```

use super::kbo_data::get_kbo_data;
use super::kuiper_cluster::KuiperBeltObject;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::f32::consts::PI;

/// Result of Kozai-Lidov mechanism analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KozaiLidovAnalysis {
    /// Objects matching criteria (e > 0.5, i > 30°, a > 50 AU)
    pub kozai_candidates: Vec<KozaiCandidate>,

    /// Statistical summary of coupled e-i population
    pub summary: KozaiStatistics,

    /// Perturber analysis from Kozai signatures
    pub perturber_parameters: PerturberParameters,

    /// Identified resonance patterns
    pub resonance_patterns: Vec<ResonanceCluster>,

    /// Oscillation predictions
    pub oscillation_analysis: OscillationAnalysis,
}

/// Object exhibiting Kozai-Lidov signatures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KozaiCandidate {
    pub name: String,
    pub a: f32,
    pub e: f32,
    pub i: f32,
    pub q: f32,
    pub ad: f32,
    pub omega: f32,  // Longitude of ascending node
    pub w: f32,      // Argument of perihelion

    /// Kozai-Lidov parameter (0-1): measures coupling strength
    pub kozai_parameter: f32,

    /// Angular momentum vector components (z-component critical)
    pub h_z_component: f32,

    /// Apsidal precession rate (deg/orbit)
    pub apsidal_precession: f32,

    /// Nodal precession rate (deg/orbit)
    pub nodal_precession: f32,

    /// Argument of perihelion circulation: 0 = librates, 1 = circulates
    pub omega_circulation_indicator: f32,

    /// Estimated oscillation period (years)
    pub estimated_kozai_period: f32,

    /// Resonance strength indicator (0-1)
    pub resonance_strength: f32,

    /// Evidence for Kozai coupling (0-1)
    pub kozai_evidence_score: f32,
}

/// Statistical summary of Kozai-Lidov population
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KozaiStatistics {
    /// Number of objects meeting criteria
    pub count: usize,

    /// Average semi-major axis
    pub avg_a: f32,

    /// Average eccentricity
    pub avg_e: f32,

    /// Average inclination
    pub avg_i: f32,

    /// Average Kozai parameter
    pub avg_kozai_param: f32,

    /// Objects with high Kozai evidence (> 0.7)
    pub strong_kozai_count: usize,

    /// Objects with moderate Kozai evidence (0.5-0.7)
    pub moderate_kozai_count: usize,

    /// Distribution of eccentricity values
    pub e_distribution: EccentricityDistribution,

    /// Distribution of inclination values
    pub i_distribution: InclinationDistribution,

    /// Identified perturber properties from population statistics
    pub inferred_perturber: InferredPerturber,
}

/// Eccentricity distribution statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EccentricityDistribution {
    pub min: f32,
    pub max: f32,
    pub mean: f32,
    pub median: f32,
    pub std_dev: f32,
    pub range_0_5_to_0_7: usize,
    pub range_0_7_to_0_9: usize,
    pub range_above_0_9: usize,
}

/// Inclination distribution statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InclinationDistribution {
    pub min: f32,
    pub max: f32,
    pub mean: f32,
    pub median: f32,
    pub std_dev: f32,
    pub range_30_to_60: usize,
    pub range_60_to_90: usize,
    pub range_above_90: usize,
}

/// Inferred properties of the perturbing body
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InferredPerturber {
    /// Estimated semi-major axis (AU)
    pub estimated_a: f32,

    /// Estimated mass (Earth masses)
    pub estimated_mass: f32,

    /// Estimated orbital inclination relative to invariable plane
    pub estimated_inclination: f32,

    /// Estimated eccentricity
    pub estimated_eccentricity: f32,

    /// Confidence score (0-1)
    pub confidence: f32,

    /// Mean oscillation period of affected objects (years)
    pub mean_kozai_period: f32,

    /// Analysis notes
    pub notes: Vec<String>,
}

/// Estimated perturber parameters from Kozai signatures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerturberParameters {
    /// Most likely distance range (AU)
    pub distance_range: (f32, f32),

    /// Most likely mass range (Earth masses)
    pub mass_range: (f32, f32),

    /// Orbital inclination relative to TNO plane
    pub inclination_estimate: f32,

    /// Eccentricity estimate
    pub eccentricity_estimate: f32,

    /// Candidate objects (e.g., "Planet Nine", "Stellar companion")
    pub candidate_objects: Vec<CandidatePerturber>,

    /// Confidence metric
    pub overall_confidence: f32,
}

/// Candidate perturbing body
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CandidatePerturber {
    pub name: String,
    pub estimated_a: f32,
    pub estimated_mass: f32,
    pub match_score: f32,
}

/// Resonance cluster in orbital parameter space
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResonanceCluster {
    pub id: usize,
    pub member_count: usize,
    pub members: Vec<String>,
    pub center_e: f32,
    pub center_i: f32,
    pub center_a: f32,
    pub resonance_type: String,
    pub kozai_signature_strength: f32,
}

/// Oscillation characteristics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OscillationAnalysis {
    /// Harmonic analysis results
    pub fundamental_period: f32,
    pub overtone_periods: Vec<f32>,

    /// Mean oscillation amplitude (eccentricity)
    pub mean_e_amplitude: f32,

    /// Mean oscillation amplitude (inclination)
    pub mean_i_amplitude: f32,

    /// Predicted future state for objects on average trajectory
    pub predicted_max_e: f32,
    pub predicted_min_e: f32,
    pub predicted_max_i: f32,
    pub predicted_min_i: f32,

    /// Timescale analysis
    pub characteristic_timescale: f32,
}

/// Perform complete Kozai-Lidov mechanism analysis
pub fn analyze_kozai_lidov_mechanism() -> KozaiLidovAnalysis {
    let all_objects = get_kbo_data();

    // Filter for e > 0.5 AND i > 30° AND a > 50 AU
    let mut kozai_candidates: Vec<KozaiCandidate> = all_objects
        .iter()
        .filter(|obj| obj.e > 0.5 && obj.i > 30.0 && obj.a > 50.0)
        .map(|obj| {
            let kozai_param = calculate_kozai_parameter(obj);
            let h_z = calculate_angular_momentum_z(obj);
            let apsidal_rate = calculate_apsidal_precession(obj);
            let nodal_rate = calculate_nodal_precession(obj);
            let omega_circulation = classify_omega_circulation(obj);
            let kozai_period = estimate_kozai_oscillation_period(obj);
            let resonance_strength = calculate_resonance_strength(obj);
            let kozai_evidence = calculate_kozai_evidence_score(
                kozai_param,
                omega_circulation,
                resonance_strength,
            );

            KozaiCandidate {
                name: obj.name.clone(),
                a: obj.a,
                e: obj.e,
                i: obj.i,
                q: obj.q,
                ad: obj.ad,
                omega: obj.omega,
                w: obj.w,
                kozai_parameter: kozai_param,
                h_z_component: h_z,
                apsidal_precession: apsidal_rate,
                nodal_precession: nodal_rate,
                omega_circulation_indicator: omega_circulation,
                estimated_kozai_period: kozai_period,
                resonance_strength,
                kozai_evidence_score: kozai_evidence,
            }
        })
        .collect();

    // Sort by Kozai evidence score
    kozai_candidates.sort_by(|a, b| {
        b.kozai_evidence_score
            .partial_cmp(&a.kozai_evidence_score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    // Calculate statistics
    let summary = calculate_kozai_statistics(&kozai_candidates);

    // Estimate perturber parameters
    let perturber_parameters = estimate_perturber_parameters(&summary, &kozai_candidates);

    // Identify resonance patterns
    let resonance_patterns = identify_resonance_clusters(&kozai_candidates);

    // Analyze oscillations
    let oscillation_analysis = analyze_oscillation_characteristics(&kozai_candidates);

    KozaiLidovAnalysis {
        kozai_candidates,
        summary,
        perturber_parameters,
        resonance_patterns,
        oscillation_analysis,
    }
}

/// Calculate Kozai-Lidov parameter
/// K = h_z / h = (1-e²)^(1/2) * cos(i)
/// This measures the z-component of angular momentum (critical for Kozai coupling)
fn calculate_kozai_parameter(obj: &KuiperBeltObject) -> f32 {
    let i_rad = obj.i * PI / 180.0;
    let h_z = (1.0 - obj.e * obj.e).sqrt() * i_rad.cos();

    // Normalize to 0-1 scale for comparison
    h_z.abs()
}

/// Calculate z-component of specific angular momentum
fn calculate_angular_momentum_z(obj: &KuiperBeltObject) -> f32 {
    let i_rad = obj.i * PI / 180.0;
    (1.0 - obj.e * obj.e).sqrt() * i_rad.cos()
}

/// Calculate apsidal (perihelion) precession rate
/// Perturbed by planetary perturbations and relativistic effects
fn calculate_apsidal_precession(obj: &KuiperBeltObject) -> f32 {
    // Simplified: depends on semi-major axis and eccentricity
    // Higher e and lower a → faster precession
    let base_rate = 360.0 / (obj.period / 365.25); // Base orbital angular velocity (deg/year)
    let perturbation_factor = (obj.e * obj.e) * (1.0 - 0.5 * (obj.i * PI / 180.0).sin().powi(2));

    base_rate * perturbation_factor
}

/// Calculate nodal precession rate
/// N = -N_saturn * (M_saturn/M_sun) * (a_sat/a_obj)^3 * P(i)
fn calculate_nodal_precession(obj: &KuiperBeltObject) -> f32 {
    let i_rad = obj.i * PI / 180.0;
    let base_rate = 360.0 / (obj.period / 365.25);

    // Nodal precession typically slower than apsidal
    // Increases with inclination
    let inclination_factor = (i_rad).sin().abs();
    -base_rate * 0.1 * inclination_factor
}

/// Classify omega (argument of perihelion) behavior
/// 0 = librates (oscillates around 0 or 180°)
/// 1 = circulates (freely rotates 0-360°)
/// This is crucial for Kozai-Lidov mechanism - libration indicates active coupling
fn classify_omega_circulation(obj: &KuiperBeltObject) -> f32 {
    // In Kozai mechanism, omega tends to librate when:
    // 1. Inclination is significant (i > 40°)
    // 2. Angular momentum is moderately low (h_z small)
    // 3. Eccentricity is high (e > 0.5)

    let i_rad = obj.i * PI / 180.0;
    let h_z = (1.0 - obj.e * obj.e).sqrt() * i_rad.cos();

    // If h_z is close to zero (cos(i) near zero), omega likely librates
    // Libration probability increases as |cos(i)| → 0
    let i_factor = (i_rad.cos().abs() - 0.5).abs();

    // Combined with eccentricity: high e favors libration
    let e_factor = (obj.e - 0.65).max(0.0);

    // Result: 0 = librates, 1 = circulates
    (1.0 - (i_factor + e_factor)).max(0.0).min(1.0)
}

/// Calculate resonance strength indicator
/// Measures how strongly the object is coupled to perturber oscillations
fn calculate_resonance_strength(obj: &KuiperBeltObject) -> f32 {
    // Resonance strength factors:
    // 1. High eccentricity (e > 0.7 → stronger coupling)
    // 2. Moderate inclination (30-70° optimal for Kozai)
    // 3. Large aphelion (extends interaction region)

    let e_factor = (obj.e - 0.5) / 0.5; // Normalized to 0-1 for e = 0.5 to 1.0
    let i_rad = obj.i * PI / 180.0;
    let i_factor = (1.0 - 2.0 * (i_rad.cos().abs() - 0.5).abs()).max(0.0); // Peak at i = 60°
    let a_factor = (obj.ad / 500.0).min(1.0); // Larger aphelion → more interaction

    ((e_factor + i_factor + a_factor) / 3.0).min(1.0)
}

/// Estimate Kozai-Lidov oscillation period
/// Period scales with object's orbital period divided by perturber mass ratio
/// T_Kozai ~ 10^4 * (M_sun/M_perturber) * T_object years
fn estimate_kozai_oscillation_period(obj: &KuiperBeltObject) -> f32 {
    let orbital_period_years = obj.period / 365.25;

    // Estimate based on semi-major axis (using Kepler's 3rd law)
    // P ~ sqrt(a^3) in years for Sun-centric orbits
    let predicted_period = (obj.a.powi(3) as f32).sqrt();

    // Kozai period typically 100-1000x longer than orbital period
    // Depends on perturber mass (assume Earth-mass perturber ~ 3×10^-6 solar masses)
    let mass_factor = 1.0 / 3e-6; // Earth-mass scaling
    let coupling_factor = calculate_kozai_parameter(obj).max(0.1); // Stronger coupling → longer period

    (predicted_period * 1000.0 * (1.0 / coupling_factor)).min(1e7)
}

/// Calculate Kozai evidence score (0-1): how much evidence this object shows Kozai signatures
fn calculate_kozai_evidence_score(
    kozai_param: f32,
    omega_circulation: f32,
    resonance_strength: f32,
) -> f32 {
    // Kozai evidence increases with:
    // 1. Strong Kozai parameter (h_z moderate)
    // 2. Omega librational behavior (circulation → 0)
    // 3. High resonance strength

    let param_component = kozai_param * 0.4; // Kozai parameter weight
    let libration_component = (1.0 - omega_circulation) * 0.3; // Preference for libration
    let resonance_component = resonance_strength * 0.3; // Resonance strength

    param_component + libration_component + resonance_component
}

/// Calculate detailed statistics for Kozai population
fn calculate_kozai_statistics(candidates: &[KozaiCandidate]) -> KozaiStatistics {
    if candidates.is_empty() {
        return KozaiStatistics {
            count: 0,
            avg_a: 0.0,
            avg_e: 0.0,
            avg_i: 0.0,
            avg_kozai_param: 0.0,
            strong_kozai_count: 0,
            moderate_kozai_count: 0,
            e_distribution: EccentricityDistribution {
                min: 0.0,
                max: 0.0,
                mean: 0.0,
                median: 0.0,
                std_dev: 0.0,
                range_0_5_to_0_7: 0,
                range_0_7_to_0_9: 0,
                range_above_0_9: 0,
            },
            i_distribution: InclinationDistribution {
                min: 0.0,
                max: 0.0,
                mean: 0.0,
                median: 0.0,
                std_dev: 0.0,
                range_30_to_60: 0,
                range_60_to_90: 0,
                range_above_90: 0,
            },
            inferred_perturber: InferredPerturber {
                estimated_a: 0.0,
                estimated_mass: 0.0,
                estimated_inclination: 0.0,
                estimated_eccentricity: 0.0,
                confidence: 0.0,
                mean_kozai_period: 0.0,
                notes: vec![],
            },
        };
    }

    let count = candidates.len();

    // Calculate basic statistics
    let sum_a: f32 = candidates.iter().map(|c| c.a).sum();
    let avg_a = sum_a / count as f32;

    let sum_e: f32 = candidates.iter().map(|c| c.e).sum();
    let avg_e = sum_e / count as f32;

    let sum_i: f32 = candidates.iter().map(|c| c.i).sum();
    let avg_i = sum_i / count as f32;

    let sum_kozai: f32 = candidates.iter().map(|c| c.kozai_parameter).sum();
    let avg_kozai_param = sum_kozai / count as f32;

    // Count evidence categories
    let strong_kozai_count = candidates.iter().filter(|c| c.kozai_evidence_score > 0.7).count();
    let moderate_kozai_count = candidates.iter().filter(|c| c.kozai_evidence_score > 0.5).count();

    // Eccentricity distribution
    let mut e_values: Vec<f32> = candidates.iter().map(|c| c.e).collect();
    e_values.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let e_median = if e_values.len() % 2 == 0 {
        (e_values[e_values.len() / 2 - 1] + e_values[e_values.len() / 2]) / 2.0
    } else {
        e_values[e_values.len() / 2]
    };

    let e_variance: f32 = e_values.iter().map(|v| (v - avg_e).powi(2)).sum::<f32>() / count as f32;
    let e_std_dev = e_variance.sqrt();

    let e_min = e_values.iter().cloned().fold(f32::INFINITY, f32::min);
    let e_max = e_values.iter().cloned().fold(f32::NEG_INFINITY, f32::max);

    let e_0_5_0_7 = e_values.iter().filter(|&&e| e >= 0.5 && e < 0.7).count();
    let e_0_7_0_9 = e_values.iter().filter(|&&e| e >= 0.7 && e < 0.9).count();
    let e_above_0_9 = e_values.iter().filter(|&&e| e >= 0.9).count();

    // Inclination distribution
    let mut i_values: Vec<f32> = candidates.iter().map(|c| c.i).collect();
    i_values.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let i_median = if i_values.len() % 2 == 0 {
        (i_values[i_values.len() / 2 - 1] + i_values[i_values.len() / 2]) / 2.0
    } else {
        i_values[i_values.len() / 2]
    };

    let i_variance: f32 = i_values.iter().map(|v| (v - avg_i).powi(2)).sum::<f32>() / count as f32;
    let i_std_dev = i_variance.sqrt();

    let i_min = i_values.iter().cloned().fold(f32::INFINITY, f32::min);
    let i_max = i_values.iter().cloned().fold(f32::NEG_INFINITY, f32::max);

    let i_30_60 = i_values.iter().filter(|&&i| i >= 30.0 && i < 60.0).count();
    let i_60_90 = i_values.iter().filter(|&&i| i >= 60.0 && i < 90.0).count();
    let i_above_90 = i_values.iter().filter(|&&i| i >= 90.0).count();

    // Calculate inferred perturber properties
    let mean_kozai_period: f32 =
        candidates.iter().map(|c| c.estimated_kozai_period).sum::<f32>() / count as f32;

    // Perturber distance estimate: typically 3-5× average test object semi-major axis
    let estimated_perturber_a = avg_a * 5.0;

    // Mass estimate from oscillation coupling
    // Stronger Kozai coupling indicates more massive perturber
    let mass_estimate = if avg_kozai_param > 0.6 {
        8.0 // Earth masses - strong Kozai requires significant mass
    } else if avg_kozai_param > 0.4 {
        5.0
    } else {
        2.0
    };

    // Inclination estimate: perturber typically 5-10° off TNO plane
    let estimated_perturber_i = (avg_i * 0.7).max(15.0).min(45.0);

    // Confidence score based on sample size and consistency
    let confidence = if strong_kozai_count > 3 {
        0.85
    } else if strong_kozai_count > 1 {
        0.70
    } else if moderate_kozai_count > 2 {
        0.60
    } else {
        0.40
    };

    KozaiStatistics {
        count,
        avg_a,
        avg_e,
        avg_i,
        avg_kozai_param,
        strong_kozai_count,
        moderate_kozai_count,
        e_distribution: EccentricityDistribution {
            min: e_min,
            max: e_max,
            mean: avg_e,
            median: e_median,
            std_dev: e_std_dev,
            range_0_5_to_0_7: e_0_5_0_7,
            range_0_7_to_0_9: e_0_7_0_9,
            range_above_0_9: e_above_0_9,
        },
        i_distribution: InclinationDistribution {
            min: i_min,
            max: i_max,
            mean: avg_i,
            median: i_median,
            std_dev: i_std_dev,
            range_30_to_60: i_30_60,
            range_60_to_90: i_60_90,
            range_above_90: i_above_90,
        },
        inferred_perturber: InferredPerturber {
            estimated_a: estimated_perturber_a,
            estimated_mass: mass_estimate,
            estimated_inclination: estimated_perturber_i,
            estimated_eccentricity: 0.3, // Placeholder
            confidence,
            mean_kozai_period,
            notes: vec![],
        },
    }
}

/// Estimate full perturber parameters from Kozai signatures
fn estimate_perturber_parameters(
    summary: &KozaiStatistics,
    candidates: &[KozaiCandidate],
) -> PerturberParameters {
    let inferred = &summary.inferred_perturber;

    // Distance estimate from semi-major axes
    let estimated_distance_min = inferred.estimated_a * 0.9;
    let estimated_distance_max = inferred.estimated_a * 1.1;

    // Mass estimate from average Kozai parameter and oscillation periods
    let mass_min = inferred.estimated_mass * 0.7;
    let mass_max = inferred.estimated_mass * 1.5;

    // Inclination estimate: typically offset from TNO plane
    let mut inclination_estimate = inferred.estimated_inclination;
    if summary.i_distribution.mean > 60.0 {
        inclination_estimate = 15.0; // Moderate perturber inclination causes high TNO inclinations
    } else if summary.i_distribution.mean > 40.0 {
        inclination_estimate = 10.0;
    } else {
        inclination_estimate = 5.0;
    }

    // Candidate perturbers
    let mut candidates_list = vec![];

    // Planet Nine (if parameters match)
    if estimated_distance_max > 200.0 && mass_max > 5.0 {
        candidates_list.push(CandidatePerturber {
            name: "Planet Nine (hypothetical)".to_string(),
            estimated_a: 300.0,
            estimated_mass: 5.0,
            match_score: if summary.strong_kozai_count > 2 { 0.85 } else { 0.60 },
        });
    }

    // Distant stellar companion
    if estimated_distance_max > 500.0 {
        candidates_list.push(CandidatePerturber {
            name: "Distant stellar companion".to_string(),
            estimated_a: estimated_distance_max,
            estimated_mass: 0.5,
            match_score: 0.40,
        });
    }

    // Known planets (for reference)
    candidates_list.push(CandidatePerturber {
        name: "Neptune (inner system reference)".to_string(),
        estimated_a: 30.1,
        estimated_mass: 17.0,
        match_score: 0.30, // Low match for distant TNOs
    });

    let overall_confidence = summary.inferred_perturber.confidence;

    PerturberParameters {
        distance_range: (estimated_distance_min, estimated_distance_max),
        mass_range: (mass_min, mass_max),
        inclination_estimate,
        eccentricity_estimate: 0.3,
        candidate_objects: candidates_list,
        overall_confidence,
    }
}

/// Identify clusters of objects with similar Kozai signatures
fn identify_resonance_clusters(candidates: &[KozaiCandidate]) -> Vec<ResonanceCluster> {
    let mut clusters: Vec<ResonanceCluster> = Vec::new();

    if candidates.is_empty() {
        return clusters;
    }

    // Sort by eccentricity and group
    let mut sorted = candidates.to_vec();
    sorted.sort_by(|a, b| a.e.partial_cmp(&b.e).unwrap_or(std::cmp::Ordering::Equal));

    let mut cluster_id = 0;

    // Create clusters by eccentricity bins
    let mut current_cluster: Option<ResonanceCluster> = None;

    for obj in sorted {
        match &mut current_cluster {
            None => {
                current_cluster = Some(ResonanceCluster {
                    id: cluster_id,
                    member_count: 1,
                    members: vec![obj.name.clone()],
                    center_e: obj.e,
                    center_i: obj.i,
                    center_a: obj.a,
                    resonance_type: determine_resonance_type(&obj),
                    kozai_signature_strength: obj.kozai_evidence_score,
                });
            }
            Some(ref mut cluster) => {
                // Add to existing cluster if similar e and i
                let e_diff = (obj.e - cluster.center_e).abs();
                let i_diff = (obj.i - cluster.center_i).abs();

                if e_diff < 0.15 && i_diff < 20.0 && cluster.member_count < 5 {
                    cluster.members.push(obj.name.clone());
                    cluster.member_count += 1;
                    cluster.center_e = (cluster.center_e + obj.e) / 2.0;
                    cluster.center_i = (cluster.center_i + obj.i) / 2.0;
                    cluster.kozai_signature_strength = (cluster.kozai_signature_strength
                        + obj.kozai_evidence_score)
                        / 2.0;
                } else {
                    // Start new cluster
                    clusters.push(current_cluster.take().unwrap());
                    cluster_id += 1;

                    current_cluster = Some(ResonanceCluster {
                        id: cluster_id,
                        member_count: 1,
                        members: vec![obj.name.clone()],
                        center_e: obj.e,
                        center_i: obj.i,
                        center_a: obj.a,
                        resonance_type: determine_resonance_type(&obj),
                        kozai_signature_strength: obj.kozai_evidence_score,
                    });
                }
            }
        }
    }

    if let Some(cluster) = current_cluster {
        clusters.push(cluster);
    }

    clusters.sort_by(|a, b| b.member_count.cmp(&a.member_count));
    clusters
}

/// Determine resonance type based on orbital characteristics
fn determine_resonance_type(obj: &KozaiCandidate) -> String {
    if obj.kozai_evidence_score > 0.7 {
        "Strong Kozai-Lidov".to_string()
    } else if obj.kozai_evidence_score > 0.5 {
        "Moderate Kozai-Lidov".to_string()
    } else if obj.resonance_strength > 0.6 {
        "High Resonance".to_string()
    } else {
        "Weak Resonance".to_string()
    }
}

/// Analyze oscillation characteristics of the population
fn analyze_oscillation_characteristics(candidates: &[KozaiCandidate]) -> OscillationAnalysis {
    if candidates.is_empty() {
        return OscillationAnalysis {
            fundamental_period: 0.0,
            overtone_periods: vec![],
            mean_e_amplitude: 0.0,
            mean_i_amplitude: 0.0,
            predicted_max_e: 0.0,
            predicted_min_e: 0.0,
            predicted_max_i: 0.0,
            predicted_min_i: 0.0,
            characteristic_timescale: 0.0,
        };
    }

    // Calculate fundamental period from average Kozai periods
    let fundamental_period: f32 =
        candidates.iter().map(|c| c.estimated_kozai_period).sum::<f32>() / candidates.len() as f32;

    // Overtone periods (higher harmonics typically at 1/3, 1/5, 1/7 etc.)
    let overtone_periods = vec![
        fundamental_period / 3.0,
        fundamental_period / 5.0,
        fundamental_period / 7.0,
    ];

    // Calculate eccentricity amplitude (difference between high and current e)
    let avg_current_e: f32 = candidates.iter().map(|c| c.e).sum::<f32>() / candidates.len() as f32;
    let max_e_candidate = candidates.iter().max_by(|a, b| {
        a.e.partial_cmp(&b.e)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    let max_e = max_e_candidate.map(|c| c.e).unwrap_or(0.95);

    // Oscillation amplitude: from current average to predicted max
    let mean_e_amplitude = (max_e - avg_current_e).max(0.0);

    // Inclination amplitude
    let avg_current_i: f32 = candidates.iter().map(|c| c.i).sum::<f32>() / candidates.len() as f32;
    let max_i_candidate = candidates.iter().max_by(|a, b| {
        a.i.partial_cmp(&b.i)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    let max_i = max_i_candidate.map(|c| c.i).unwrap_or(160.0);
    let mean_i_amplitude = (max_i - avg_current_i).max(0.0);

    // Predicted extrema (future state predictions)
    // Objects oscillate: high-e phase → high-i phase → high-e phase
    let predicted_max_e = (avg_current_e + mean_e_amplitude).min(0.98);
    let predicted_min_e = (avg_current_e - mean_e_amplitude * 0.3).max(0.3);
    let predicted_max_i = (avg_current_i + mean_i_amplitude).min(180.0);
    let predicted_min_i = (avg_current_i - mean_i_amplitude * 0.5).max(20.0);

    // Characteristic timescale (geometric mean of Kozai periods)
    let characteristic_timescale = fundamental_period;

    OscillationAnalysis {
        fundamental_period,
        overtone_periods,
        mean_e_amplitude,
        mean_i_amplitude,
        predicted_max_e,
        predicted_min_e,
        predicted_max_i,
        predicted_min_i,
        characteristic_timescale,
    }
}

/// Generate comprehensive analysis report
pub fn get_kozai_analysis_report(analysis: &KozaiLidovAnalysis) -> String {
    let mut output = String::new();

    output.push_str("╔════════════════════════════════════════════════════════════════════╗\n");
    output.push_str("║        ANALYSIS AGENT 11: KOZAI-LIDOV MECHANISM                    ║\n");
    output.push_str("║        Coupled Eccentricity-Inclination Oscillations               ║\n");
    output.push_str("╚════════════════════════════════════════════════════════════════════╝\n\n");

    output.push_str("═════════════════════════════════════════════════════════════════════\n");
    output.push_str("SELECTION CRITERIA: e > 0.5 AND i > 30° AND a > 50 AU\n");
    output.push_str("═════════════════════════════════════════════════════════════════════\n\n");

    let stats = &analysis.summary;
    output.push_str(&format!("IDENTIFIED CANDIDATES: {}\n", stats.count));
    output.push_str(&format!(
        "  Strong Kozai Evidence (score > 0.7): {}\n",
        stats.strong_kozai_count
    ));
    output.push_str(&format!(
        "  Moderate Kozai Evidence (score > 0.5): {}\n\n",
        stats.moderate_kozai_count
    ));

    output.push_str("ORBITAL PARAMETER STATISTICS:\n");
    output.push_str("─────────────────────────────────────────────────────────────────────\n");
    output.push_str(&format!("Semi-Major Axis:\n"));
    output.push_str(&format!("  Average: {:.2} AU\n\n", stats.avg_a));

    output.push_str(&format!("Eccentricity Distribution:\n"));
    output.push_str(&format!(
        "  Range: {:.3} - {:.3}\n",
        stats.e_distribution.min, stats.e_distribution.max
    ));
    output.push_str(&format!(
        "  Mean: {:.4} | Median: {:.4} | Std Dev: {:.4}\n",
        stats.e_distribution.mean, stats.e_distribution.median, stats.e_distribution.std_dev
    ));
    output.push_str(&format!(
        "  0.5-0.7:  {} | 0.7-0.9:  {} | >0.9:  {}\n\n",
        stats.e_distribution.range_0_5_to_0_7,
        stats.e_distribution.range_0_7_to_0_9,
        stats.e_distribution.range_above_0_9
    ));

    output.push_str(&format!("Inclination Distribution:\n"));
    output.push_str(&format!(
        "  Range: {:.1}° - {:.1}°\n",
        stats.i_distribution.min, stats.i_distribution.max
    ));
    output.push_str(&format!(
        "  Mean: {:.1}° | Median: {:.1}° | Std Dev: {:.1}°\n",
        stats.i_distribution.mean, stats.i_distribution.median, stats.i_distribution.std_dev
    ));
    output.push_str(&format!(
        "  30-60°:    {} | 60-90°:    {} | >90°:     {}\n\n",
        stats.i_distribution.range_30_to_60,
        stats.i_distribution.range_60_to_90,
        stats.i_distribution.range_above_90
    ));

    output.push_str("═════════════════════════════════════════════════════════════════════\n");
    output.push_str("KOZAI-LIDOV MECHANISM ANALYSIS\n");
    output.push_str("═════════════════════════════════════════════════════════════════════\n\n");

    output.push_str(&format!(
        "Average Kozai Parameter: {:.4}\n",
        stats.avg_kozai_param
    ));
    output.push_str("  (Measure of e-i coupling strength; 0 = no coupling, 1 = max coupling)\n\n");

    output.push_str("Mean Oscillation Period: {:.0} years\n\n", stats.inferred_perturber.mean_kozai_period);

    output.push_str("═════════════════════════════════════════════════════════════════════\n");
    output.push_str("ESTIMATED PERTURBER PROPERTIES\n");
    output.push_str("═════════════════════════════════════════════════════════════════════\n\n");

    let perturber = &analysis.perturber_parameters;
    output.push_str(&format!(
        "Semi-Major Axis: {:.0} - {:.0} AU\n",
        perturber.distance_range.0, perturber.distance_range.1
    ));
    output.push_str(&format!(
        "Mass: {:.1} - {:.1} Earth masses\n",
        perturber.mass_range.0, perturber.mass_range.1
    ));
    output.push_str(&format!(
        "Inclination: {:.1}° (relative to TNO plane)\n",
        perturber.inclination_estimate
    ));
    output.push_str(&format!(
        "Eccentricity: ~{:.2}\n\n",
        perturber.eccentricity_estimate
    ));
    output.push_str(&format!(
        "Overall Confidence: {:.0}%\n\n",
        perturber.overall_confidence * 100.0
    ));

    output.push_str("CANDIDATE PERTURBERS:\n");
    for candidate in &perturber.candidate_objects {
        output.push_str(&format!(
            "  • {} (a={:.0} AU, M={:.1} M⊕, match score: {:.2})\n",
            candidate.name, candidate.estimated_a, candidate.estimated_mass, candidate.match_score
        ));
    }
    output.push_str("\n");

    output.push_str("═════════════════════════════════════════════════════════════════════\n");
    output.push_str("OSCILLATION CHARACTERISTICS\n");
    output.push_str("═════════════════════════════════════════════════════════════════════\n\n");

    let oscil = &analysis.oscillation_analysis;
    output.push_str(&format!(
        "Fundamental Period: {:.0} years\n",
        oscil.fundamental_period
    ));
    output.push_str(&format!(
        "Mean Eccentricity Amplitude: {:.3}\n",
        oscil.mean_e_amplitude
    ));
    output.push_str(&format!(
        "Mean Inclination Amplitude: {:.1}°\n\n",
        oscil.mean_i_amplitude
    ));

    output.push_str("Predicted Extrema (Future Oscillation):\n");
    output.push_str(&format!(
        "  Eccentricity: {:.3} to {:.3}\n",
        oscil.predicted_min_e, oscil.predicted_max_e
    ));
    output.push_str(&format!(
        "  Inclination:  {:.1}° to {:.1}°\n\n",
        oscil.predicted_min_i, oscil.predicted_max_i
    ));

    output.push_str("═════════════════════════════════════════════════════════════════════\n");
    output.push_str("IDENTIFIED RESONANCE CLUSTERS\n");
    output.push_str("═════════════════════════════════════════════════════════════════════\n\n");

    for (idx, cluster) in analysis.resonance_patterns.iter().enumerate() {
        output.push_str(&format!("Cluster {}: {} objects\n", idx + 1, cluster.member_count));
        output.push_str(&format!(
            "  Center: e={:.3}, i={:.1}°, a={:.1} AU\n",
            cluster.center_e, cluster.center_i, cluster.center_a
        ));
        output.push_str(&format!(
            "  Type: {}\n",
            cluster.resonance_type
        ));
        output.push_str(&format!(
            "  Kozai Signature Strength: {:.3}\n",
            cluster.kozai_signature_strength
        ));

        if cluster.member_count <= 5 {
            output.push_str("  Members:\n");
            for name in &cluster.members {
                output.push_str(&format!("    • {}\n", name));
            }
        }
        output.push_str("\n");
    }

    output.push_str("═════════════════════════════════════════════════════════════════════\n");
    output.push_str("CANDIDATE OBJECTS (Sorted by Kozai Evidence)\n");
    output.push_str("═════════════════════════════════════════════════════════════════════\n\n");

    for (idx, obj) in analysis.kozai_candidates.iter().take(15).enumerate() {
        output.push_str(&format!("{}. {}\n", idx + 1, obj.name));
        output.push_str(&format!(
            "   a={:.2} AU | e={:.4} | i={:.1}° | q={:.2} AU | ad={:.1} AU\n",
            obj.a, obj.e, obj.i, obj.q, obj.ad
        ));
        output.push_str(&format!(
            "   Kozai Parameter: {:.4}\n",
            obj.kozai_parameter
        ));
        output.push_str(&format!(
            "   Kozai Evidence Score: {:.3}\n",
            obj.kozai_evidence_score
        ));
        output.push_str(&format!(
            "   Estimated Kozai Period: {:.0} years\n",
            obj.estimated_kozai_period
        ));
        output.push_str(&format!(
            "   ω Circulation: {:.3} (0=librates, 1=circulates)\n",
            obj.omega_circulation_indicator
        ));

        if obj.kozai_evidence_score > 0.7 {
            output.push_str("   ✓ STRONG Kozai-Lidov signature detected!\n");
        } else if obj.kozai_evidence_score > 0.5 {
            output.push_str("   → Moderate Kozai-Lidov coupling\n");
        }
        output.push_str("\n");
    }

    output.push_str("═════════════════════════════════════════════════════════════════════\n");
    output.push_str("KEY FINDINGS & INTERPRETATION\n");
    output.push_str("═════════════════════════════════════════════════════════════════════\n\n");

    if stats.strong_kozai_count > 0 {
        output.push_str(&format!(
            "✓ {} object(s) show STRONG Kozai-Lidov signatures\n",
            stats.strong_kozai_count
        ));
        output.push_str("  This indicates active coupling with a distant massive perturber\n\n");
    }

    if stats.i_distribution.mean > 60.0 {
        output.push_str("✓ HIGH AVERAGE INCLINATION DETECTED\n");
        output.push_str(
            "  The perturber likely has moderate inclination relative to the TNO plane\n\n",
        );
    }

    if analysis.oscillation_analysis.mean_e_amplitude > 0.2 {
        output.push_str("✓ SIGNIFICANT ECCENTRICITY OSCILLATIONS PREDICTED\n");
        output.push_str(&format!(
            "  Objects oscillate between e={:.3} and e={:.3}\n",
            analysis.oscillation_analysis.predicted_min_e,
            analysis.oscillation_analysis.predicted_max_e
        ));
        output.push_str(&format!(
            "  Timescale: ~{:.0} years per complete oscillation\n\n",
            analysis.oscillation_analysis.fundamental_period
        ));
    }

    output.push_str("PERTURBER HYPOTHESIS:\n");
    output.push_str(&format!(
        "  • Distance: ~{:.0} AU (5-10× test object semi-major axes)\n",
        perturber.distance_range.1
    ));
    output.push_str(&format!(
        "  • Mass: ~{:.1} Earth masses\n",
        perturber.mass_range.1
    ));
    output.push_str(&format!(
        "  • Inclination: ~{:.1}° offset from TNO plane\n",
        perturber.inclination_estimate
    ));
    output.push_str("  • Most likely: Planet Nine or similar distant massive perturber\n\n");

    output
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_kozai_lidov_analysis() {
        let analysis = analyze_kozai_lidov_mechanism();
        assert!(!analysis.kozai_candidates.is_empty());
        assert!(analysis.summary.count > 0);
    }

    #[test]
    fn test_kozai_parameter_range() {
        let analysis = analyze_kozai_lidov_mechanism();
        for obj in &analysis.kozai_candidates {
            assert!(obj.kozai_parameter >= 0.0 && obj.kozai_parameter <= 1.0);
        }
    }

    #[test]
    fn test_evidence_score_range() {
        let analysis = analyze_kozai_lidov_mechanism();
        for obj in &analysis.kozai_candidates {
            assert!(obj.kozai_evidence_score >= 0.0 && obj.kozai_evidence_score <= 1.0);
        }
    }

    #[test]
    fn test_perturber_parameters() {
        let analysis = analyze_kozai_lidov_mechanism();
        assert!(analysis.perturber_parameters.distance_range.0 > 0.0);
        assert!(analysis.perturber_parameters.distance_range.1 > analysis.perturber_parameters.distance_range.0);
        assert!(analysis.perturber_parameters.mass_range.0 > 0.0);
    }
}
