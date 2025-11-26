//! # Dynamical Stability Analysis - Agent 12
//!
//! Analysis of Kuiper Belt Objects in potentially unstable regions.
//! Identifies objects with 50 < a < 100 AU and e > 0.3 that should be unstable
//! but continue to exist, suggesting stabilizing influence from unseen planet.
//!
//! ## Stability Criteria:
//! - Classical KBOs: typically stable with low eccentricity (e < 0.2) at 40-50 AU
//! - Scattered Disk: extended beyond 50 AU with e can be 0.3-0.6
//! - High-e objects beyond 50 AU in chaotic regions
//!
//! ## Run with:
//! ```bash
//! cargo run --example dynamical_stability_analysis --features storage
//! ```

use std::collections::HashMap;

#[derive(Debug, Clone)]
struct KuiperBeltObject {
    name: String,
    a: f64,      // Semi-major axis (AU)
    e: f64,      // Eccentricity
    i: f64,      // Inclination (degrees)
    q: f64,      // Perihelion (AU)
    ad: f64,     // Aphelion (AU)
    period: f64, // Orbital period (days)
    omega: f64,  // Longitude of ascending node (degrees)
    w: f64,      // Argument of perihelion (degrees)
    h: Option<f64>,
    class: String,
}

#[derive(Debug, Clone)]
struct StabilityAnalysis {
    name: String,
    a: f64,
    e: f64,
    i: f64,
    q: f64,
    ad: f64,
    classification: String,
    stability_index: f64,
    is_high_eccentricity: bool,
    chaos_indicator: f64,
    suggested_stabilizer_mass: f64,
    stabilizer_location: f64,
    resonance_factor: f64,
    kozai_lidov_susceptibility: f64,
    reasoning: String,
}

fn analyze_stability(obj: &KuiperBeltObject) -> StabilityAnalysis {
    let stability_index = calculate_stability_index(&obj);
    let chaos_indicator = calculate_chaos_indicator(&obj);
    let is_high_e = obj.e > 0.3;
    let suggested_mass = estimate_stabilizer_mass(&obj);
    let stabilizer_loc = estimate_stabilizer_location(&obj);
    let resonance = calculate_resonance_parameter(&obj);
    let kozai = calculate_kozai_lidov_susceptibility(&obj);

    let reasoning = generate_stability_reasoning(
        &obj,
        stability_index,
        chaos_indicator,
        is_high_e,
        suggested_mass,
        resonance,
    );

    StabilityAnalysis {
        name: obj.name.clone(),
        a: obj.a,
        e: obj.e,
        i: obj.i,
        q: obj.q,
        ad: obj.ad,
        classification: classify_stability_region(&obj),
        stability_index,
        is_high_eccentricity: is_high_e,
        chaos_indicator,
        suggested_stabilizer_mass: suggested_mass,
        stabilizer_location: stabilizer_loc,
        resonance_factor: resonance,
        kozai_lidov_susceptibility: kozai,
        reasoning,
    }
}

/// Calculates stability index based on orbital elements
/// Range: 0.0 (unstable) to 1.0 (stable)
fn calculate_stability_index(obj: &KuiperBeltObject) -> f64 {
    let mut stability = 1.0;

    // Factor 1: Eccentricity (high e = less stable)
    // At a > 50 AU, e > 0.3 creates orbital chaos
    stability *= 1.0 - (obj.e * 0.8).min(1.0);

    // Factor 2: Semi-major axis zone
    // 50-100 AU is boundary region (less stable than inner KB)
    let a_stability = if obj.a < 50.0 {
        1.0
    } else if obj.a < 70.0 {
        0.7 // Scattered disk - naturally less stable
    } else if obj.a < 100.0 {
        0.5 // Highly unstable zone
    } else {
        0.3 // Extreme - very chaotic
    };
    stability *= a_stability;

    // Factor 3: Perihelion (closer to Neptune = perturbed)
    // Neptune is at ~30 AU
    let perihelion_factor = if obj.q < 30.0 {
        0.3 // High perturbation from Neptune
    } else if obj.q < 35.0 {
        0.6 // Moderate perturbation
    } else {
        1.0 // Far from Neptune
    };
    stability *= perihelion_factor;

    // Factor 4: Inclination (affects resonances)
    let inclination_factor = if obj.i > 20.0 {
        0.8 // High inclination less stable
    } else {
        1.0
    };
    stability *= inclination_factor;

    stability.max(0.0).min(1.0)
}

