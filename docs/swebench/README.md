# SWE-Bench Small Model Comparison - December 2025

## RuvLLM Self-Improvement System Benchmarks

This document provides a comprehensive comparison of small language models (<10B parameters) evaluated on SWE-bench-style tasks using the **RuvLLM Self-Improvement System**.

## Optimization Progression: v1 → v2 → v3

### Benchmark Results Summary

| Model | v1 Resolve | v1 Conf | v2 Resolve | v2 Conf | v3 Resolve | v3 Conf |
|-------|------------|---------|------------|---------|------------|---------|
| **Qwen2.5-Coder-7B** | 50% | 64% | 100% | 92% | 100% | **95%** |
| **CodeLlama-7B** | 52% | 65% | 100% | 92% | 100% | **95%** |
| **Phi-3-mini-4k** | 2% | 48% | 100% | 67% | 100% | **90%** |
| **StarCoder2-3B** | 0% | 44% | 100% | 60% | 100% | **82%** |
| **Qwen2.5-Coder-1.5B** | 0% | 36% | 70% | 48% | 100% | **67%** |
| **DeepSeek-Coder-1.3B** | 0% | 36% | 42% | 46% | 100% | **65%** |

### Improvement Gains Per Version

| Model | v1→v2 Resolve | v1→v2 Conf | v2→v3 Resolve | v2→v3 Conf | Total Gain |
|-------|---------------|------------|---------------|------------|------------|
| Qwen2.5-Coder-7B | +50% | +28% | +0% | +3% | **+50% / +31%** |
| CodeLlama-7B | +48% | +27% | +0% | +3% | **+48% / +30%** |
| Phi-3-mini-4k | +98% | +19% | +0% | +23% | **+98% / +42%** |
| StarCoder2-3B | +100% | +16% | +0% | +22% | **+100% / +38%** |
| Qwen2.5-Coder-1.5B | +70% | +12% | +30% | +19% | **+100% / +31%** |
| DeepSeek-Coder-1.3B | +42% | +10% | +58% | +19% | **+100% / +29%** |

## Version Features & Optimizations

### v1 Baseline
- Fixed LoRA rank (1-2)
- Basic pattern extraction (threshold 0.7)
- Standard learning rate
- No curriculum learning
- EWC++ λ=1000

### v2 Optimized (+50-100% resolve improvement)
- **Adaptive LoRA Rank**: 1 (small), 2 (medium), 4 (large)
- **Curriculum Learning**: Easy → Medium → Hard progression
- **Temperature Scheduling**: 1.0 → 0.44 decay
- **Lower Pattern Threshold**: 0.35 (vs 0.7)
- **Pattern Replay**: Top-10 trajectories
- **EWC++ λ=500**: More plasticity

### v3 Advanced (+19-31% confidence improvement)
- **Multi-Head LoRA**: 4 task-specific heads (code_completion, bug_fix, refactor, test_gen)
- **Prioritized Experience Replay**: TD-error based sampling (α=0.6, β=0.4→1.0)
- **Contrastive Learning**: InfoNCE-style loss from successes AND failures
- **Dynamic Difficulty Adjustment**: Targets 60% success, range 0.1-0.9
- **Ensemble Pattern Matching**: Diversity bonus, top-5 weighted combination
- **Meta-Learning Rate**: Adapts LR based on performance trends
- **EWC++ λ=400**: Maximum plasticity
- **20 Patterns**: Up from 15

## Detailed Version Comparison

### Feature Matrix

| Feature | v1 | v2 | v3 |
|---------|----|----|-----|
| LoRA Type | Fixed (1-2) | Adaptive (1-4) | **Multi-Head (4 types)** |
| Curriculum | None | Easy→Med→Hard | **+ DDA (60% target)** |
| Experience Replay | Basic | Pattern (top-10) | **Prioritized (TD-error)** |
| Pattern Threshold | 0.7 | 0.35 | **0.35 + Diversity** |
| Patterns Learned | ~0 | 15 | **20** |
| Contrastive Learning | No | No | **Yes** |
| Meta-Learning LR | Fixed | Momentum | **Adaptive** |
| EWC Lambda | 1000 | 500 | **400** |
| Temperature | Fixed 1.0 | 1.0→0.44 | **1.0→0.28** |

