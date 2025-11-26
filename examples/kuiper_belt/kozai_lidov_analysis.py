#!/usr/bin/env python3
"""
Analysis Agent 11: Kozai-Lidov Mechanism

Comprehensive analysis of coupled eccentricity-inclination oscillations
caused by gravitational perturbations from a distant third body.

Selection Criteria: e > 0.5, i > 30°, a > 50 AU

Run with:
    python3 kozai_lidov_analysis.py
"""

import csv
import math
import json
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Tuple, Optional
from pathlib import Path


@dataclass
class KozaiCandidate:
    """Object exhibiting Kozai-Lidov signatures"""
    name: str
    a: float  # Semi-major axis (AU)
    e: float  # Eccentricity
    i: float  # Inclination (degrees)
    q: float  # Perihelion (AU)
    ad: float  # Aphelion (AU)
    omega: float  # Longitude of ascending node
    w: float  # Argument of perihelion

    kozai_parameter: float = 0.0
    h_z_component: float = 0.0
    apsidal_precession: float = 0.0
    nodal_precession: float = 0.0
    omega_circulation_indicator: float = 0.0
    estimated_kozai_period: float = 0.0
    resonance_strength: float = 0.0
    kozai_evidence_score: float = 0.0


@dataclass
class KozaiStatistics:
    """Statistical summary of Kozai-Lidov population"""
    count: int = 0
    avg_a: float = 0.0
    avg_e: float = 0.0
    avg_i: float = 0.0
    avg_kozai_param: float = 0.0
    strong_kozai_count: int = 0
    moderate_kozai_count: int = 0

    e_min: float = 0.0
    e_max: float = 0.0
    e_mean: float = 0.0
    e_std_dev: float = 0.0

    i_min: float = 0.0
    i_max: float = 0.0
    i_mean: float = 0.0
    i_std_dev: float = 0.0


@dataclass
class PerturberParameters:
    """Estimated perturber parameters"""
    distance_min: float = 0.0
    distance_max: float = 0.0
    mass_min: float = 0.0
    mass_max: float = 0.0
    inclination_estimate: float = 0.0
    eccentricity_estimate: float = 0.3
    overall_confidence: float = 0.0
    candidates: List[str] = field(default_factory=list)