/// Calculates chaos indicator - how chaotic the orbit is
/// Range: 0.0 (stable) to 1.0 (highly chaotic)
fn calculate_chaos_indicator(obj: &KuiperBeltObject) -> f64 {
    let mut chaos = 0.0;

    // Primary chaos source: eccentricity
    // Lyapunov exponent correlates strongly with e in KB region
    if obj.e > 0.3 {
        chaos += 0.4 * ((obj.e - 0.3) / 0.7).min(1.0);
    }

    // Secondary chaos: semi-major axis
    // 50-100 AU is chaotic zone between classical and extreme
    if obj.a > 50.0 && obj.a < 100.0 {
        chaos += 0.3 * ((obj.a - 50.0) / 50.0).min(1.0);
    }

    // Tertiary: orbital crossing probability
    // Objects with low perihelion cross planetary orbits
    if obj.q < 35.0 && obj.a > 50.0 {
        chaos += 0.2;
    }

    // Quaternary: mean motion resonance proximity
    // Certain a values have known instabilities
    if is_near_dangerous_resonance(obj.a) {
        chaos += 0.1;
    }

    chaos.min(1.0)
}

/// Check if semi-major axis is near known dangerous mean-motion resonances
fn is_near_dangerous_resonance(a: f64) -> bool {
    let dangerous_zones = vec![
        (55.0, 58.0),   // 5:2 Neptune resonance region
        (62.0, 66.0),   // 7:3 Neptune resonance region
        (71.0, 77.0),   // 2:1 Neptune resonance region (strong)
        (47.5, 50.5),   // 2:1 Neptune resonance inner edge
    ];

    dangerous_zones.iter().any(|(low, high)| a >= low && a <= high)
}

/// Estimates mass of stabilizing planet needed to keep object stable
fn estimate_stabilizer_mass(obj: &KuiperBeltObject) -> f64 {
    // Higher eccentricity and weaker stability require more massive stabilizer
    let stability_index = calculate_stability_index(obj);

    // If stability is already good, no massive stabilizer needed
    if stability_index > 0.7 {
        return 0.0; // Self-stable
    }

    // Empirical relationship:
    // Massive perturber can stabilize chaotic regions through:
    // 1. Creating resonance "dead zones"
    // 2. Dynamical shepherding
    // 3. Clearing competing perturbers

    let deficit = (1.0 - stability_index) * 100.0;

    // Account for current eccentricity
    let eccentricity_factor = obj.e / 0.5; // Normalized to 0.5 as reference

    // Estimate based on Hill sphere considerations
    // M_planet ~ (deficit * eccentricity_factor)^0.5 Earth masses
    let estimated_mass = ((deficit * eccentricity_factor).abs()).sqrt();

    // Cap at reasonable values
    estimated_mass.min(25.0).max(0.5)
}

/// Estimates where the stabilizing planet should be located
fn estimate_stabilizer_location(obj: &KuiperBeltObject) -> f64 {
    // For objects at 50-100 AU, stabilizer likely at:
    // 1. Inner edge: perturb and clear
    // 2. Outer edge: provide shepherd effect
    // 3. Resonance location: 1:1, 2:1, 3:2 with object

    // Most likely: 2:1 or 3:2 resonance with the object
    // This provides strongest long-term stabilization

    // 2:1 resonance: a_perturber = a_object / (2^(2/3)) ≈ 0.63 * a_object
    // 3:2 resonance: a_perturber = a_object * (2/3)^(2/3) ≈ 0.77 * a_object
    // 1:1 resonance: a_perturber = a_object (Trojan configuration)

    // For scattered disk objects, the stabilizer is more likely in the
    // 1:2 to 1:3 resonance ratio (inner planet perturbing outer objects)

    // Based on Planet Nine hypothesis and current observations:
    // Most likely location: 250-500 AU (overlapping with Planet Nine hypothesis)

    let avg_resonance_location = (obj.a * 2.0 / 3.0_f64.powf(2.0/3.0)).max(50.0);

    // But empirically, outer perturbers work better for scattered disk
    // Adjust for semi-major axis range
    if obj.a < 60.0 {
        avg_resonance_location * 1.5  // Look outward
    } else if obj.a < 100.0 {
        avg_resonance_location * 2.0  // Much further out
    } else {
        avg_resonance_location * 3.0  // Very distant
    }
}

