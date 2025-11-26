//! # Anti-Alignment Analysis Executable
//!
//! Runs the complete anti-alignment analysis for ETNOs and generates
//! formatted output with statistical interpretation.

mod kbo_data;
mod kuiper_cluster;
mod anti_alignment_analysis;

use anti_alignment_analysis::{analyze_anti_alignment, generate_anti_alignment_report};
use std::fs;

fn main() {
    println!("\nInitializing Anti-Alignment Analysis for ETNOs...\n");

    // Run analysis
    let analysis = analyze_anti_alignment();

    // Generate report
    let report = generate_anti_alignment_report(&analysis);

    // Print to stdout
    println!("{}", report);

    // Save to file
    let output_path = "anti_alignment_results.txt";
    match fs::write(output_path, &report) {
        Ok(_) => println!("\n✓ Report saved to: {}", output_path),
        Err(e) => eprintln!("Error saving report: {}", e),
    }

    // Summary statistics
    println!("\n═══════════════════════════════════════════════════════════════");
    println!("SUMMARY STATISTICS");
    println!("═══════════════════════════════════════════════════════════════");
    println!("Total filtered objects (a > 150 AU, q > 30 AU): {}", analysis.filtered_objects.len());
    println!("Mean longitude of perihelion: {:.2}°", analysis.mean_longitude);
    println!("Std dev: {:.2}°", analysis.std_dev_longitude);
    println!("Hypothetical planet position: {:.2}°", analysis.hypothetical_planet_longitude);
    println!("Anti-aligned objects (±45°): {}", analysis.objects_in_anti_aligned_region.len());
    println!("Anti-aligned fraction: {:.1}%", analysis.anti_aligned_fraction * 100.0);
    println!("Concentration metric (R̄): {:.4}", analysis.concentration_metric);
    println!("Planet evidence score: {:.4} ({:.1}%)",
        analysis.planet_evidence_score,
        analysis.planet_evidence_score * 100.0);
    println!("═══════════════════════════════════════════════════════════════\n");
}
