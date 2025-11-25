import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import { GenomicVectorDB } from '@ruvector/genomic-vector-analysis';

export async function searchCommand(
  query: string,
  options: {
    topK: string;
    threshold?: string;
    filters?: string;
    format: string;
  }
) {
  const spinner = ora('Searching...').start();

  try {
    const k = parseInt(options.topK);
    const threshold = options.threshold ? parseFloat(options.threshold) : undefined;
    const filters = options.filters ? JSON.parse(options.filters) : undefined;

    // Initialize database
    const db = new GenomicVectorDB();

    // Perform search
    const startTime = Date.now();
    const results = await db.searchByText(query, k);
    const searchTime = Date.now() - startTime;

    spinner.succeed(`Found ${results.length} results in ${searchTime}ms`);

    if (results.length === 0) {
      console.log(chalk.yellow('No results found'));
      return;
    }

    // Display results
    console.log();
    console.log(chalk.blue(`Top ${results.length} Results:`));
    console.log(chalk.gray('━'.repeat(70)));

    if (options.format === 'json') {
      console.log(JSON.stringify(results, null, 2));
    } else {
      // Table format
      const tableData = [
        [
          chalk.bold('Rank'),
          chalk.bold('ID'),
          chalk.bold('Score'),
          chalk.bold('Metadata'),
        ],
        ...results.map((r, i) => [
          (i + 1).toString(),
          r.id.substring(0, 20),
          r.score.toFixed(4),
          JSON.stringify(r.metadata || {}).substring(0, 30),
        ]),
      ];

      console.log(table(tableData));
    }

    console.log();
    console.log(chalk.gray(`Search completed in ${searchTime}ms`));

  } catch (error) {
    spinner.fail('Search failed');
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  }
}
