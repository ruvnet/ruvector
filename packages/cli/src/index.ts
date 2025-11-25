#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init';
import { embedCommand } from './commands/embed';
import { searchCommand } from './commands/search';
import { trainCommand } from './commands/train';
import { benchmarkCommand } from './commands/benchmark';
import { exportCommand } from './commands/export';
import { statsCommand } from './commands/stats';
import { interactiveCommand } from './commands/interactive';

const program = new Command();

program
  .name('gva')
  .description('Genomic Vector Analysis - CLI tool for genomic data analysis')
  .version('1.0.0');

// Init command
program
  .command('init')
  .description('Initialize a new genomic vector database')
  .option('-d, --database <name>', 'Database name', 'genomic-db')
  .option('--dimensions <number>', 'Vector dimensions', '384')
  .option('--metric <type>', 'Distance metric (cosine|euclidean|hamming)', 'cosine')
  .option('--index <type>', 'Index type (hnsw|ivf|flat)', 'hnsw')
  .action(initCommand);

// Embed command
program
  .command('embed <file>')
  .description('Generate embeddings for genomic sequences')
  .option('-m, --model <type>', 'Embedding model (kmer|dna-bert|nucleotide-transformer)', 'kmer')
  .option('--dims <number>', 'Embedding dimensions', '384')
  .option('-k, --kmer-size <number>', 'K-mer size for k-mer model', '6')
  .option('-o, --output <file>', 'Output file for embeddings')
  .option('-b, --batch-size <number>', 'Batch size for processing', '32')
  .action(embedCommand);

// Search command
program
  .command('search <query>')
  .description('Search for similar genomic sequences or patterns')
  .option('-k, --top-k <number>', 'Number of results to return', '10')
  .option('-t, --threshold <number>', 'Similarity threshold (0-1)')
  .option('-f, --filters <json>', 'JSON filters for metadata')
  .option('--format <type>', 'Output format (json|table)', 'table')
  .action(searchCommand);

// Train command
program
  .command('train')
  .description('Train pattern recognition models from historical data')
  .option('-m, --model <type>', 'Model type (pattern-recognizer|rl)', 'pattern-recognizer')
  .option('-d, --data <file>', 'Training data file (JSONL format)', 'cases.jsonl')
  .option('-e, --epochs <number>', 'Number of training epochs', '10')
  .option('--learning-rate <number>', 'Learning rate', '0.01')
  .option('--validation-split <number>', 'Validation split ratio', '0.2')
  .action(trainCommand);

// Benchmark command
program
  .command('benchmark')
  .description('Run performance benchmarks')
  .option('-d, --dataset <file>', 'Test dataset file')
  .option('-o, --operations <list>', 'Operations to benchmark (embed,search,train)', 'embed,search')
  .option('-i, --iterations <number>', 'Number of iterations', '100')
  .option('--format <type>', 'Output format (json|table)', 'table')
  .option('--report <type>', 'Generate report (html)', '')
  .action(benchmarkCommand);

// Export command
program
  .command('export')
  .description('Export genomic data in various formats')
  .option('-f, --format <type>', 'Output format (json|csv|html)', 'json')
  .option('-o, --output <file>', 'Output file path')
  .option('-d, --database <name>', 'Database name')
  .option('-q, --query <string>', 'Filter query')
  .option('-l, --limit <number>', 'Limit number of records', '1000')
  .action(exportCommand);

// Stats command
program
  .command('stats')
  .description('Show database statistics and metrics')
  .option('-d, --database <name>', 'Database name')
  .option('-v, --verbose', 'Show detailed statistics')
  .action(statsCommand);

// Interactive command
program
  .command('interactive')
  .description('Start interactive REPL mode')
  .action(interactiveCommand);

// Info command
program
  .command('info')
  .description('Show database information and statistics')
  .action(() => {
    console.log(chalk.blue('Genomic Vector Analysis v1.0.0'));
    console.log(chalk.gray('High-performance genomic data analysis with advanced learning'));
    console.log();
    console.log(chalk.yellow('Features:'));
    console.log('  • Vector database for genomic data');
    console.log('  • Multiple embedding models');
    console.log('  • Pattern recognition and learning');
    console.log('  • Multi-modal search capabilities');
    console.log('  • Plugin architecture');
    console.log('  • Rust/WASM acceleration');
    console.log();
    console.log(chalk.cyan('Commands:'));
    console.log('  init        Initialize a new database');
    console.log('  embed       Generate embeddings from genomic data');
    console.log('  search      Search for similar patterns');
    console.log('  train       Train pattern recognition models');
    console.log('  benchmark   Run performance benchmarks');
    console.log('  export      Export data in various formats');
    console.log('  stats       Show database statistics');
    console.log('  interactive Start interactive REPL mode');
    console.log();
    console.log(chalk.gray('Run "gva <command> --help" for command-specific options'));
  });

// Parse arguments
program.parse();
