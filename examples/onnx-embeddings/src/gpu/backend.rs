//! GPU Backend Abstraction Layer
//!
//! Provides a unified interface for different GPU backends:
//! - WebGPU (via wgpu)
//! - CUDA-WASM (optional, via cuda-rust-wasm)
//! - CPU fallback

use crate::{EmbeddingError, Result};
use super::config::{GpuConfig, GpuMemoryStats, GpuMode, PowerPreference};
use std::collections::HashMap;
use std::sync::{Arc, Mutex, atomic::{AtomicU64, Ordering}};

/// Global buffer ID counter
static BUFFER_ID_COUNTER: AtomicU64 = AtomicU64::new(1);
static PIPELINE_ID_COUNTER: AtomicU64 = AtomicU64::new(1);

/// GPU device information
#[derive(Debug, Clone)]
pub struct GpuInfo {
    /// Device name
    pub name: String,
    /// Vendor name
    pub vendor: String,
    /// Backend type (WebGPU, CUDA-WASM, CPU)
    pub backend: String,
    /// API version
    pub api_version: String,
    /// Driver version
    pub driver_version: String,
    /// Total memory (bytes)
    pub total_memory: u64,
    /// Maximum workgroup size
    pub max_workgroup_size: u32,
    /// Maximum buffer size
    pub max_buffer_size: u64,
    /// Supports compute shaders
    pub supports_compute: bool,
    /// Supports float16
    pub supports_f16: bool,
}

impl Default for GpuInfo {
    fn default() -> Self {
        Self {
            name: "Unknown".to_string(),
            vendor: "Unknown".to_string(),
            backend: "CPU".to_string(),
            api_version: "N/A".to_string(),
            driver_version: "N/A".to_string(),
            total_memory: 0,
            max_workgroup_size: 256,
            max_buffer_size: 128 * 1024 * 1024, // 128MB default
            supports_compute: false,
            supports_f16: false,
        }
    }
}

/// GPU buffer handle
#[derive(Debug, Clone)]
pub struct GpuBuffer {
    /// Buffer ID
    pub id: u64,
    /// Size in bytes
    pub size: u64,
    /// Usage flags
    pub usage: BufferUsage,
}

impl GpuBuffer {
    /// Create a new buffer handle
    pub fn new(size: u64, usage: BufferUsage) -> Self {
        Self {
            id: BUFFER_ID_COUNTER.fetch_add(1, Ordering::SeqCst),
            size,
            usage,
        }
    }
}

/// Buffer usage flags
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BufferUsage {
    /// Storage buffer (read-write)
    Storage,
    /// Uniform buffer (read-only)
    Uniform,
    /// Staging buffer (for transfers)
    Staging,
    /// Vertex buffer
    Vertex,
    /// Index buffer
    Index,
}

/// GPU compute pipeline
pub struct ComputePipeline {
    /// Pipeline ID
    pub id: u64,
    /// Shader name
    pub shader_name: String,
    /// Workgroup size
    pub workgroup_size: [u32; 3],
}

impl ComputePipeline {
    /// Create a new pipeline handle
    pub fn new(shader_name: String, workgroup_size: [u32; 3]) -> Self {
        Self {
            id: PIPELINE_ID_COUNTER.fetch_add(1, Ordering::SeqCst),
            shader_name,
            workgroup_size,
        }
    }
}

/// GPU Backend trait - unified interface for all GPU operations
pub trait GpuBackend: Send + Sync {
    /// Check if GPU is available
    fn is_available(&self) -> bool;

    /// Get device information
    fn device_info(&self) -> GpuInfo;

    /// Get memory statistics
    fn memory_stats(&self) -> GpuMemoryStats;

    /// Create a buffer
    fn create_buffer(&self, size: u64, usage: BufferUsage) -> Result<GpuBuffer>;

    /// Write data to buffer
    fn write_buffer(&self, buffer: &GpuBuffer, data: &[u8]) -> Result<()>;

    /// Read data from buffer
    fn read_buffer(&self, buffer: &GpuBuffer, size: u64) -> Result<Vec<u8>>;

    /// Create compute pipeline from shader
    fn create_pipeline(
        &self,
        shader_source: &str,
        entry_point: &str,
        workgroup_size: [u32; 3],
    ) -> Result<ComputePipeline>;

