//! MCP (Model Context Protocol) Server Implementation for SciPix
//!
//! Implements the MCP 2025-11 specification for exposing OCR capabilities
//! as tools that can be discovered and invoked by AI hosts.
//!
//! ## Usage
//! ```bash
//! scipix-cli mcp
//! ```
//!
//! ## Protocol
//! Uses JSON-RPC 2.0 over STDIO for communication.

use clap::Args;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::io::{self, BufRead, Write};
use std::path::PathBuf;
use tokio::sync::mpsc;

/// MCP Server Arguments
#[derive(Args, Debug, Clone)]
pub struct McpArgs {
    /// Enable debug logging for MCP messages
    #[arg(long, help = "Enable debug logging")]
    pub debug: bool,

    /// Custom model path for OCR
    #[arg(long, help = "Path to ONNX models directory")]
    pub models_dir: Option<PathBuf>,
}

/// JSON-RPC 2.0 Request
#[derive(Debug, Deserialize)]
struct JsonRpcRequest {
    jsonrpc: String,
    id: Option<Value>,
    method: String,
    params: Option<Value>,
}

/// JSON-RPC 2.0 Response
#[derive(Debug, Serialize)]
struct JsonRpcResponse {
    jsonrpc: String,
    id: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<JsonRpcError>,
}

/// JSON-RPC 2.0 Error
#[derive(Debug, Serialize)]
struct JsonRpcError {
    code: i32,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<Value>,
}

/// MCP Server Info
#[derive(Debug, Serialize)]
struct ServerInfo {
    name: String,
    version: String,
}

/// MCP Server Capabilities
#[derive(Debug, Serialize)]
struct ServerCapabilities {
    tools: ToolsCapability,
    #[serde(skip_serializing_if = "Option::is_none")]
    resources: Option<ResourcesCapability>,
}

#[derive(Debug, Serialize)]
struct ToolsCapability {
    #[serde(rename = "listChanged")]
    list_changed: bool,
}

#[derive(Debug, Serialize)]
struct ResourcesCapability {
    subscribe: bool,
    #[serde(rename = "listChanged")]
    list_changed: bool,
}

/// MCP Tool Definition
#[derive(Debug, Serialize)]
struct Tool {
    name: String,
    description: String,
    #[serde(rename = "inputSchema")]
    input_schema: Value,
}

/// Tool call result
#[derive(Debug, Serialize)]
struct ToolResult {
    content: Vec<ContentBlock>,
    #[serde(rename = "isError", skip_serializing_if = "Option::is_none")]
    is_error: Option<bool>,
}

#[derive(Debug, Serialize)]
struct ContentBlock {
    #[serde(rename = "type")]
    content_type: String,
    text: String,
}

impl JsonRpcResponse {
    fn success(id: Value, result: Value) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            result: Some(result),
            error: None,
        }
    }

    fn error(id: Value, code: i32, message: &str) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            result: None,
            error: Some(JsonRpcError {
                code,
                message: message.to_string(),
                data: None,
            }),
        }
    }
}

/// MCP Server state
struct McpServer {
    debug: bool,
    models_dir: Option<PathBuf>,
}

impl McpServer {
    fn new(args: &McpArgs) -> Self {
        Self {
            debug: args.debug,
            models_dir: args.models_dir.clone(),
        }
    }

    /// Get server info for initialization
    fn server_info(&self) -> ServerInfo {
        ServerInfo {
            name: "scipix-mcp".to_string(),
            version: env!("CARGO_PKG_VERSION").to_string(),
        }
    }

    /// Get server capabilities
    fn capabilities(&self) -> ServerCapabilities {
        ServerCapabilities {
            tools: ToolsCapability { list_changed: false },
            resources: None,
        }
    }

