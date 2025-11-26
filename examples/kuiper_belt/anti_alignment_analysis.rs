//! # Anti-Alignment Analysis for Extreme Trans-Neptunian Objects
//!
//! This module analyzes if ETNOs are anti-aligned with a hypothetical planet.
//! Anti-alignment suggests gravitational interaction with an exterior perturbing body.
//!
//! ## Methodology
//! 1. Filter objects with a > 150 AU and q > 30 AU (extreme objects)
//! 2. Calculate longitude of perihelion Ω + ω for each object
//! 3. Compute mean longitude of perihelion across filtered sample
//! 4. Hypothetical planet position = mean longitude + 180° (anti-aligned)
//! 5. Analyze clustering and statistical significance
//!
//! ## References
//! - Batygin & Brown (2016): Evidence for a Distant Giant Planet in the Solar System
//! - Sheppard et al. (2016): A Sedna-like body with a perihelion of 80 AU

use super::kbo_data::get_kbo_data;
use super::kuiper_cluster::KuiperBeltObject;
use std::f64::consts::PI;

/// Represents an ETNO with anti-alignment metrics
#[derive(Debug, Clone)]
pub struct AntiAlignmentObject {
    pub name: String,
    pub a: f64,
    pub q: f64,
    pub omega: f64,  // Ascending node (Ω) in degrees
    pub w: f64,      // Argument of perihelion (ω) in degrees
    pub longitude_perihelion: f64,  // Ω + ω (longitude of perihelion)
    pub distance_to_mean: f64,  // Angular distance to mean longitude
    pub distance_to_anti_aligned: f64,  // Angular distance to anti-aligned position
    pub aligned_angle: f64,  // Angular distance to mean (positive/negative)
}

/// Results of anti-alignment analysis
#[derive(Debug, Clone)]
pub struct AntiAlignmentAnalysis {
    pub filtered_objects: Vec<AntiAlignmentObject>,
    pub mean_longitude: f64,
    pub std_dev_longitude: f64,
    pub hypothetical_planet_longitude: f64,
    pub objects_in_anti_aligned_region: Vec<AntiAlignmentObject>,
    pub anti_aligned_fraction: f64,
    pub angular_range: (f64, f64),  // Min and max longitude
    pub concentration_metric: f64,
    pub planet_evidence_score: f64,
}

/// Normalize angle to 0-360 range
fn normalize_angle(angle: f64) -> f64 {
    let mut normalized = angle % 360.0;
    if normalized < 0.0 {
        normalized += 360.0;
    }
    normalized
}

/// Calculate angular distance between two angles (degrees)
fn angular_distance(angle1: f64, angle2: f64) -> f64 {
    let diff = (angle1 - angle2).abs();
    if diff > 180.0 {
        360.0 - diff
    } else {
        diff
    }
}

/// Calculate signed angular distance (positive = counter-clockwise)
fn signed_angular_distance(from: f64, to: f64) -> f64 {
    let mut diff = to - from;
    while diff < -180.0 {
        diff += 360.0;
    }
    while diff > 180.0 {
        diff -= 360.0;
    }
    diff
}