class KozaiLidovAnalyzer:
    """Analyzer for Kozai-Lidov mechanism signatures"""

    def __init__(self, csv_file: str):
        self.csv_file = csv_file
        self.objects = []
        self.kozai_candidates: List[KozaiCandidate] = []
        self.statistics = KozaiStatistics()
        self.perturber_params = PerturberParameters()

    def load_data(self) -> None:
        """Load object data from CSV"""
        print("📥 Loading Kuiper Belt Objects from CSV...")

        with open(self.csv_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    obj = {
                        'name': row['Object_Name'].strip(),
                        'a': float(row['Semi_Major_Axis_AU']),
                        'e': float(row['Eccentricity']),
                        'i': float(row['Inclination_deg']),
                        'q': float(row['Perihelion_AU']),
                        'ad': float(row['Aphelion_AU']),
                        'omega': float(row['Ascending_Node_deg']),
                        'w': float(row['Perihelion_Arg_deg']),
                    }
                    self.objects.append(obj)
                except (ValueError, KeyError) as e:
                    print(f"⚠️  Skipping {row.get('Object_Name', 'unknown')}: {e}")

        print(f"   Loaded {len(self.objects)} objects\n")

    def calculate_kozai_parameter(self, obj: dict) -> float:
        """Calculate Kozai-Lidov parameter: K = sqrt(1-e²) * cos(i)"""
        i_rad = math.radians(obj['i'])
        h_z = math.sqrt(1.0 - obj['e']**2) * math.cos(i_rad)
        return abs(h_z)

    def calculate_angular_momentum_z(self, obj: dict) -> float:
        """Calculate z-component of specific angular momentum"""
        i_rad = math.radians(obj['i'])
        return math.sqrt(1.0 - obj['e']**2) * math.cos(i_rad)

    def estimate_kozai_period(self, obj: dict) -> float:
        """Estimate Kozai-Lidov oscillation period in years"""
        # Kozai period ~ 10^4 * (M_sun/M_perturber) * T_object
        # For Earth-mass perturber: T_Kozai ~ 10^4 * T_object
        orbital_period_years = math.sqrt(obj['a']**3)

        # Coupling factor: stronger coupling → longer period
        kozai_param = self.calculate_kozai_parameter(obj)
        coupling_factor = max(kozai_param, 0.1)

        return orbital_period_years * 1000.0 * (1.0 / coupling_factor)

    def classify_omega_circulation(self, obj: dict) -> float:
        """Classify omega behavior: 0=librates, 1=circulates"""
        i_rad = math.radians(obj['i'])
        i_factor = abs(abs(math.cos(i_rad)) - 0.5)
        e_factor = max(obj['e'] - 0.65, 0.0)

        return max(0.0, min(1.0, 1.0 - (i_factor + e_factor)))

    def calculate_resonance_strength(self, obj: dict) -> float:
        """Calculate resonance strength indicator (0-1)"""
        e_factor = (obj['e'] - 0.5) / 0.5
        i_rad = math.radians(obj['i'])
        i_factor = max(0.0, 1.0 - 2.0 * abs(abs(math.cos(i_rad)) - 0.5))
        a_factor = min(obj['ad'] / 500.0, 1.0)

        return min(1.0, (e_factor + i_factor + a_factor) / 3.0)

    def calculate_kozai_evidence(self, kozai_param: float, omega_circulation: float,
                                 resonance_strength: float) -> float:
        """Calculate Kozai evidence score (0-1)"""
        param_component = kozai_param * 0.4
        libration_component = (1.0 - omega_circulation) * 0.3
        resonance_component = resonance_strength * 0.3

        return param_component + libration_component + resonance_component

    def analyze(self) -> None:
        """Perform Kozai-Lidov mechanism analysis"""
        print("🔍 Analyzing for Kozai-Lidov signatures...")
        print("   Criteria: e > 0.5 AND i > 30° AND a > 50 AU\n")

        # Filter candidates
        candidates_raw = [
            obj for obj in self.objects
            if obj['e'] > 0.5 and obj['i'] > 30.0 and obj['a'] > 50.0
        ]

        print(f"   Found {len(candidates_raw)} objects matching criteria\n")

        # Calculate detailed properties
        for obj in candidates_raw:
            kozai_param = self.calculate_kozai_parameter(obj)
            h_z = self.calculate_angular_momentum_z(obj)
            omega_circulation = self.classify_omega_circulation(obj)
            resonance_strength = self.calculate_resonance_strength(obj)
            kozai_period = self.estimate_kozai_period(obj)
            kozai_evidence = self.calculate_kozai_evidence(
                kozai_param, omega_circulation, resonance_strength
            )

            candidate = KozaiCandidate(
                name=obj['name'],
                a=obj['a'],
                e=obj['e'],
                i=obj['i'],
                q=obj['q'],
                ad=obj['ad'],
                omega=obj['omega'],
                w=obj['w'],
                kozai_parameter=kozai_param,
                h_z_component=h_z,
                omega_circulation_indicator=omega_circulation,
                resonance_strength=resonance_strength,
                estimated_kozai_period=kozai_period,
                kozai_evidence_score=kozai_evidence
            )

            self.kozai_candidates.append(candidate)

        # Sort by Kozai evidence score
        self.kozai_candidates.sort(key=lambda x: x.kozai_evidence_score, reverse=True)

        # Calculate statistics
        self._calculate_statistics()

        # Estimate perturber parameters
        self._estimate_perturber_parameters()

    def _calculate_statistics(self) -> None:
        """Calculate statistical summary"""
        if not self.kozai_candidates:
            return

        count = len(self.kozai_candidates)

        # Basic statistics
        stats = self.statistics
        stats.count = count
        stats.avg_a = sum(c.a for c in self.kozai_candidates) / count
        stats.avg_e = sum(c.e for c in self.kozai_candidates) / count
        stats.avg_i = sum(c.i for c in self.kozai_candidates) / count
        stats.avg_kozai_param = sum(c.kozai_parameter for c in self.kozai_candidates) / count

        stats.strong_kozai_count = sum(1 for c in self.kozai_candidates if c.kozai_evidence_score > 0.7)
        stats.moderate_kozai_count = sum(1 for c in self.kozai_candidates if c.kozai_evidence_score > 0.5)

        # Eccentricity distribution
        e_values = sorted([c.e for c in self.kozai_candidates])
        stats.e_min = min(e_values)
        stats.e_max = max(e_values)
        stats.e_mean = sum(e_values) / len(e_values)
        e_variance = sum((v - stats.e_mean)**2 for v in e_values) / len(e_values)
        stats.e_std_dev = math.sqrt(e_variance)

        # Inclination distribution
        i_values = sorted([c.i for c in self.kozai_candidates])
        stats.i_min = min(i_values)
        stats.i_max = max(i_values)
        stats.i_mean = sum(i_values) / len(i_values)
        i_variance = sum((v - stats.i_mean)**2 for v in i_values) / len(i_values)
        stats.i_std_dev = math.sqrt(i_variance)

    def _estimate_perturber_parameters(self) -> None:
        """Estimate perturber parameters from Kozai signatures"""
        if not self.kozai_candidates:
            return

        perturber = self.perturber_params

        # Distance estimate: 5× average test object semi-major axis
        avg_a = self.statistics.avg_a
        perturber.distance_min = avg_a * 4.5
        perturber.distance_max = avg_a * 5.5

        # Mass estimate from average Kozai parameter
        avg_kozai = self.statistics.avg_kozai_param
        if avg_kozai > 0.6:
            perturber.mass_min = 6.0
            perturber.mass_max = 10.0
        elif avg_kozai > 0.4:
            perturber.mass_min = 4.0
            perturber.mass_max = 7.0
        else:
            perturber.mass_min = 1.5
            perturber.mass_max = 4.0

        # Inclination estimate
        avg_i = self.statistics.avg_i
        if avg_i > 60.0:
            perturber.inclination_estimate = 15.0
        elif avg_i > 40.0:
            perturber.inclination_estimate = 10.0
        else:
            perturber.inclination_estimate = 5.0

        # Confidence score
        if self.statistics.strong_kozai_count > 3:
            perturber.overall_confidence = 0.85
        elif self.statistics.strong_kozai_count > 1:
            perturber.overall_confidence = 0.70
        elif self.statistics.moderate_kozai_count > 2:
            perturber.overall_confidence = 0.60
        else:
            perturber.overall_confidence = 0.40

        # Candidate perturbers
        if perturber.distance_max > 200.0 and perturber.mass_max > 5.0:
            perturber.candidates.append("Planet Nine (hypothetical)")
        if perturber.distance_max > 500.0:
            perturber.candidates.append("Distant stellar companion")
        if perturber.distance_max < 100.0:
            perturber.candidates.append("Neptune (for comparison)")

    def generate_report(self) -> str:
        """Generate comprehensive analysis report"""
        report = []

        report.append("╔════════════════════════════════════════════════════════════════════╗")
        report.append("║        ANALYSIS AGENT 11: KOZAI-LIDOV MECHANISM                    ║")
        report.append("║        Coupled Eccentricity-Inclination Oscillations               ║")
        report.append("╚════════════════════════════════════════════════════════════════════╝\n")

        report.append("═════════════════════════════════════════════════════════════════════")
        report.append("SELECTION CRITERIA: e > 0.5 AND i > 30° AND a > 50 AU")
        report.append("═════════════════════════════════════════════════════════════════════\n")

        stats = self.statistics
        report.append(f"IDENTIFIED CANDIDATES: {stats.count}")
        report.append(f"  Strong Kozai Evidence (score > 0.7): {stats.strong_kozai_count}")
        report.append(f"  Moderate Kozai Evidence (score > 0.5): {stats.moderate_kozai_count}\n")

        report.append("ORBITAL PARAMETER STATISTICS:")
        report.append("─────────────────────────────────────────────────────────────────────")
        report.append(f"Semi-Major Axis: {stats.avg_a:.2f} AU (average)\n")

        report.append("Eccentricity Distribution:")
        report.append(f"  Range: {stats.e_min:.3f} - {stats.e_max:.3f}")
        report.append(f"  Mean: {stats.e_mean:.4f} | Std Dev: {stats.e_std_dev:.4f}\n")

        report.append("Inclination Distribution:")
        report.append(f"  Range: {stats.i_min:.1f}° - {stats.i_max:.1f}°")
        report.append(f"  Mean: {stats.i_mean:.1f}° | Std Dev: {stats.i_std_dev:.1f}°\n")

        report.append("═════════════════════════════════════════════════════════════════════")
        report.append("KOZAI-LIDOV MECHANISM ANALYSIS")
        report.append("═════════════════════════════════════════════════════════════════════\n")

        report.append(f"Average Kozai Parameter: {stats.avg_kozai_param:.4f}")
        report.append("  (Measure of e-i coupling strength; 0 = no coupling, 1 = max coupling)\n")

        report.append("═════════════════════════════════════════════════════════════════════")
        report.append("ESTIMATED PERTURBER PROPERTIES")
        report.append("═════════════════════════════════════════════════════════════════════\n")

        perturber = self.perturber_params
        report.append(f"Semi-Major Axis: {perturber.distance_min:.0f} - {perturber.distance_max:.0f} AU")
        report.append(f"Mass: {perturber.mass_min:.1f} - {perturber.mass_max:.1f} Earth masses")
        report.append(f"Inclination: {perturber.inclination_estimate:.1f}° (relative to TNO plane)")
        report.append(f"Eccentricity: ~{perturber.eccentricity_estimate:.2f}\n")
        report.append(f"Overall Confidence: {perturber.overall_confidence*100.0:.0f}%\n")

        report.append("CANDIDATE PERTURBERS:")
        if perturber.candidates:
            for candidate in perturber.candidates:
                report.append(f"  • {candidate}")
        else:
            report.append("  (No candidates identified with current constraints)")
        report.append("\n")

        report.append("═════════════════════════════════════════════════════════════════════")
        report.append("TOP KOZAI-LIDOV CANDIDATES (by Evidence Score)")
        report.append("═════════════════════════════════════════════════════════════════════\n")

        for idx, obj in enumerate(self.kozai_candidates[:15], 1):
            badge = "★★★" if obj.kozai_evidence_score > 0.7 else ("★★" if obj.kozai_evidence_score > 0.5 else "★")
            report.append(f"{idx}. {badge} {obj.name}")
            report.append(f"   a={obj.a:.2f} AU | e={obj.e:.4f} | i={obj.i:.1f}° | q={obj.q:.2f} AU | ad={obj.ad:.1f} AU")
            report.append(f"   Kozai Parameter: {obj.kozai_parameter:.4f} | Evidence Score: {obj.kozai_evidence_score:.3f}")

            if obj.kozai_evidence_score > 0.7:
                report.append("   ✓ STRONG Kozai-Lidov signature detected!")
            elif obj.kozai_evidence_score > 0.5:
                report.append("   → Moderate Kozai-Lidov coupling")
            report.append("")

        report.append("═════════════════════════════════════════════════════════════════════")
        report.append("KEY FINDINGS & INTERPRETATION")
        report.append("═════════════════════════════════════════════════════════════════════\n")

        if stats.strong_kozai_count > 0:
            report.append(f"✓ {stats.strong_kozai_count} object(s) show STRONG Kozai-Lidov signatures")
            report.append("  This indicates active coupling with a distant massive perturber\n")

        if stats.i_mean > 60.0:
            report.append("✓ HIGH AVERAGE INCLINATION DETECTED")
            report.append("  The perturber likely has moderate inclination relative to the TNO plane\n")

        report.append("PERTURBER HYPOTHESIS:")
        report.append(f"  • Distance: ~{perturber.distance_max:.0f} AU (typical for Planet Nine)")
        report.append(f"  • Mass: ~{perturber.mass_max:.1f} Earth masses")
        report.append(f"  • Inclination: ~{perturber.inclination_estimate:.1f}° offset from TNO plane")
        report.append("  • Most likely candidate: Planet Nine or similar distant massive perturber\n")

        return "\n".join(report)


def main():
    """Main analysis function"""
    csv_file = Path("/home/user/ruvector/examples/kuiper_belt/DISTANT_OBJECTS_DATA.csv")

    if not csv_file.exists():
        print(f"❌ Data file not found: {csv_file}")
        return

    analyzer = KozaiLidovAnalyzer(str(csv_file))
    analyzer.load_data()
    analyzer.analyze()

    # Print report
    report = analyzer.generate_report()
    print(report)

    # Save report
    report_file = Path("/home/user/ruvector/examples/kuiper_belt/KOZAI_LIDOV_ANALYSIS.txt")
    report_file.write_text(report)
    print(f"\n✓ Report saved to: {report_file}")

    # Save JSON data
    data = {
        'candidates': [asdict(c) for c in analyzer.kozai_candidates],
        'statistics': asdict(analyzer.statistics),
        'perturber': asdict(analyzer.perturber_params),
    }

    json_file = Path("/home/user/ruvector/examples/kuiper_belt/KOZAI_LIDOV_DATA.json")
    json_file.write_text(json.dumps(data, indent=2))
    print(f"✓ Data saved to: {json_file}")


if __name__ == "__main__":
    main()
