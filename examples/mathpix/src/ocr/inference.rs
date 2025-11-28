//! ONNX Inference Module
//!
//! This module handles ONNX inference operations for text detection,
//! character recognition, and mathematical expression recognition.
//!
//! # Model Requirements
//!
//! This module requires ONNX models to be available in the configured model directory.
//! Without models, all inference operations will return errors.
//!
//! To use this module:
//! 1. Download compatible ONNX models (PaddleOCR, TrOCR, or similar)
//! 2. Place them in the models directory
//! 3. Enable the `ocr` feature flag

use super::{models::ModelHandle, OcrError, OcrOptions, Result};
use image::{DynamicImage, GenericImageView, GrayImage, ImageBuffer, Luma, Rgb, RgbImage};
use std::sync::Arc;
use tracing::{debug, error, info, warn};

/// Result from text detection
#[derive(Debug, Clone)]
pub struct DetectionResult {
    /// Bounding box [x, y, width, height]
    pub bbox: [f32; 4],
    /// Detection confidence
    pub confidence: f32,
    /// Cropped image region
    pub region_image: Vec<u8>,
    /// Whether this region likely contains math
    pub is_math_likely: bool,
}

/// Result from text/math recognition
#[derive(Debug, Clone)]
pub struct RecognitionResult {
    /// Logits output from the model [sequence_length, vocab_size]
    pub logits: Vec<Vec<f32>>,
    /// Character-level confidence scores
    pub character_confidences: Vec<f32>,
    /// Raw output tensor (for debugging)
    pub raw_output: Option<Vec<f32>>,
}

/// Inference engine for running ONNX models
///
/// IMPORTANT: This engine requires ONNX models to be loaded.
/// All methods will return errors if models are not properly initialized.
pub struct InferenceEngine {
    /// Detection model
    detection_model: Arc<ModelHandle>,
    /// Recognition model
    recognition_model: Arc<ModelHandle>,
    /// Math recognition model (optional)
    math_model: Option<Arc<ModelHandle>>,
    /// Whether to use GPU acceleration
    use_gpu: bool,
    /// Whether models are actually loaded (vs placeholder handles)
    models_loaded: bool,
}

impl InferenceEngine {
    /// Create a new inference engine
    ///
    /// # Arguments
    /// * `detection_model` - Text detection model handle
    /// * `recognition_model` - Text recognition model handle
    /// * `math_model` - Optional math recognition model handle
    /// * `use_gpu` - Whether to use GPU acceleration
    ///
    /// # Returns
    /// Returns an InferenceEngine instance. Note that models must be properly
    /// loaded for inference to work - use `is_ready()` to check.
    pub fn new(
        detection_model: Arc<ModelHandle>,
        recognition_model: Arc<ModelHandle>,
        math_model: Option<Arc<ModelHandle>>,
        use_gpu: bool,
    ) -> Result<Self> {
        // Check if models exist on disk
        let detection_exists = detection_model.path().exists();
        let recognition_exists = recognition_model.path().exists();
        let models_loaded = detection_exists && recognition_exists;

        if !models_loaded {
            warn!(
                "ONNX models not found. Detection model: {} (exists: {}), Recognition model: {} (exists: {})",
                detection_model.path().display(),
                detection_exists,
                recognition_model.path().display(),
                recognition_exists
            );
            warn!("OCR inference will fail until models are downloaded. See documentation for model setup.");
        } else {
            info!(
                "Inference engine initialized (GPU: {})",
                if use_gpu { "enabled" } else { "disabled" }
            );
        }

        Ok(Self {
            detection_model,
            recognition_model,
            math_model,
            use_gpu,
            models_loaded,
        })
    }

    /// Check if the inference engine is ready for use
    pub fn is_ready(&self) -> bool {
        self.models_loaded
    }

    /// Run text detection on an image
    ///
    /// # Errors
    /// Returns `OcrError::ModelLoading` if models are not available
    pub async fn run_detection(
        &self,
        image_data: &[u8],
        threshold: f32,
    ) -> Result<Vec<DetectionResult>> {
        if !self.models_loaded {
            return Err(OcrError::ModelLoading(
                "ONNX models not loaded. Please download and configure OCR models before use. \
                 See examples/mathpix/docs/MODEL_SETUP.md for instructions.".to_string()
            ));
        }

        debug!("Running text detection (threshold: {})", threshold);

        // Decode and preprocess the image
        let input_tensor = self.preprocess_image_for_detection(image_data)?;

        // Run ONNX inference
        #[cfg(feature = "ocr")]
        {
            // With ort feature enabled, run actual inference
            let detections = self.run_onnx_detection(&input_tensor, threshold).await?;
            debug!("Detected {} regions", detections.len());
            return Ok(detections);
        }

        #[cfg(not(feature = "ocr"))]
        {
            // Without ort feature, return error
            Err(OcrError::Inference(
                "OCR feature not enabled. Rebuild with `--features ocr` to enable ONNX inference.".to_string()
            ))
        }
    }

