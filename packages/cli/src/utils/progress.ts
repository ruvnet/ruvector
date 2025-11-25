import cliProgress from 'cli-progress';
import chalk from 'chalk';

export class ProgressTracker {
  private bar: cliProgress.SingleBar | null = null;
  private startTime: number = 0;
  private lastUpdate: number = 0;
  private processedItems: number = 0;
  private totalItems: number = 0;

  constructor(private name: string) {}

  start(total: number) {
    this.totalItems = total;
    this.processedItems = 0;
    this.startTime = Date.now();
    this.lastUpdate = this.startTime;

    this.bar = new cliProgress.SingleBar({
      format: `${chalk.cyan(this.name)} |${chalk.cyan('{bar}')}| {percentage}% | ETA: {eta}s | {value}/{total} | {throughput}`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
    });

    this.bar.start(total, 0, {
      throughput: '0 items/s',
    });
  }

  update(processed: number, metadata?: Record<string, any>) {
    if (!this.bar) return;

    this.processedItems = processed;
    const now = Date.now();
    const elapsed = (now - this.startTime) / 1000;
    const throughput = elapsed > 0 ? (processed / elapsed).toFixed(2) : '0';

    this.bar.update(processed, {
      throughput: `${throughput} items/s`,
      ...metadata,
    });

    this.lastUpdate = now;
  }

  increment(amount: number = 1, metadata?: Record<string, any>) {
    this.update(this.processedItems + amount, metadata);
  }

  stop() {
    if (this.bar) {
      this.bar.stop();
      this.bar = null;
    }

    const elapsed = (Date.now() - this.startTime) / 1000;
    const throughput = elapsed > 0 ? (this.processedItems / elapsed).toFixed(2) : '0';

    console.log(chalk.green(`✓ ${this.name} completed`));
    console.log(chalk.gray(`  Total time: ${elapsed.toFixed(2)}s`));
    console.log(chalk.gray(`  Throughput: ${throughput} items/s`));
  }

  fail(error: string) {
    if (this.bar) {
      this.bar.stop();
      this.bar = null;
    }
    console.log(chalk.red(`✗ ${this.name} failed: ${error}`));
  }
}

export class MultiProgressTracker {
  private multibar: cliProgress.MultiBar;
  private bars: Map<string, cliProgress.SingleBar> = new Map();
  private startTime: number = 0;
  private stats: Map<string, { processed: number; total: number; startTime: number }> = new Map();

  constructor() {
    this.multibar = new cliProgress.MultiBar({
      clearOnComplete: false,
      hideCursor: true,
      format: '{name} |{bar}| {percentage}% | ETA: {eta}s | {value}/{total}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
    });
    this.startTime = Date.now();
  }

  addTask(name: string, total: number) {
    const bar = this.multibar.create(total, 0, { name: chalk.cyan(name) });
    this.bars.set(name, bar);
    this.stats.set(name, { processed: 0, total, startTime: Date.now() });
  }

  update(name: string, value: number) {
    const bar = this.bars.get(name);
    const stat = this.stats.get(name);

    if (bar && stat) {
      bar.update(value);
      stat.processed = value;
    }
  }

  increment(name: string, amount: number = 1) {
    const stat = this.stats.get(name);
    if (stat) {
      this.update(name, stat.processed + amount);
    }
  }

  stop() {
    this.multibar.stop();

    console.log();
    console.log(chalk.green('✓ All tasks completed'));

    const totalElapsed = (Date.now() - this.startTime) / 1000;
    console.log(chalk.gray(`  Total time: ${totalElapsed.toFixed(2)}s`));

    console.log();
    console.log(chalk.blue('Task Statistics:'));
    this.stats.forEach((stat, name) => {
      const elapsed = (Date.now() - stat.startTime) / 1000;
      const throughput = elapsed > 0 ? (stat.processed / elapsed).toFixed(2) : '0';
      console.log(`  ${name}: ${stat.processed}/${stat.total} (${throughput} items/s)`);
    });
  }
}