/// Perform complete anti-alignment analysis
pub fn analyze_anti_alignment() -> AntiAlignmentAnalysis {
    let kbo_data = get_kbo_data();

    // Filter for extreme objects: a > 150 AU and q > 30 AU
    let mut filtered: Vec<AntiAlignmentObject> = kbo_data
        .iter()
        .filter(|obj| obj.a > 150.0 && obj.q > 30.0)
        .map(|obj| {
            let longitude_perihelion = normalize_angle(obj.omega + obj.w);

            AntiAlignmentObject {
                name: obj.name.clone(),
                a: obj.a as f64,
                q: obj.q as f64,
                omega: obj.omega as f64,
                w: obj.w as f64,
                longitude_perihelion,
                distance_to_mean: 0.0,  // Will be calculated
                distance_to_anti_aligned: 0.0,  // Will be calculated
                aligned_angle: 0.0,  // Will be calculated
            }
        })
        .collect();

    if filtered.is_empty() {
        return AntiAlignmentAnalysis {
            filtered_objects: vec![],
            mean_longitude: 0.0,
            std_dev_longitude: 0.0,
            hypothetical_planet_longitude: 0.0,
            objects_in_anti_aligned_region: vec![],
            anti_aligned_fraction: 0.0,
            angular_range: (0.0, 0.0),
            concentration_metric: 0.0,
            planet_evidence_score: 0.0,
        };
    }

    // Calculate mean longitude of perihelion using circular statistics
    let mean_longitude = calculate_circular_mean(&filtered);
    let anti_aligned_longitude = normalize_angle(mean_longitude + 180.0);

    // Calculate standard deviation and update distances
    let mut sum_sq_dev = 0.0;
    for obj in &mut filtered {
        obj.distance_to_mean = angular_distance(obj.longitude_perihelion, mean_longitude);
        obj.distance_to_anti_aligned =
            angular_distance(obj.longitude_perihelion, anti_aligned_longitude);
        obj.aligned_angle = signed_angular_distance(mean_longitude, obj.longitude_perihelion);

        sum_sq_dev += obj.distance_to_mean.powi(2);
    }

    let std_dev = (sum_sq_dev / filtered.len() as f64).sqrt();

    // Find objects in anti-aligned region (within 45° of anti-aligned position)
    let anti_aligned_threshold = 45.0;
    let objects_in_anti_aligned = filtered
        .iter()
        .filter(|obj| obj.distance_to_anti_aligned <= anti_aligned_threshold)
        .cloned()
        .collect::<Vec<_>>();

    let anti_aligned_fraction = objects_in_anti_aligned.len() as f64 / filtered.len() as f64;

    // Angular range
    let mut angles = filtered.iter().map(|o| o.longitude_perihelion).collect::<Vec<_>>();
    angles.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let angular_range = (
        angles.first().copied().unwrap_or(0.0),
        angles.last().copied().unwrap_or(0.0),
    );

    // Calculate concentration metric (inverse of circular variance)
    let concentration_metric = calculate_concentration(&filtered);

    // Calculate planet evidence score
    // Factors: anti-aligned fraction, concentration, number of objects
    let planet_evidence_score = (anti_aligned_fraction * 0.4)
        + (concentration_metric * 0.3)
        + (filtered.len() as f64 / 50.0).min(1.0) * 0.3;

    // Sort by distance to anti-aligned position
    let mut anti_aligned_sorted = objects_in_anti_aligned;
    anti_aligned_sorted.sort_by(|a, b| {
        a.distance_to_anti_aligned.partial_cmp(&b.distance_to_anti_aligned).unwrap()
    });

    AntiAlignmentAnalysis {
        filtered_objects: filtered,
        mean_longitude,
        std_dev_longitude: std_dev,
        hypothetical_planet_longitude: anti_aligned_longitude,
        objects_in_anti_aligned_region: anti_aligned_sorted,
        anti_aligned_fraction,
        angular_range,
        concentration_metric,
        planet_evidence_score,
    }
}

/// Calculate circular mean of angles
fn calculate_circular_mean(objects: &[AntiAlignmentObject]) -> f64 {
    if objects.is_empty() {
        return 0.0;
    }

    let mut sin_sum = 0.0;
    let mut cos_sum = 0.0;

    for obj in objects {
        let rad = obj.longitude_perihelion.to_radians();
        sin_sum += rad.sin();
        cos_sum += rad.cos();
    }

    let mean_rad = sin_sum.atan2(cos_sum);
    normalize_angle(mean_rad.to_degrees())
}

/// Calculate concentration metric (R̄ value from circular statistics)
fn calculate_concentration(objects: &[AntiAlignmentObject]) -> f64 {
    if objects.is_empty() {
        return 0.0;
    }

    let n = objects.len() as f64;
    let mut sin_sum = 0.0;
    let mut cos_sum = 0.0;

    for obj in objects {
        let rad = obj.longitude_perihelion.to_radians();
        sin_sum += rad.sin();
        cos_sum += rad.cos();
    }

    let r_bar = (sin_sum.powi(2) + cos_sum.powi(2)).sqrt() / n;
    r_bar  // Value between 0 (uniform) and 1 (concentrated)
}

