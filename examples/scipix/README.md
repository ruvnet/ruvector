# SciPix - Scientific Image & Math OCR Engine

<p align="center">
  <strong>High-performance OCR for scientific documents, mathematical equations, and technical imagery</strong>
</p>

<p align="center">
  <a href="#features">Features</a> |
  <a href="#quick-start">Quick Start</a> |
  <a href="#installation">Installation</a> |
  <a href="#tutorials">Tutorials</a> |
  <a href="#api-reference">API Reference</a>
</p>

---

## Introduction

**SciPix** is a production-ready OCR (Optical Character Recognition) engine built in Rust, specifically designed for scientific documents, mathematical equations, and technical diagrams. It provides:

- **Native ONNX Runtime Integration** - GPU-accelerated inference using the `ort` crate
- **Multiple Deployment Options** - REST API server, CLI tool, WebAssembly module
- **Advanced Math Recognition** - LaTeX, MathML, and ASCII output formats
- **High Performance** - Async I/O, connection pooling, and intelligent caching
- **Production Security** - SHA-256 authentication, rate limiting, request validation

Whether you're building a document processing pipeline, a math homework helper, or a scientific paper digitizer, SciPix provides the foundation you need.

## Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **Image OCR** | Extract text from images (PNG, JPEG, WebP, TIFF, BMP) |
| **Math Recognition** | Convert handwritten/printed equations to LaTeX, MathML, ASCII |
| **PDF Processing** | Async PDF extraction with job queue and progress tracking |
| **Digital Ink** | Process stylus/tablet stroke data into formatted text |
| **Document Conversion** | Convert between MMD, DOCX, and other formats |

### Output Formats

- **LaTeX** - Mathematical typesetting format
- **MathML** - XML-based math markup for web
- **HTML** - Web-ready formatted output
- **ASCII** - Plain text representation
- **MMD** - Multi-Markdown format

### Deployment Options

| Mode | Use Case | Bundle Size |
|------|----------|-------------|
| **REST API Server** | Backend services, microservices | ~15MB |
| **CLI Tool** | Batch processing, automation | ~15MB |
| **WebAssembly** | Browser-based OCR, offline apps | <2MB |

### Performance Features

- Async I/O with Tokio runtime
- ONNX Runtime for GPU/CPU inference
- Intelligent result caching (Moka)
- Token bucket rate limiting
- Gzip response compression
- Connection pooling for external requests

## Quick Start

### 30-Second Setup

```bash
# Clone and build
cd examples/scipix
cargo build --release

# Run the server
./target/release/scipix-server

# Test with curl
curl http://localhost:3000/health
```

### Process Your First Image

```bash
# Base64 encode an image and send it
BASE64_IMAGE=$(base64 -w 0 your_image.png)

curl -X POST http://localhost:3000/v3/text \
  -H "Content-Type: application/json" \
  -H "app_id: demo" \
  -H "app_key: demo_key" \
  -d "{\"base64\": \"$BASE64_IMAGE\", \"metadata\": {\"formats\": [\"text\", \"latex\"]}}"
```

## Installation

### Prerequisites

