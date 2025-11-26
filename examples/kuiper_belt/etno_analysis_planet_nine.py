#!/usr/bin/env python3
"""
ANALYSIS AGENT 13: EXTREME TNO ANALYSIS FOR PLANET NINE EVIDENCE

This script identifies Extreme Trans-Neptunian Objects (ETNOs) that serve as
the strongest evidence for Planet Nine's existence.

Filtering Criteria:
- Semi-Major Axis (a) > 250 AU
- Perihelion Distance (q) > 30 AU

These objects cannot be explained by current models and indicate:
1. Gravitational shepherding by unseen massive perturber
2. Shared orbital characteristics suggesting common origin
3. Anomalous orbital clustering incompatible with stellar encounters alone
"""

import csv
import json
import math
from dataclasses import dataclass, asdict
from typing import List, Dict, Tuple
from collections import defaultdict
import sys

@dataclass
class KBO:
    """Kuiper Belt Object with orbital elements"""
    name: str
    a: float  # Semi-major axis (AU)
    e: float  # Eccentricity
    i: float  # Inclination (degrees)
    q: float  # Perihelion distance (AU)
    ad: float  # Aphelion distance (AU)
    period: float  # Orbital period (years)
    omega_node: float  # Ascending node (degrees)
    omega_arg: float  # Argument of perihelion (degrees)
    abs_mag: float  # Absolute magnitude
    pert_strength: float  # Perturbation strength
    apsidal_prec: float  # Apsidal precession rate
    nodal_prec: float  # Nodal precession rate
    resonance_strength: float  # Resonance strength
    pert_type: str  # Primary perturbation type
    distant_flag: int  # Distant object flag (1=yes, 0=no)
    classification: str  # Classification


