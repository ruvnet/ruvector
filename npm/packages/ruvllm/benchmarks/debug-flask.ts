/**
 * Debug flask predictions
 */

import * as fs from 'fs';
import * as path from 'path';

interface SWEBenchInstance {
    instance_id: string;
    repo: string;
    patch: string;
    problem_statement: string;
    hints_text: string;
}

const PACKAGE_NAMES = new Set(['flask', 'config', 'cli', 'app']);

function extractCandidatesDebug(problem: string, hints: string): void {
    console.log('\n--- Extraction Debug ---');

    // Class patterns
    const classPatterns = [
        /(?:class|\.)\s*([A-Z][a-zA-Z]+)(?:\s*\(|\.|\s*:|\s+)/g,
        /\b([A-Z][a-z]+(?:[A-Z][a-z]+)+)\b/g,
    ];
    for (const pattern of classPatterns) {
        const matches = (problem + ' ' + (hints || '')).matchAll(pattern);
        for (const m of matches) {
            const className = m[1];
            const snakeName = className.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
            console.log(`  Class: ${className} -> ${snakeName}.py`);
        }
    }

    // Simple .py
    const pyFiles = (problem + ' ' + (hints || '')).match(/[\w\/]+\.py/g) || [];
    console.log(`  Py files: ${pyFiles.join(', ') || 'none'}`);

    // Module refs like flask.Config
    const moduleRefs = (problem + ' ' + (hints || '')).match(/\b([a-z][a-z0-9_]*\.[A-Z][a-zA-Z]+)\b/g) || [];
    console.log(`  Module refs: ${moduleRefs.join(', ') || 'none'}`);
}

async function main() {
    const swePath = path.join(__dirname, 'swe-bench-real', 'all_instances.json');
    const sweInstances: SWEBenchInstance[] = JSON.parse(fs.readFileSync(swePath, 'utf8'));

    const flaskInstances = sweInstances.filter(i => i.repo === 'pallets/flask');
    const splitIdx = Math.floor(flaskInstances.length * 0.6);
    const testInstances = flaskInstances.slice(splitIdx);

    console.log('='.repeat(70));
    console.log('DEBUG FLASK PREDICTIONS');
    console.log('='.repeat(70));

    for (const inst of testInstances) {
        const goldPath = inst.patch.match(/diff --git a\/(.+?) b\//)?.[1] || '';

        console.log(`\n--- ${inst.instance_id} ---`);
        console.log(`Gold: ${goldPath}`);
        console.log(`\nProblem preview:`);
        console.log(inst.problem_statement.substring(0, 400));

        extractCandidatesDebug(inst.problem_statement, inst.hints_text || '');
    }
}

main().catch(console.error);
