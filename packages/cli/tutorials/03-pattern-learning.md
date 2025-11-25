# Pattern Learning Tutorial

**Duration:** ~30 minutes
**Difficulty:** Advanced
**Prerequisites:** Complete [Variant Analysis Workflow](./02-variant-analysis.md) tutorial

## Overview

Learn advanced machine learning techniques for genomic pattern recognition, including:
- Training custom pattern recognizers
- Reinforcement learning from clinical outcomes
- Transfer learning from pre-trained models
- Pattern discovery and validation

## Use Case: Learning from NICU Cases

Build a system that learns from historical NICU cases to predict:
- Likely diagnoses from variant patterns
- Phenotype-genotype associations
- Treatment response predictions
- Outcome forecasting

## Part 1: Pattern Recognition Fundamentals (8 minutes)

### Step 1: Prepare Training Data

Create comprehensive training dataset:

```bash
# Generate clinical cases with rich metadata
cat > training_cases.jsonl << EOF
{"patientId":"P001","age_days":2,"variants":[{"gene":"SCN1A","type":"missense","pos":"chr2:166848646","inheritance":"de_novo"}],"phenotypes":["prolonged_seizures","fever_sensitivity"],"diagnosis":"Dravet_syndrome","severity":"severe","treatment_response":"poor_AED_response","outcome":"developmental_delay"}
{"patientId":"P002","age_days":1,"variants":[{"gene":"KCNQ2","type":"frameshift","pos":"chr20:62063658","inheritance":"de_novo"}],"phenotypes":["early_onset_seizures","hypotonia"],"diagnosis":"KCNQ2_epilepsy","severity":"moderate","treatment_response":"good_Na_channel_blockers","outcome":"normal_development"}
{"patientId":"P003","age_days":5,"variants":[{"gene":"STXBP1","type":"nonsense","pos":"chr9:127671591","inheritance":"de_novo"}],"phenotypes":["epilepsy","movement_disorder","ID"],"diagnosis":"STXBP1_encephalopathy","severity":"severe","treatment_response":"partial_multiple_AEDs","outcome":"moderate_ID"}
{"patientId":"P004","age_days":3,"variants":[{"gene":"SCN2A","type":"missense","pos":"chr2:165310456","inheritance":"de_novo"}],"phenotypes":["focal_seizures","autism_features"],"diagnosis":"SCN2A_disorder","severity":"moderate","treatment_response":"good_Na_channel_blockers","outcome":"mild_ID_autism"}
{"patientId":"P005","age_days":7,"variants":[{"gene":"CDKL5","type":"deletion","pos":"chrX:18635447","inheritance":"de_novo"}],"phenotypes":["infantile_spasms","vision_problems"],"diagnosis":"CDKL5_disorder","severity":"severe","treatment_response":"poor_standard_AEDs","outcome":"severe_ID"}
{"patientId":"P006","age_days":4,"variants":[{"gene":"KCNQ2","type":"missense","pos":"chr20:62061254","inheritance":"maternal"}],"phenotypes":["benign_neonatal_seizures"],"diagnosis":"BFNS","severity":"mild","treatment_response":"spontaneous_resolution","outcome":"normal"}
{"patientId":"P007","age_days":2,"variants":[{"gene":"SCN1A","type":"missense","pos":"chr2:166848712","inheritance":"de_novo"}],"phenotypes":["prolonged_seizures","fever_sensitivity","photosensitivity"],"diagnosis":"Dravet_syndrome","severity":"severe","treatment_response":"poor_AED_response","outcome":"severe_developmental_delay"}
{"patientId":"P008","age_days":6,"variants":[{"gene":"ARX","type":"expansion","pos":"chrX:25022363","inheritance":"maternal"}],"phenotypes":["infantile_spasms","dystonia"],"diagnosis":"ARX_disorder","severity":"severe","treatment_response":"partial_vigabatrin","outcome":"profound_ID"}
EOF
```

### Step 2: Basic Pattern Training

Train initial pattern recognizer:

```bash
gva train \
  --model pattern \
  --data training_cases.jsonl \
  --epochs 100 \
  --learning-rate 0.01 \
  --validation-split 0.2
```