    /// Run text recognition on a region image
    ///
    /// # Errors
    /// Returns `OcrError::ModelLoading` if models are not available
    pub async fn run_recognition(
        &self,
        region_image: &[u8],
        options: &OcrOptions,
    ) -> Result<RecognitionResult> {
        if !self.models_loaded {
            return Err(OcrError::ModelLoading(
                "ONNX models not loaded. Please download and configure OCR models before use.".to_string()
            ));
        }

        debug!("Running text recognition");

        // Preprocess region image to tensor
        let input_tensor = self.preprocess_image_for_recognition(region_image)?;

        #[cfg(feature = "ocr")]
        {
            let result = self.run_onnx_recognition(&input_tensor, options).await?;
            return Ok(result);
        }

        #[cfg(not(feature = "ocr"))]
        {
            Err(OcrError::Inference(
                "OCR feature not enabled. Rebuild with `--features ocr` to enable ONNX inference.".to_string()
            ))
        }
    }

    /// Run math recognition on a region image
    ///
    /// # Errors
    /// Returns `OcrError::ModelLoading` if models are not available
    pub async fn run_math_recognition(
        &self,
        region_image: &[u8],
        options: &OcrOptions,
    ) -> Result<RecognitionResult> {
        if !self.models_loaded {
            return Err(OcrError::ModelLoading(
                "ONNX models not loaded. Please download and configure OCR models before use.".to_string()
            ));
        }

        debug!("Running math recognition");

        if self.math_model.is_none() {
            warn!("Math model not loaded, falling back to text recognition");
            return self.run_recognition(region_image, options).await;
        }

        let input_tensor = self.preprocess_image_for_math(region_image)?;

        #[cfg(feature = "ocr")]
        {
            let result = self.run_onnx_math_recognition(&input_tensor, options).await?;
            return Ok(result);
        }

        #[cfg(not(feature = "ocr"))]
        {
            Err(OcrError::Inference(
                "OCR feature not enabled. Rebuild with `--features ocr` to enable ONNX inference.".to_string()
            ))
        }
    }

    /// Preprocess image for detection model
    fn preprocess_image_for_detection(&self, image_data: &[u8]) -> Result<Vec<f32>> {
        // Decode the image
        let img = image::load_from_memory(image_data)
            .map_err(|e| OcrError::ImageProcessing(format!("Failed to decode image: {}", e)))?;

        let input_shape = self.detection_model.input_shape();
        let (_, _, height, width) = (input_shape[0], input_shape[1], input_shape[2], input_shape[3]);

        // Resize to model input size
        let resized = img.resize_exact(
            width as u32,
            height as u32,
            image::imageops::FilterType::Lanczos3,
        );

        // Convert to RGB and normalize to [0, 1]
        let rgb = resized.to_rgb8();
        let mut tensor = Vec::with_capacity(3 * height * width);

        // Convert to NCHW format with normalization
        for c in 0..3 {
            for y in 0..height {
                for x in 0..width {
                    let pixel = rgb.get_pixel(x as u32, y as u32);
                    tensor.push(pixel[c] as f32 / 255.0);
                }
            }
        }

        Ok(tensor)
    }

    /// Preprocess image for recognition model
    fn preprocess_image_for_recognition(&self, image_data: &[u8]) -> Result<Vec<f32>> {
        // Decode the image
        let img = image::load_from_memory(image_data)
            .map_err(|e| OcrError::ImageProcessing(format!("Failed to decode image: {}", e)))?;

        let input_shape = self.recognition_model.input_shape();
        let (_, channels, height, width) = (input_shape[0], input_shape[1], input_shape[2], input_shape[3]);

        // Resize to model input size
        let resized = img.resize_exact(
            width as u32,
            height as u32,
            image::imageops::FilterType::Lanczos3,
        );

        let mut tensor = Vec::with_capacity(channels * height * width);

        if channels == 1 {
            // Convert to grayscale
            let gray = resized.to_luma8();
            for y in 0..height {
                for x in 0..width {
                    let pixel = gray.get_pixel(x as u32, y as u32);
                    // Normalize to [-1, 1] (common for text recognition models)
                    tensor.push((pixel[0] as f32 / 127.5) - 1.0);
                }
            }
        } else {
            // RGB normalization
            let rgb = resized.to_rgb8();
            for c in 0..3 {
                for y in 0..height {
                    for x in 0..width {
                        let pixel = rgb.get_pixel(x as u32, y as u32);
                        tensor.push((pixel[c] as f32 / 127.5) - 1.0);
                    }
                }
            }
        }

        Ok(tensor)
    }

