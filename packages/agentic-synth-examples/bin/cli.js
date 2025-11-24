#!/usr/bin/env node

/**
 * Agentic Synth Examples CLI - REAL API VERSION
 * Uses actual Gemini/OpenRouter APIs for 100% real synthetic data
 */

import { Command } from 'commander';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), 'packages/agentic-synth/.env') });

const program = new Command();

program
  .name('agentic-synth-examples')
  .description('REAL AI-powered synthetic data generation with Gemini/OpenRouter')
  .version('0.1.2')
  .addHelpText('after', `
Examples:
  $ agentic-synth-examples generate stock-market --count 100 --provider gemini
  $ agentic-synth-examples generate cicd --count 50 --provider openrouter
  $ agentic-synth-examples list

⚡ REAL API Generation - Requires API Keys:
  Set GEMINI_API_KEY or OPENROUTER_API_KEY in your .env file
`);

program
  .command('list')
  .description('List all available example generators')
  .action(() => {
    console.log(`
📚 Available Real AI-Powered Generators

🤖 All generators use REAL APIs (Gemini/OpenRouter):
  • stock-market      - Realistic OHLCV stock data with market events
  • cicd              - CI/CD pipeline executions and metrics
  • security          - Security vulnerabilities and test scenarios
  • swarm             - Multi-agent swarm coordination patterns
  • self-learning     - Self-improving system iteration data

Usage:
  $ agentic-synth-examples generate <type> --count <n> --provider <gemini|openrouter>

Required:
  - API Key: Set GEMINI_API_KEY or OPENROUTER_API_KEY in .env
  - Provider: --provider gemini (recommended, free) or openrouter

Example:
  $ export GEMINI_API_KEY="your-key-here"
  $ agentic-synth-examples generate stock-market --count 10 --provider gemini
`);
  });