    /// Execute compute pipeline
    fn dispatch(
        &self,
        pipeline: &ComputePipeline,
        bindings: &[&GpuBuffer],
        workgroups: [u32; 3],
    ) -> Result<()>;

    /// Synchronize GPU operations
    fn sync(&self) -> Result<()>;

    /// Release buffer
    fn release_buffer(&self, buffer: GpuBuffer) -> Result<()>;

    /// Release pipeline
    fn release_pipeline(&self, pipeline: ComputePipeline) -> Result<()>;
}

/// GPU Device wrapper with lifetime management
pub struct GpuDevice {
    backend: Arc<dyn GpuBackend>,
    config: GpuConfig,
}

impl GpuDevice {
    /// Create new GPU device
    pub fn new(backend: Arc<dyn GpuBackend>, config: GpuConfig) -> Self {
        Self { backend, config }
    }

    /// Get backend reference
    pub fn backend(&self) -> &dyn GpuBackend {
        self.backend.as_ref()
    }

    /// Get config
    pub fn config(&self) -> &GpuConfig {
        &self.config
    }
}

// ==================== CPU Backend ====================

/// CPU fallback backend
pub struct CpuBackend;

impl GpuBackend for CpuBackend {
    fn is_available(&self) -> bool {
        true // CPU always available
    }

    fn device_info(&self) -> GpuInfo {
        GpuInfo {
            name: "CPU Fallback".to_string(),
            vendor: "N/A".to_string(),
            backend: "CPU".to_string(),
            supports_compute: false,
            ..Default::default()
        }
    }

    fn memory_stats(&self) -> GpuMemoryStats {
        GpuMemoryStats::default()
    }

    fn create_buffer(&self, size: u64, usage: BufferUsage) -> Result<GpuBuffer> {
        Ok(GpuBuffer::new(size, usage))
    }

    fn write_buffer(&self, _buffer: &GpuBuffer, _data: &[u8]) -> Result<()> {
        Ok(()) // No-op for CPU
    }

    fn read_buffer(&self, _buffer: &GpuBuffer, size: u64) -> Result<Vec<u8>> {
        Ok(vec![0u8; size as usize])
    }

    fn create_pipeline(
        &self,
        _shader_source: &str,
        entry_point: &str,
        workgroup_size: [u32; 3],
    ) -> Result<ComputePipeline> {
        Ok(ComputePipeline::new(entry_point.to_string(), workgroup_size))
    }

    fn dispatch(
        &self,
        _pipeline: &ComputePipeline,
        _bindings: &[&GpuBuffer],
        _workgroups: [u32; 3],
    ) -> Result<()> {
        Ok(()) // No-op for CPU
    }

    fn sync(&self) -> Result<()> {
        Ok(())
    }

    fn release_buffer(&self, _buffer: GpuBuffer) -> Result<()> {
        Ok(())
    }

    fn release_pipeline(&self, _pipeline: ComputePipeline) -> Result<()> {
        Ok(())
    }
}

// ==================== WebGPU Backend ====================

#[cfg(feature = "gpu")]
use wgpu;

#[cfg(feature = "gpu")]
use bytemuck;

/// WebGPU backend (via wgpu) with proper buffer management
#[cfg(feature = "gpu")]
pub struct WebGpuBackend {
    device: wgpu::Device,
    queue: wgpu::Queue,
    adapter_info: wgpu::AdapterInfo,
    /// Active buffers indexed by buffer ID
    buffers: Mutex<HashMap<u64, wgpu::Buffer>>,
    /// Active pipelines indexed by pipeline ID
    pipelines: Mutex<HashMap<u64, wgpu::ComputePipeline>>,
    /// Bind group layouts for compute pipelines
    bind_group_layouts: Mutex<HashMap<u64, wgpu::BindGroupLayout>>,
}

