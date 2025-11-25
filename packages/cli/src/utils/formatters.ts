import chalk from 'chalk';
import Table from 'cli-table3';
import { format } from 'fast-csv';
import { writeFile } from 'fs/promises';
import { createWriteStream } from 'fs';

export interface FormatterOptions {
  format: 'json' | 'csv' | 'table' | 'html';
  output?: string;
  columns?: string[];
  title?: string;
}

export class OutputFormatter {
  static async format(data: any[], options: FormatterOptions): Promise<void> {
    switch (options.format) {
      case 'json':
        await this.formatJSON(data, options);
        break;
      case 'csv':
        await this.formatCSV(data, options);
        break;
      case 'table':
        this.formatTable(data, options);
        break;
      case 'html':
        await this.formatHTML(data, options);
        break;
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  static async formatJSON(data: any[], options: FormatterOptions): Promise<void> {
    const json = JSON.stringify(data, null, 2);

    if (options.output) {
      await writeFile(options.output, json);
      console.log(chalk.green(`✓ Results saved to ${options.output}`));
    } else {
      console.log(json);
    }
  }

  static async formatCSV(data: any[], options: FormatterOptions): Promise<void> {
    if (data.length === 0) {
      console.log(chalk.yellow('No data to export'));
      return;
    }

    const outputPath = options.output || 'output.csv';
    const stream = format({ headers: true });
    const writeStream = createWriteStream(outputPath);

    stream.pipe(writeStream);

    for (const row of data) {
      stream.write(row);
    }

    stream.end();

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    console.log(chalk.green(`✓ CSV exported to ${outputPath}`));
  }

  static formatTable(data: any[], options: FormatterOptions): void {
    if (data.length === 0) {
      console.log(chalk.yellow('No data to display'));
      return;
    }

    // Determine columns
    const columns = options.columns || Object.keys(data[0]);

    const table = new Table({
      head: columns.map(col => chalk.cyan.bold(col)),
      style: {
        head: [],
        border: ['gray'],
      },
      colWidths: columns.map(() => undefined),
      wordWrap: true,
    });

    // Add rows
    for (const row of data) {
      const tableRow = columns.map(col => {
        const value = row[col];
        if (value === null || value === undefined) return chalk.gray('N/A');
        if (typeof value === 'object') return JSON.stringify(value);
        if (typeof value === 'number') return chalk.yellow(value.toFixed(4));
        return String(value);
      });
      table.push(tableRow);
    }

    console.log();
    if (options.title) {
      console.log(chalk.blue.bold(options.title));
      console.log(chalk.gray('─'.repeat(options.title.length)));
    }
    console.log(table.toString());
    console.log();
  }

  static async formatHTML(data: any[], options: FormatterOptions): Promise<void> {
    const html = this.generateHTMLReport(data, options.title || 'Analysis Report');

    const outputPath = options.output || 'report.html';
    await writeFile(outputPath, html);

    console.log(chalk.green(`✓ HTML report generated: ${outputPath}`));
  }

  private static generateHTMLReport(data: any[], title: string): string {
    const columns = data.length > 0 ? Object.keys(data[0]) : [];

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
      min-height: 100vh;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      text-align: center;
    }
    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      font-weight: 700;
    }
    .header p {
      opacity: 0.9;
      font-size: 1.1rem;
    }
    .content {
      padding: 2rem;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    .stat-card h3 {
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 0.5rem;
      opacity: 0.9;
    }
    .stat-card .value {
      font-size: 2rem;
      font-weight: 700;
    }
    .chart-container {
      margin: 2rem 0;
      background: #f8f9fa;
      padding: 1.5rem;
      border-radius: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
    }
    thead {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    th, td {
      padding: 1rem;
      text-align: left;
    }
    tbody tr:nth-child(even) {
      background: #f8f9fa;
    }
    tbody tr:hover {
      background: #e9ecef;
      transition: background 0.3s;
    }
    .footer {
      background: #f8f9fa;
      padding: 1.5rem;
      text-align: center;
      color: #666;
      border-top: 2px solid #e9ecef;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧬 ${title}</h1>
      <p>Generated on ${new Date().toLocaleString()}</p>
    </div>

    <div class="content">
      <div class="stats">
        <div class="stat-card">
          <h3>Total Records</h3>
          <div class="value">${data.length}</div>
        </div>
        <div class="stat-card">
          <h3>Columns</h3>
          <div class="value">${columns.length}</div>
        </div>
        <div class="stat-card">
          <h3>Report Type</h3>
          <div class="value">Genomic Analysis</div>
        </div>
      </div>

      ${data.length > 0 ? `
      <div class="chart-container">
        <canvas id="dataChart"></canvas>
      </div>
      ` : ''}

      <table>
        <thead>
          <tr>
            ${columns.map(col => `<th>${col}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              ${columns.map(col => `<td>${this.escapeHTML(String(row[col] || 'N/A'))}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>Generated by Genomic Vector Analysis CLI</p>
      <p style="margin-top: 0.5rem; font-size: 0.875rem;">
        Powered by ruvector • High-performance genomic data analysis
      </p>
    </div>
  </div>

  <script>
    // Create visualization if numeric data exists
    const data = ${JSON.stringify(data)};
    if (data.length > 0) {
      const ctx = document.getElementById('dataChart');

      // Find numeric columns
      const numericCols = ${JSON.stringify(columns)}.filter(col =>
        data.some(row => typeof row[col] === 'number')
      );

      if (numericCols.length > 0 && ctx) {
        const labels = data.map((_, i) => \`Record \${i + 1}\`);
        const datasets = numericCols.map((col, i) => ({
          label: col,
          data: data.map(row => row[col] || 0),
          borderColor: \`hsl(\${i * 360 / numericCols.length}, 70%, 50%)\`,
          backgroundColor: \`hsla(\${i * 360 / numericCols.length}, 70%, 50%, 0.1)\`,
          tension: 0.4,
        }));

        new Chart(ctx, {
          type: 'line',
          data: { labels, datasets },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: 'Data Visualization',
                font: { size: 16, weight: 'bold' }
              },
              legend: {
                position: 'top',
              }
            },
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        });
      }
    }
  </script>
</body>
</html>
    `.trim();
  }

  private static escapeHTML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