/// Resonance parameter - likelihood of mean-motion resonance
fn calculate_resonance_parameter(obj: &KuiperBeltObject) -> f64 {
    // Check proximity to various known resonances
    let mut resonance_strength = 0.0;

    // Check main Neptune resonances
    let resonances = vec![
        (39.5, "3:2 Plutino"),
        (47.8, "2:1 Twotino"),
        (55.4, "5:2"),
        (62.0, "7:3"),
        (71.5, "2:1 strong"),
    ];

    for (res_a, _name) in resonances {
        let distance_from_resonance = (obj.a - res_a).abs();
        if distance_from_resonance < 5.0 {
            // Closer = stronger resonance effect
            resonance_strength += (1.0 - distance_from_resonance / 5.0) * 0.3;
        }
    }

    resonance_strength.min(1.0)
}

/// Kozai-Lidov mechanism susceptibility
/// High i and e objects are susceptible to coupled oscillations
fn calculate_kozai_lidov_susceptibility(obj: &KuiperBeltObject) -> f64 {
    // Kozai-Lidov effect couples eccentricity and inclination
    // Strongest when: high initial inclination + moderate eccentricity

    let inclination_factor = (obj.i / 90.0).min(1.0);
    let eccentricity_factor = (obj.e / 0.7).min(1.0);

    // Synergistic effect: both needed for strong KL cycling
    inclination_factor * eccentricity_factor * 0.8
}

/// Classifies which stability region the object occupies
fn classify_stability_region(obj: &KuiperBeltObject) -> String {
    if obj.a < 50.0 {
        "Classical/Plutino".to_string()
    } else if obj.a < 65.0 {
        "Inner Scattered Disk".to_string()
    } else if obj.a < 100.0 {
        if obj.e > 0.3 {
            "High-Eccentricity Scattered Disk".to_string()
        } else {
            "Low-Eccentricity Scattered Disk".to_string()
        }
    } else if obj.a < 200.0 {
        "Detached/Extreme".to_string()
    } else {
        "Ultra-Distant".to_string()
    }
}