#[cfg(feature = "gpu")]
impl WebGpuBackend {
    /// Create new WebGPU backend
    pub async fn new(config: &GpuConfig) -> Result<Self> {
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
            backends: wgpu::Backends::all(),
            ..Default::default()
        });

        let power_pref = match config.power_preference {
            PowerPreference::LowPower => wgpu::PowerPreference::LowPower,
            PowerPreference::HighPerformance => wgpu::PowerPreference::HighPerformance,
            PowerPreference::None => wgpu::PowerPreference::None,
        };

        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: power_pref,
                compatible_surface: None,
                force_fallback_adapter: false,
            })
            .await
            .ok_or_else(|| EmbeddingError::GpuNotAvailable {
                reason: "No GPU adapter found".to_string(),
            })?;

        let adapter_info = adapter.get_info();

        let (device, queue) = adapter
            .request_device(
                &wgpu::DeviceDescriptor {
                    label: Some("RuVector GPU"),
                    required_features: wgpu::Features::empty(),
                    required_limits: wgpu::Limits::default(),
                    memory_hints: wgpu::MemoryHints::Performance,
                },
                None,
            )
            .await
            .map_err(|e| EmbeddingError::GpuInitFailed {
                reason: format!("Failed to create device: {}", e),
            })?;

        Ok(Self {
            device,
            queue,
            adapter_info,
            buffers: Mutex::new(HashMap::new()),
            pipelines: Mutex::new(HashMap::new()),
            bind_group_layouts: Mutex::new(HashMap::new()),
        })
    }

    /// Convert BufferUsage to wgpu::BufferUsages
    fn to_wgpu_usage(usage: BufferUsage) -> wgpu::BufferUsages {
        match usage {
            BufferUsage::Storage => {
                wgpu::BufferUsages::STORAGE
                    | wgpu::BufferUsages::COPY_DST
                    | wgpu::BufferUsages::COPY_SRC
            }
            BufferUsage::Uniform => {
                wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST
            }
            BufferUsage::Staging => {
                wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST
            }
            BufferUsage::Vertex => {
                wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST
            }
            BufferUsage::Index => {
                wgpu::BufferUsages::INDEX | wgpu::BufferUsages::COPY_DST
            }
        }
    }
}

#[cfg(feature = "gpu")]
impl GpuBackend for WebGpuBackend {
    fn is_available(&self) -> bool {
        true
    }

    fn device_info(&self) -> GpuInfo {
        GpuInfo {
            name: self.adapter_info.name.clone(),
            vendor: format!("{:?}", self.adapter_info.vendor),
            backend: format!("{:?}", self.adapter_info.backend),
            api_version: "WebGPU".to_string(),
            driver_version: self.adapter_info.driver.clone(),
            total_memory: 0, // WebGPU doesn't expose this directly
            max_workgroup_size: self.device.limits().max_compute_workgroup_size_x,
            max_buffer_size: self.device.limits().max_storage_buffer_binding_size as u64,
            supports_compute: true,
            supports_f16: self.device.features().contains(wgpu::Features::SHADER_F16),
        }
    }

    fn memory_stats(&self) -> GpuMemoryStats {
        let buffers = self.buffers.lock().unwrap();
        let total_allocated: u64 = buffers.values().map(|b| b.size()).sum();
        GpuMemoryStats {
            total: total_allocated,
            used: total_allocated,
            free: 0, // WebGPU doesn't expose this
            peak: total_allocated,
        }
    }

    fn create_buffer(&self, size: u64, usage: BufferUsage) -> Result<GpuBuffer> {
        let handle = GpuBuffer::new(size, usage);

        let wgpu_buffer = self.device.create_buffer(&wgpu::BufferDescriptor {
            label: Some(&format!("RuVector Buffer {}", handle.id)),
            size,
            usage: Self::to_wgpu_usage(usage),
            mapped_at_creation: false,
        });

        self.buffers.lock().unwrap().insert(handle.id, wgpu_buffer);

        Ok(handle)
    }

    fn write_buffer(&self, buffer: &GpuBuffer, data: &[u8]) -> Result<()> {
        let buffers = self.buffers.lock().unwrap();
        let wgpu_buffer = buffers.get(&buffer.id).ok_or_else(|| {
            EmbeddingError::GpuBufferError {
                reason: format!("Buffer {} not found", buffer.id),
            }
        })?;

        self.queue.write_buffer(wgpu_buffer, 0, data);
        Ok(())
    }

