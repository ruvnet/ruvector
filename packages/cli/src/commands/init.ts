import chalk from 'chalk';
import ora from 'ora';
import { GenomicVectorDB } from '@ruvector/genomic-vector-analysis';

export async function initCommand(options: {
  database: string;
  dimensions: string;
  metric: string;
  index: string;
}) {
  const spinner = ora('Initializing genomic vector database...').start();

  try {
    const dimensions = parseInt(options.dimensions);

    // Create database instance
    const db = new GenomicVectorDB({
      database: {
        dimensions,
        metric: options.metric,
        indexType: options.index,
      },
    });

    spinner.succeed('Database initialized successfully!');

    console.log();
    console.log(chalk.blue('Database Configuration:'));
    console.log(chalk.gray('━'.repeat(50)));
    console.log(`  Name:       ${chalk.green(options.database)}`);
    console.log(`  Dimensions: ${chalk.green(dimensions)}`);
    console.log(`  Metric:     ${chalk.green(options.metric)}`);
    console.log(`  Index:      ${chalk.green(options.index)}`);
    console.log(chalk.gray('━'.repeat(50)));
    console.log();
    console.log(chalk.yellow('Next steps:'));
    console.log('  1. Add genomic data:');
    console.log(chalk.cyan('     gva embed variants.vcf --model kmer'));
    console.log('  2. Search for patterns:');
    console.log(chalk.cyan('     gva search "neonatal seizures" --k 10'));
    console.log('  3. Train models:');
    console.log(chalk.cyan('     gva train --data cases.jsonl'));
    console.log();

  } catch (error) {
    spinner.fail('Failed to initialize database');
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  }
}
