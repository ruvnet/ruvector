/**
 * Detailed debug for flask-4992
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

const PACKAGE_NAMES = new Set([
    'matplotlib', 'django', 'flask', 'requests', 'numpy', 'pandas',
    'scipy', 'sklearn', 'torch', 'tensorflow', 'sympy', 'pytest',
    'sphinx', 'pylint', 'astropy', 'xarray', 'seaborn'
]);

function isTestFile(filename: string): boolean {
    const name = filename.toLowerCase();
    return (
        name.startsWith('test_') ||
        name.startsWith('tests_') ||
        name === 'test.py' ||
        name === 'tests.py'
    );
}

function extractCandidates(
    problem: string,
    hints: string
): Array<{ file: string; source: string; score: number }> {
    const candidates: Array<{ file: string; source: string; score: number }> = [];
    const seen = new Set<string>();

    const add = (file: string, source: string, score: number) => {
        let normalized = file.split('/').pop() || file;
        normalized = normalized.replace(/^['"`]|['"`]$/g, '');
        if (!seen.has(normalized) && normalized.endsWith('.py') && normalized !== '.py' && normalized.length > 3) {
            seen.add(normalized);
            let adjustedScore = score;
            if (isTestFile(normalized)) adjustedScore -= 0.3;
            candidates.push({ file: normalized, source, score: adjustedScore });
            console.log(`ADD: ${normalized} (source=${source}, score=${adjustedScore.toFixed(2)})`);
        }
    };

    console.log('\n=== EXTRACTION TRACE ===\n');

    // Module.Class refs
    console.log('Module.Class refs:');
    (problem.match(/\b([a-z][a-z0-9_]*\.[A-Z][a-zA-Z]+)\b/g) || []).forEach(ref => {
        console.log(`  Found: ${ref}`);
        const parts = ref.split('.');
        if (parts.length === 2 && !PACKAGE_NAMES.has(parts[1].toLowerCase())) {
            const className = parts[1];
            const fileName = className.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '') + '.py';
            if (fileName.length >= 5) {
                add(fileName, 'module-class', 0.75);
            }
        } else {
            console.log(`    Skipped: parts=${parts.length}, inPackage=${PACKAGE_NAMES.has(parts[1]?.toLowerCase())}`);
        }
    });

    // Class patterns
    console.log('\nClass patterns:');
    const classPatterns = [
        /(?:class|\.)\s*([A-Z][a-zA-Z]+)(?:\s*\(|\.|\s*:|\s+)/g,
    ];
    for (const pattern of classPatterns) {
        const matches = problem.matchAll(pattern);
        for (const m of matches) {
            const className = m[1];
            const snakeName = className.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
            if (snakeName.length >= 3 && !PACKAGE_NAMES.has(snakeName)) {
                console.log(`  Found: ${className} -> ${snakeName}.py`);
                add(snakeName + '.py', 'class-inferred', 0.55);
            }
        }
    }

    // Simple .py
    console.log('\nSimple .py:');
    (problem.match(/\b([a-z][a-z0-9_\/]*\.py)\b/gi) || []).forEach(f => {
        console.log(`  Found: ${f}`);
        if (!f.includes('site-packages') && f.length < 60 && !f.startsWith('/') && !f.startsWith('//')) {
            add(f, 'regex', 0.60);
        }
    });

    return candidates;
}

async function main() {
    const swePath = path.join(__dirname, 'swe-bench-real', 'all_instances.json');
    const sweInstances: SWEBenchInstance[] = JSON.parse(fs.readFileSync(swePath, 'utf8'));

    const inst = sweInstances.find(i => i.instance_id === 'pallets__flask-4992');
    if (!inst) {
        console.log('Instance not found');
        return;
    }

    console.log('='.repeat(70));
    console.log('DEBUG: pallets__flask-4992');
    console.log('='.repeat(70));

    const goldPath = inst.patch.match(/diff --git a\/(.+?) b\//)?.[1] || '';
    console.log(`\nGold: ${goldPath}`);

    const candidates = extractCandidates(inst.problem_statement, inst.hints_text || '');

    console.log('\n=== FINAL CANDIDATES (sorted by score) ===\n');
    const sorted = candidates.sort((a, b) => b.score - a.score);
    for (const c of sorted) {
        const match = goldPath.includes(c.file) ? '✅' : '';
        console.log(`${c.file.padEnd(20)} score=${c.score.toFixed(2)} source=${c.source} ${match}`);
    }

    console.log('\n=== WINNER ===');
    if (sorted.length > 0) {
        const winner = sorted[0];
        console.log(`${winner.file} (score=${winner.score.toFixed(2)})`);
        console.log(`Match: ${goldPath.includes(winner.file) ? 'YES ✅' : 'NO ❌'}`);
    } else {
        console.log('No candidates!');
    }
}

main().catch(console.error);