    fn read_buffer(&self, buffer: &GpuBuffer, size: u64) -> Result<Vec<u8>> {
        let buffers = self.buffers.lock().unwrap();
        let wgpu_buffer = buffers.get(&buffer.id).ok_or_else(|| {
            EmbeddingError::GpuBufferError {
                reason: format!("Buffer {} not found", buffer.id),
            }
        })?;

        // Create staging buffer for reading
        let staging_buffer = self.device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Staging Read Buffer"),
            size,
            usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        // Copy from GPU buffer to staging buffer
        let mut encoder = self.device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("Read Buffer Encoder"),
        });
        encoder.copy_buffer_to_buffer(wgpu_buffer, 0, &staging_buffer, 0, size);
        self.queue.submit(std::iter::once(encoder.finish()));

        // Map and read the staging buffer
        let buffer_slice = staging_buffer.slice(..);
        let (tx, rx) = std::sync::mpsc::channel();
        buffer_slice.map_async(wgpu::MapMode::Read, move |result| {
            tx.send(result).unwrap();
        });

        self.device.poll(wgpu::Maintain::Wait);

        rx.recv()
            .map_err(|e| EmbeddingError::GpuOperationFailed {
                operation: "read_buffer".to_string(),
                reason: format!("Channel error: {}", e),
            })?
            .map_err(|e| EmbeddingError::GpuOperationFailed {
                operation: "read_buffer".to_string(),
                reason: format!("Buffer map failed: {:?}", e),
            })?;

        let data = buffer_slice.get_mapped_range();
        let result = data.to_vec();
        drop(data);
        staging_buffer.unmap();

        Ok(result)
    }

    fn create_pipeline(
        &self,
        shader_source: &str,
        entry_point: &str,
        workgroup_size: [u32; 3],
    ) -> Result<ComputePipeline> {
        let handle = ComputePipeline::new(entry_point.to_string(), workgroup_size);

        // Create shader module
        let shader_module = self.device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some(&format!("Shader: {}", entry_point)),
            source: wgpu::ShaderSource::Wgsl(shader_source.into()),
        });

        // Create bind group layout for storage buffers
        // We support up to 4 storage buffers
        let bind_group_layout = self.device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some(&format!("BindGroupLayout: {}", entry_point)),
            entries: &[
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: true },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 1,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: true },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 2,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: false },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
            ],
        });

        let pipeline_layout = self.device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some(&format!("PipelineLayout: {}", entry_point)),
            bind_group_layouts: &[&bind_group_layout],
            push_constant_ranges: &[],
        });

        let compute_pipeline = self.device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some(&format!("Pipeline: {}", entry_point)),
            layout: Some(&pipeline_layout),
            module: &shader_module,
            entry_point: Some(entry_point),
            compilation_options: wgpu::PipelineCompilationOptions::default(),
            cache: None,
        });

        self.pipelines.lock().unwrap().insert(handle.id, compute_pipeline);
        self.bind_group_layouts.lock().unwrap().insert(handle.id, bind_group_layout);

        Ok(handle)
    }

    fn dispatch(
        &self,
        pipeline: &ComputePipeline,
        bindings: &[&GpuBuffer],
        workgroups: [u32; 3],
    ) -> Result<()> {
        let pipelines = self.pipelines.lock().unwrap();
        let layouts = self.bind_group_layouts.lock().unwrap();
        let buffers = self.buffers.lock().unwrap();

        let compute_pipeline = pipelines.get(&pipeline.id).ok_or_else(|| {
            EmbeddingError::GpuOperationFailed {
                operation: "dispatch".to_string(),
                reason: format!("Pipeline {} not found", pipeline.id),
            }
        })?;

        let bind_group_layout = layouts.get(&pipeline.id).ok_or_else(|| {
            EmbeddingError::GpuOperationFailed {
                operation: "dispatch".to_string(),
                reason: format!("BindGroupLayout for pipeline {} not found", pipeline.id),
            }
        })?;

        // Build bind group entries
        let mut bind_group_entries = Vec::new();
        for (i, buf_handle) in bindings.iter().enumerate() {
            let wgpu_buffer = buffers.get(&buf_handle.id).ok_or_else(|| {
                EmbeddingError::GpuBufferError {
                    reason: format!("Buffer {} not found", buf_handle.id),
                }
            })?;
            bind_group_entries.push(wgpu::BindGroupEntry {
                binding: i as u32,
                resource: wgpu_buffer.as_entire_binding(),
            });
        }

        let bind_group = self.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Compute BindGroup"),
            layout: bind_group_layout,
            entries: &bind_group_entries,
        });

        // Create command encoder and dispatch
        let mut encoder = self.device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("Compute Encoder"),
        });

        {
            let mut compute_pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("Compute Pass"),
                timestamp_writes: None,
            });
            compute_pass.set_pipeline(compute_pipeline);
            compute_pass.set_bind_group(0, &bind_group, &[]);
            compute_pass.dispatch_workgroups(workgroups[0], workgroups[1], workgroups[2]);
        }

        self.queue.submit(std::iter::once(encoder.finish()));

        Ok(())
    }

    fn sync(&self) -> Result<()> {
        self.device.poll(wgpu::Maintain::Wait);
        Ok(())
    }

    fn release_buffer(&self, buffer: GpuBuffer) -> Result<()> {
        self.buffers.lock().unwrap().remove(&buffer.id);
        Ok(())
    }

    fn release_pipeline(&self, pipeline: ComputePipeline) -> Result<()> {
        self.pipelines.lock().unwrap().remove(&pipeline.id);
        self.bind_group_layouts.lock().unwrap().remove(&pipeline.id);
        Ok(())
    }
}