- **Rust 1.77+** - Install via [rustup](https://rustup.rs/)
- **Cargo** - Comes with Rust
- **(Optional) ONNX Runtime** - For GPU acceleration

### From Source

```bash
# Clone the repository
git clone https://github.com/ruvnet/ruvector.git
cd ruvector/examples/scipix

# Build with all features
cargo build --release --all-features

# Or build specific features
cargo build --release --features "ocr,math,optimize"
```

### Feature Flags

| Flag | Description | Default |
|------|-------------|---------|
| `ocr` | ONNX-based OCR engine | Off |
| `math` | Math expression parsing | Off |
| `preprocess` | Image preprocessing | On |
| `cache` | Result caching | On |
| `optimize` | Performance optimizations | On |
| `wasm` | WebAssembly support | Off |

### Download ONNX Models

```bash
# Run the model download script
./scripts/download_models.sh

# Or manually place models in:
# models/scipix_encoder.onnx
# models/scipix_decoder.onnx
# models/scipix_tokenizer.onnx
```

## Tutorials

### Tutorial 1: Basic Image OCR

Learn to extract text from images using the REST API.

**Step 1: Start the Server**

```bash
cargo run --bin scipix-server
```

**Step 2: Prepare Your Image**

```bash
# Encode image to base64
BASE64=$(base64 -w 0 document.png)
echo $BASE64 > image.b64
```

**Step 3: Send OCR Request**

```bash
curl -X POST http://localhost:3000/v3/text \
  -H "Content-Type: application/json" \
  -H "app_id: test" \
  -H "app_key: test123" \
  -d @- << EOF
{
  "base64": "$(cat image.b64)",
  "metadata": {
    "formats": ["text"],
    "confidence_threshold": 0.8
  }
}
EOF
```

**Step 4: Parse the Response**

```json
{
  "request_id": "abc123",
  "text": "Your extracted text here",
  "confidence": 0.95,
  "processing_time_ms": 150
}
```

### Tutorial 2: Mathematical Equation Recognition

Convert math images to LaTeX format.

**Step 1: Capture Equation Image**

Take a photo or screenshot of a mathematical equation.

**Step 2: Request LaTeX Output**

```bash
curl -X POST http://localhost:3000/v3/text \
  -H "Content-Type: application/json" \
  -H "app_id: test" \
  -H "app_key: test123" \
  -d '{
    "url": "https://example.com/equation.png",
    "metadata": {
      "formats": ["latex", "mathml"],
      "math_mode": true
    }
  }'
```

**Step 3: Use the Output**

```json
{
  "latex": "\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
  "mathml": "<math>...</math>",
  "confidence": 0.92
}
```

### Tutorial 3: Batch PDF Processing

Process multi-page PDFs asynchronously.

**Step 1: Submit PDF Job**

```bash
JOB_RESPONSE=$(curl -s -X POST http://localhost:3000/v3/pdf \
  -H "Content-Type: application/json" \
  -H "app_id: test" \
  -H "app_key: test123" \
  -d '{
    "url": "https://example.com/paper.pdf",
    "options": {
      "format": "mmd",
      "enable_ocr": true,
      "include_images": true,
      "page_range": "1-10"
    }
  }')

JOB_ID=$(echo $JOB_RESPONSE | jq -r '.pdf_id')
echo "Job ID: $JOB_ID"
```

**Step 2: Poll for Status**

```bash
while true; do
  STATUS=$(curl -s http://localhost:3000/v3/pdf/$JOB_ID \
    -H "app_id: test" -H "app_key: test123" | jq -r '.status')

  echo "Status: $STATUS"

  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "error" ]; then
    break
  fi

  sleep 2
done
```

**Step 3: Stream Results (SSE)**

```bash
curl -N http://localhost:3000/v3/pdf/$JOB_ID/stream \
  -H "app_id: test" \
  -H "app_key: test123"
```

### Tutorial 4: Digital Ink Recognition

Process stylus/touch stroke data.

**Step 1: Capture Strokes**

```javascript
// In your web application
const strokes = [];
canvas.addEventListener('touchmove', (e) => {
  strokes.push({
    x: Array.from(e.touches).map(t => t.clientX),
    y: Array.from(e.touches).map(t => t.clientY)
  });
});
```

**Step 2: Send to API**

```bash
curl -X POST http://localhost:3000/v3/strokes \
  -H "Content-Type: application/json" \
  -H "app_id: test" \
  -H "app_key: test123" \
  -d '{
    "strokes": [
      {"x": [0, 10, 20, 30], "y": [0, 10, 10, 0]},
      {"x": [40, 50, 60], "y": [5, 15, 5]}
    ],
    "metadata": {
      "formats": ["latex", "text"]
    }
  }'
```

### Tutorial 5: WebAssembly Integration

Run OCR directly in the browser.

**Step 1: Build WASM Module**

```bash
# Install wasm-pack
cargo install wasm-pack

# Build WebAssembly package
wasm-pack build --target web --features wasm
```

**Step 2: Use in Browser**

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import init, { ScipixWasm } from './pkg/ruvector_scipix.js';

    async function processImage() {
      await init();

      const scipix = new ScipixWasm();
      await scipix.initialize();

      // Get image from canvas or file input
      const canvas = document.getElementById('canvas');
      const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);

      const result = await scipix.recognize(imageData.data);
      console.log('Result:', result);
    }

    processImage();
  </script>
