/**
 * Benchmark Report Generator
 *
 * Generates comprehensive HTML reports with charts and visualizations:
 * - Performance trends
 * - Comparison with baselines
 * - Success/failure metrics
 * - Resource utilization
 */

import * as fs from 'fs';
import * as path from 'path';
import type { BenchmarkResult } from './vcf-benchmark';
import type { ClinVarBenchmarkResult } from './clinvar-benchmark';
import type { PhenotypeBenchmarkResult } from './phenotype-benchmark';
import type { GIABBenchmarkResult } from './giab-validation';
import type { EndToEndResult } from './end-to-end-benchmark';

type AnyBenchmarkResult =
  | BenchmarkResult
  | ClinVarBenchmarkResult
  | PhenotypeBenchmarkResult
  | GIABBenchmarkResult
  | EndToEndResult;

interface BenchmarkSummary {
  totalTests: number;
  successful: number;
  failed: number;
  totalDurationMs: number;
  avgThroughput: number;
  peakMemoryMB: number;
  timestamp: string;
}

interface PerformanceBaseline {
  name: string;
  expectedThroughput: number;
  maxLatencyMs: number;
  maxMemoryMB: number;
}

const PERFORMANCE_BASELINES: PerformanceBaseline[] = [
  {
    name: 'VCF Parsing',
    expectedThroughput: 50000, // 50K variants/sec claimed
    maxLatencyMs: 0.02, // 20 microseconds per variant
    maxMemoryMB: 500,
  },
  {
    name: 'Embedding Generation',
    expectedThroughput: 25000,
    maxLatencyMs: 0.04,
    maxMemoryMB: 1000,
  },
  {
    name: 'End-to-End Processing',
    expectedThroughput: 10000,
    maxLatencyMs: 0.1,
    maxMemoryMB: 2000,
  },
];

/**
 * Generate HTML report
 */