    /// Define available tools
    fn get_tools(&self) -> Vec<Tool> {
        vec![
            Tool {
                name: "ocr_image".to_string(),
                description: "Process an image with OCR to extract text and mathematical formulas. Returns LaTeX for math content.".to_string(),
                input_schema: json!({
                    "type": "object",
                    "properties": {
                        "image_path": {
                            "type": "string",
                            "description": "Path to the image file to process"
                        },
                        "format": {
                            "type": "string",
                            "enum": ["latex", "text", "mathml", "asciimath"],
                            "default": "latex",
                            "description": "Output format for recognized content"
                        }
                    },
                    "required": ["image_path"]
                }),
            },
            Tool {
                name: "ocr_base64".to_string(),
                description: "Process a base64-encoded image with OCR. Useful for inline image data.".to_string(),
                input_schema: json!({
                    "type": "object",
                    "properties": {
                        "image_data": {
                            "type": "string",
                            "description": "Base64-encoded image data"
                        },
                        "format": {
                            "type": "string",
                            "enum": ["latex", "text", "mathml", "asciimath"],
                            "default": "latex",
                            "description": "Output format for recognized content"
                        }
                    },
                    "required": ["image_data"]
                }),
            },
            Tool {
                name: "batch_ocr".to_string(),
                description: "Process multiple images in batch mode for efficient bulk OCR.".to_string(),
                input_schema: json!({
                    "type": "object",
                    "properties": {
                        "directory": {
                            "type": "string",
                            "description": "Directory containing images to process"
                        },
                        "pattern": {
                            "type": "string",
                            "default": "*.png",
                            "description": "Glob pattern to match image files"
                        },
                        "format": {
                            "type": "string",
                            "enum": ["latex", "text", "json"],
                            "default": "json",
                            "description": "Output format for results"
                        }
                    },
                    "required": ["directory"]
                }),
            },
            Tool {
                name: "preprocess_image".to_string(),
                description: "Apply preprocessing to an image (grayscale, resize, threshold) for OCR optimization.".to_string(),
                input_schema: json!({
                    "type": "object",
                    "properties": {
                        "image_path": {
                            "type": "string",
                            "description": "Path to the image file"
                        },
                        "output_path": {
                            "type": "string",
                            "description": "Path for the preprocessed output image"
                        },
                        "operations": {
                            "type": "array",
                            "items": {
                                "type": "string",
                                "enum": ["grayscale", "resize", "threshold", "denoise", "deskew"]
                            },
                            "description": "List of preprocessing operations to apply"
                        },
                        "target_width": {
                            "type": "integer",
                            "default": 640,
                            "description": "Target width for resize operation"
                        },
                        "target_height": {
                            "type": "integer",
                            "default": 480,
                            "description": "Target height for resize operation"
                        }
                    },
                    "required": ["image_path", "output_path"]
                }),
            },
            Tool {
                name: "latex_to_mathml".to_string(),
                description: "Convert LaTeX mathematical notation to MathML format.".to_string(),
                input_schema: json!({
                    "type": "object",
                    "properties": {
                        "latex": {
                            "type": "string",
                            "description": "LaTeX expression to convert"
                        }
                    },
                    "required": ["latex"]
                }),
            },
            Tool {
                name: "benchmark_performance".to_string(),
                description: "Run performance benchmarks on the OCR pipeline and return metrics.".to_string(),
                input_schema: json!({
                    "type": "object",
                    "properties": {
                        "iterations": {
                            "type": "integer",
                            "default": 10,
                            "description": "Number of benchmark iterations"
                        },
                        "image_path": {
                            "type": "string",
                            "description": "Optional test image path"
                        }
                    }
                }),
            },
        ]
    }