/// Generates detailed reasoning for stability classification
fn generate_stability_reasoning(
    obj: &KuiperBeltObject,
    stability_index: f64,
    chaos_indicator: f64,
    is_high_e: bool,
    suggested_mass: f64,
    resonance_factor: f64,
) -> String {
    let mut reasoning = String::new();

    // Opening statement
    if stability_index > 0.7 {
        reasoning.push_str("STABLE OBJECT: ");
    } else if stability_index > 0.4 {
        reasoning.push_str("MARGINALLY STABLE - REQUIRES EXPLANATION: ");
    } else {
        reasoning.push_str("UNSTABLE OBJECT THAT SHOULD NOT EXIST: ");
    }

    // Orbital element analysis
    reasoning.push_str(&format!(
        "Object at a={:.2} AU, e={:.3} (q={:.2}, ad={:.2}), i={:.2}°. ",
        obj.a, obj.e, obj.q, obj.ad, obj.i
    ));

    // Stability assessment
    if stability_index <= 0.4 {
        reasoning.push_str(&format!(
            "Stability index is only {:.2} - orbital dynamics predict chaos on Gyr timescales. ",
            stability_index
        ));

        if is_high_e {
            reasoning.push_str(&format!(
                "Eccentricity of {:.3} is dangerously high for semi-major axis range. ",
                obj.e
            ));
        }

        if obj.a > 50.0 && obj.a < 100.0 {
            reasoning.push_str(&format!(
                "Semi-major axis of {:.1} AU places object in naturally chaotic region between classical and extreme populations. ",
                obj.a
            ));
        }

        // Stabilization mechanism
        reasoning.push_str(&format!(
            "STABILIZATION REQUIRED: Estimated need for {:.1} Earth-mass perturber ", suggested_mass
        ));

        if resonance_factor > 0.2 {
            reasoning.push_str(&format!(
                "at mean-motion resonance (resonance factor: {:.2}) ",
                resonance_factor
            ));
        }

        reasoning.push_str("to prevent orbital decay or ejection within the age of solar system. ");

        // Mechanism description
        reasoning.push_str("Mechanism: Outer massive planet can stabilize through mean-motion resonance, creating protected regions where chaotic diffusion is suppressed. ");
    } else if stability_index > 0.4 && stability_index < 0.7 {
        reasoning.push_str(&format!(
            "Marginally stable with index {:.2}. ",
            stability_index
        ));

        if resonance_factor > 0.1 {
            reasoning.push_str(&format!(
                "Resonance coupling (factor: {:.2}) may provide stabilization. ",
                resonance_factor
            ));
        }

        reasoning.push_str("Small perturbations could destabilize orbit.");
    } else {
        reasoning.push_str(&format!(
            "Self-stable with index {:.2}. No external stabilization required. ",
            stability_index
        ));
    }

    reasoning.push_str(&format!("Chaos indicator: {:.2}/1.0. ", chaos_indicator));

    reasoning
}