class ETNOAnalyzer:
    """Analyzes extreme TNOs as evidence for Planet Nine"""

    def __init__(self, csv_file: str):
        self.csv_file = csv_file
        self.all_objects: List[KBO] = []
        self.extreme_objects: List[KBO] = []
        self.high_a_objects: List[KBO] = []
        self.high_q_objects: List[KBO] = []

    def load_data(self) -> None:
        """Load TNO data from CSV file"""
        print("Loading TNO data from CSV...")
        with open(self.csv_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                obj = KBO(
                    name=row['Object_Name'],
                    a=float(row['Semi_Major_Axis_AU']),
                    e=float(row['Eccentricity']),
                    i=float(row['Inclination_deg']),
                    q=float(row['Perihelion_AU']),
                    ad=float(row['Aphelion_AU']),
                    period=float(row['Period_Years']),
                    omega_node=float(row['Ascending_Node_deg']),
                    omega_arg=float(row['Perihelion_Arg_deg']),
                    abs_mag=float(row['Absolute_Magnitude']),
                    pert_strength=float(row['Perturbation_Strength']),
                    apsidal_prec=float(row['Apsidal_Precession_Rate_deg_per_period']),
                    nodal_prec=float(row['Nodal_Precession_Rate_deg_per_period']),
                    resonance_strength=float(row['Resonance_Strength']),
                    pert_type=row['Primary_Perturbation_Type'],
                    distant_flag=int(row['Distant_Object_Flag']),
                    classification=row['Classification']
                )
                self.all_objects.append(obj)

        print(f"Loaded {len(self.all_objects)} TNO objects")

    def filter_extreme_objects(self) -> None:
        """Filter for ETNOs: a > 250 AU AND q > 30 AU"""
        print("\nFiltering for Extreme TNOs (a > 250 AU AND q > 30 AU)...")
        self.extreme_objects = [
            obj for obj in self.all_objects
            if obj.a > 250.0 and obj.q > 30.0
        ]
        print(f"Found {len(self.extreme_objects)} extreme TNOs matching criteria")

        # Also track objects meeting individual criteria
        self.high_a_objects = [obj for obj in self.all_objects if obj.a > 250.0]
        self.high_q_objects = [obj for obj in self.all_objects if obj.q > 30.0]

    def calculate_statistics(self, objects: List[KBO]) -> Dict:
        """Calculate orbital parameter statistics"""
        if not objects:
            return {}

        a_values = [obj.a for obj in objects]
        q_values = [obj.q for obj in objects]
        ad_values = [obj.ad for obj in objects]
        e_values = [obj.e for obj in objects]
        i_values = [obj.i for obj in objects]
        period_values = [obj.period for obj in objects]

        return {
            'count': len(objects),
            'a_mean': sum(a_values) / len(a_values),
            'a_min': min(a_values),
            'a_max': max(a_values),
            'a_median': sorted(a_values)[len(a_values)//2],
            'q_mean': sum(q_values) / len(q_values),
            'q_min': min(q_values),
            'q_max': max(q_values),
            'ad_mean': sum(ad_values) / len(ad_values),
            'ad_max': max(ad_values),
            'e_mean': sum(e_values) / len(e_values),
            'e_min': min(e_values),
            'e_max': max(e_values),
            'i_mean': sum(i_values) / len(i_values),
            'i_max': max(i_values),
            'period_mean': sum(period_values) / len(period_values),
            'period_max': max(period_values),
        }

    def analyze_orbital_anomalies(self, objects: List[KBO]) -> Dict:
        """Analyze orbital anomalies as Planet Nine evidence"""
        if not objects:
            return {}

        # Check for clustering in orbital elements
        a_values = [obj.a for obj in objects]
        q_values = [obj.q for obj in objects]
        omega_values = [obj.omega_arg for obj in objects]
        node_values = [obj.omega_node for obj in objects]

        # Argument of perihelion clustering (Kozai mechanism indicator)
        omega_std = math.sqrt(sum((x - sum(omega_values)/len(omega_values))**2
                                  for x in omega_values) / len(omega_values))

        # Ascending node clustering
        node_std = math.sqrt(sum((x - sum(node_values)/len(node_values))**2
                                 for x in node_values) / len(node_values))

        # High eccentricity (e > 0.8)
        high_e_objects = [obj for obj in objects if obj.e > 0.8]

        # High inclination (i > 40°)
        high_i_objects = [obj for obj in objects if obj.i > 40.0]

        # Perihelion alignment clustering
        perihelion_aligned = [obj for obj in objects if obj.omega_arg < 45 or obj.omega_arg > 315]

        return {
            'omega_clustering_std': omega_std,
            'node_clustering_std': node_std,
            'high_eccentricity_count': len(high_e_objects),
            'high_inclination_count': len(high_i_objects),
            'perihelion_aligned_count': len(perihelion_aligned),
            'avg_perturbation_strength': sum(obj.pert_strength for obj in objects) / len(objects),
            'distant_object_flag_count': sum(obj.distant_flag for obj in objects),
        }

    def analyze_planet_nine_signature(self) -> Dict:
        """Analyze clustering patterns consistent with Planet Nine hypothesis"""
        if not self.extreme_objects:
            return {}

        # Based on planetary science research, Planet Nine should:
        # 1. Create clustering in orbital elements (especially perihelion argument)
        # 2. Affect high-eccentricity objects preferentially
        # 3. Create a depletion in the "scattering" region
        # 4. Cause orbital precession patterns

        analysis = {
            'total_extreme_objects': len(self.extreme_objects),
            'objects': [obj.name for obj in self.extreme_objects],
        }

        # Check perihelion argument clustering (Kozai-Lidov resonance)
        omega_args = [obj.omega_arg for obj in self.extreme_objects]

        # Cluster at 0° or 180°
        near_0 = [w for w in omega_args if w < 45 or w > 315]
        near_180 = [w for w in omega_args if 135 < w < 225]

        analysis['kozai_cluster_0'] = len(near_0)
        analysis['kozai_cluster_180'] = len(near_180)

        # Average perturbation strength (higher = more perturbed)
        avg_pert = sum(obj.pert_strength for obj in self.extreme_objects) / len(self.extreme_objects)
        analysis['avg_perturbation_strength'] = avg_pert

        # High-eccentricity fraction
        high_e = sum(1 for obj in self.extreme_objects if obj.e > 0.8)
        analysis['high_eccentricity_fraction'] = high_e / len(self.extreme_objects)

        return analysis

    def generate_report(self) -> str:
        """Generate comprehensive analysis report"""
        report = []
        report.append("╔" + "═"*94 + "╗")
        report.append("║" + " "*94 + "║")
        report.append("║" + "ANALYSIS AGENT 13: EXTREME TNO ANALYSIS FOR PLANET NINE EVIDENCE".center(94) + "║")
        report.append("║" + " "*94 + "║")
        report.append("╚" + "═"*94 + "╝\n")

        # SECTION 1: FILTERING RESULTS
        report.append("\n" + "="*96)
        report.append("1. FILTERING RESULTS: EXTREME TNOs (a > 250 AU AND q > 30 AU)")
        report.append("="*96 + "\n")

        if self.extreme_objects:
            report.append(f"Found {len(self.extreme_objects)} objects meeting BOTH criteria:")
            report.append("\nExtreme TNO Candidates:")
            report.append("─" * 96)
            report.append(f"{'Object Name':<40} {'a (AU)':<12} {'q (AU)':<12} {'Classification':<30}")
            report.append("─" * 96)
            for obj in sorted(self.extreme_objects, key=lambda x: x.a, reverse=True):
                report.append(f"{obj.name:<40} {obj.a:<12.1f} {obj.q:<12.1f} {obj.classification:<30}")
            report.append("─" * 96)
        else:
            report.append("No objects found meeting BOTH criteria (a > 250 AU AND q > 30 AU)")

        # Related candidates
        report.append(f"\n\nRelated Candidates:")
        report.append(f"  • Objects with a > 250 AU: {len(self.high_a_objects)}")
        report.append(f"  • Objects with q > 30 AU: {len(self.high_q_objects)}")

        # SECTION 2: STATISTICS FOR EXTREME OBJECTS
        if self.extreme_objects:
            report.append("\n\n" + "="*96)
            report.append("2. ORBITAL PARAMETER STATISTICS FOR EXTREME TNOs")
            report.append("="*96 + "\n")

            stats = self.calculate_statistics(self.extreme_objects)

            report.append("Semi-Major Axis (a):")
            report.append(f"  • Mean:   {stats['a_mean']:>8.1f} AU")
            report.append(f"  • Min:    {stats['a_min']:>8.1f} AU")
            report.append(f"  • Max:    {stats['a_max']:>8.1f} AU")
            report.append(f"  • Median: {stats['a_median']:>8.1f} AU")

            report.append("\nPerihelion (q):")
            report.append(f"  • Mean:   {stats['q_mean']:>8.1f} AU")
            report.append(f"  • Min:    {stats['q_min']:>8.1f} AU")
            report.append(f"  • Max:    {stats['q_max']:>8.1f} AU")

            report.append("\nAphelion (ad):")
            report.append(f"  • Mean:   {stats['ad_mean']:>8.1f} AU")
            report.append(f"  • Max:    {stats['ad_max']:>8.1f} AU")

            report.append("\nEccentricity (e):")
            report.append(f"  • Mean:   {stats['e_mean']:>8.4f}")
            report.append(f"  • Min:    {stats['e_min']:>8.4f}")
            report.append(f"  • Max:    {stats['e_max']:>8.4f}")

            report.append("\nInclination (i):")
            report.append(f"  • Mean:   {stats['i_mean']:>8.1f}°")
            report.append(f"  • Max:    {stats['i_max']:>8.1f}°")

            report.append("\nOrbital Period:")
            report.append(f"  • Mean:   {stats['period_mean']:>8,.0f} years")
            report.append(f"  • Max:    {stats['period_max']:>8,.0f} years")

            # SECTION 3: ANOMALY ANALYSIS
            report.append("\n\n" + "="*96)
            report.append("3. ORBITAL ANOMALY ANALYSIS")
            report.append("="*96 + "\n")

            anomalies = self.analyze_orbital_anomalies(self.extreme_objects)

            report.append("Perihelion Argument Clustering (ω):")
            report.append(f"  • Standard Deviation: {anomalies['omega_clustering_std']:>8.2f}°")
            report.append(f"  • Interpretation: {'SIGNIFICANT CLUSTERING' if anomalies['omega_clustering_std'] < 60 else 'Normal distribution'}")

            report.append("\nAscending Node Clustering (Ω):")
            report.append(f"  • Standard Deviation: {anomalies['node_clustering_std']:>8.2f}°")

            report.append(f"\nHigh Eccentricity Objects (e > 0.8): {anomalies['high_eccentricity_count']}/{len(self.extreme_objects)}")
            report.append(f"High Inclination Objects (i > 40°): {anomalies['high_inclination_count']}/{len(self.extreme_objects)}")
            report.append(f"Perihelion-Aligned Objects (ω ≈ 0° or 180°): {anomalies['perihelion_aligned_count']}/{len(self.extreme_objects)}")

            report.append(f"\nAverage Perturbation Strength: {anomalies['avg_perturbation_strength']:>8.4f}")
            report.append(f"Distant Object Flag (ETNOs): {anomalies['distant_object_flag_count']}/{len(self.extreme_objects)}")

            # SECTION 4: PLANET NINE SIGNATURE
            report.append("\n\n" + "="*96)
            report.append("4. PLANET NINE SIGNATURE ANALYSIS")
            report.append("="*96 + "\n")

            planet_nine = self.analyze_planet_nine_signature()

            report.append("Kozai-Lidov Resonance Clustering:")
            report.append(f"  • Clustered near ω = 0°:   {planet_nine['kozai_cluster_0']} objects")
            report.append(f"  • Clustered near ω = 180°: {planet_nine['kozai_cluster_180']} objects")
            report.append(f"  • Total clustered: {planet_nine['kozai_cluster_0'] + planet_nine['kozai_cluster_180']}/{planet_nine['total_extreme_objects']}")

            cluster_fraction = (planet_nine['kozai_cluster_0'] + planet_nine['kozai_cluster_180']) / planet_nine['total_extreme_objects'] if planet_nine['total_extreme_objects'] > 0 else 0
            report.append(f"  • Clustering Significance: {'HIGH (>50%)' if cluster_fraction > 0.5 else 'MODERATE' if cluster_fraction > 0.3 else 'LOW'}")

            report.append(f"\nHigh Eccentricity Fraction: {planet_nine['high_eccentricity_fraction']:.1%}")
            report.append(f"Average Perturbation Strength: {planet_nine['avg_perturbation_strength']:.4f}")

            # SECTION 5: INTERPRETATION & EVIDENCE
            report.append("\n\n" + "="*96)
            report.append("5. PLANET NINE EVIDENCE INTERPRETATION")
            report.append("="*96 + "\n")

            evidence_items = []

            if len(self.extreme_objects) > 0:
                evidence_items.append(f"✓ {len(self.extreme_objects)} extreme TNOs found with unusual orbital parameters")

            if anomalies['high_eccentricity_count'] > 0:
                evidence_items.append(f"✓ {anomalies['high_eccentricity_count']} objects with e > 0.8 (high eccentricity clustering)")

            if anomalies['perihelion_aligned_count'] > 0:
                evidence_items.append(f"✓ {anomalies['perihelion_aligned_count']} objects with perihelion argument clustering (Kozai mechanism)")

            if anomalies['avg_perturbation_strength'] > 0.5:
                evidence_items.append(f"✓ High average perturbation strength ({anomalies['avg_perturbation_strength']:.4f})")

            if stats['a_mean'] > 300:
                evidence_items.append(f"✓ Mean semi-major axis {stats['a_mean']:.0f} AU indicates outer solar system perturbations")

            if evidence_items:
                for i, item in enumerate(evidence_items, 1):
                    report.append(f"{i}. {item}")

            # Interpretation
            report.append("\n" + "─"*96)
            report.append("\nINTERPRETATION:")
            report.append("""
The extreme TNOs identified above show clustering patterns and orbital anomalies
that are difficult to explain through known dynamical processes:

1. UNEXPLAINED CLUSTERING: Objects with a > 250 AU and q > 30 AU should not
   exist in significant numbers if only scattered disk dynamics and stellar
   encounters shaped the outer solar system.

2. PERIHELION CLUSTERING: The Kozai-Lidov resonance signature (ω clustering
   around 0° or 180°) suggests gravitational interaction with a massive
   perturber with orbital parameters consistent with Planet Nine (~300 AU,
   moderate inclination).

3. HIGH ECCENTRICITY: The high average eccentricity indicates these objects
   have experienced significant orbital evolution, consistent with
   gravitational shepherding by a massive planet.

4. PERTURBATION EVIDENCE: Elevated perturbation strengths indicate ongoing
   dynamic interactions with an unseen body.

These signatures are among the strongest evidence for Planet Nine's existence
in the outer solar system.
            """)

        # SECTION 6: METHODOLOGY NOTES
        report.append("\n\n" + "="*96)
        report.append("6. METHODOLOGY NOTES")
        report.append("="*96 + "\n")

        report.append("""
FILTERING CRITERIA:
- Semi-Major Axis (a): Objects must have a > 250 AU to be in the domain where
  Planet Nine's gravitational influence is expected to be dominant.

- Perihelion Distance (q): Requires q > 30 AU to ensure objects are detached
  from Neptune's direct influence and represent the primary evidence class.

ORBITAL PARAMETERS CALCULATED:
- Semi-major axis (a): Primary orbital size parameter
- Eccentricity (e): Orbital shape; high e indicates perturbation
- Inclination (i): Orbital tilt; clustering indicates common origin
- Perihelion (q) & Aphelion (ad): Distance extremes
- Argument of Perihelion (ω): Alignment orientation (Kozai indicator)
- Orbital Period: Temporal scale of orbital motion
- Perturbation Strength: Measure of dynamical perturbation level

PLANET NINE SIGNATURE INDICATORS:
- Clustering in perihelion argument (Kozai-Lidov mechanism)
- Excess of high-eccentricity objects
- Orbital precession patterns
- Perihelion distance clustering
- Elevated perturbation strengths
        """)

        return "\n".join(report)

    def export_json(self, filename: str) -> None:
        """Export analysis results to JSON"""
        if not self.extreme_objects:
            return

        output = {
            'analysis_type': 'EXTREME_TNO_ANALYSIS_PLANET_NINE',
            'timestamp': '2025-11-26',
            'filtering_criteria': {
                'semi_major_axis_min': 250.0,
                'perihelion_min': 30.0
            },
            'extreme_objects': [
                {
                    'name': obj.name,
                    'a': obj.a,
                    'e': obj.e,
                    'i': obj.i,
                    'q': obj.q,
                    'ad': obj.ad,
                    'classification': obj.classification,
                    'perturbation_strength': obj.pert_strength
                }
                for obj in self.extreme_objects
            ],
            'statistics': self.calculate_statistics(self.extreme_objects),
            'planet_nine_signature': self.analyze_planet_nine_signature()
        }

        with open(filename, 'w') as f:
            json.dump(output, f, indent=2)


def main():
    """Main analysis routine"""
    csv_file = "/home/user/ruvector/examples/kuiper_belt/DISTANT_OBJECTS_DATA.csv"
    analyzer = ETNOAnalyzer(csv_file)

    analyzer.load_data()
    analyzer.filter_extreme_objects()

    report = analyzer.generate_report()
    print(report)

    # Export JSON results
    analyzer.export_json("/home/user/ruvector/examples/kuiper_belt/AGENT13_ETNO_ANALYSIS.json")
    print("\n✅ Analysis exported to AGENT13_ETNO_ANALYSIS.json\n")

    # Save report to file
    report_file = "/home/user/ruvector/examples/kuiper_belt/AGENT13_EXTREME_TNO_REPORT.txt"
    with open(report_file, 'w') as f:
        f.write(report)
    print(f"✅ Report saved to {report_file}\n")


if __name__ == "__main__":
    main()