</head>
<body>
  <canvas id="canvas" width="400" height="300"></canvas>
</body>
</html>
```

### Tutorial 6: CLI Batch Processing

Process multiple files from command line.

**Step 1: Single File**

```bash
./target/release/scipix-cli ocr --input document.png --output result.json --format latex
```

**Step 2: Batch Directory**

```bash
./target/release/scipix-cli batch \
  --input-dir ./documents \
  --output-dir ./results \
  --format latex \
  --parallel 4 \
  --recursive
```

**Step 3: Watch Mode**

```bash
./target/release/scipix-cli batch \
  --input-dir ./inbox \
  --output-dir ./processed \
  --watch \
  --format text
```

## API Reference

### Authentication

All API endpoints (except `/health`) require authentication headers:

```
app_id: your_application_id
app_key: your_secret_key
```

### Endpoints

#### `POST /v3/text` - Image OCR

Process an image and extract text/equations.

**Request Body:**

```json
{
  "base64": "string (optional)",
  "url": "string (optional)",
  "metadata": {
    "formats": ["text", "latex", "mathml", "html"],
    "confidence_threshold": 0.5,
    "math_mode": false,
    "language": "en"
  }
}
```

**Response:**

```json
{
  "request_id": "uuid",
  "text": "extracted text",
  "latex": "\\LaTeX output",
  "mathml": "<math>...</math>",
  "confidence": 0.95,
  "processing_time_ms": 150
}
```

#### `POST /v3/strokes` - Digital Ink

Process stylus stroke data.

**Request Body:**

```json
{
  "strokes": [
    {"x": [0.0, 1.0, 2.0], "y": [0.0, 1.0, 0.0]}
  ],
  "metadata": {
    "formats": ["latex"]
  }
}
```

#### `POST /v3/pdf` - PDF Job Creation

**Request Body:**

```json
{
  "url": "https://example.com/document.pdf",
  "options": {
    "format": "mmd",
    "enable_ocr": true,
    "include_images": true,
    "page_range": "1-10"
  },
  "webhook_url": "https://your-server.com/callback"
}
```

**Response:**

```json
{
  "pdf_id": "job-uuid",
  "status": "processing"
}
```

#### `GET /v3/pdf/:id` - Job Status

Returns current job status and progress.

#### `GET /v3/pdf/:id/stream` - SSE Stream

Server-Sent Events stream for real-time progress updates.

#### `DELETE /v3/pdf/:id` - Cancel Job

Cancel a pending or processing job.

#### `GET /health` - Health Check

No authentication required.

```json
{
  "status": "healthy",
  "version": "0.1.16"
}
```

### Error Responses

```json
{
  "error": {
    "code": "INVALID_IMAGE",
    "message": "Unsupported image format",
    "details": "Expected PNG, JPEG, or WebP"
  }
}
```

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing credentials |
| `RATE_LIMITED` | 429 | Too many requests |
| `INVALID_IMAGE` | 400 | Unsupported or corrupt image |
| `PROCESSING_ERROR` | 500 | Internal processing failure |
| `NOT_FOUND` | 404 | Resource not found |

## Configuration

### Environment Variables

```bash
# Server configuration
SERVER_ADDR=127.0.0.1:3000
RUST_LOG=scipix_server=debug,tower_http=debug

# Rate limiting
RATE_LIMIT_PER_MINUTE=100
RATE_LIMIT_BURST=20

# Caching
CACHE_MAX_SIZE=1000
CACHE_TTL_SECONDS=3600

# OCR settings
MODEL_PATH=./models
CONFIDENCE_THRESHOLD=0.5
MAX_IMAGE_SIZE=10485760

# Security
API_KEY_HASH_ROUNDS=10
```

### Configuration File

Create `config.toml`:

```toml
[server]
address = "127.0.0.1"
port = 3000
workers = 4