// ==================== CUDA-WASM Backend ====================

/// CUDA-WASM backend placeholder
#[cfg(feature = "cuda-wasm")]
pub struct CudaWasmBackend {
    // Will hold cuda-rust-wasm transpiler context
    _marker: std::marker::PhantomData<()>,
}

#[cfg(feature = "cuda-wasm")]
impl CudaWasmBackend {
    /// Create new CUDA-WASM backend
    pub async fn new(_config: &GpuConfig) -> Result<Self> {
        // TODO: Initialize cuda-rust-wasm transpiler
        // This will use the transpiler from https://github.com/ruvector/ruv-FANN/tree/main/cuda-wasm
        Err(EmbeddingError::GpuNotAvailable {
            reason: "CUDA-WASM backend not yet fully implemented".to_string(),
        })
    }
}

#[cfg(feature = "cuda-wasm")]
impl GpuBackend for CudaWasmBackend {
    fn is_available(&self) -> bool { false }
    fn device_info(&self) -> GpuInfo { GpuInfo::default() }
    fn memory_stats(&self) -> GpuMemoryStats { GpuMemoryStats::default() }
    fn create_buffer(&self, size: u64, usage: BufferUsage) -> Result<GpuBuffer> {
        Ok(GpuBuffer::new(size, usage))
    }
    fn write_buffer(&self, _: &GpuBuffer, _: &[u8]) -> Result<()> { Ok(()) }
    fn read_buffer(&self, _: &GpuBuffer, size: u64) -> Result<Vec<u8>> {
        Ok(vec![0u8; size as usize])
    }
    fn create_pipeline(&self, _: &str, entry: &str, ws: [u32; 3]) -> Result<ComputePipeline> {
        Ok(ComputePipeline::new(entry.to_string(), ws))
    }
    fn dispatch(&self, _: &ComputePipeline, _: &[&GpuBuffer], _: [u32; 3]) -> Result<()> { Ok(()) }
    fn sync(&self) -> Result<()> { Ok(()) }
    fn release_buffer(&self, _: GpuBuffer) -> Result<()> { Ok(()) }
    fn release_pipeline(&self, _: ComputePipeline) -> Result<()> { Ok(()) }
}

// ==================== Factory Functions ====================

