#!/usr/bin/env node

/**
 * rUvector CLI
 *
 * Beautiful command-line interface for vector database operations
 * Includes: Vector Search, Graph/Cypher, GNN, Compression, and more
 */

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const Table = require('cli-table3');
const fs = require('fs').promises;
const path = require('path');

// Lazy load backends to improve startup time
let vectorBackend = null;
let graphBackend = null;
let gnnBackend = null;

function getVectorBackend() {
  if (!vectorBackend) {
    try {
      const { VectorIndex, getBackendInfo, Utils } = require('../dist/index.js');
      vectorBackend = { VectorIndex, getBackendInfo, Utils };
    } catch (e) {
      console.error(chalk.red('Vector backend not available:', e.message));
      process.exit(1);
    }
  }
  return vectorBackend;
}

function getGraphBackend() {
  if (!graphBackend) {
    try {
      graphBackend = require('@ruvector/graph-node');
    } catch (e) {
      try {
        graphBackend = require('@ruvector/graph-wasm');
      } catch (e2) {
        return null;
      }
    }
  }
  return graphBackend;
}

function getGnnBackend() {
  if (!gnnBackend) {
    try {
      gnnBackend = require('@ruvector/gnn-node');
    } catch (e) {
      try {
        gnnBackend = require('@ruvector/gnn-wasm');
      } catch (e2) {
        return null;
      }
    }
  }
  return gnnBackend;
}

const program = new Command();

// Utility to format numbers
function formatNumber(num) {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  }
  return num.toString();
}

// Utility to format bytes
function formatBytes(bytes) {
  if (bytes >= 1_073_741_824) {
    return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
  } else if (bytes >= 1_048_576) {
    return `${(bytes / 1_048_576).toFixed(2)} MB`;
  } else if (bytes >= 1_024) {
    return `${(bytes / 1_024).toFixed(2)} KB`;
  }
  return `${bytes} B`;
}

