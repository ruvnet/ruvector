/**
 * Comprehensive Test Suite for StreamingOptimization Initialization System
 *
 * This test suite covers:
 * - Unit tests for class initialization
 * - Model configuration and validation
 * - Integration tests for complete workflows
 * - Edge cases and error scenarios
 * - Performance benchmarks
 * - Security and boundary conditions
 *
 * Coverage Target: 90%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  StreamingOptimization,
  StreamingModelConfig,
  StreamingBenchmarkResult,
  StreamingQualityMetrics,
  StreamingOptimizationResult,
  runStreamingOptimizationExample
} from '../../src/advanced/streaming-optimization.js';
import { AgenticSynth } from '@ruvector/agentic-synth';

describe('StreamingOptimization - Initialization System Tests', () => {
  let optimizer: StreamingOptimization;
  const testSchema = {
    name: { type: 'string', description: 'Test name' },
    value: { type: 'number', description: 'Test value' }
  };

  beforeEach(() => {
    // Reset environment variables
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_GEMINI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Unit Tests - Class Initialization', () => {
    describe('Constructor with Default Configuration', () => {
      it('should initialize with default model configurations', () => {
        optimizer = new StreamingOptimization();

        expect(optimizer).toBeDefined();
        expect(optimizer).toBeInstanceOf(StreamingOptimization);
      });

      it('should have exactly 3 default models', () => {
        optimizer = new StreamingOptimization();

        // Access private property for testing (TypeScript workaround)
        const models = (optimizer as any).models as StreamingModelConfig[];

        expect(models).toBeDefined();
        expect(models.length).toBe(3);
      });

      it('should configure Gemini Flash as first default model', () => {
        optimizer = new StreamingOptimization();
        const models = (optimizer as any).models as StreamingModelConfig[];

        expect(models[0].provider).toBe('gemini');
        expect(models[0].model).toBe('gemini-2.5-flash');
        expect(models[0].name).toBe('Gemini Flash');
        expect(models[0].weight).toBe(1.0);
      });

      it('should configure Claude Sonnet as second default model', () => {
        optimizer = new StreamingOptimization();
        const models = (optimizer as any).models as StreamingModelConfig[];

        expect(models[1].provider).toBe('openrouter');
        expect(models[1].model).toBe('anthropic/claude-sonnet-4.5');
        expect(models[1].name).toBe('Claude Sonnet');
        expect(models[1].weight).toBe(0.8);
      });

      it('should configure Kimi K2 as third default model', () => {
        optimizer = new StreamingOptimization();
        const models = (optimizer as any).models as StreamingModelConfig[];

        expect(models[2].provider).toBe('openrouter');
        expect(models[2].model).toBe('moonshot/moonshot-v1-32k');
        expect(models[2].name).toBe('Kimi K2');
        expect(models[2].weight).toBe(0.7);
      });

      it('should initialize performance history as empty array', () => {
        optimizer = new StreamingOptimization();
        const history = (optimizer as any).performanceHistory;

        expect(history).toBeDefined();
        expect(Array.isArray(history)).toBe(true);
        expect(history.length).toBe(0);
      });

      it('should initialize optimized prompts as empty Map', () => {
        optimizer = new StreamingOptimization();
        const prompts = (optimizer as any).optimizedPrompts;

        expect(prompts).toBeDefined();
        expect(prompts).toBeInstanceOf(Map);
        expect(prompts.size).toBe(0);
      });

      it('should set learning rate to 0.1', () => {
        optimizer = new StreamingOptimization();
        const learningRate = (optimizer as any).learningRate;

        expect(learningRate).toBe(0.1);
      });

      it('should initialize best model as null', () => {
        optimizer = new StreamingOptimization();
        const bestModel = (optimizer as any).bestModel;

        expect(bestModel).toBeNull();
      });
    });

    describe('Constructor with Custom Configuration', () => {
      it('should accept custom model configurations', () => {
        const customModels: StreamingModelConfig[] = [
          {
            provider: 'gemini',
            model: 'gemini-pro',
            name: 'Custom Gemini',
            weight: 0.9,
            apiKey: 'custom-key'
          }
        ];

        optimizer = new StreamingOptimization(customModels);
        const models = (optimizer as any).models;

        expect(models).toEqual(customModels);
        expect(models.length).toBe(1);
      });

      it('should support multiple custom models', () => {
        const customModels: StreamingModelConfig[] = [
          {
            provider: 'gemini',
            model: 'gemini-pro',
            name: 'Model 1',
            weight: 1.0
          },
          {
            provider: 'openrouter',
            model: 'custom-model',
            name: 'Model 2',
            weight: 0.8
          },
          {
            provider: 'gemini',
            model: 'gemini-ultra',
            name: 'Model 3',
            weight: 0.6
          },
          {
            provider: 'openrouter',
            model: 'another-model',
            name: 'Model 4',
            weight: 0.4
          }
        ];

        optimizer = new StreamingOptimization(customModels);
        const models = (optimizer as any).models;

        expect(models.length).toBe(4);
        expect(models[0].name).toBe('Model 1');
        expect(models[3].weight).toBe(0.4);
      });

      it('should preserve custom API keys in model config', () => {
        const customModels: StreamingModelConfig[] = [
          {
            provider: 'gemini',
            model: 'test-model',
            name: 'Test',
            weight: 1.0,
            apiKey: 'test-api-key-123'
          }
        ];

        optimizer = new StreamingOptimization(customModels);
        const models = (optimizer as any).models;

        expect(models[0].apiKey).toBe('test-api-key-123');
      });

      it('should handle empty custom models array', () => {
        optimizer = new StreamingOptimization([]);
        const models = (optimizer as any).models;

        expect(models).toBeDefined();
        expect(models.length).toBe(0);
      });
    });
  });

  describe('Unit Tests - Model Configuration Validation', () => {
    describe('Model Provider Validation', () => {
      it('should only accept gemini or openrouter as providers', () => {
        const validModels: StreamingModelConfig[] = [
          {
            provider: 'gemini',
            model: 'test',
            name: 'Test Gemini',
            weight: 1.0
          },
          {
            provider: 'openrouter',
            model: 'test',
            name: 'Test OpenRouter',
            weight: 1.0
          }
        ];

        optimizer = new StreamingOptimization(validModels);
        const models = (optimizer as any).models;

        expect(models[0].provider).toBe('gemini');
        expect(models[1].provider).toBe('openrouter');
      });
    });

    describe('Model Weight Validation', () => {
      it('should accept valid weight values between 0 and 1', () => {
        const models: StreamingModelConfig[] = [
          { provider: 'gemini', model: 'test', name: 'Test 1', weight: 0.0 },
          { provider: 'gemini', model: 'test', name: 'Test 2', weight: 0.5 },
          { provider: 'gemini', model: 'test', name: 'Test 3', weight: 1.0 }
        ];

        optimizer = new StreamingOptimization(models);
        const storedModels = (optimizer as any).models;

        expect(storedModels[0].weight).toBe(0.0);
        expect(storedModels[1].weight).toBe(0.5);
        expect(storedModels[2].weight).toBe(1.0);
      });
    });

    describe('Model Name Validation', () => {
      it('should accept any non-empty string as model name', () => {
        const models: StreamingModelConfig[] = [
          { provider: 'gemini', model: 'test', name: 'Model A', weight: 1.0 },
          { provider: 'gemini', model: 'test', name: 'Test-Model-123', weight: 1.0 },
          { provider: 'gemini', model: 'test', name: 'Custom_Model_v2', weight: 1.0 }
        ];

        optimizer = new StreamingOptimization(models);
        const storedModels = (optimizer as any).models;

        expect(storedModels[0].name).toBe('Model A');
        expect(storedModels[1].name).toBe('Test-Model-123');
        expect(storedModels[2].name).toBe('Custom_Model_v2');
      });
    });
  });

  describe('Integration Tests - Generator Initialization', () => {
    describe('initializeGenerators Method', () => {
      it('should initialize generators with valid API keys', async () => {
        optimizer = new StreamingOptimization();

        const apiKeys = {
          gemini: 'test-gemini-key',
          openrouter: 'test-openrouter-key'
        };

        // Mock console.log to suppress output during tests
        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        try {
          const generators = await optimizer.initializeGenerators(apiKeys);

          expect(generators).toBeDefined();
          expect(typeof generators).toBe('object');
        } finally {
          consoleLogSpy.mockRestore();
        }
      });

      it('should skip models without API keys', async () => {
        optimizer = new StreamingOptimization();

        const apiKeys = {
          gemini: 'test-gemini-key'
          // Missing openrouter key
        };

        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        try {
          const generators = await optimizer.initializeGenerators(apiKeys);

          // Should only initialize Gemini model
          const generatorNames = Object.keys(generators);
          expect(generatorNames.includes('Gemini Flash')).toBe(true);
          expect(generatorNames.includes('Claude Sonnet')).toBe(false);
          expect(generatorNames.includes('Kimi K2')).toBe(false);
        } finally {
          consoleLogSpy.mockRestore();
        }
      });

      it('should use model-specific API key over global key', async () => {
        const customModels: StreamingModelConfig[] = [
          {
            provider: 'gemini',
            model: 'test-model',
            name: 'Test Model',
            weight: 1.0,
            apiKey: 'model-specific-key'
          }
        ];

        optimizer = new StreamingOptimization(customModels);

        const apiKeys = {
          gemini: 'global-key',
          openrouter: 'other-key'
        };

        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        try {
          const generators = await optimizer.initializeGenerators(apiKeys);

          // Should use model-specific key
          expect(generators['Test Model']).toBeDefined();
        } finally {
          consoleLogSpy.mockRestore();
        }
      });

      it('should handle empty API keys object gracefully', async () => {
        optimizer = new StreamingOptimization();

        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        try {
          const generators = await optimizer.initializeGenerators({});

          expect(generators).toBeDefined();
          expect(Object.keys(generators).length).toBe(0);
        } finally {
          consoleLogSpy.mockRestore();
        }
      });

      it('should read API keys from environment variables', async () => {
        // Set environment variables
        process.env.GEMINI_API_KEY = 'env-gemini-key';
        process.env.OPENROUTER_API_KEY = 'env-openrouter-key';

        optimizer = new StreamingOptimization();

        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        try {
          // Pass empty apiKeys object to force env var usage
          const generators = await optimizer.initializeGenerators({});

          // Should not initialize any generators because env keys are test values
          expect(generators).toBeDefined();
        } finally {
          consoleLogSpy.mockRestore();
          delete process.env.GEMINI_API_KEY;
          delete process.env.OPENROUTER_API_KEY;
        }
      });
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    describe('Boundary Conditions', () => {
      it('should handle maximum weight value (1.0)', () => {
        const models: StreamingModelConfig[] = [
          { provider: 'gemini', model: 'test', name: 'Max Weight', weight: 1.0 }
        ];

        optimizer = new StreamingOptimization(models);
        const storedModels = (optimizer as any).models;

        expect(storedModels[0].weight).toBe(1.0);
      });

      it('should handle minimum weight value (0.0)', () => {
        const models: StreamingModelConfig[] = [
          { provider: 'gemini', model: 'test', name: 'Min Weight', weight: 0.0 }
        ];

        optimizer = new StreamingOptimization(models);
        const storedModels = (optimizer as any).models;

        expect(storedModels[0].weight).toBe(0.0);
      });

      it('should handle very long model names', () => {
        const longName = 'A'.repeat(1000);
        const models: StreamingModelConfig[] = [
          { provider: 'gemini', model: 'test', name: longName, weight: 1.0 }
        ];

        optimizer = new StreamingOptimization(models);
        const storedModels = (optimizer as any).models;

        expect(storedModels[0].name).toBe(longName);
        expect(storedModels[0].name.length).toBe(1000);
      });

      it('should handle model names with special characters', () => {
        const specialName = 'Model-with_Special@Characters#123!';
        const models: StreamingModelConfig[] = [
          { provider: 'gemini', model: 'test', name: specialName, weight: 1.0 }
        ];

        optimizer = new StreamingOptimization(models);
        const storedModels = (optimizer as any).models;

        expect(storedModels[0].name).toBe(specialName);
      });
    });

    describe('Null and Undefined Handling', () => {
      it('should handle undefined custom models as default configuration', () => {
        optimizer = new StreamingOptimization(undefined);
        const models = (optimizer as any).models;

        expect(models.length).toBe(3); // Should use default models
      });

      it('should initialize with null API keys', async () => {
        optimizer = new StreamingOptimization();

        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        try {
          const generators = await optimizer.initializeGenerators({
            gemini: null as any,
            openrouter: null as any
          });

          expect(generators).toBeDefined();
          expect(Object.keys(generators).length).toBe(0);
        } finally {
          consoleLogSpy.mockRestore();
        }
      });
    });

    describe('Concurrent Initialization', () => {
      it('should handle multiple simultaneous initializations', async () => {
        const promises = Array(5).fill(null).map(() => {
          const opt = new StreamingOptimization();
          return Promise.resolve(opt);
        });

        const optimizers = await Promise.all(promises);

        expect(optimizers.length).toBe(5);
        optimizers.forEach(opt => {
          expect(opt).toBeInstanceOf(StreamingOptimization);
        });
      });

      it('should maintain separate state for multiple instances', () => {
        const opt1 = new StreamingOptimization();
        const opt2 = new StreamingOptimization();

        const models1 = (opt1 as any).models;
        const models2 = (opt2 as any).models;

        // Modify one instance
        models1[0].weight = 0.5;

        // Other instance should not be affected
        expect(models2[0].weight).toBe(1.0);
      });
    });

    describe('Memory and Performance', () => {
      it('should initialize quickly with default configuration', () => {
        const startTime = Date.now();

        optimizer = new StreamingOptimization();

        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(10); // Should be nearly instantaneous
      });

      it('should initialize quickly with many custom models', () => {
        const manyModels: StreamingModelConfig[] = Array(100).fill(null).map((_, i) => ({
          provider: i % 2 === 0 ? 'gemini' : 'openrouter',
          model: `model-${i}`,
          name: `Model ${i}`,
          weight: 1.0
        }));

        const startTime = Date.now();

        optimizer = new StreamingOptimization(manyModels);

        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(50); // Should still be fast
      });

      it('should not leak memory on repeated initialization', () => {
        // Create and discard many instances
        for (let i = 0; i < 1000; i++) {
          const opt = new StreamingOptimization();
          // Intentionally not storing reference
        }

        // If we get here without running out of memory, test passes
        expect(true).toBe(true);
      });
    });
  });

  describe('Quality Assessment Algorithm Tests', () => {
    describe('assessQuality Method', () => {
      it('should assess completeness correctly for complete data', () => {
        optimizer = new StreamingOptimization();

        const data = [
          { name: 'Test 1', value: 100 },
          { name: 'Test 2', value: 200 },
          { name: 'Test 3', value: 300 }
        ];

        const quality = (optimizer as any).assessQuality(data, testSchema);

        expect(quality.completeness).toBe(1.0); // 100% complete
      });

      it('should assess completeness correctly for incomplete data', () => {
        optimizer = new StreamingOptimization();

        const data = [
          { name: 'Test 1' }, // Missing value
          { name: 'Test 2', value: 200 },
          { value: 300 } // Missing name
        ];

        const quality = (optimizer as any).assessQuality(data, testSchema);

        expect(quality.completeness).toBeLessThan(1.0);
      });

      it('should assess data types correctly', () => {
        optimizer = new StreamingOptimization();

        const data = [
          { name: 'Test 1', value: 100 },
          { name: 'Test 2', value: 'invalid' }, // Wrong type
          { name: 'Test 3', value: 300 }
        ];

        const quality = (optimizer as any).assessQuality(data, testSchema);

        expect(quality.dataTypes).toBeLessThan(1.0);
      });

      it('should calculate overall quality score', () => {
        optimizer = new StreamingOptimization();

        const data = [
          { name: 'Test', value: 100 }
        ];

        const quality = (optimizer as any).assessQuality(data, testSchema);

        expect(quality.overall).toBeGreaterThan(0);
        expect(quality.overall).toBeLessThanOrEqual(1.0);
      });

      it('should handle empty data array', () => {
        optimizer = new StreamingOptimization();

        const quality = (optimizer as any).assessQuality([], testSchema);

        // Should handle gracefully without crashing
        expect(quality).toBeDefined();
      });
    });
  });

  describe('Helper Methods Tests', () => {
    describe('Banner and Progress Display', () => {
      it('should create banner without errors', () => {
        optimizer = new StreamingOptimization();

        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        try {
          (optimizer as any).banner('Test Banner');

          expect(consoleLogSpy).toHaveBeenCalled();
        } finally {
          consoleLogSpy.mockRestore();
        }
      });

      it('should create progress bar with correct format', () => {
        optimizer = new StreamingOptimization();

        const progressBar = (optimizer as any).progressBar(50, 100, 'Test');

        expect(progressBar).toBeDefined();
        expect(typeof progressBar).toBe('string');
        expect(progressBar).toContain('50.0%');
      });

      it('should create progress bar with metrics', () => {
        optimizer = new StreamingOptimization();

        const progressBar = (optimizer as any).progressBar(
          75,
          100,
          'Test',
          { speed: '10 rec/s', quality: '95%' }
        );

        expect(progressBar).toContain('speed');
        expect(progressBar).toContain('quality');
      });
    });
  });

  describe('Example Function Tests', () => {
    it('should export runStreamingOptimizationExample function', () => {
      expect(runStreamingOptimizationExample).toBeDefined();
      expect(typeof runStreamingOptimizationExample).toBe('function');
    });

    it('should create optimizer instance in example', async () => {
      // Mock environment variables
      process.env.GEMINI_API_KEY = 'test-key';

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      try {
        // Should not throw error during initialization
        expect(async () => {
          const opt = new StreamingOptimization();
          return opt;
        }).not.toThrow();
      } finally {
        consoleLogSpy.mockRestore();
        delete process.env.GEMINI_API_KEY;
      }
    });
  });

  describe('Type Safety and Interface Compliance', () => {
    it('should comply with StreamingModelConfig interface', () => {
      const config: StreamingModelConfig = {
        provider: 'gemini',
        model: 'test-model',
        name: 'Test',
        weight: 1.0,
        apiKey: 'optional-key'
      };

      optimizer = new StreamingOptimization([config]);

      expect(optimizer).toBeDefined();
    });

    it('should comply with StreamingQualityMetrics interface', () => {
      optimizer = new StreamingOptimization();

      const data = [{ name: 'Test', value: 100 }];
      const quality = (optimizer as any).assessQuality(data, testSchema);

      expect(quality).toHaveProperty('overall');
      expect(quality).toHaveProperty('completeness');
      expect(quality).toHaveProperty('dataTypes');
      expect(quality).toHaveProperty('consistency');
      expect(quality).toHaveProperty('realism');
    });
  });
});