export function generateHTMLReport(
  results: AnyBenchmarkResult[],
  outputPath: string
): void {
  const summary = calculateSummary(results);
  const comparisonData = compareWithBaselines(results);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Genomic Vector Analysis - Empirical Benchmark Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    h1 {
      color: #2c3e50;
      margin-bottom: 10px;
      font-size: 2.5em;
    }

    h2 {
      color: #34495e;
      margin-top: 40px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #3498db;
    }

    h3 {
      color: #555;
      margin-top: 30px;
      margin-bottom: 15px;
    }

    .timestamp {
      color: #7f8c8d;
      font-size: 0.9em;
      margin-bottom: 30px;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }

    .summary-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .summary-card.success {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .summary-card.warning {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }

    .summary-card.info {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }

    .summary-card h3 {
      margin: 0 0 10px 0;
      color: white;
      font-size: 1em;
      opacity: 0.9;
    }

    .summary-card .value {
      font-size: 2.5em;
      font-weight: bold;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      background: white;
    }

    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }

    th {
      background: #3498db;
      color: white;
      font-weight: 600;
    }

    tr:hover {
      background: #f8f9fa;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.85em;
      font-weight: 600;
    }

    .status-badge.pass {
      background: #d4edda;
      color: #155724;
    }

    .status-badge.fail {
      background: #f8d7da;
      color: #721c24;
    }

    .status-badge.warning {
      background: #fff3cd;
      color: #856404;
    }

    .chart-container {
      margin: 30px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .bar-chart {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .bar-row {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .bar-label {
      min-width: 200px;
      font-weight: 500;
    }

    .bar-container {
      flex: 1;
      height: 30px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }

    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #3498db, #2ecc71);
      transition: width 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 10px;
      color: white;
      font-weight: 600;
      font-size: 0.85em;
    }

    .bar-value {
      min-width: 120px;
      text-align: right;
      font-weight: 600;
      color: #555;
    }

    .error-list {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }

    .error-list ul {
      margin-left: 20px;
    }

    .comparison-table td.good {
      background: #d4edda;
    }

    .comparison-table td.bad {
      background: #f8d7da;
    }

    footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      color: #7f8c8d;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧬 Genomic Vector Analysis</h1>
    <h2>Empirical Benchmark Report</h2>
    <div class="timestamp">Generated: ${summary.timestamp}</div>

    <div class="summary-grid">
      <div class="summary-card success">
        <h3>Total Tests</h3>
        <div class="value">${summary.totalTests}</div>
      </div>
      <div class="summary-card info">
        <h3>Successful</h3>
        <div class="value">${summary.successful}</div>
      </div>
      ${summary.failed > 0 ? `
      <div class="summary-card warning">
        <h3>Failed</h3>
        <div class="value">${summary.failed}</div>
      </div>
      ` : ''}
      <div class="summary-card info">
        <h3>Avg Throughput</h3>
        <div class="value">${summary.avgThroughput.toFixed(0)}</div>
        <div style="font-size: 0.8em; margin-top: 5px;">variants/sec</div>
      </div>
      <div class="summary-card info">
        <h3>Total Duration</h3>
        <div class="value">${(summary.totalDurationMs / 1000).toFixed(1)}</div>
        <div style="font-size: 0.8em; margin-top: 5px;">seconds</div>
      </div>
      <div class="summary-card info">
        <h3>Peak Memory</h3>
        <div class="value">${summary.peakMemoryMB.toFixed(0)}</div>
        <div style="font-size: 0.8em; margin-top: 5px;">MB</div>
      </div>
    </div>

    <h2>📊 Performance Results</h2>
    ${generatePerformanceTable(results)}

    <h2>📈 Throughput Comparison</h2>
    <div class="chart-container">
      ${generateThroughputChart(results)}
    </div>

    <h2>⚖️ Baseline Comparison</h2>
    ${generateBaselineComparison(comparisonData)}

    <h2>💾 Memory Usage</h2>
    <div class="chart-container">
      ${generateMemoryChart(results)}
    </div>

    ${generateErrorSection(results)}

    <footer>
      <p>Genomic Vector Analysis Benchmark Suite v1.0.0</p>
      <p>Generated with realistic genomic datasets (VCF, ClinVar, HPO, GIAB)</p>
    </footer>
  </div>
</body>
</html>`;

  fs.writeFileSync(outputPath, html);
  console.log(`\n✓ HTML report generated: ${outputPath}`);
}

/**
 * Calculate summary statistics
 */
function calculateSummary(results: AnyBenchmarkResult[]): BenchmarkSummary {
  let totalDurationMs = 0;
  let totalThroughput = 0;
  let peakMemoryMB = 0;
  let successful = 0;
  let failed = 0;

  for (const result of results) {
    if ('successful' in result && result.successful) {
      successful++;
    } else if ('successful' in result) {
      failed++;
    }

    if ('totalTimeMs' in result) {
      totalDurationMs += result.totalTimeMs;
    } else if ('totalDurationMs' in result) {
      totalDurationMs += result.totalDurationMs;
    }

    if ('variantsPerSec' in result) {
      totalThroughput += result.variantsPerSec;
    } else if ('patientsPerSec' in result) {
      totalThroughput += result.patientsPerSec;
    } else if ('overallThroughput' in result) {
      totalThroughput += result.overallThroughput;
    }

    if ('memoryUsedMB' in result) {
      peakMemoryMB = Math.max(peakMemoryMB, result.memoryUsedMB);
    } else if ('peakMemoryMB' in result) {
      peakMemoryMB = Math.max(peakMemoryMB, result.peakMemoryMB);
    }
  }

  return {
    totalTests: results.length,
    successful,
    failed,
    totalDurationMs,
    avgThroughput: results.length > 0 ? totalThroughput / results.length : 0,
    peakMemoryMB,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate performance table HTML
 */
function generatePerformanceTable(results: AnyBenchmarkResult[]): string {
  let html = '<table><thead><tr>';
  html += '<th>Test Name</th>';
  html += '<th>Status</th>';
  html += '<th>Duration (ms)</th>';
  html += '<th>Throughput</th>';
  html += '<th>Memory (MB)</th>';
  html += '</tr></thead><tbody>';

  for (const result of results) {
    const status = ('successful' in result && result.successful) ? 'pass' : 'fail';
    const testName = result.testName;
    const duration = ('totalTimeMs' in result) ? result.totalTimeMs.toFixed(0) :
                     ('totalDurationMs' in result) ? result.totalDurationMs.toFixed(0) : 'N/A';

    let throughput = 'N/A';
    if ('variantsPerSec' in result) {
      throughput = `${result.variantsPerSec.toFixed(0)} var/s`;
    } else if ('patientsPerSec' in result) {
      throughput = `${result.patientsPerSec.toFixed(0)} pat/s`;
    } else if ('overallThroughput' in result) {
      throughput = `${result.overallThroughput.toFixed(0)} var/s`;
    }

    const memory = ('memoryUsedMB' in result) ? result.memoryUsedMB.toFixed(1) :
                   ('peakMemoryMB' in result) ? result.peakMemoryMB.toFixed(1) : 'N/A';

    html += `<tr>
      <td>${testName}</td>
      <td><span class="status-badge ${status}">${status.toUpperCase()}</span></td>
      <td>${duration}</td>
      <td>${throughput}</td>
      <td>${memory}</td>
    </tr>`;
  }

  html += '</tbody></table>';
  return html;
}

/**
 * Generate throughput chart HTML
 */
function generateThroughputChart(results: AnyBenchmarkResult[]): string {
  const maxThroughput = Math.max(...results.map(r => {
    if ('variantsPerSec' in r) return r.variantsPerSec;
    if ('patientsPerSec' in r) return r.patientsPerSec;
    if ('overallThroughput' in r) return r.overallThroughput;
    return 0;
  }));

  let html = '<div class="bar-chart">';

  for (const result of results) {
    let throughput = 0;
    let unit = 'items/s';

    if ('variantsPerSec' in result) {
      throughput = result.variantsPerSec;
      unit = 'var/s';
    } else if ('patientsPerSec' in result) {
      throughput = result.patientsPerSec;
      unit = 'pat/s';
    } else if ('overallThroughput' in result) {
      throughput = result.overallThroughput;
      unit = 'var/s';
    }

    const percentage = maxThroughput > 0 ? (throughput / maxThroughput) * 100 : 0;

    html += `
    <div class="bar-row">
      <div class="bar-label">${result.testName}</div>
      <div class="bar-container">
        <div class="bar-fill" style="width: ${percentage}%"></div>
      </div>
      <div class="bar-value">${throughput.toFixed(0)} ${unit}</div>
    </div>`;
  }

  html += '</div>';
  return html;
}

/**
 * Generate memory chart HTML
 */
function generateMemoryChart(results: AnyBenchmarkResult[]): string {
  const maxMemory = Math.max(...results.map(r => {
    if ('memoryUsedMB' in r) return r.memoryUsedMB;
    if ('peakMemoryMB' in r) return r.peakMemoryMB;
    return 0;
  }));

  let html = '<div class="bar-chart">';

  for (const result of results) {
    let memory = 0;

    if ('memoryUsedMB' in result) {
      memory = result.memoryUsedMB;
    } else if ('peakMemoryMB' in result) {
      memory = result.peakMemoryMB;
    }

    const percentage = maxMemory > 0 ? (memory / maxMemory) * 100 : 0;

    html += `
    <div class="bar-row">
      <div class="bar-label">${result.testName}</div>
      <div class="bar-container">
        <div class="bar-fill" style="width: ${percentage}%"></div>
      </div>
      <div class="bar-value">${memory.toFixed(1)} MB</div>
    </div>`;
  }

  html += '</div>';
  return html;
}

/**
 * Compare results with baselines
 */
function compareWithBaselines(results: AnyBenchmarkResult[]): Array<{
  testName: string;
  actualThroughput: number;
  expectedThroughput: number;
  meetsExpectation: boolean;
}> {
  const comparisons = [];

  for (const baseline of PERFORMANCE_BASELINES) {
    const matchingResults = results.filter(r => r.testName.includes(baseline.name));

    for (const result of matchingResults) {
      let actualThroughput = 0;

      if ('variantsPerSec' in result) {
        actualThroughput = result.variantsPerSec;
      } else if ('overallThroughput' in result) {
        actualThroughput = result.overallThroughput;
      }

      comparisons.push({
        testName: result.testName,
        actualThroughput,
        expectedThroughput: baseline.expectedThroughput,
        meetsExpectation: actualThroughput >= baseline.expectedThroughput * 0.8, // 80% threshold
      });
    }
  }

  return comparisons;
}

/**
 * Generate baseline comparison table
 */
function generateBaselineComparison(comparisons: ReturnType<typeof compareWithBaselines>): string {
  if (comparisons.length === 0) {
    return '<p>No baseline comparisons available.</p>';
  }

  let html = '<table class="comparison-table"><thead><tr>';
  html += '<th>Test Name</th>';
  html += '<th>Expected</th>';
  html += '<th>Actual</th>';
  html += '<th>% of Expected</th>';
  html += '<th>Status</th>';
  html += '</tr></thead><tbody>';

  for (const comp of comparisons) {
    const percentage = (comp.actualThroughput / comp.expectedThroughput) * 100;
    const status = comp.meetsExpectation ? 'pass' : 'warning';
    const rowClass = comp.meetsExpectation ? 'good' : 'bad';

    html += `<tr class="${rowClass}">
      <td>${comp.testName}</td>
      <td>${comp.expectedThroughput.toLocaleString()} var/s</td>
      <td>${comp.actualThroughput.toFixed(0)} var/s</td>
      <td>${percentage.toFixed(1)}%</td>
      <td><span class="status-badge ${status}">${status.toUpperCase()}</span></td>
    </tr>`;
  }

  html += '</tbody></table>';
  return html;
}

/**
 * Generate error section
 */
function generateErrorSection(results: AnyBenchmarkResult[]): string {
  const errorsFound = results.some(r => 'errors' in r && r.errors.length > 0);

  if (!errorsFound) {
    return '';
  }

  let html = '<h2>⚠️ Errors and Warnings</h2>';

  for (const result of results) {
    if ('errors' in result && result.errors.length > 0) {
      html += `<div class="error-list">
        <strong>${result.testName}</strong>
        <ul>`;

      for (const error of result.errors) {
        html += `<li>${error}</li>`;
      }

      html += '</ul></div>';
    }
  }

  return html;
}

/**
 * Generate JSON report
 */
export function generateJSONReport(
  results: AnyBenchmarkResult[],
  outputPath: string
): void {
  const summary = calculateSummary(results);
  const comparisons = compareWithBaselines(results);

  const report = {
    summary,
    baselines: comparisons,
    results,
    metadata: {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      platform: process.platform,
      nodeVersion: process.version,
    },
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`✓ JSON report generated: ${outputPath}`);
}

/**
 * Generate markdown summary
 */
export function generateMarkdownSummary(
  results: AnyBenchmarkResult[],
  outputPath: string
): void {
  const summary = calculateSummary(results);
  const comparisons = compareWithBaselines(results);

  let md = `# Empirical Benchmark Results\n\n`;
  md += `**Generated:** ${summary.timestamp}\n\n`;

  md += `## Summary\n\n`;
  md += `- **Total Tests:** ${summary.totalTests}\n`;
  md += `- **Successful:** ${summary.successful}\n`;
  md += `- **Failed:** ${summary.failed}\n`;
  md += `- **Avg Throughput:** ${summary.avgThroughput.toFixed(0)} variants/sec\n`;
  md += `- **Total Duration:** ${(summary.totalDurationMs / 1000).toFixed(2)}s\n`;
  md += `- **Peak Memory:** ${summary.peakMemoryMB.toFixed(1)} MB\n\n`;

  md += `## Performance Results\n\n`;
  md += `| Test Name | Status | Duration (ms) | Throughput | Memory (MB) |\n`;
  md += `|-----------|--------|---------------|------------|-------------|\n`;

  for (const result of results) {
    const status = ('successful' in result && result.successful) ? '✓' : '✗';
    const duration = ('totalTimeMs' in result) ? result.totalTimeMs.toFixed(0) :
                     ('totalDurationMs' in result) ? result.totalDurationMs.toFixed(0) : 'N/A';

    let throughput = 'N/A';
    if ('variantsPerSec' in result) {
      throughput = `${result.variantsPerSec.toFixed(0)} var/s`;
    } else if ('patientsPerSec' in result) {
      throughput = `${result.patientsPerSec.toFixed(0)} pat/s`;
    }

    const memory = ('memoryUsedMB' in result) ? result.memoryUsedMB.toFixed(1) : 'N/A';

    md += `| ${result.testName} | ${status} | ${duration} | ${throughput} | ${memory} |\n`;
  }

  md += `\n## Baseline Comparison\n\n`;
  md += `| Test | Expected | Actual | % of Expected | Status |\n`;
  md += `|------|----------|--------|---------------|--------|\n`;

  for (const comp of comparisons) {
    const percentage = (comp.actualThroughput / comp.expectedThroughput) * 100;
    const status = comp.meetsExpectation ? '✓ PASS' : '⚠ BELOW';

    md += `| ${comp.testName} | ${comp.expectedThroughput.toLocaleString()} | ${comp.actualThroughput.toFixed(0)} | ${percentage.toFixed(1)}% | ${status} |\n`;
  }

  fs.writeFileSync(outputPath, md);
  console.log(`✓ Markdown summary generated: ${outputPath}`);
}
