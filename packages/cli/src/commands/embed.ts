import chalk from 'chalk';
import ora from 'ora';
import { GenomicVectorDB } from '@ruvector/genomic-vector-analysis';
import { readFile, writeFile } from 'fs/promises';

export async function embedCommand(
  file: string,
  options: {
    model: string;
    dims: string;
    kmerSize: string;
    output?: string;
    batchSize: string;
  }
) {
  const spinner = ora('Loading sequences...').start();

  try {
    // Read input file
    const content = await readFile(file, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());

    spinner.text = `Processing ${lines.length} sequences...`;

    // Initialize database
    const dimensions = parseInt(options.dims);
    const db = new GenomicVectorDB({
      database: { dimensions },
      embeddings: {
        model: options.model,
        dimensions,
        kmerSize: parseInt(options.kmerSize),
        batchSize: parseInt(options.batchSize),
      },
    });

    // Process sequences
    const results = [];
    let processed = 0;

    for (const line of lines) {
      if (!line.startsWith('>')) {
        const embedding = await db.embeddings.embed(line);
        results.push({
          sequence: line.substring(0, 50) + '...',
          dimensions: embedding.vector.length,
          processingTime: embedding.processingTime,
        });

        processed++;
        if (processed % 10 === 0) {
          spinner.text = `Processed ${processed}/${lines.length} sequences...`;
        }
      }
    }

    spinner.succeed(`Successfully embedded ${results.length} sequences`);

    // Display statistics
    console.log();
    console.log(chalk.blue('Embedding Statistics:'));
    console.log(chalk.gray('━'.repeat(50)));
    console.log(`  Total sequences:   ${chalk.green(results.length)}`);
    console.log(`  Model:             ${chalk.green(options.model)}`);
    console.log(`  Dimensions:        ${chalk.green(dimensions)}`);
    console.log(`  Avg. time/seq:     ${chalk.green(
      (results.reduce((sum, r) => sum + (r.processingTime || 0), 0) / results.length).toFixed(2)
    )}ms`);
    console.log(chalk.gray('━'.repeat(50)));

    // Save results if output specified
    if (options.output) {
      await writeFile(
        options.output,
        JSON.stringify(results, null, 2)
      );
      console.log();
      console.log(chalk.green(`Results saved to: ${options.output}`));
    }

  } catch (error) {
    spinner.fail('Failed to embed sequences');
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  }
}