program
  .command('generate')
  .description('Generate REAL synthetic data using AI')
  .argument('<type>', 'Data type (stock-market, cicd, security, swarm, self-learning)')
  .option('-c, --count <number>', 'Number of records', '10')
  .option('-o, --output <path>', 'Output directory', './agentic-data')
  .option('-p, --provider <provider>', 'AI provider (gemini|openrouter)', 'gemini')
  .option('--api-key <key>', 'API key (or use env var)')
  .option('--model <model>', 'Specific model to use')
  .action(async (type, options) => {
    try {
      console.log(`\n📊 Generating REAL ${type} data with AI...`);
      console.log(`   Provider: ${options.provider}`);
      console.log(`   Count: ${options.count} records`);
      console.log(`   Output: ${options.output}\n`);

      // Get API key
      const apiKey = options.apiKey ||
                     process.env.GEMINI_API_KEY ||
                     process.env.GOOGLE_GEMINI_API_KEY ||
                     process.env.OPENROUTER_API_KEY;

      if (!apiKey) {
        console.error('❌ Error: No API key found!');
        console.error('\nPlease set one of these environment variables:');
        console.error('  - GEMINI_API_KEY (for Gemini)');
        console.error('  - OPENROUTER_API_KEY (for OpenRouter)');
        console.error('\nOr pass --api-key flag\n');
        process.exit(1);
      }

      // Import AgenticSynth from the main package
      const { AgenticSynth } = await import('@ruvector/agentic-synth');

      const count = parseInt(options.count);
      let schema;
      let filename;

      // Define schemas for each type
      switch (type) {
        case 'stock-market':
          console.log('🏦 Schema: OHLCV stock market data with news events');
          schema = {
            timestamp: { type: 'string', description: 'ISO 8601 timestamp' },
            symbol: { type: 'string', description: 'Stock ticker symbol (AAPL, GOOGL, etc.)' },
            open: { type: 'number', description: 'Opening price in USD' },
            high: { type: 'number', description: 'Highest price in USD' },
            low: { type: 'number', description: 'Lowest price in USD' },
            close: { type: 'number', description: 'Closing price in USD' },
            volume: { type: 'number', description: 'Trading volume' },
            news: { type: 'string', description: 'Market news headline affecting this stock' },
            sentiment: { type: 'string', description: 'Market sentiment: bullish, bearish, or neutral' },
          };
          filename = 'stock-market-data.json';
          break;

        case 'cicd':
          console.log('🚀 Schema: CI/CD pipeline execution data');
          schema = {
            pipeline_id: { type: 'string', description: 'Unique pipeline ID' },
            timestamp: { type: 'string', description: 'Execution timestamp' },
            status: { type: 'string', description: 'Status: success, failure, or pending' },
            duration_seconds: { type: 'number', description: 'Pipeline duration in seconds' },
            repository: { type: 'string', description: 'Git repository name' },
            branch: { type: 'string', description: 'Git branch name' },
            commit_sha: { type: 'string', description: '7-character commit hash' },
            tests_passed: { type: 'number', description: 'Number of tests passed' },
            tests_failed: { type: 'number', description: 'Number of tests failed' },
            coverage_percent: { type: 'number', description: 'Code coverage percentage' },
          };
          filename = 'cicd-pipelines.json';
          break;

        case 'security':
          console.log('🔒 Schema: Security vulnerability test scenarios');
          schema = {
            vulnerability_id: { type: 'string', description: 'Unique vulnerability ID' },
            type: { type: 'string', description: 'Type: SQL Injection, XSS, CSRF, etc.' },
            severity: { type: 'string', description: 'Severity: low, medium, high, critical' },
            endpoint: { type: 'string', description: 'API endpoint being tested' },
            method: { type: 'string', description: 'HTTP method: GET, POST, PUT, DELETE' },
            payload: { type: 'string', description: 'Attack payload used in test' },
            exploitable: { type: 'boolean', description: 'Whether vulnerability is exploitable' },
            cvss_score: { type: 'number', description: 'CVSS score 0-10' },
            remediation: { type: 'string', description: 'How to fix this vulnerability' },
          };
          filename = 'security-tests.json';
          break;

        case 'swarm':
          console.log('🤖 Schema: Multi-agent swarm coordination');
          schema = {
            agent_id: { type: 'string', description: 'Unique agent identifier' },
            role: { type: 'string', description: 'Role: coordinator, worker, analyzer, optimizer' },
            status: { type: 'string', description: 'Status: active, idle, terminated' },
            current_task: { type: 'string', description: 'Task currently being executed' },
            tasks_completed: { type: 'number', description: 'Total tasks completed' },
            success_rate: { type: 'number', description: 'Success rate 0-1' },
            coordination_score: { type: 'number', description: 'How well agent coordinates 0-1' },
            memory_usage_mb: { type: 'number', description: 'Memory usage in megabytes' },
            cpu_usage_percent: { type: 'number', description: 'CPU usage percentage' },
          };
          filename = 'swarm-coordination.json';
          break;

        case 'self-learning':
          console.log('🧠 Schema: Self-learning system iterations');
          schema = {
            iteration: { type: 'number', description: 'Iteration number' },
            timestamp: { type: 'string', description: 'Iteration timestamp' },
            quality_score: { type: 'number', description: 'Output quality 0-1' },
            learning_rate: { type: 'number', description: 'Current learning rate' },
            loss: { type: 'number', description: 'Training loss value' },
            accuracy: { type: 'number', description: 'Model accuracy 0-1' },
            feedback_received: { type: 'number', description: 'Feedback samples received' },
            adjustments_made: { type: 'number', description: 'Parameter adjustments made' },
            converged: { type: 'boolean', description: 'Whether training has converged' },
          };
          filename = 'self-learning-data.json';
          break;

        default:
          console.error(`❌ Unknown type: ${type}`);
          console.log('\nAvailable types: stock-market, cicd, security, swarm, self-learning');
          process.exit(1);
      }

      // Initialize AI generator
      console.log('\n🤖 Initializing AI generator...');
      const generator = new AgenticSynth({
        provider: options.provider,
        model: options.model || (options.provider === 'gemini' ? 'gemini-2.0-flash-exp' : 'anthropic/claude-3.5-sonnet'),
        apiKey,
      });

      // Generate REAL data with AI
      console.log('⚡ Generating with AI (this may take 10-30 seconds)...\n');
      const startTime = Date.now();

      const result = await generator.generate('structured', {
        schema,
        count,
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      // Ensure output directory exists
      const outputDir = resolve(process.cwd(), options.output);
      mkdirSync(outputDir, { recursive: true });

      // Write the file
      const outputPath = resolve(outputDir, filename);

      const output = {
        metadata: {
          type,
          count: result.data.length,
          generated: new Date().toISOString(),
          version: '0.1.2',
          generator: '@ruvector/agentic-synth-examples',
          provider: options.provider,
          model: options.model || generator.config?.model,
          generation_time_seconds: parseFloat(duration),
          real_ai_generated: true,
        },
        data: result.data,
      };

      writeFileSync(outputPath, JSON.stringify(output, null, 2));

      console.log(`\n✅ Generated ${result.data.length} REAL AI-powered records`);
      console.log(`📁 Saved to: ${outputPath}`);
      console.log(`⏱️  Generation time: ${duration}s`);
      console.log(`📊 File size: ${(JSON.stringify(output).length / 1024).toFixed(2)} KB\n`);

      // Show sample
      if (result.data && result.data.length > 0) {
        console.log('Sample record (AI-generated):');
        console.log(JSON.stringify(result.data[0], null, 2));
      }

      console.log('\n✨ Real AI generation complete!\n');

    } catch (error) {
      console.error('\n❌ Generation failed:', error.message);
      if (error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
      console.error('\nTroubleshooting:');
      console.error('  1. Check your API key is valid');
      console.error('  2. Ensure you have API credits/quota');
      console.error('  3. Try with --provider gemini (free tier available)');
      console.error('  4. Reduce --count if hitting rate limits\n');
      process.exit(1);
    }
  });

// Show help if no command
if (process.argv.length === 2) {
  program.help();
}

program.parse();