    /// Preprocess image for math recognition model
    fn preprocess_image_for_math(&self, image_data: &[u8]) -> Result<Vec<f32>> {
        let math_model = self
            .math_model
            .as_ref()
            .ok_or_else(|| OcrError::Inference("Math model not loaded".to_string()))?;

        // Similar preprocessing to recognition but potentially different dimensions
        let img = image::load_from_memory(image_data)
            .map_err(|e| OcrError::ImageProcessing(format!("Failed to decode image: {}", e)))?;

        let input_shape = math_model.input_shape();
        let (_, channels, height, width) = (input_shape[0], input_shape[1], input_shape[2], input_shape[3]);

        let resized = img.resize_exact(
            width as u32,
            height as u32,
            image::imageops::FilterType::Lanczos3,
        );

        let mut tensor = Vec::with_capacity(channels * height * width);

        if channels == 1 {
            let gray = resized.to_luma8();
            for y in 0..height {
                for x in 0..width {
                    let pixel = gray.get_pixel(x as u32, y as u32);
                    tensor.push((pixel[0] as f32 / 127.5) - 1.0);
                }
            }
        } else {
            let rgb = resized.to_rgb8();
            for c in 0..channels {
                for y in 0..height {
                    for x in 0..width {
                        let pixel = rgb.get_pixel(x as u32, y as u32);
                        tensor.push((pixel[c] as f32 / 127.5) - 1.0);
                    }
                }
            }
        }

        Ok(tensor)
    }

    /// ONNX detection inference (requires `ocr` feature)
    #[cfg(feature = "ocr")]
    async fn run_onnx_detection(
        &self,
        input_tensor: &[f32],
        threshold: f32,
    ) -> Result<Vec<DetectionResult>> {
        // This is where actual ONNX inference would happen
        // Using ort crate:
        // let session = self.detection_model.session();
        // let inputs = ort::inputs!["input" => input_tensor.view()]?;
        // let outputs = session.run(inputs)?;
        // ... postprocess outputs to DetectionResult

        Err(OcrError::OnnxRuntime(
            "ONNX Runtime inference not yet fully implemented. \
             Model loading succeeded but inference binding pending.".to_string()
        ))
    }

    /// ONNX recognition inference (requires `ocr` feature)
    #[cfg(feature = "ocr")]
    async fn run_onnx_recognition(
        &self,
        input_tensor: &[f32],
        _options: &OcrOptions,
    ) -> Result<RecognitionResult> {
        Err(OcrError::OnnxRuntime(
            "ONNX Runtime inference not yet fully implemented. \
             Model loading succeeded but inference binding pending.".to_string()
        ))
    }

    /// ONNX math recognition inference (requires `ocr` feature)
    #[cfg(feature = "ocr")]
    async fn run_onnx_math_recognition(
        &self,
        input_tensor: &[f32],
        _options: &OcrOptions,
    ) -> Result<RecognitionResult> {
        Err(OcrError::OnnxRuntime(
            "ONNX Runtime inference not yet fully implemented. \
             Model loading succeeded but inference binding pending.".to_string()
        ))
    }

    /// Get detection model
    pub fn detection_model(&self) -> &ModelHandle {
        &self.detection_model
    }

    /// Get recognition model
    pub fn recognition_model(&self) -> &ModelHandle {
        &self.recognition_model
    }

    /// Get math model if available
    pub fn math_model(&self) -> Option<&ModelHandle> {
        self.math_model.as_ref().map(|m| m.as_ref())
    }

    /// Check if GPU acceleration is enabled
    pub fn is_gpu_enabled(&self) -> bool {
        self.use_gpu
    }
}