fn main() {
    println!("╔═══════════════════════════════════════════════════════════════╗");
    println!("║         DYNAMICAL STABILITY ANALYSIS - AGENT 12               ║");
    println!("║     Kuiper Belt Objects in Potentially Unstable Regions       ║");
    println!("╚═══════════════════════════════════════════════════════════════╝\n");

    // Get all KBO data
    let all_objects = get_kbo_data();

    // Filter for target region: 50 < a < 100 AU and e > 0.3
    let mut target_objects: Vec<_> = all_objects
        .iter()
        .filter(|obj| obj.a > 50.0 && obj.a < 100.0 && obj.e > 0.3)
        .collect();

    println!("ANALYSIS PARAMETERS:");
    println!("  Semi-major axis range: 50 < a < 100 AU");
    println!("  Eccentricity threshold: e > 0.3");
    println!("  Target region: High-e scattered disk objects");
    println!("  Total dataset: {} KBOs", all_objects.len());
    println!("  Objects in target region: {}\n", target_objects.len());

    // Analyze stability of each object
    let mut analyses: Vec<_> = target_objects
        .iter()
        .map(|obj| analyze_stability(obj))
        .collect();

    // Sort by stability index (unstable first)
    analyses.sort_by(|a, b| a.stability_index.partial_cmp(&b.stability_index).unwrap());

    // Statistics
    let unstable_count = analyses.iter().filter(|a| a.stability_index < 0.4).count();
    let marginally_stable = analyses
        .iter()
        .filter(|a| a.stability_index >= 0.4 && a.stability_index < 0.7)
        .count();
    let stable_count = analyses.iter().filter(|a| a.stability_index >= 0.7).count();

    println!("STABILITY CLASSIFICATION:");
    println!("  Unstable (index < 0.4): {} objects", unstable_count);
    println!("  Marginally stable (0.4-0.7): {} objects", marginally_stable);
    println!("  Stable (index > 0.7): {} objects\n", stable_count);

    if unstable_count > 0 {
        println!("╔═══════════════════════════════════════════════════════════════╗");
        println!("║ CRITICAL FINDINGS: OBJECTS THAT SHOULD NOT BE STABLE        ║");
        println!("╚═══════════════════════════════════════════════════════════════╝\n");

        let mut stabilizer_masses: Vec<f64> = Vec::new();

        for analysis in &analyses {
            if analysis.stability_index < 0.4 {
                println!("OBJECT: {}", analysis.name);
                println!("  Orbital parameters:");
                println!("    a = {:.2} AU, e = {:.3}, i = {:.2}°", analysis.a, analysis.e, analysis.i);
                println!("    q = {:.2} AU, ad = {:.2} AU", analysis.q, analysis.ad);
                println!("  Stability metrics:");
                println!("    Stability Index: {:.3}/1.0 ← UNSTABLE", analysis.stability_index);
                println!("    Chaos Indicator: {:.3}/1.0", analysis.chaos_indicator);
                println!("    Resonance Factor: {:.3}", analysis.resonance_factor);
                println!("  Region: {}", analysis.classification);
                println!("  Reasoning: {}", analysis.reasoning);
                println!("  Required Stabilizer:");
                println!("    Estimated mass: {:.1} Earth masses", analysis.suggested_stabilizer_mass);
                println!("    Location: ~{:.0} AU from Sun", analysis.stabilizer_location);
                println!();

                stabilizer_masses.push(analysis.suggested_stabilizer_mass);
            }
        }

        if !stabilizer_masses.is_empty() {
            let avg_mass: f64 = stabilizer_masses.iter().sum::<f64>() / stabilizer_masses.len() as f64;
            println!("\nSTABILIZER MASS SUMMARY:");
            println!("  Average required mass: {:.1} Earth masses", avg_mass);
            println!("  Range: {:.1} - {:.1} Earth masses",
                stabilizer_masses.iter().cloned().fold(f64::INFINITY, f64::min),
                stabilizer_masses.iter().cloned().fold(0.0, f64::max)
            );
        }
    }

    // Marginally stable objects
    if marginally_stable > 0 {
        println!("\n╔═══════════════════════════════════════════════════════════════╗");
        println!("║  MARGINALLY STABLE OBJECTS - REQUIRE MONITORING              ║");
        println!("╚═══════════════════════════════════════════════════════════════╝\n");

        for analysis in &analyses {
            if analysis.stability_index >= 0.4 && analysis.stability_index < 0.7 {
                println!("OBJECT: {}", analysis.name);
                println!("  a = {:.2} AU, e = {:.3} (Stability: {:.2})", analysis.a, analysis.e, analysis.stability_index);
                println!("  Region: {}", analysis.classification);
                if analysis.resonance_factor > 0.2 {
                    println!("  Note: Strong resonance factor ({:.2}) provides stability", analysis.resonance_factor);
                }
                println!();
            }
        }
    }

    // Summary table
    println!("\n╔═══════════════════════════════════════════════════════════════╗");
    println!("║  COMPLETE ANALYSIS TABLE - ALL OBJECTS IN TARGET REGION      ║");
    println!("╚═══════════════════════════════════════════════════════════════╝\n");

    println!("{:<35} {:>8} {:>8} {:>10} {:>12}", "Object", "a (AU)", "e", "Stability", "Class");
    println!("{}", "─".repeat(73));

    for analysis in &analyses {
        let stability_label = if analysis.stability_index < 0.4 {
            "UNSTABLE!"
        } else if analysis.stability_index < 0.7 {
            "MARGINAL"
        } else {
            "STABLE"
        };

        println!("{:<35} {:>8.2} {:>8.3} {:>10.3} {:>12}",
            analysis.name,
            analysis.a,
            analysis.e,
            analysis.stability_index,
            stability_label
        );
    }

    println!("\n╔═══════════════════════════════════════════════════════════════╗");
    println!("║  KEY FINDINGS AND INTERPRETATION                             ║");
    println!("╚═══════════════════════════════════════════════════════════════╝\n");

    println!("CONCLUSION:");
    if unstable_count > 0 {
        println!("✓ {} objects identified in unstable orbital regions (50-100 AU, e > 0.3)", unstable_count);
        println!("✓ These objects require stabilization from external perturbations");
        println!("✓ Most likely mechanism: Outer planetary perturber (Planet Nine?)");
        println!("✓ Evidence suggests massive body with stabilizing resonance pattern");
    } else {
        println!("✓ All objects in target region show marginal to stable configurations");
        println!("✓ Existing resonance architecture may provide natural stabilization");
    }

    println!("\nSTABILIZATION MECHANISMS:");
    println!("1. Mean-Motion Resonance: Outer planet in 2:1 or 3:2 with object");
    println!("2. Secular Resonance: Long-period orbital element coupling");
    println!("3. Dynamical Shepherding: Planet clears competing perturbers");
    println!("4. Kozai-Lidov Stabilization: Inclination-eccentricity coupling");
}