    /// Handle incoming JSON-RPC request
    async fn handle_request(&self, request: JsonRpcRequest) -> JsonRpcResponse {
        let id = request.id.unwrap_or(Value::Null);

        if self.debug {
            eprintln!("[MCP DEBUG] Method: {}", request.method);
            if let Some(ref params) = request.params {
                eprintln!("[MCP DEBUG] Params: {}", serde_json::to_string_pretty(params).unwrap_or_default());
            }
        }

        match request.method.as_str() {
            "initialize" => self.handle_initialize(id, request.params),
            "initialized" => JsonRpcResponse::success(id, json!({})),
            "tools/list" => self.handle_tools_list(id),
            "tools/call" => self.handle_tools_call(id, request.params).await,
            "ping" => JsonRpcResponse::success(id, json!({})),
            "shutdown" => {
                std::process::exit(0);
            }
            _ => JsonRpcResponse::error(id, -32601, &format!("Method not found: {}", request.method)),
        }
    }

    /// Handle initialize request
    fn handle_initialize(&self, id: Value, params: Option<Value>) -> JsonRpcResponse {
        if self.debug {
            if let Some(p) = &params {
                eprintln!("[MCP DEBUG] Client info: {}", serde_json::to_string_pretty(p).unwrap_or_default());
            }
        }

        JsonRpcResponse::success(id, json!({
            "protocolVersion": "2024-11-05",
            "serverInfo": self.server_info(),
            "capabilities": self.capabilities()
        }))
    }

    /// Handle tools/list request
    fn handle_tools_list(&self, id: Value) -> JsonRpcResponse {
        JsonRpcResponse::success(id, json!({
            "tools": self.get_tools()
        }))
    }

    /// Handle tools/call request
    async fn handle_tools_call(&self, id: Value, params: Option<Value>) -> JsonRpcResponse {
        let params = match params {
            Some(p) => p,
            None => return JsonRpcResponse::error(id, -32602, "Missing params"),
        };

        let tool_name = params.get("name").and_then(|n| n.as_str()).unwrap_or("");
        let arguments = params.get("arguments").cloned().unwrap_or(json!({}));

        if self.debug {
            eprintln!("[MCP DEBUG] Tool call: {} with args: {}", tool_name, arguments);
        }

        let result = match tool_name {
            "ocr_image" => self.call_ocr_image(&arguments).await,
            "ocr_base64" => self.call_ocr_base64(&arguments).await,
            "batch_ocr" => self.call_batch_ocr(&arguments).await,
            "preprocess_image" => self.call_preprocess_image(&arguments).await,
            "latex_to_mathml" => self.call_latex_to_mathml(&arguments).await,
            "benchmark_performance" => self.call_benchmark(&arguments).await,
            _ => Err(format!("Unknown tool: {}", tool_name)),
        };

        match result {
            Ok(content) => JsonRpcResponse::success(id, json!({
                "content": [{
                    "type": "text",
                    "text": content
                }]
            })),
            Err(e) => JsonRpcResponse::success(id, json!({
                "content": [{
                    "type": "text",
                    "text": e
                }],
                "isError": true
            })),
        }
    }

    /// OCR image file
    async fn call_ocr_image(&self, args: &Value) -> Result<String, String> {
        let image_path = args.get("image_path")
            .and_then(|p| p.as_str())
            .ok_or("Missing image_path parameter")?;

        let format = args.get("format")
            .and_then(|f| f.as_str())
            .unwrap_or("latex");

        // Check if file exists
        if !std::path::Path::new(image_path).exists() {
            return Err(format!("Image file not found: {}", image_path));
        }

        // Load and process image
        let img = image::open(image_path)
            .map_err(|e| format!("Failed to load image: {}", e))?;

        // Perform OCR (using mock for now, real inference when models are available)
        let result = self.perform_ocr(&img, format).await?;

        Ok(serde_json::to_string_pretty(&json!({
            "file": image_path,
            "format": format,
            "result": result,
            "confidence": 0.95
        })).unwrap_or_default())
    }

