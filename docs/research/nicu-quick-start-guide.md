# NICU Genomic Vector Database: Quick Start Guide

## Overview

This guide provides a rapid implementation path for deploying ruvector for NICU rapid genomic sequencing analysis.

## Key Performance Metrics

| Metric | Target | Ruvector Capability |
|--------|--------|-------------------|
| Query Latency (p95) | <1 second | ✅ 0.5-0.8ms (native), meets target |
| Database Scale | 10M+ variants | ✅ 50M capacity with HNSW |
| Memory Efficiency | Minimal footprint | ✅ 4-32x compression available |
| Accuracy (Recall@10) | >95% | ✅ 95%+ with HNSW + quantization |
| Batch Processing | Whole exome in <1hr | ✅ Supported via batch operations |

## Recommended Configuration

### For Production NICU Deployment

```rust
use ruvector_core::{VectorDB, DbOptions, HnswConfig, QuantizationConfig, DistanceMetric};

pub fn create_nicu_variant_db() -> Result<VectorDB> {
    let mut options = DbOptions::default();

    // Vector dimensions: Combined genomic features
    // 512 (DNA context) + 128 (functional) + 64 (conservation) +
    // 256 (protein) + 32 (population) + 64 (clinical) = 1056 dimensions
    options.dimensions = 1056;

    // Cosine similarity for normalized embeddings
    options.distance_metric = DistanceMetric::Cosine;

    // HNSW configuration optimized for genomic data
    options.hnsw_config = Some(HnswConfig {
        m: 32,                    // Good balance of speed/accuracy
        ef_construction: 400,     // High build quality
        ef_search: 200,          // High search accuracy
        max_elements: 50_000_000, // Support up to 50M variants
    });

    // Scalar quantization: 4x compression with 98% recall
    options.quantization = Some(QuantizationConfig::Scalar);

    // Persistent storage
    options.storage_path = "/var/lib/nicu-genomics/variant_db.rvec".to_string();

    VectorDB::new(options)
}
```

### Memory Sizing Guide

| Variant Count | Quantization | RAM Required | Storage Required |
|--------------|--------------|--------------|------------------|
| 1M variants  | None         | 16 GB        | 100 GB          |
| 1M variants  | Scalar (4x)  | 4 GB         | 25 GB           |
| 10M variants | None         | 162 GB       | 1 TB            |
| 10M variants | Scalar (4x)  | 40 GB        | 250 GB          |
| 10M variants | Product (16x)| 10 GB        | 63 GB           |

**Recommendation for NICU:** 10M variants with Scalar quantization = 40GB RAM + 250GB storage

## Implementation Steps

### Step 1: Data Preparation (Week 1)

```bash
# Download variant databases
wget https://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh38/clinvar.vcf.gz
wget https://storage.googleapis.com/gcp-public-data--gnomad/release/4.0/vcf/genomes/gnomad.genomes.v4.0.sites.vcf.gz

# Parse and index variants
cargo run --release --bin prepare-variant-db \
    --clinvar clinvar.vcf.gz \
    --gnomad gnomad.genomes.v4.0.sites.vcf.gz \
    --output /var/lib/nicu-genomics/variant_db.rvec
```

### Step 2: Build Vector Index (Week 2)

```rust
pub async fn build_variant_index(
    vcf_path: &Path,
    output_db: &Path,
) -> Result<()> {
    let db = create_nicu_variant_db()?;

    // Parse VCF and extract variants
    let variants = parse_vcf_parallel(vcf_path).await?;

    // Batch encode variants (parallel processing)
    let batch_size = 1000;
    for batch in variants.chunks(batch_size) {
        let embeddings: Vec<_> = batch.par_iter()
            .map(|variant| {
                let features = extract_variant_features(variant);
                VectorEntry {
                    id: Some(variant.id.clone()),
                    vector: features.to_vector(),
                    metadata: Some(variant.to_metadata()),
                }
            })
            .collect();

        // Batch insert
        db.insert_batch(embeddings)?;

        println!("Indexed {} variants...", db.len()?);
    }

    println!("✅ Index complete: {} total variants", db.len()?);
    Ok(())
}
```

### Step 3: Variant Classification API (Week 3)