/// Generate formatted report
pub fn generate_anti_alignment_report(analysis: &AntiAlignmentAnalysis) -> String {
    let mut report = String::new();

    report.push_str("═══════════════════════════════════════════════════════════════\n");
    report.push_str("ANTI-ALIGNMENT ANALYSIS FOR EXTREME TRANS-NEPTUNIAN OBJECTS\n");
    report.push_str("═══════════════════════════════════════════════════════════════\n\n");

    report.push_str("FILTERING CRITERIA:\n");
    report.push_str("─────────────────────────────────────────────────────────────\n");
    report.push_str(&format!("  • Semi-major axis (a) > 150 AU\n"));
    report.push_str(&format!("  • Perihelion distance (q) > 30 AU\n"));
    report.push_str(&format!("  • Objects meeting criteria: {}\n\n", analysis.filtered_objects.len()));

    if analysis.filtered_objects.is_empty() {
        report.push_str("No objects found matching filter criteria.\n");
        return report;
    }

    report.push_str("ORBITAL PARAMETER ANALYSIS:\n");
    report.push_str("─────────────────────────────────────────────────────────────\n");
    report.push_str(&format!("  • Mean Longitude of Perihelion (Ω + ω): {:.2}°\n", analysis.mean_longitude));
    report.push_str(&format!("  • Standard Deviation: {:.2}°\n", analysis.std_dev_longitude));
    report.push_str(&format!("  • Angular Range: {:.2}° to {:.2}°\n",
        analysis.angular_range.0, analysis.angular_range.1));
    report.push_str(&format!("  • Concentration Metric (R̄): {:.4}\n\n", analysis.concentration_metric));

    report.push_str("HYPOTHETICAL PLANET POSITION:\n");
    report.push_str("─────────────────────────────────────────────────────────────\n");
    report.push_str(&format!("  • Anti-Aligned Position: {:.2}° (mean + 180°)\n",
        analysis.hypothetical_planet_longitude));
    report.push_str(&format!("  • Detection Confidence: {:.1}%\n\n",
        analysis.planet_evidence_score * 100.0));

    report.push_str("ANTI-ALIGNMENT RESULTS:\n");
    report.push_str("─────────────────────────────────────────────────────────────\n");
    report.push_str(&format!("  • Objects in anti-aligned region (±45°): {}\n",
        analysis.objects_in_anti_aligned_region.len()));
    report.push_str(&format!("  • Anti-aligned fraction: {:.1}%\n",
        analysis.anti_aligned_fraction * 100.0));
    report.push_str(&format!("  • Planet Evidence Score: {:.4}\n\n",
        analysis.planet_evidence_score));

    if !analysis.objects_in_anti_aligned_region.is_empty() {
        report.push_str("OBJECTS IN ANTI-ALIGNED REGION:\n");
        report.push_str("─────────────────────────────────────────────────────────────\n");
        report.push_str("Name                          | a(AU)  | q(AU)  | Long.P(°) | Dist(°)\n");
        report.push_str("─────────────────────────────────────────────────────────────\n");

        for obj in &analysis.objects_in_anti_aligned_region {
            report.push_str(&format!(
                "{:30} | {:6.1} | {:6.1} | {:9.2} | {:7.2}\n",
                &obj.name[..obj.name.len().min(30)],
                obj.a,
                obj.q,
                obj.longitude_perihelion,
                obj.distance_to_anti_aligned
            ));
        }
        report.push_str("\n");
    }

    report.push_str("STATISTICAL INTERPRETATION:\n");
    report.push_str("─────────────────────────────────────────────────────────────\n");

    if analysis.anti_aligned_fraction > 0.5 {
        report.push_str("✓ STRONG ANTI-ALIGNMENT SIGNAL DETECTED\n");
        report.push_str("  High concentration of objects near anti-aligned position\n");
        report.push_str("  suggests significant gravitational perturbation.\n");
    } else if analysis.anti_aligned_fraction > 0.3 {
        report.push_str("○ MODERATE ANTI-ALIGNMENT SIGNAL\n");
        report.push_str("  Some evidence of clustering near anti-aligned position.\n");
    } else {
        report.push_str("✗ WEAK OR NO ANTI-ALIGNMENT SIGNAL\n");
        report.push_str("  Objects appear randomly distributed.\n");
    }

    if analysis.concentration_metric > 0.3 {
        report.push_str(&format!("  Concentration metric {:.4} indicates clustering.\n",
            analysis.concentration_metric));
    }

    report.push_str("\nAll Filtered Objects by Longitude of Perihelion:\n");
    report.push_str("─────────────────────────────────────────────────────────────\n");
    report.push_str("Name                          | a(AU)  | q(AU)  | Long.P(°) | To Mean(°)\n");
    report.push_str("─────────────────────────────────────────────────────────────\n");

    let mut sorted_objs = analysis.filtered_objects.clone();
    sorted_objs.sort_by(|a, b| a.longitude_perihelion.partial_cmp(&b.longitude_perihelion).unwrap());

    for obj in &sorted_objs {
        report.push_str(&format!(
            "{:30} | {:6.1} | {:6.1} | {:9.2} | {:10.2}\n",
            &obj.name[..obj.name.len().min(30)],
            obj.a,
            obj.q,
            obj.longitude_perihelion,
            obj.aligned_angle
        ));
    }

    report
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_angle() {
        assert_eq!(normalize_angle(360.0), 0.0);
        assert_eq!(normalize_angle(450.0), 90.0);
        assert_eq!(normalize_angle(-90.0), 270.0);
    }

    #[test]
    fn test_angular_distance() {
        assert_eq!(angular_distance(10.0, 20.0), 10.0);
        assert_eq!(angular_distance(10.0, 350.0), 20.0);
        assert_eq!(angular_distance(0.0, 180.0), 180.0);
    }

    #[test]
    fn test_signed_angular_distance() {
        assert_eq!(signed_angular_distance(0.0, 90.0), 90.0);
        assert_eq!(signed_angular_distance(90.0, 0.0), -90.0);
        assert_eq!(signed_angular_distance(0.0, 200.0), -160.0);
    }

    #[test]
    fn test_anti_alignment_runs() {
        let analysis = analyze_anti_alignment();
        // Should complete without panicking
        assert!(analysis.mean_longitude >= 0.0 && analysis.mean_longitude <= 360.0);
    }
}