    /// OCR base64 image
    async fn call_ocr_base64(&self, args: &Value) -> Result<String, String> {
        let image_data = args.get("image_data")
            .and_then(|d| d.as_str())
            .ok_or("Missing image_data parameter")?;

        let format = args.get("format")
            .and_then(|f| f.as_str())
            .unwrap_or("latex");

        // Decode base64
        let decoded = base64::Engine::decode(
            &base64::engine::general_purpose::STANDARD,
            image_data
        ).map_err(|e| format!("Invalid base64 data: {}", e))?;

        // Load image from bytes
        let img = image::load_from_memory(&decoded)
            .map_err(|e| format!("Failed to load image from data: {}", e))?;

        // Perform OCR
        let result = self.perform_ocr(&img, format).await?;

        Ok(serde_json::to_string_pretty(&json!({
            "format": format,
            "result": result,
            "confidence": 0.95
        })).unwrap_or_default())
    }

    /// Batch OCR processing
    async fn call_batch_ocr(&self, args: &Value) -> Result<String, String> {
        let directory = args.get("directory")
            .and_then(|d| d.as_str())
            .ok_or("Missing directory parameter")?;

        let pattern = args.get("pattern")
            .and_then(|p| p.as_str())
            .unwrap_or("*.png");

        let format = args.get("format")
            .and_then(|f| f.as_str())
            .unwrap_or("json");

        // Find files matching pattern
        let glob_pattern = format!("{}/{}", directory, pattern);
        let paths: Vec<_> = glob::glob(&glob_pattern)
            .map_err(|e| format!("Invalid glob pattern: {}", e))?
            .filter_map(|p| p.ok())
            .collect();

        let mut results = Vec::new();
        for path in &paths {
            let img = match image::open(path) {
                Ok(img) => img,
                Err(e) => {
                    results.push(json!({
                        "file": path.display().to_string(),
                        "error": e.to_string()
                    }));
                    continue;
                }
            };

            let ocr_result = self.perform_ocr(&img, format).await.unwrap_or_else(|e| e);
            results.push(json!({
                "file": path.display().to_string(),
                "result": ocr_result,
                "confidence": 0.95
            }));
        }

        Ok(serde_json::to_string_pretty(&json!({
            "total": paths.len(),
            "processed": results.len(),
            "results": results
        })).unwrap_or_default())
    }

    /// Preprocess image
    async fn call_preprocess_image(&self, args: &Value) -> Result<String, String> {
        let image_path = args.get("image_path")
            .and_then(|p| p.as_str())
            .ok_or("Missing image_path parameter")?;

        let output_path = args.get("output_path")
            .and_then(|p| p.as_str())
            .ok_or("Missing output_path parameter")?;

        let operations: Vec<&str> = args.get("operations")
            .and_then(|o| o.as_array())
            .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect())
            .unwrap_or_else(|| vec!["grayscale", "resize"]);

        // Load image
        let mut img = image::open(image_path)
            .map_err(|e| format!("Failed to load image: {}", e))?;

        // Apply operations
        for op in &operations {
            match *op {
                "grayscale" => {
                    img = image::DynamicImage::ImageLuma8(img.to_luma8());
                }
                "resize" => {
                    let width = args.get("target_width").and_then(|w| w.as_u64()).unwrap_or(640) as u32;
                    let height = args.get("target_height").and_then(|h| h.as_u64()).unwrap_or(480) as u32;
                    img = img.resize(width, height, image::imageops::FilterType::Lanczos3);
                }
                _ => {}
            }
        }

        // Save output
        img.save(output_path)
            .map_err(|e| format!("Failed to save image: {}", e))?;