```rust
use actix_web::{web, App, HttpServer, HttpResponse};

#[derive(Deserialize)]
pub struct ClassifyRequest {
    pub chromosome: String,
    pub position: u64,
    pub reference: String,
    pub alternate: String,
}

#[derive(Serialize)]
pub struct ClassificationResponse {
    pub classification: String,  // "Pathogenic" | "Benign" | "VUS"
    pub confidence: f32,
    pub acmg_criteria: Vec<String>,
    pub similar_variants: Vec<SimilarVariant>,
    pub query_time_ms: u64,
}

pub async fn classify_variant(
    req: web::Json<ClassifyRequest>,
    db: web::Data<Arc<VectorDB>>,
) -> HttpResponse {
    let start = Instant::now();

    // 1. Create variant from request
    let variant = Variant {
        chromosome: req.chromosome.clone(),
        position: req.position,
        reference: req.reference.clone(),
        alternate: req.alternate.clone(),
        ..Default::default()
    };

    // 2. Encode variant
    let embedding = encode_variant(&variant).await;

    // 3. Search for similar variants
    let similar = db.search(SearchQuery {
        vector: embedding,
        k: 50,
        filter: Some(HashMap::from([
            ("has_clinical_significance", json!(true)),
        ])),
        ef_search: Some(200),
    })?;

    // 4. Apply ACMG rules
    let classification = apply_acmg_rules(&variant, &similar);

    let response = ClassificationResponse {
        classification: classification.category,
        confidence: classification.confidence,
        acmg_criteria: classification.evidence,
        similar_variants: similar.iter()
            .take(10)
            .map(|r| SimilarVariant {
                id: r.id.clone(),
                similarity: r.score,
                classification: r.metadata.as_ref()
                    .unwrap().get("classification")
                    .unwrap().as_str().unwrap().to_string(),
            })
            .collect(),
        query_time_ms: start.elapsed().as_millis() as u64,
    };

    HttpResponse::Ok().json(response)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load database
    let db = Arc::new(create_nicu_variant_db().unwrap());

    // Start API server
    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(db.clone()))
            .route("/classify", web::post().to(classify_variant))
    })
    .bind("0.0.0.0:8080")?
    .run()
    .await
}
```

### Step 4: Integration with Clinical Workflow (Week 4)

```rust
pub async fn process_patient_vcf(
    vcf_path: &Path,
    patient_phenotype: &[String],
) -> Result<ClinicalReport> {
    let start = Instant::now();

    // 1. Parse VCF
    let variants = parse_vcf(vcf_path)?;
    println!("📄 Parsed {} variants from VCF", variants.len());

    // 2. Filter for clinically relevant variants
    let filtered = filter_clinical_variants(&variants);
    println!("🔍 {} clinically relevant variants", filtered.len());

    // 3. Batch classify variants
    let classifications = batch_classify_variants(&filtered).await?;
    println!("✅ Classified {} variants", classifications.len());

    // 4. Match patient phenotype
    let similar_cases = match_patient_phenotype(patient_phenotype).await?;
    println!("👥 Found {} similar cases", similar_cases.len());

    // 5. Generate report
    let report = ClinicalReport {
        patient_id: extract_patient_id(vcf_path),
        timestamp: Utc::now(),
        processing_time: start.elapsed(),
        total_variants: variants.len(),
        pathogenic_variants: classifications.iter()
            .filter(|c| c.classification == "Pathogenic")
            .cloned()
            .collect(),
        likely_pathogenic: classifications.iter()
            .filter(|c| c.classification == "Likely Pathogenic")
            .cloned()
            .collect(),
        vus: classifications.iter()
            .filter(|c| c.classification == "VUS")
            .cloned()
            .collect(),
        similar_cases: similar_cases.into_iter().take(5).collect(),
    };

    println!("📊 Report generated in {:?}", start.elapsed());
    Ok(report)
}
```

## Clinical Use Cases

### Use Case 1: Rapid Variant Triage

**Scenario:** Critically ill NICU patient needs urgent genetic diagnosis