/// Batch inference optimization
impl InferenceEngine {
    /// Run batch detection on multiple images
    ///
    /// # Errors
    /// Returns error if models are not loaded or inference fails
    pub async fn run_batch_detection(
        &self,
        images: &[&[u8]],
        threshold: f32,
    ) -> Result<Vec<Vec<DetectionResult>>> {
        if !self.models_loaded {
            return Err(OcrError::ModelLoading(
                "ONNX models not loaded. Cannot run batch detection.".to_string()
            ));
        }

        debug!("Running batch detection on {} images", images.len());

        let mut results = Vec::new();
        for image in images {
            let detections = self.run_detection(image, threshold).await?;
            results.push(detections);
        }

        Ok(results)
    }

    /// Run batch recognition on multiple regions
    ///
    /// # Errors
    /// Returns error if models are not loaded or inference fails
    pub async fn run_batch_recognition(
        &self,
        regions: &[&[u8]],
        options: &OcrOptions,
    ) -> Result<Vec<RecognitionResult>> {
        if !self.models_loaded {
            return Err(OcrError::ModelLoading(
                "ONNX models not loaded. Cannot run batch recognition.".to_string()
            ));
        }

        debug!("Running batch recognition on {} regions", regions.len());

        let mut results = Vec::new();
        for region in regions {
            let result = self.run_recognition(region, options).await?;
            results.push(result);
        }

        Ok(results)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ocr::models::{ModelMetadata, ModelType};
    use std::path::PathBuf;
    use tempfile::tempdir;

    fn create_test_model(model_type: ModelType, path: PathBuf) -> Arc<ModelHandle> {
        let metadata = ModelMetadata {
            name: format!("{:?} Model", model_type),
            version: "1.0.0".to_string(),
            input_shape: vec![1, 3, 640, 640],
            output_shape: vec![1, 100, 85],
            input_dtype: "float32".to_string(),
            file_size: 1000,
            checksum: None,
        };

        Arc::new(
            ModelHandle::new(model_type, path, metadata).unwrap(),
        )
    }

    #[test]
    fn test_inference_engine_creation_without_models() {
        let detection = create_test_model(ModelType::Detection, PathBuf::from("/nonexistent/model.onnx"));
        let recognition = create_test_model(ModelType::Recognition, PathBuf::from("/nonexistent/model.onnx"));

        let engine = InferenceEngine::new(detection, recognition, None, false).unwrap();
        // Engine should be created but not ready (models don't exist)
        assert!(!engine.is_ready());
    }

    #[tokio::test]
    async fn test_detection_fails_without_models() {
        let detection = create_test_model(ModelType::Detection, PathBuf::from("/nonexistent/model.onnx"));
        let recognition = create_test_model(ModelType::Recognition, PathBuf::from("/nonexistent/model.onnx"));
        let engine = InferenceEngine::new(detection, recognition, None, false).unwrap();

        // Create a valid PNG image (1x1 white pixel)
        let png_data = create_test_png();
        let result = engine.run_detection(&png_data, 0.5).await;

        // Should fail because models don't exist
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(matches!(err, OcrError::ModelLoading(_)));
    }

    #[tokio::test]
    async fn test_recognition_fails_without_models() {
        let detection = create_test_model(ModelType::Detection, PathBuf::from("/nonexistent/model.onnx"));
        let recognition = create_test_model(ModelType::Recognition, PathBuf::from("/nonexistent/model.onnx"));
        let engine = InferenceEngine::new(detection, recognition, None, false).unwrap();

        let png_data = create_test_png();
        let options = OcrOptions::default();
        let result = engine.run_recognition(&png_data, &options).await;

        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), OcrError::ModelLoading(_)));
    }

    #[test]
    fn test_is_ready_reflects_model_state() {
        // Without real models
        let detection = create_test_model(ModelType::Detection, PathBuf::from("/fake/path"));
        let recognition = create_test_model(ModelType::Recognition, PathBuf::from("/fake/path"));
        let engine = InferenceEngine::new(detection, recognition, None, false).unwrap();
        assert!(!engine.is_ready());
    }

    /// Helper to create a minimal valid PNG for testing
    fn create_test_png() -> Vec<u8> {
        use image::{RgbImage, ImageBuffer};
        let img: RgbImage = ImageBuffer::from_fn(10, 10, |_, _| {
            image::Rgb([255, 255, 255])
        });
        let mut bytes: Vec<u8> = Vec::new();
        img.write_to(&mut std::io::Cursor::new(&mut bytes), image::ImageFormat::Png).unwrap();
        bytes
    }
}