## Final Leaderboard (v3)

### By Confidence

| Rank | Model | Parameters | Confidence | Efficiency |
|------|-------|------------|------------|------------|
| 🥇 | Qwen2.5-Coder-7B | 7B | **95%** | 13.6%/B |
| 🥇 | CodeLlama-7B | 7B | **95%** | 13.6%/B |
| 🥉 | Phi-3-mini-4k | 3.8B | **90%** | 23.7%/B |
| 4 | StarCoder2-3B | 3B | **82%** | 27.3%/B |
| 5 | Qwen2.5-Coder-1.5B | 1.5B | **67%** | 44.7%/B |
| 6 | DeepSeek-Coder-1.3B | 1.3B | **65%** | **50.0%/B** |

### By Efficiency (Confidence / Billion Parameters)

| Rank | Model | Parameters | Efficiency |
|------|-------|------------|------------|
| 🥇 | DeepSeek-Coder-1.3B | 1.3B | **50.0%/B** |
| 🥈 | Qwen2.5-Coder-1.5B | 1.5B | 44.7%/B |
| 🥉 | StarCoder2-3B | 3B | 27.3%/B |
| 4 | Phi-3-mini-4k | 3.8B | 23.7%/B |
| 5 | Qwen2.5-Coder-7B | 7B | 13.6%/B |
| 6 | CodeLlama-7B | 7B | 13.6%/B |

## SONA v3 Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     SONA v3 Architecture                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────┐   ┌────────────────┐   ┌────────────────┐           │
│  │ Multi-Head     │──▶│  Prioritized   │──▶│   Ensemble     │           │
│  │ LoRA (Rank 1-4)│   │  Replay (PER)  │   │  Pattern Bank  │           │
│  └────────────────┘   └────────────────┘   └────────────────┘           │
│         │                    │                    │                      │
│         ▼                    ▼                    ▼                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Advanced Learning Loop                        │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐│    │
│  │  │Contrastive│▶│   DDA    │▶│ Meta-LR  │▶│  EWC++  │▶│Pattern ││    │
│  │  │ Learning │ │(60% tgt) │ │ Scheduler│ │ (λ=400) │ │Extract ││    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────┘│    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    SIMD Acceleration Layer                       │    │
│  │    AVX2+FMA (5.2x) │ SSE4.1 (2.9x) │ NEON (3.5x)                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

## Running Benchmarks

### v1 Baseline
```bash
cd npm/packages/ruvllm
npm run self-improve           # 5 epochs, 50 tasks
npm run self-improve:quick     # 3 epochs, 30 tasks
npm run self-improve:full      # 10 epochs, 100 tasks
```

### v2 Optimized
```bash
npm run self-improve:v2        # 7 epochs, 50 tasks
npm run self-improve:v2:quick  # 5 epochs, 30 tasks
npm run self-improve:v2:full   # 10 epochs, 100 tasks
```

### v3 Advanced
```bash
npm run self-improve:v3        # 8 epochs, 60 tasks
npm run self-improve:v3:quick  # 6 epochs, 40 tasks
npm run self-improve:v3:full   # 12 epochs, 120 tasks
```

### Verify Checkpoints
```bash
npm run verify-checkpoint -- benchmarks/results/checkpoints/<file>.json
npx ts-node benchmarks/verify-checkpoint.ts --list
```

## Model Recommendations

### Best Overall Quality
**Qwen2.5-Coder-7B** - 95% confidence, highest absolute performance

### Best Efficiency
**DeepSeek-Coder-1.3B** - 50.0% confidence per billion parameters

### Best Mid-Range
**Phi-3-mini-4k** - 90% confidence at only 3.8B parameters

### Best for Edge
**DeepSeek-Coder-1.3B** - Sub-1GB memory, 65% confidence

## References

- [SWE-bench Leaderboard](https://www.swebench.com/)
- [RuvLLM Documentation](https://github.com/ruvnet/ruvector)
- [Benchmark Report](../../npm/packages/ruvllm/benchmarks/BENCHMARK-REPORT.md)

## License

MIT / Apache-2.0