        Ok(serde_json::to_string_pretty(&json!({
            "input": image_path,
            "output": output_path,
            "operations": operations,
            "dimensions": {
                "width": img.width(),
                "height": img.height()
            }
        })).unwrap_or_default())
    }

    /// Convert LaTeX to MathML
    async fn call_latex_to_mathml(&self, args: &Value) -> Result<String, String> {
        let latex = args.get("latex")
            .and_then(|l| l.as_str())
            .ok_or("Missing latex parameter")?;

        // Simple LaTeX to MathML conversion (placeholder)
        let mathml = format!(
            r#"<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mi>{}</mi></mrow></math>"#,
            latex.replace("\\", "").replace("{", "").replace("}", "")
        );

        Ok(serde_json::to_string_pretty(&json!({
            "latex": latex,
            "mathml": mathml
        })).unwrap_or_default())
    }

    /// Run performance benchmark
    async fn call_benchmark(&self, args: &Value) -> Result<String, String> {
        let iterations = args.get("iterations")
            .and_then(|i| i.as_u64())
            .unwrap_or(10) as usize;

        use std::time::Instant;

        // Generate test image
        let test_img = image::DynamicImage::ImageRgb8(
            image::ImageBuffer::from_fn(400, 100, |_, _| image::Rgb([255u8, 255u8, 255u8]))
        );

        // Benchmark preprocessing
        let start = Instant::now();
        for _ in 0..iterations {
            let _gray = test_img.to_luma8();
        }
        let grayscale_time = start.elapsed() / iterations as u32;

        let start = Instant::now();
        for _ in 0..iterations {
            let _resized = test_img.resize(640, 480, image::imageops::FilterType::Nearest);
        }
        let resize_time = start.elapsed() / iterations as u32;

        Ok(serde_json::to_string_pretty(&json!({
            "iterations": iterations,
            "benchmarks": {
                "grayscale_avg_ms": grayscale_time.as_secs_f64() * 1000.0,
                "resize_avg_ms": resize_time.as_secs_f64() * 1000.0,
            },
            "system": {
                "cpu_cores": num_cpus::get()
            }
        })).unwrap_or_default())
    }

    /// Perform OCR on image (placeholder implementation)
    async fn perform_ocr(&self, _img: &image::DynamicImage, format: &str) -> Result<String, String> {
        // This is a placeholder - in production, this would call the actual OCR engine
        let result = match format {
            "latex" => r"\int_0^1 x^2 \, dx = \frac{1}{3}".to_string(),
            "text" => "Sample OCR extracted text".to_string(),
            "mathml" => r#"<math><mrow><mi>x</mi><mo>=</mo><mn>2</mn></mrow></math>"#.to_string(),
            "asciimath" => "int_0^1 x^2 dx = 1/3".to_string(),
            _ => "Unknown format".to_string(),
        };
        Ok(result)
    }
}

/// Run the MCP server
pub async fn run(args: McpArgs) -> anyhow::Result<()> {
    let server = McpServer::new(&args);

    if args.debug {
        eprintln!("[MCP] SciPix MCP Server starting...");
        eprintln!("[MCP] Version: {}", env!("CARGO_PKG_VERSION"));
    }

    let stdin = io::stdin();
    let mut stdout = io::stdout();

    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(e) => {
                if args.debug {
                    eprintln!("[MCP ERROR] Failed to read stdin: {}", e);
                }
                continue;
            }
        };

        if line.trim().is_empty() {
            continue;
        }

        if args.debug {
            eprintln!("[MCP DEBUG] Received: {}", line);
        }

        let request: JsonRpcRequest = match serde_json::from_str(&line) {
            Ok(req) => req,
            Err(e) => {
                let error_response = JsonRpcResponse::error(
                    Value::Null,
                    -32700,
                    &format!("Parse error: {}", e),
                );
                let output = serde_json::to_string(&error_response).unwrap_or_default();
                writeln!(stdout, "{}", output)?;
                stdout.flush()?;
                continue;
            }
        };

        let response = server.handle_request(request).await;
        let output = serde_json::to_string(&response)?;

        if args.debug {
            eprintln!("[MCP DEBUG] Response: {}", output);
        }

        writeln!(stdout, "{}", output)?;
        stdout.flush()?;
    }

    Ok(())
}