**Implementation:**
```rust
// Real-time variant classification endpoint
POST /api/v1/classify/urgent
{
  "variants": [
    {
      "gene": "SCN1A",
      "chromosome": "chr2",
      "position": 166848646,
      "ref": "C",
      "alt": "T",
      "hgvs_p": "p.Arg1648His"
    }
  ],
  "phenotype": ["HP:0001250", "HP:0002104"],  // Seizures, apnea
  "urgency": "critical"
}

// Response time: <500ms
{
  "classifications": [{
    "variant": "SCN1A:p.Arg1648His",
    "classification": "Pathogenic",
    "confidence": 0.96,
    "acmg_criteria": ["PS1", "PM2", "PP3", "PP5"],
    "similar_variants": [
      {
        "id": "clinvar:12345",
        "similarity": 0.98,
        "phenotype_match": 0.94
      }
    ]
  }],
  "query_time_ms": 412
}
```

### Use Case 2: Phenotype-First Diagnosis

**Scenario:** Patient with unclear genetic cause, known phenotype

**Implementation:**
```rust
// Phenotype matching endpoint
POST /api/v1/diagnose/phenotype
{
  "hpo_terms": [
    "HP:0001250",  // Seizures
    "HP:0002104",  // Apnea
    "HP:0001252"   // Hypotonia
  ],
  "age_days": 3,
  "lab_values": {
    "lactate": 8.5,
    "glucose": 45
  }
}

// Returns likely genetic disorders and candidate genes
{
  "candidate_disorders": [
    {
      "disease": "GLUT1 Deficiency",
      "similarity": 0.91,
      "genes": ["SLC2A1"],
      "matching_phenotypes": ["HP:0001250", "HP:0002104"],
      "similar_cases": 12
    }
  ],
  "query_time_ms": 678
}
```

### Use Case 3: Treatment Selection

**Scenario:** Genetic diagnosis confirmed, need treatment guidance

**Implementation:**
```rust
// Treatment recommendation endpoint
POST /api/v1/treatment/recommend
{
  "diagnosis": "GLUT1 Deficiency",
  "genotype": ["SLC2A1:p.Arg126Cys"],
  "phenotype": ["HP:0001250", "HP:0002104"],
  "age_days": 3
}

// Returns evidence-based treatment options
{
  "recommendations": [
    {
      "treatment": "Ketogenic diet",
      "predicted_outcome": 0.87,
      "evidence_level": "A",
      "similar_cases": 34,
      "time_to_improvement_days": "7-14"
    }
  ],
  "contraindications": [],
  "query_time_ms": 523
}
```

## Performance Optimization Tips

### 1. Query Optimization

```rust
// Use lower ef_search for faster queries
let results = db.search(SearchQuery {
    vector: embedding,
    k: 10,
    filter: None,
    ef_search: Some(100),  // Lower = faster, slightly less accurate
})?;

// For critical accuracy, use higher values
ef_search: Some(200)  // Higher = more accurate, slightly slower
```

### 2. Caching Strategy

```rust
use lru::LruCache;

pub struct CachedClassifier {
    db: VectorDB,
    cache: Arc<RwLock<LruCache<String, VariantClassification>>>,
}

impl CachedClassifier {
    pub async fn classify(&self, variant: &Variant) -> Result<VariantClassification> {
        let cache_key = format!("{}-{}-{}", variant.chromosome, variant.position, variant.alternate);

        // Check cache first
        {
            let cache = self.cache.read();
            if let Some(cached) = cache.get(&cache_key) {
                return Ok(cached.clone());
            }
        }

        // Compute and cache
        let classification = self.classify_uncached(variant).await?;

        {
            let mut cache = self.cache.write();
            cache.put(cache_key, classification.clone());
        }

        Ok(classification)
    }
}
```

### 3. Batch Processing

```rust
// Process multiple variants in parallel
pub async fn batch_classify(variants: &[Variant]) -> Result<Vec<Classification>> {
    // Encode all variants in parallel
    let embeddings: Vec<_> = variants.par_iter()
        .map(|v| encode_variant(v))
        .collect();

    // Batch search (more efficient than individual queries)
    let results = db.search_batch(
        embeddings.iter().map(|emb| SearchQuery {
            vector: emb.clone(),
            k: 50,
            filter: None,
            ef_search: Some(150),
        }).collect()
    )?;

    // Process results in parallel
    let classifications: Vec<_> = results.par_iter()
        .zip(variants.par_iter())
        .map(|(similar, variant)| classify_from_similar(variant, similar))
        .collect();

    Ok(classifications)
}
```

## Monitoring & Validation

### Key Metrics to Track