/// Create appropriate backend based on configuration
pub async fn create_backend(config: &GpuConfig) -> Result<Box<dyn GpuBackend>> {
    match config.mode {
        GpuMode::CpuOnly => {
            Ok(Box::new(CpuBackend))
        }
        #[cfg(feature = "gpu")]
        GpuMode::WebGpu => {
            match WebGpuBackend::new(config).await {
                Ok(backend) => Ok(Box::new(backend)),
                Err(e) if config.fallback_to_cpu => {
                    tracing::warn!("WebGPU not available, falling back to CPU: {}", e);
                    Ok(Box::new(CpuBackend))
                }
                Err(e) => Err(e),
            }
        }
        #[cfg(feature = "cuda-wasm")]
        GpuMode::CudaWasm => {
            match CudaWasmBackend::new(config).await {
                Ok(backend) => Ok(Box::new(backend)),
                Err(e) if config.fallback_to_cpu => {
                    tracing::warn!("CUDA-WASM not available, falling back to CPU: {}", e);
                    Ok(Box::new(CpuBackend))
                }
                Err(e) => Err(e),
            }
        }
        GpuMode::Auto => {
            #[cfg(feature = "gpu")]
            {
                if let Ok(backend) = WebGpuBackend::new(config).await {
                    return Ok(Box::new(backend));
                }
            }
            #[cfg(feature = "cuda-wasm")]
            {
                if let Ok(backend) = CudaWasmBackend::new(config).await {
                    return Ok(Box::new(backend));
                }
            }
            Ok(Box::new(CpuBackend))
        }
        #[allow(unreachable_patterns)]
        _ => Ok(Box::new(CpuBackend)),
    }
}

/// Probe GPU availability without full initialization
pub async fn probe_gpu() -> bool {
    #[cfg(feature = "gpu")]
    {
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor::default());
        instance
            .request_adapter(&wgpu::RequestAdapterOptions::default())
            .await
            .is_some()
    }
    #[cfg(not(feature = "gpu"))]
    {
        false
    }
}

/// Get GPU info without full backend creation
pub async fn get_device_info() -> Option<GpuInfo> {
    #[cfg(feature = "gpu")]
    {
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor::default());
        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions::default())
            .await?;

        let info = adapter.get_info();
        Some(GpuInfo {
            name: info.name,
            vendor: format!("{:?}", info.vendor),
            backend: format!("{:?}", info.backend),
            api_version: "WebGPU".to_string(),
            driver_version: info.driver,
            supports_compute: true,
            ..Default::default()
        })
    }
    #[cfg(not(feature = "gpu"))]
    {
        None
    }
}

// ==================== High-Level GPU Compute Helper ====================

/// High-level GPU compute executor for common operations
#[cfg(feature = "gpu")]
pub struct GpuCompute {
    backend: Arc<WebGpuBackend>,
}

#[cfg(feature = "gpu")]
impl GpuCompute {
    /// Create new compute executor
    pub fn new(backend: Arc<WebGpuBackend>) -> Self {
        Self { backend }
    }

    /// Execute a compute shader with f32 inputs and outputs
    pub fn execute_f32(
        &self,
        shader: &str,
        entry_point: &str,
        input_a: &[f32],
        input_b: &[f32],
        output_size: usize,
        workgroups: [u32; 3],
    ) -> Result<Vec<f32>> {
        // Create buffers
        let buf_a = self.backend.create_buffer(
            (input_a.len() * 4) as u64,
            BufferUsage::Storage,
        )?;
        let buf_b = self.backend.create_buffer(
            (input_b.len() * 4) as u64,
            BufferUsage::Storage,
        )?;
        let buf_out = self.backend.create_buffer(
            (output_size * 4) as u64,
            BufferUsage::Storage,
        )?;

        // Write input data
        self.backend.write_buffer(&buf_a, bytemuck::cast_slice(input_a))?;
        self.backend.write_buffer(&buf_b, bytemuck::cast_slice(input_b))?;

        // Create and execute pipeline
        let pipeline = self.backend.create_pipeline(shader, entry_point, [64, 1, 1])?;
        self.backend.dispatch(&pipeline, &[&buf_a, &buf_b, &buf_out], workgroups)?;
        self.backend.sync()?;

        // Read output
        let output_bytes = self.backend.read_buffer(&buf_out, (output_size * 4) as u64)?;
        let output: Vec<f32> = bytemuck::cast_slice(&output_bytes).to_vec();

        // Cleanup
        self.backend.release_buffer(buf_a)?;
        self.backend.release_buffer(buf_b)?;
        self.backend.release_buffer(buf_out)?;
        self.backend.release_pipeline(pipeline)?;

        Ok(output)
    }
}