// Stub for KBO data - would load from actual data in real implementation
fn get_kbo_data() -> Vec<KuiperBeltObject> {
    // High-e scattered disk objects (priority targets for analysis)
    vec![
        // High-e objects in 50-100 AU range
        KuiperBeltObject {
            name: "136199 Eris".to_string(),
            a: 68.0, e: 0.4370, i: 43.87, q: 38.284, ad: 97.71,
            period: 205000.0, omega: 36.03, w: 150.73, h: Some(-1.25), class: "TNO".to_string(),
        },
        KuiperBeltObject {
            name: "225088 Gonggong".to_string(),
            a: 66.89, e: 0.5032, i: 30.87, q: 33.235, ad: 100.55,
            period: 200000.0, omega: 336.84, w: 206.64, h: Some(1.84), class: "TNO".to_string(),
        },
        KuiperBeltObject {
            name: "15874 (1996 TL66)".to_string(),
            a: 84.89, e: 0.5866, i: 23.96, q: 35.094, ad: 134.69,
            period: 286000.0, omega: 217.70, w: 185.14, h: Some(5.41), class: "TNO".to_string(),
        },
        KuiperBeltObject {
            name: "26181 (1996 GQ21)".to_string(),
            a: 92.48, e: 0.5874, i: 13.36, q: 38.152, ad: 146.81,
            period: 325000.0, omega: 194.22, w: 356.02, h: Some(4.84), class: "TNO".to_string(),
        },
        KuiperBeltObject {
            name: "26375 (1999 DE9)".to_string(),
            a: 55.5, e: 0.4201, i: 7.61, q: 32.184, ad: 78.81,
            period: 151000.0, omega: 322.88, w: 159.37, h: Some(4.89), class: "TNO".to_string(),
        },
        KuiperBeltObject {
            name: "145480 (2005 TB190)".to_string(),
            a: 75.93, e: 0.3912, i: 26.48, q: 46.227, ad: 105.64,
            period: 242000.0, omega: 180.46, w: 171.99, h: Some(4.49), class: "TNO".to_string(),
        },
        KuiperBeltObject {
            name: "229762 G!kun||'homdima".to_string(),
            a: 74.59, e: 0.4961, i: 23.33, q: 37.585, ad: 111.59,
            period: 235000.0, omega: 131.24, w: 345.94, h: Some(3.45), class: "TNO".to_string(),
        },
        KuiperBeltObject {
            name: "145451 Rumina".to_string(),
            a: 92.27, e: 0.6190, i: 28.70, q: 35.160, ad: 149.39,
            period: 324000.0, omega: 84.63, w: 318.73, h: Some(4.59), class: "TNO".to_string(),
        },
        KuiperBeltObject {
            name: "65489 Ceto".to_string(),
            a: 100.5, e: 0.8238, i: 22.30, q: 17.709, ad: 183.25,
            period: 368000.0, omega: 171.95, w: 319.46, h: Some(6.47), class: "TNO".to_string(),
        },
        KuiperBeltObject {
            name: "127546 (2002 XU93)".to_string(),
            a: 66.9, e: 0.6862, i: 77.95, q: 20.991, ad: 112.80,
            period: 200000.0, omega: 90.21, w: 28.02, h: Some(8.06), class: "TNO".to_string(),
        },
        KuiperBeltObject {
            name: "65407 (2002 RP120)".to_string(),
            a: 54.53, e: 0.9542, i: 119.37, q: 2.498, ad: 106.57,
            period: 147000.0, omega: 39.01, w: 357.97, h: Some(12.43), class: "TNO".to_string(),
        },
    ]
}
