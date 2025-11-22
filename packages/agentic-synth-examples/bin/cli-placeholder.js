#!/usr/bin/env node

/**
 * Agentic Synth Examples CLI - WORKING VERSION
 * Actually generates files using the implemented generators
 */

import { Command } from 'commander';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const program = new Command();

program
  .name('agentic-synth-examples')
  .description('Production-ready examples for @ruvector/agentic-synth - NOW WITH REAL FILE GENERATION!')
  .version('0.1.2')
  .addHelpText('after', `
Examples:
  $ agentic-synth-examples generate stock-market --count 100 --output ./data
  $ agentic-synth-examples generate cicd --count 50
  $ agentic-synth-examples generate security --count 20
  $ agentic-synth-examples list

✨ NEW in v0.1.2: Real file generation is now working!
`);

program
  .command('list')
  .description('List all available example generators')
  .action(() => {
    console.log(`
📚 Available Example Generators (v0.1.2 - NOW WORKING!)

🤖 AI & Multi-Agent:
  • swarm             - Multi-agent swarm coordination data
  • self-learning     - Self-improving system scenarios

💰 Finance & Trading:
  • stock-market      - Realistic OHLCV stock market data with news events

🔒 Security & Testing:
  • security          - Vulnerability testing and penetration test scenarios

🚀 DevOps & CI/CD:
  • cicd              - Pipeline executions, test results, deployments

Usage:
  $ agentic-synth-examples generate <type> [options]
  $ agentic-synth-examples generate stock-market --count 100 --output ./data

Options:
  -c, --count <number>    Number of records to generate (default: 10)
  -o, --output <path>     Output directory (default: ./agentic-data)
  -f, --format <format>   Output format: json|csv (default: json)

For more information:
  $ agentic-synth-examples generate --help
`);
  });

program
  .command('generate')
  .description('Generate synthetic data files')
  .argument('<type>', 'Data type (stock-market, cicd, security, swarm, self-learning)')
  .option('-c, --count <number>', 'Number of records', '10')
  .option('-o, --output <path>', 'Output directory', './agentic-data')
  .option('-f, --format <format>', 'Output format (json|csv)', 'json')
  .option('--api-key <key>', 'API key for AI generation (optional)')
  .action(async (type, options) => {
    try {
      console.log(`\n📊 Generating ${type} data...`);
      console.log(`   Count: ${options.count} records`);
      console.log(`   Output: ${options.output}`);
      console.log(`   Format: ${options.format}\n`);

      // Import the generators dynamically
      const { Examples } = await import('../dist/index.js');

      let generator;
      let data;
      let filename;

      const count = parseInt(options.count);

      switch (type) {
        case 'stock-market':
          console.log('🏦 Initializing Stock Market Simulator...');
          generator = Examples.createStockMarket({
            tickerSymbols: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'],
            marketCondition: 'bullish',
            generateNews: true,
          });
          data = await generator.generate(count);
          filename = 'stock-market-data.json';
          break;

        case 'cicd':
          console.log('🚀 Initializing CI/CD Data Generator...');
          generator = Examples.createCICD({
            pipelineTypes: ['build', 'test', 'deploy'],
            includeMetrics: true,
          });
          data = await generator.generate(count);
          filename = 'cicd-pipelines.json';
          break;

        case 'security':
          console.log('🔒 Initializing Security Testing Generator...');
          generator = Examples.createSecurity({
            vulnerabilityTypes: ['sql-injection', 'xss', 'csrf', 'auth-bypass'],
            includeExploits: true,
          });
          data = await generator.generate(count);
          filename = 'security-tests.json';
          break;

        case 'swarm':
          console.log('🤖 Initializing Swarm Coordinator...');
          generator = Examples.createSwarm({
            agentCount: Math.min(count, 20),
            coordinationStrategy: 'hierarchical',
          });
          data = await generator.generate(count);
          filename = 'swarm-coordination.json';
          break;

        case 'self-learning':
          console.log('🧠 Initializing Self-Learning Generator...');
          generator = Examples.createSelfLearning({
            learningRate: 0.1,
            taskType: 'code-generation',
          });
          data = await generator.generate(count);
          filename = 'self-learning-data.json';
          break;

        default:
          console.error(`❌ Unknown type: ${type}`);
          console.log('\nAvailable types: stock-market, cicd, security, swarm, self-learning');
          console.log('Run "agentic-synth-examples list" for more details');
          process.exit(1);
      }

      // Ensure output directory exists
      const outputDir = resolve(process.cwd(), options.output);
      mkdirSync(outputDir, { recursive: true });

      // Write the file
      const outputPath = resolve(outputDir, filename);

      const output = {
        metadata: {
          type,
          count: data.length || count,
          generated: new Date().toISOString(),
          version: '0.1.2',
          generator: `@ruvector/agentic-synth-examples`,
        },
        data,
      };

      writeFileSync(outputPath, JSON.stringify(output, null, 2));

      console.log(`\n✅ Generated ${data.length || count} records`);
      console.log(`📁 Saved to: ${outputPath}`);
      console.log(`📊 File size: ${(JSON.stringify(output).length / 1024).toFixed(2)} KB\n`);

      // Show sample
      if (data && data.length > 0) {
        console.log('Sample record:');
        console.log(JSON.stringify(data[0], null, 2));
      }

      console.log('\n✨ Generation complete!\n');

    } catch (error) {
      console.error('\n❌ Generation failed:', error.message);
      if (error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// DSPy command (keeping for compatibility, but with note)
program
  .command('dspy')
  .description('DSPy multi-model training (advanced feature)')
  .action(() => {
    console.log('\n🧠 DSPy Multi-Model Training\n');
    console.log('DSPy training is an advanced feature that requires:');
    console.log('  - Multiple AI model API keys (Gemini, Claude, GPT-4, etc.)');
    console.log('  - Significant computational resources');
    console.log('  - Extended training time (10-30 minutes)\n');
    console.log('For DSPy training, use the API directly:');
    console.log('  import { DSPyTrainingSession } from "@ruvector/agentic-synth-examples";\n');
    console.log('See documentation: https://www.npmjs.com/package/@ruvector/agentic-synth-examples\n');
  });

// Error handler
program.on('command:*', function () {
  console.error('\n❌ Invalid command: %s', program.args.join(' '));
  console.log('Run "agentic-synth-examples --help" for available commands.\n');
  process.exit(1);
});

// Show help if no command
if (process.argv.length === 2) {
  program.help();
}

program.parse();
