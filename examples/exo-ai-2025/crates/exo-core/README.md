# exo-core

Core traits and types for EXO-AI cognitive substrate - IIT consciousness measurement and Landauer thermodynamics.

[![Crates.io](https://img.shields.io/crates/v/exo-core.svg)](https://crates.io/crates/exo-core)
[![Documentation](https://docs.rs/exo-core/badge.svg)](https://docs.rs/exo-core)
[![License](https://img.shields.io/badge/license-MIT%2FApache--2.0-blue.svg)](LICENSE)

## Overview

`exo-core` provides the foundational types and traits for the EXO-AI cognitive substrate:

- **IIT Consciousness Measurement**: Integrated Information Theory (Φ) computation
- **Landauer Thermodynamics**: Physical cost of information processing
- **Pattern Storage**: Core types for cognitive patterns
- **Causal Graph**: Relationships between cognitive elements

## Installation

```toml
[dependencies]
exo-core = "0.1"
```

## Usage

```rust
use exo_core::consciousness::{ConsciousnessSubstrate, IITConfig};
use exo_core::thermodynamics::CognitiveThermometer;

// Measure integrated information (Φ)
let substrate = ConsciousnessSubstrate::new(IITConfig::default());
substrate.add_pattern(pattern);
let phi = substrate.compute_phi();

// Track computational thermodynamics
let thermo = CognitiveThermometer::new(300.0); // Kelvin
let cost = thermo.landauer_cost_bits(1024);
```

## Links

- [GitHub](https://github.com/ruvnet/ruvector)
- [Website](https://ruv.io)
- [EXO-AI Documentation](https://github.com/ruvnet/ruvector/tree/main/examples/exo-ai-2025)

## License

MIT OR Apache-2.0