[ocr]
model_path = "./models"
confidence_threshold = 0.5
max_image_size = 10485760
supported_formats = ["png", "jpeg", "webp", "tiff", "bmp"]

[cache]
max_size = 1000
ttl_seconds = 3600

[rate_limit]
requests_per_minute = 100
burst_size = 20

[security]
require_https = false
allowed_origins = ["*"]
```

## Project Structure

```
examples/scipix/
├── src/
│   ├── api/                 # REST API implementation
│   │   ├── handlers.rs      # Request handlers
│   │   ├── middleware.rs    # Auth, rate limiting
│   │   ├── routes.rs        # Route definitions
│   │   ├── requests.rs      # Request validation
│   │   ├── responses.rs     # Response types
│   │   ├── jobs.rs          # Async job queue
│   │   └── state.rs         # Application state
│   ├── ocr/                 # OCR engine
│   │   ├── engine.rs        # Main OCR engine
│   │   ├── inference.rs     # ONNX inference
│   │   ├── models.rs        # Model loading
│   │   └── pipeline.rs      # Processing pipeline
│   ├── preprocess/          # Image preprocessing
│   │   ├── pipeline.rs      # Preprocessing pipeline
│   │   ├── transforms.rs    # Image transforms
│   │   ├── binarization.rs  # Binarization algorithms
│   │   └── enhancement.rs   # Image enhancement
│   ├── math/                # Math processing
│   │   ├── parser.rs        # Expression parser
│   │   ├── ast.rs           # Abstract syntax tree
│   │   ├── renderer.rs      # LaTeX/MathML render
│   │   └── symbols.rs       # Symbol tables
│   ├── wasm/                # WebAssembly bindings
│   │   ├── api.rs           # WASM API
│   │   ├── worker.rs        # Web Worker support
│   │   ├── canvas.rs        # Canvas handling
│   │   └── memory.rs        # Memory management
│   ├── cli/                 # CLI implementation
│   │   └── commands/        # CLI commands
│   ├── bin/
│   │   ├── server.rs        # API server entry
│   │   └── cli.rs           # CLI entry
│   ├── cache/               # Caching layer
│   ├── error.rs             # Error types
│   ├── config.rs            # Configuration
│   └── lib.rs               # Library exports
├── tests/                   # Test suite
├── benches/                 # Benchmarks
├── models/                  # ONNX models
├── scripts/                 # Utility scripts
├── web/                     # WASM web resources
├── Cargo.toml
└── README.md
```

## Performance

### Benchmarks

| Operation | Time (avg) | Throughput |
|-----------|------------|------------|
| Simple text OCR | 50ms | 20 img/s |
| Math equation | 80ms | 12 img/s |
| Full page scan | 200ms | 5 img/s |
| PDF page | 150ms | 6 pages/s |

### Optimization Tips

1. **Use GPU acceleration** - Set `ONNX_USE_GPU=1`
2. **Enable caching** - Duplicate requests are instant
3. **Batch requests** - Use batch endpoints for multiple images
4. **Tune workers** - Match `workers` to CPU cores
5. **Preprocess images** - Resize large images before sending

## Troubleshooting

### Common Issues

**Q: Server won't start**
```bash
# Check port availability
lsof -i :3000

# Check logs
RUST_LOG=debug cargo run --bin scipix-server
```

**Q: OCR returns empty results**
```bash
# Verify models are installed
ls -la models/

# Check confidence threshold
# Lower it in config if needed
```

**Q: WASM module fails to load**
```bash
# Rebuild with correct target
wasm-pack build --target web --features wasm

# Check browser console for errors
```

**Q: Rate limiting too aggressive**
```bash
# Increase limits in .env
RATE_LIMIT_PER_MINUTE=500
RATE_LIMIT_BURST=50
```

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit PRs to the `main` branch.

```bash
# Run tests
cargo test --all-features

# Run linting
cargo clippy --all-features

# Format code
cargo fmt
```

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with Rust | Powered by ONNX Runtime
</p>
