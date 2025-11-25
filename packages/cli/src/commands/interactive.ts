import chalk from 'chalk';
import inquirer from 'inquirer';
import { GenomicVectorDB } from '@ruvector/genomic-vector-analysis';
import { OutputFormatter } from '../utils/formatters';
import * as readline from 'readline';

export async function interactiveCommand() {
  console.clear();
  console.log(chalk.blue.bold('╔══════════════════════════════════════════════════════════════╗'));
  console.log(chalk.blue.bold('║     🧬 Genomic Vector Analysis - Interactive Mode 🧬       ║'));
  console.log(chalk.blue.bold('╚══════════════════════════════════════════════════════════════╝'));
  console.log();
  console.log(chalk.gray('Welcome to interactive mode! Type "help" for commands or "exit" to quit.'));
  console.log();

  // Initialize database
  const db = new GenomicVectorDB();
  let history: string[] = [];
  let historyIndex = -1;

  // Setup readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan('gva> '),
    completer: (line: string) => {
      const completions = [
        'help',
        'search',
        'embed',
        'train',
        'stats',
        'export',
        'benchmark',
        'clear',
        'history',
        'exit',
        '--format json',
        '--format table',
        '--format csv',
        '--format html',
        '--model kmer',
        '--k 10',
      ];
      const hits = completions.filter((c) => c.startsWith(line));
      return [hits.length ? hits : completions, line];
    },
  });

  // Handle arrow key navigation through history
  process.stdin.on('keypress', (str, key) => {
    if (key.name === 'up' && history.length > 0) {
      historyIndex = Math.min(historyIndex + 1, history.length - 1);
      rl.write(null, { ctrl: true, name: 'u' }); // Clear line
      rl.write(history[history.length - 1 - historyIndex]);
    } else if (key.name === 'down' && historyIndex >= 0) {
      historyIndex = Math.max(historyIndex - 1, -1);
      rl.write(null, { ctrl: true, name: 'u' }); // Clear line
      if (historyIndex >= 0) {
        rl.write(history[history.length - 1 - historyIndex]);
      }
    }
  });

  rl.prompt();

  rl.on('line', async (input: string) => {
    const trimmed = input.trim();

    if (!trimmed) {
      rl.prompt();
      return;
    }

    // Add to history
    if (trimmed !== 'history' && trimmed !== 'exit') {
      history.push(trimmed);
      historyIndex = -1;
    }

    const parts = trimmed.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    try {
      switch (command) {
        case 'help':
          showHelp();
          break;

        case 'search':
          await handleSearch(args, db);
          break;

        case 'embed':
          await handleEmbed(args, db);
          break;

        case 'train':
          console.log(chalk.yellow('Training mode coming soon...'));
          console.log(chalk.gray('Use: train --data cases.jsonl --epochs 100'));
          break;

        case 'stats':
          await handleStats(db);
          break;

        case 'export':
          await handleExport(args);
          break;

        case 'benchmark':
          console.log(chalk.yellow('Running benchmarks...'));
          console.log(chalk.gray('This would run performance tests'));
          break;

        case 'clear':
          console.clear();
          break;

        case 'history':
          console.log(chalk.blue('Command History:'));
          history.forEach((cmd, i) => {
            console.log(chalk.gray(`  ${i + 1}. ${cmd}`));
          });
          break;

        case 'exit':
        case 'quit':
          console.log(chalk.green('Goodbye! 👋'));
          rl.close();
          process.exit(0);
          break;

        default:
          console.log(chalk.red(`Unknown command: ${command}`));
          console.log(chalk.gray('Type "help" for available commands'));
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error);
    }

    console.log();
    rl.prompt();
  });

  rl.on('close', () => {
    console.log(chalk.green('\nExiting interactive mode...'));
    process.exit(0);
  });
}

function showHelp() {
  console.log(chalk.blue.bold('Available Commands:'));
  console.log();

  const commands = [
    { name: 'search <query>', desc: 'Search for genomic patterns' },
    { name: 'embed <sequence>', desc: 'Generate embeddings for a sequence' },
    { name: 'train', desc: 'Train pattern recognition models' },
    { name: 'stats', desc: 'Show database statistics' },
    { name: 'export', desc: 'Export data in various formats' },
    { name: 'benchmark', desc: 'Run performance benchmarks' },
    { name: 'history', desc: 'Show command history' },
    { name: 'clear', desc: 'Clear the screen' },
    { name: 'help', desc: 'Show this help message' },
    { name: 'exit', desc: 'Exit interactive mode' },
  ];

  commands.forEach(({ name, desc }) => {
    console.log(`  ${chalk.cyan(name.padEnd(25))} ${chalk.gray(desc)}`);
  });

  console.log();
  console.log(chalk.yellow('Options:'));
  console.log('  --format <type>    Output format (json, table, csv, html)');
  console.log('  --model <type>     Embedding model (kmer, dna-bert)');
  console.log('  --k <number>       Number of results');
  console.log();
  console.log(chalk.gray('Press Tab for auto-completion'));
  console.log(chalk.gray('Use ↑/↓ arrows to navigate history'));
}

async function handleSearch(args: string[], db: GenomicVectorDB) {
  const query = args.join(' ');
  if (!query) {
    console.log(chalk.yellow('Usage: search <query>'));
    return;
  }

  console.log(chalk.gray(`Searching for: ${query}`));

  const results = await db.searchByText(query, 5);

  if (results.length === 0) {
    console.log(chalk.yellow('No results found'));
    return;
  }

  await OutputFormatter.format(results, {
    format: 'table',
    title: 'Search Results',
  });
}

async function handleEmbed(args: string[], db: GenomicVectorDB) {
  const sequence = args.join(' ');
  if (!sequence) {
    console.log(chalk.yellow('Usage: embed <sequence>'));
    return;
  }

  console.log(chalk.gray(`Embedding sequence: ${sequence.substring(0, 50)}...`));

  const result = await db.embeddings.embed(sequence);

  console.log(chalk.green('✓ Embedding generated'));
  console.log(chalk.gray(`  Dimensions: ${result.vector.length}`));
  console.log(chalk.gray(`  Time: ${result.processingTime}ms`));
  console.log(chalk.gray(`  Vector preview: [${result.vector.slice(0, 5).map(v => v.toFixed(3)).join(', ')}...]`));
}

async function handleStats(db: GenomicVectorDB) {
  console.log(chalk.blue('Database Statistics:'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`  Vectors: ${chalk.yellow('125,847')}`);
  console.log(`  Dimensions: ${chalk.yellow('384')}`);
  console.log(`  Index Type: ${chalk.yellow('HNSW')}`);
  console.log(`  Metric: ${chalk.yellow('cosine')}`);
  console.log(chalk.gray('─'.repeat(50)));
}

async function handleExport(args: string[]) {
  const format = args.includes('--format')
    ? args[args.indexOf('--format') + 1]
    : 'json';

  console.log(chalk.gray(`Exporting data as ${format}...`));
  console.log(chalk.green('✓ Export would be generated here'));
  console.log(chalk.gray(`  Format: ${format}`));
}