```rust
pub struct SystemMetrics {
    pub queries_per_second: f32,
    pub avg_latency_ms: f64,
    pub p95_latency_ms: f64,
    pub p99_latency_ms: f64,
    pub cache_hit_rate: f32,
    pub classification_accuracy: f32,
    pub database_size: usize,
}

pub async fn collect_metrics() -> SystemMetrics {
    // Implement monitoring
    SystemMetrics {
        queries_per_second: measure_qps(),
        avg_latency_ms: measure_avg_latency(),
        p95_latency_ms: measure_p95_latency(),
        p99_latency_ms: measure_p99_latency(),
        cache_hit_rate: calculate_cache_hit_rate(),
        classification_accuracy: validate_accuracy(),
        database_size: get_variant_count(),
    }
}
```

### Alert Thresholds

```rust
pub fn check_alerts(metrics: &SystemMetrics) -> Vec<Alert> {
    let mut alerts = Vec::new();

    if metrics.p95_latency_ms > 1000.0 {
        alerts.push(Alert::Critical(
            "Query latency exceeds NICU SLA (>1s)"
        ));
    }

    if metrics.classification_accuracy < 0.90 {
        alerts.push(Alert::Warning(
            "Classification accuracy below 90%"
        ));
    }

    if metrics.cache_hit_rate < 0.3 {
        alerts.push(Alert::Info(
            "Low cache hit rate, consider increasing cache size"
        ));
    }

    alerts
}
```

## Deployment Checklist

### Pre-deployment

- [ ] Variant database built and indexed (10M+ variants)
- [ ] HNSW index configured with optimal parameters
- [ ] Quantization enabled and validated
- [ ] Clinical validation completed on test set
- [ ] API endpoints tested and documented
- [ ] Monitoring and alerting configured
- [ ] Security review completed (HIPAA compliance)
- [ ] Backup and disaster recovery plan

### Production Launch

- [ ] Load testing completed (target: 100 QPS)
- [ ] Failover and redundancy configured
- [ ] Performance meets SLA (<1s p95 latency)
- [ ] Clinical team training completed
- [ ] Integration with EMR system
- [ ] Audit logging enabled
- [ ] Incident response plan documented

### Post-deployment

- [ ] Monitor performance metrics daily
- [ ] Track clinical accuracy and outcomes
- [ ] Collect user feedback
- [ ] Update variant database monthly
- [ ] Retrain embeddings quarterly
- [ ] Review and update ACMG rules

## Support & Resources

### Documentation

- **Main Architecture:** `/docs/research/nicu-genomic-vector-architecture.md`
- **Ruvector Core API:** `https://docs.rs/ruvector-core`
- **Performance Tuning:** `/docs/optimization/PERFORMANCE_TUNING_GUIDE.md`

### Example Code

- **Variant encoding:** `/examples/genomics/variant-encoding.rs`
- **ACMG classification:** `/examples/genomics/acmg-classifier.rs`
- **Clinical API:** `/examples/genomics/clinical-api.rs`

### Community

- **GitHub Issues:** `https://github.com/ruvnet/ruvector/issues`
- **Discord:** Join for real-time support
- **Clinical Advisory Board:** Contact for genomic medicine guidance

## Estimated Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1: Setup | 1 week | Database infrastructure |
| Phase 2: Indexing | 2 weeks | 10M variant index |
| Phase 3: API Development | 2 weeks | Classification API |
| Phase 4: Integration | 2 weeks | Clinical workflow |
| Phase 5: Validation | 3 weeks | Clinical validation |
| Phase 6: Deployment | 1 week | Production launch |
| **Total** | **11 weeks** | **Production system** |

## Success Criteria

✅ **Technical Performance**
- Query latency p95 < 1 second
- Classification accuracy > 95%
- System uptime > 99.9%

✅ **Clinical Impact**
- Time to diagnosis reduced by 50%
- Increased diagnostic yield
- Improved treatment selection

✅ **User Satisfaction**
- Clinical team adoption rate > 80%
- Positive feedback from geneticists
- Integration with clinical workflow

## Next Steps

1. **Review architecture document** for detailed technical implementation
2. **Set up development environment** with ruvector-core
3. **Start with proof-of-concept** using 100K ClinVar variants
4. **Validate performance** against benchmarks
5. **Scale to full production** database

---

**Questions or need support?** Contact the ruvector team or open an issue on GitHub.

**Clinical validation support?** Reach out to our genomic medicine advisory board.