**Expected Output:**
```
✓ Loaded 8 training cases

Training ████████████████████ 100% | 100/100
✓ Training completed
  Total time: 5.00s
  Throughput: 20.00 items/s

Training Results:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Model:         pattern
  Cases:         8
  Accuracy:      96.25%
  Precision:     94.50%
  Recall:        93.80%
  F1 Score:      94.15%
  Training time: 5000ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Learned 5 patterns:

Pattern 1: SCN gene family epilepsy
  Frequency:  3
  Confidence: 96.5%
  Examples:   3
  Features:   ["SCN1A","SCN2A","missense","de_novo","seizures"]

Pattern 2: KCNQ2 benign vs severe
  Frequency:  2
  Confidence: 91.2%
  Examples:   2
  Features:   ["KCNQ2","inheritance_pattern","seizure_type"]

Pattern 3: De novo severe encephalopathy
  Frequency:  5
  Confidence: 88.7%
  Examples:   5
  Features:   ["de_novo","severe","developmental_delay"]

Pattern 4: X-linked developmental disorders
  Frequency:  2
  Confidence: 85.3%
  Examples:   2
  Features:   ["chrX","maternal","infantile_spasms"]

Pattern 5: Treatment response predictors
  Frequency:  8
  Confidence: 79.8%
  Examples:   8
  Features:   ["gene","variant_type","AED_response"]
```

### Step 3: Analyze Learned Patterns

Query discovered patterns:

```bash
# Search for SCN1A-related patterns
gva search "SCN1A Dravet" --k 5 --format table

# Find similar treatment response patterns
gva search "poor AED response" --k 3

# Identify inheritance patterns
gva search "de novo severe" --k 10
```

## Part 2: Advanced Training Techniques (10 minutes)

### Multi-Epoch Training with Validation

```bash
# Create validation set
cat > validation_cases.jsonl << EOF
{"patientId":"V001","variants":[{"gene":"SCN1A","type":"missense"}],"phenotypes":["prolonged_seizures"],"diagnosis":"Dravet_syndrome","severity":"severe"}
{"patientId":"V002","variants":[{"gene":"KCNQ2","type":"missense"}],"phenotypes":["benign_seizures"],"diagnosis":"BFNS","severity":"mild"}
EOF

# Train with validation monitoring
gva train \
  --model pattern \
  --data training_cases.jsonl \
  --epochs 200 \
  --learning-rate 0.005 \
  --validation-split 0.25 \
  --early-stopping true \
  --patience 10
```

### Transfer Learning

```bash
# Load pre-trained genomic model (conceptual)
gva train \
  --model pattern \
  --pretrained dna-bert \
  --data training_cases.jsonl \
  --epochs 50 \
  --fine-tune true
```

### Hyperparameter Optimization

```bash
# Grid search over hyperparameters
for lr in 0.001 0.005 0.01 0.05; do
  for epochs in 50 100 200; do
    echo "Training with lr=$lr, epochs=$epochs"
    gva train \
      --model pattern \
      --data training_cases.jsonl \
      --epochs $epochs \
      --learning-rate $lr \
      --output "model_lr${lr}_e${epochs}.json" \
      --quiet
  done
done

# Compare results
gva compare-models --directory ./models --metric f1_score
```

## Part 3: Pattern Discovery (6 minutes)

### Unsupervised Pattern Finding

```bash
# Discover patterns without labels
gva discover \
  --data unlabeled_variants.vcf \
  --min-frequency 3 \
  --confidence-threshold 0.8 \
  --output discovered_patterns.json
```

**Output Example:**
```json
{
  "patterns": [
    {
      "id": "pattern_001",
      "type": "gene_cluster",
      "genes": ["SCN1A", "SCN2A", "SCN3A", "SCN8A"],
      "frequency": 12,
      "confidence": 0.94,
      "description": "Sodium channel gene family",
      "associated_phenotypes": ["epilepsy", "seizures"]
    },
    {
      "id": "pattern_002",
      "type": "variant_hotspot",
      "region": "chr20:62060000-62065000",
      "frequency": 8,
      "confidence": 0.87,
      "description": "KCNQ2 hotspot region"
    }
  ]
}
```