// Utility to format duration
function formatDuration(ms) {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${ms.toFixed(2)}ms`;
}

// Info command
program
  .command('info')
  .description('Show backend information and available modules')
  .action(() => {
    const { getBackendInfo } = getVectorBackend();
    const info = getBackendInfo();

    console.log(chalk.bold.cyan('\n🚀 rUvector - All-in-One Vector Database\n'));

    const table = new Table({
      chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' }
    });

    table.push(
      ['Backend Type', chalk.green(info.type === 'native' ? '⚡ Native' : '🌐 WASM')],
      ['Version', info.version],
      ['Features', info.features.join(', ')]
    );

    console.log(table.toString());
    console.log();

    // Show available modules
    console.log(chalk.bold.cyan('📦 Available Modules:\n'));
    const modulesTable = new Table({
      head: ['Module', 'Status', 'Description'],
      colWidths: [20, 12, 45]
    });

    // Check vector
    modulesTable.push(['Vector Search', chalk.green('✓ Ready'), 'HNSW index, similarity search']);

    // Check graph
    const graphAvailable = getGraphBackend() !== null;
    modulesTable.push([
      'Graph/Cypher',
      graphAvailable ? chalk.green('✓ Ready') : chalk.yellow('○ Optional'),
      'Neo4j-compatible queries, hyperedges'
    ]);

    // Check GNN
    const gnnAvailable = getGnnBackend() !== null;
    modulesTable.push([
      'GNN Layers',
      gnnAvailable ? chalk.green('✓ Ready') : chalk.yellow('○ Optional'),
      'Neural network on graph topology'
    ]);

    // Built-in features
    modulesTable.push(['Compression', chalk.green('✓ Built-in'), 'f32→f16→PQ8→PQ4→Binary (2-32x)']);
    modulesTable.push(['WASM/Browser', chalk.green('✓ Built-in'), 'Client-side vector search']);

    console.log(modulesTable.toString());
    console.log();

    if (!graphAvailable || !gnnAvailable) {
      console.log(chalk.cyan('💡 Install optional modules:'));
      if (!graphAvailable) {
        console.log(chalk.white('   npm install @ruvector/graph-node'));
      }
      if (!gnnAvailable) {
        console.log(chalk.white('   npm install @ruvector/gnn-node'));
      }
      console.log();
    }
  });

// Init command
program
  .command('init <path>')
  .description('Initialize a new vector index')
  .option('-d, --dimension <number>', 'Vector dimension', '384')
  .option('-m, --metric <type>', 'Distance metric (cosine|euclidean|dot)', 'cosine')
  .option('-t, --type <type>', 'Index type (flat|hnsw)', 'hnsw')
  .option('--hnsw-m <number>', 'HNSW M parameter', '16')
  .option('--hnsw-ef <number>', 'HNSW ef_construction parameter', '200')
  .action(async (indexPath, options) => {
    const spinner = ora('Initializing vector index...').start();

    try {
      const { VectorIndex } = getVectorBackend();
      const index = new VectorIndex({
        dimension: parseInt(options.dimension),
        metric: options.metric,
        indexType: options.type,
        hnswConfig: options.type === 'hnsw' ? {
          m: parseInt(options.hnswM),
          efConstruction: parseInt(options.hnswEf)
        } : undefined
      });

      await index.save(indexPath);

      spinner.succeed(chalk.green('Index initialized successfully!'));

      console.log(chalk.cyan('\nConfiguration:'));
      console.log(`  Path: ${chalk.white(indexPath)}`);
      console.log(`  Dimension: ${chalk.white(options.dimension)}`);
      console.log(`  Metric: ${chalk.white(options.metric)}`);
      console.log(`  Type: ${chalk.white(options.type)}`);

      if (options.type === 'hnsw') {
        console.log(chalk.cyan('\nHNSW Parameters:'));
        console.log(`  M: ${chalk.white(options.hnswM)}`);
        console.log(`  ef_construction: ${chalk.white(options.hnswEf)}`);
      }

      console.log();
    } catch (error) {
      spinner.fail(chalk.red('Failed to initialize index'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Stats command
program
  .command('stats <path>')
  .description('Show index statistics')
  .action(async (indexPath) => {
    const spinner = ora('Loading index...').start();

    try {
      const { VectorIndex } = getVectorBackend();
      const index = await VectorIndex.load(indexPath);
      const stats = await index.stats();

      spinner.succeed(chalk.green('Index loaded'));

      console.log(chalk.bold.cyan('\n📊 Index Statistics\n'));

      const table = new Table({
        chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' }
      });

      table.push(
        ['Vectors', chalk.white(formatNumber(stats.vectorCount))],
        ['Dimension', chalk.white(stats.dimension)],
        ['Index Type', chalk.white(stats.indexType)],
        ['Memory Usage', chalk.white(stats.memoryUsage ? formatBytes(stats.memoryUsage) : 'N/A')]
      );

      console.log(table.toString());
      console.log();
    } catch (error) {
      spinner.fail(chalk.red('Failed to load index'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Insert command
program
  .command('insert <path> <vectors-file>')
  .description('Insert vectors from JSON file')
  .option('-b, --batch-size <number>', 'Batch size', '1000')
  .action(async (indexPath, vectorsFile, options) => {
    let spinner = ora('Loading index...').start();

    try {
      const { VectorIndex } = getVectorBackend();
      const index = await VectorIndex.load(indexPath);
      spinner.succeed();

      spinner = ora('Loading vectors...').start();
      const data = await fs.readFile(vectorsFile, 'utf-8');
      const vectors = JSON.parse(data);
      spinner.succeed(chalk.green(`Loaded ${vectors.length} vectors`));

      const startTime = Date.now();
      spinner = ora('Inserting vectors...').start();

      let lastProgress = 0;
      await index.insertBatch(vectors, {
        batchSize: parseInt(options.batchSize),
        progressCallback: (progress) => {
          const percent = Math.floor(progress * 100);
          if (percent > lastProgress) {
            spinner.text = `Inserting vectors... ${percent}%`;
            lastProgress = percent;
          }
        }
      });

      const duration = Date.now() - startTime;
      const throughput = vectors.length / (duration / 1000);

      spinner.succeed(chalk.green('Vectors inserted!'));

      console.log(chalk.cyan('\nPerformance:'));
      console.log(`  Duration: ${chalk.white(formatDuration(duration))}`);
      console.log(`  Throughput: ${chalk.white(formatNumber(throughput))} vectors/sec`);

      spinner = ora('Saving index...').start();
      await index.save(indexPath);
      spinner.succeed(chalk.green('Index saved'));

      console.log();
    } catch (error) {
      spinner.fail(chalk.red('Operation failed'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Search command
program
  .command('search <path>')
  .description('Search for similar vectors')
  .requiredOption('-q, --query <vector>', 'Query vector as JSON array')
  .option('-k, --top-k <number>', 'Number of results', '10')
  .option('--ef <number>', 'HNSW ef parameter')
  .action(async (indexPath, options) => {
    const spinner = ora('Loading index...').start();

    try {
      const { VectorIndex } = getVectorBackend();
      const index = await VectorIndex.load(indexPath);
      spinner.succeed();

      const query = JSON.parse(options.query);

      spinner.text = 'Searching...';
      spinner.start();

      const startTime = Date.now();
      const results = await index.search(query, {
        k: parseInt(options.topK),
        ef: options.ef ? parseInt(options.ef) : undefined
      });
      const duration = Date.now() - startTime;

      spinner.succeed(chalk.green(`Found ${results.length} results in ${formatDuration(duration)}`));

      console.log(chalk.bold.cyan('\n🔍 Search Results\n'));

      const table = new Table({
        head: ['Rank', 'ID', 'Score', 'Metadata'],
        colWidths: [6, 20, 12, 40]
      });

      results.forEach((result, i) => {
        table.push([
          chalk.yellow(`#${i + 1}`),
          result.id,
          chalk.green(result.score.toFixed(4)),
          result.metadata ? JSON.stringify(result.metadata).substring(0, 37) + '...' : ''
        ]);
      });

      console.log(table.toString());
      console.log();
    } catch (error) {
      spinner.fail(chalk.red('Search failed'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Benchmark command
program
  .command('benchmark')
  .description('Run performance benchmarks')
  .option('-d, --dimension <number>', 'Vector dimension', '384')
  .option('-n, --num-vectors <number>', 'Number of vectors', '10000')
  .option('-q, --num-queries <number>', 'Number of queries', '100')
  .action(async (options) => {
    const { VectorIndex, Utils } = getVectorBackend();
    const dimension = parseInt(options.dimension);
    const numVectors = parseInt(options.numVectors);
    const numQueries = parseInt(options.numQueries);

    console.log(chalk.bold.cyan('\n⚡ Performance Benchmark\n'));
    console.log(chalk.cyan('Configuration:'));
    console.log(`  Dimension: ${chalk.white(dimension)}`);
    console.log(`  Vectors: ${chalk.white(formatNumber(numVectors))}`);
    console.log(`  Queries: ${chalk.white(formatNumber(numQueries))}`);
    console.log();

    const results = [];

    try {
      // Create index
      let spinner = ora('Creating index...').start();
      const index = new VectorIndex({
        dimension,
        metric: 'cosine',
        indexType: 'hnsw'
      });
      spinner.succeed();

      // Generate vectors
      spinner = ora('Generating vectors...').start();
      const vectors = [];
      for (let i = 0; i < numVectors; i++) {
        vectors.push({
          id: `vec_${i}`,
          values: Utils.randomVector(dimension)
        });
      }
      spinner.succeed();

      // Insert benchmark
      spinner = ora('Benchmarking inserts...').start();
      const insertStart = Date.now();
      await index.insertBatch(vectors, { batchSize: 1000 });
      const insertDuration = Date.now() - insertStart;
      const insertThroughput = numVectors / (insertDuration / 1000);
      spinner.succeed();

      results.push({
        operation: 'Insert',
        duration: insertDuration,
        throughput: insertThroughput
      });

      // Search benchmark
      spinner = ora('Benchmarking searches...').start();
      const queries = [];
      for (let i = 0; i < numQueries; i++) {
        queries.push(Utils.randomVector(dimension));
      }

      const searchStart = Date.now();
      for (const query of queries) {
        await index.search(query, { k: 10 });
      }
      const searchDuration = Date.now() - searchStart;
      const searchThroughput = numQueries / (searchDuration / 1000);
      spinner.succeed();

      results.push({
        operation: 'Search',
        duration: searchDuration,
        throughput: searchThroughput
      });

      // Display results
      console.log(chalk.bold.cyan('\n📈 Results\n'));

      const table = new Table({
        head: ['Operation', 'Total Time', 'Throughput'],
        colWidths: [15, 20, 25]
      });

      results.forEach(result => {
        table.push([
          chalk.white(result.operation),
          chalk.yellow(formatDuration(result.duration)),
          chalk.green(`${formatNumber(result.throughput)} ops/sec`)
        ]);
      });

      console.log(table.toString());
      console.log();

      // Backend info
      const { getBackendInfo } = getVectorBackend();
      const info = getBackendInfo();
      console.log(chalk.cyan(`Backend: ${chalk.white(info.type)}`));
      console.log();

    } catch (error) {
      console.error(chalk.red('Benchmark failed:'), error.message);
      process.exit(1);
    }
  });

// ============================================================================
// GRAPH COMMANDS
// ============================================================================

const graphCmd = program
  .command('graph')
  .description('Graph database commands (Cypher queries, nodes, edges)');

graphCmd
  .command('query <cypher>')
  .description('Execute a Cypher query')
  .option('-f, --format <type>', 'Output format (table|json)', 'table')
  .action(async (cypher, options) => {
    const graph = getGraphBackend();
    if (!graph) {
      console.error(chalk.red('Graph module not installed. Run: npm install @ruvector/graph-node'));
      process.exit(1);
    }

    const spinner = ora('Executing Cypher query...').start();
    try {
      const db = new graph.GraphDB();
      const results = await db.query(cypher);
      spinner.succeed(chalk.green(`Query returned ${results.length} results`));

      if (options.format === 'json') {
        console.log(JSON.stringify(results, null, 2));
      } else {
        if (results.length > 0) {
          const table = new Table({
            head: Object.keys(results[0]).map(k => chalk.cyan(k))
          });
          results.forEach(row => {
            table.push(Object.values(row).map(v =>
              typeof v === 'object' ? JSON.stringify(v) : String(v)
            ));
          });
          console.log(table.toString());
        }
      }
    } catch (error) {
      spinner.fail(chalk.red('Query failed'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

graphCmd
  .command('create-node')
  .description('Create a new node')
  .requiredOption('-l, --label <label>', 'Node label')
  .requiredOption('-p, --properties <json>', 'Node properties as JSON')
  .action(async (options) => {
    const graph = getGraphBackend();
    if (!graph) {
      console.error(chalk.red('Graph module not installed. Run: npm install @ruvector/graph-node'));
      process.exit(1);
    }

    try {
      const db = new graph.GraphDB();
      const props = JSON.parse(options.properties);
      const nodeId = await db.createNode(options.label, props);
      console.log(chalk.green(`✓ Created node: ${nodeId}`));
    } catch (error) {
      console.error(chalk.red('Failed to create node:', error.message));
      process.exit(1);
    }
  });

// ============================================================================
// GNN COMMANDS
// ============================================================================

const gnnCmd = program
  .command('gnn')
  .description('Graph Neural Network commands');

gnnCmd
  .command('layer')
  .description('Create and test a GNN layer')
  .option('-i, --input-dim <number>', 'Input dimension', '128')
  .option('-h, --hidden-dim <number>', 'Hidden dimension', '256')
  .option('--heads <number>', 'Attention heads', '4')
  .action(async (options) => {
    const gnn = getGnnBackend();
    if (!gnn) {
      console.error(chalk.red('GNN module not installed. Run: npm install @ruvector/gnn-node'));
      process.exit(1);
    }

    try {
      const layer = new gnn.RuvectorLayer(
        parseInt(options.inputDim),
        parseInt(options.hiddenDim),
        parseInt(options.heads),
        0.1 // dropout
      );
      console.log(chalk.green('✓ GNN Layer created'));
      console.log(chalk.cyan('Configuration:'));
      console.log(`  Input dim: ${options.inputDim}`);
      console.log(`  Hidden dim: ${options.hiddenDim}`);
      console.log(`  Attention heads: ${options.heads}`);
    } catch (error) {
      console.error(chalk.red('Failed to create GNN layer:', error.message));
      process.exit(1);
    }
  });

gnnCmd
  .command('compress')
  .description('Compress a vector using adaptive compression')
  .requiredOption('-v, --vector <json>', 'Vector as JSON array')
  .option('-f, --frequency <number>', 'Access frequency (0-1)', '0.5')
  .action(async (options) => {
    const gnn = getGnnBackend();
    if (!gnn) {
      console.error(chalk.red('GNN module not installed. Run: npm install @ruvector/gnn-node'));
      process.exit(1);
    }

    try {
      const vector = JSON.parse(options.vector);
      const freq = parseFloat(options.frequency);
      const compressor = new gnn.TensorCompress();
      const compressed = compressor.compress(vector, freq);

      console.log(chalk.green('✓ Vector compressed'));
      console.log(chalk.cyan('Compression info:'));
      console.log(`  Original size: ${vector.length * 4} bytes`);
      console.log(`  Compressed: ${JSON.stringify(compressed).length} bytes`);
      console.log(`  Access frequency: ${freq}`);
      console.log(`  Level: ${gnn.getCompressionLevel(freq)}`);
    } catch (error) {
      console.error(chalk.red('Compression failed:', error.message));
      process.exit(1);
    }
  });

// Version
program.version(require('../package.json').version, '-v, --version', 'Show version');

// Help customization
program.on('--help', () => {
  console.log('');
  console.log(chalk.bold.cyan('Vector Commands:'));
  console.log('  $ ruvector info                                    Show backend info');
  console.log('  $ ruvector init my-index.bin -d 384                Initialize index');
  console.log('  $ ruvector insert my-index.bin vectors.json        Insert vectors');
  console.log('  $ ruvector search my-index.bin -q "[0.1,...]" -k 10');
  console.log('  $ ruvector benchmark -d 384 -n 10000               Run benchmarks');
  console.log('');
  console.log(chalk.bold.cyan('Graph Commands (requires @ruvector/graph-node):'));
  console.log('  $ ruvector graph query "MATCH (n) RETURN n"        Execute Cypher');
  console.log('  $ ruvector graph create-node -l Person -p \'{"name":"Alice"}\'');
  console.log('');
  console.log(chalk.bold.cyan('GNN Commands (requires @ruvector/gnn-node):'));
  console.log('  $ ruvector gnn layer -i 128 -h 256 --heads 4       Create GNN layer');
  console.log('  $ ruvector gnn compress -v "[0.1,...]" -f 0.5      Compress vector');
  console.log('');
  console.log(chalk.cyan('For more info: https://github.com/ruvnet/ruvector'));
  console.log('');
});

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