### Pattern Validation

```bash
# Validate discovered patterns on test set
gva validate \
  --patterns discovered_patterns.json \
  --test-data test_cases.jsonl \
  --metrics accuracy,precision,recall,f1
```

## Part 4: Reinforcement Learning (6 minutes)

### Reward-Based Training

```bash
# Define reward function based on clinical outcomes
cat > reward_config.json << EOF
{
  "rewards": {
    "correct_diagnosis": 10,
    "correct_severity": 5,
    "correct_treatment": 8,
    "incorrect": -5
  },
  "exploration_rate": 0.1,
  "discount_factor": 0.95
}
EOF

# Train with reinforcement learning
gva train \
  --model rl \
  --data training_cases.jsonl \
  --rewards reward_config.json \
  --episodes 1000 \
  --algorithm q-learning
```

**RL Training Output:**
```
Episode 1/1000 | Reward: 45 | Epsilon: 0.10
Episode 100/1000 | Avg Reward: 78 | Epsilon: 0.09
Episode 500/1000 | Avg Reward: 124 | Epsilon: 0.05
Episode 1000/1000 | Avg Reward: 186 | Epsilon: 0.01

RL Training Complete:
  Total Episodes: 1000
  Final Avg Reward: 186
  Best Episode: 892 (reward: 230)
  Convergence: 85%
```

### Policy Evaluation

```bash
# Evaluate learned policy
gva evaluate \
  --model trained_rl_model.json \
  --test-data test_cases.jsonl \
  --metrics reward,accuracy,treatment_success
```

## Part 5: Production Deployment (5 minutes)

### Export Trained Model

```bash
# Export model for production use
gva export-model \
  --model trained_pattern_model \
  --format onnx \
  --output production_model.onnx \
  --optimize true
```

### Model Serving

```bash
# Serve model via API (conceptual)
gva serve \
  --model production_model.onnx \
  --port 8080 \
  --workers 4 \
  --gpu true
```

### Batch Prediction

```bash
# Predict on new cases
gva predict \
  --model production_model.onnx \
  --data new_patients.jsonl \
  --output predictions.json \
  --confidence-threshold 0.8
```

**Prediction Output:**
```json
{
  "predictions": [
    {
      "patientId": "NEW001",
      "predicted_diagnosis": "Dravet_syndrome",
      "confidence": 0.94,
      "evidence": ["SCN1A_mutation", "fever_sensitive_seizures"],
      "similar_cases": ["P001", "P007"],
      "recommended_treatment": "avoid_sodium_channel_blockers",
      "predicted_outcome": "developmental_delay_likely"
    }
  ]
}
```

## Advanced Techniques

### Ensemble Learning

```bash
# Train multiple models and combine predictions
gva ensemble \
  --models "model1.json,model2.json,model3.json" \
  --strategy voting \
  --weights "0.4,0.3,0.3" \
  --data test_cases.jsonl
```

### Active Learning

```bash
# Identify most informative samples for labeling
gva active-learn \
  --model current_model.json \
  --unlabeled unlabeled_pool.jsonl \
  --strategy uncertainty \
  --samples 20 \
  --output samples_to_label.json
```

### Continual Learning

```bash
# Update model with new data without forgetting
gva continual-train \
  --base-model production_model.onnx \
  --new-data recent_cases.jsonl \
  --retention-strategy ewc \
  --lambda 0.1 \
  --output updated_model.onnx
```

## Monitoring & Evaluation

### Track Model Performance

```bash
# Generate comprehensive evaluation report
gva evaluate \
  --model production_model.onnx \
  --test-data holdout_set.jsonl \
  --metrics all \
  --report html \
  --output evaluation_report.html
```

**Evaluation Metrics:**
- Accuracy: 94.2%
- Precision: 92.8%
- Recall: 91.5%
- F1 Score: 92.1%
- AUC-ROC: 0.96
- Calibration Error: 0.04

### Monitor Prediction Distribution

```bash
# Analyze prediction patterns
gva analyze-predictions \
  --predictions predictions.json \
  --visualize true \
  --output analysis_report.html
```

### A/B Testing

```bash
# Compare model versions
gva ab-test \
  --model-a v1_model.onnx \
  --model-b v2_model.onnx \
  --test-data ab_test_cases.jsonl \
  --metric f1_score \
  --significance 0.05
```

## Best Practices

### Data Preparation
1. **Clean and normalize data**
2. **Handle class imbalance** (rare diagnoses)
3. **Feature engineering** (combine variants, phenotypes)
4. **Cross-validation** for robust evaluation

### Model Training
1. **Start simple** (pattern recognition)
2. **Add complexity gradually** (RL, transfer learning)
3. **Monitor validation metrics**
4. **Save checkpoints** frequently

### Production Deployment
1. **Version control** models
2. **Monitor prediction quality**
3. **Implement fallbacks**
4. **Regular retraining** with new data

## Troubleshooting

### Overfitting
```bash
# Add regularization
gva train --l2-penalty 0.01 --dropout 0.2

# Increase validation split
gva train --validation-split 0.3

# Use early stopping
gva train --early-stopping true --patience 10
```

### Poor Convergence
```bash
# Adjust learning rate
gva train --learning-rate 0.001 --lr-scheduler cosine

# Increase epochs
gva train --epochs 500

# Try different optimizer
gva train --optimizer adam --beta1 0.9 --beta2 0.999
```

### Class Imbalance
```bash
# Use class weights
gva train --class-weights balanced

# Oversample minority class
gva train --oversample true --ratio 0.5

# Use focal loss
gva train --loss focal --gamma 2.0
```

## Complete Training Pipeline

```bash
#!/bin/bash
# Production pattern learning pipeline

set -e

echo "=== NICU Pattern Learning Pipeline ==="

# 1. Prepare data
echo "Preparing training data..."
python prepare_data.py \
  --input raw_cases.csv \
  --output training_cases.jsonl \
  --validation-split 0.2

# 2. Initial training
echo "Training base model..."
gva train \
  --model pattern \
  --data training_cases.jsonl \
  --epochs 100 \
  --learning-rate 0.01 \
  --output base_model.json

# 3. Hyperparameter optimization
echo "Optimizing hyperparameters..."
gva optimize \
  --model pattern \
  --data training_cases.jsonl \
  --trials 50 \
  --metric f1_score \
  --output best_params.json

# 4. Retrain with best parameters
echo "Training optimized model..."
gva train \
  --model pattern \
  --data training_cases.jsonl \
  --config best_params.json \
  --output optimized_model.json

# 5. Evaluate
echo "Evaluating model..."
gva evaluate \
  --model optimized_model.json \
  --test-data validation_cases.jsonl \
  --report html \
  --output evaluation.html

# 6. Export for production
echo "Exporting production model..."
gva export-model \
  --model optimized_model.json \
  --format onnx \
  --optimize true \
  --output models/production_v$(date +%Y%m%d).onnx

echo "=== Pipeline Complete ==="
echo "Model saved to: models/production_v$(date +%Y%m%d).onnx"
echo "Evaluation report: evaluation.html"
```

## Next Steps

Master the final topic:
- **[Advanced Optimization Tutorial](./04-advanced-optimization.md)** - Performance tuning and scaling (45 min)

## Resources

- [Pattern Recognition in Genomics](https://www.nature.com/subjects/pattern-recognition)
- [Machine Learning for Clinical Genetics](https://www.nature.com/articles/s41576-019-0122-6)
- [Reinforcement Learning in Healthcare](https://www.nature.com/articles/s41591-021-01270-1)
- [ACMG Clinical Guidelines](https://www.acmg.net/ACMG/Medical-Genetics-Practice-Resources/Practice-Guidelines.aspx)

---

**Time Spent:** 30 minutes
**What You Learned:**
- ✓ Train pattern recognition models
- ✓ Apply advanced ML techniques (RL, transfer learning)
- ✓ Discover patterns from unlabeled data
- ✓ Deploy models to production
- ✓ Monitor and evaluate model performance
- ✓ Build complete training pipelines

Ready for performance optimization? Try [Advanced Optimization](./04-advanced-optimization.md)!
