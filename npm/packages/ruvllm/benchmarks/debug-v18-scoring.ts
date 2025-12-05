/**
 * Debug V18 scoring for pylint-7993
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
        name === 'tests.py' ||
        name.endsWith('_test.py') ||
        name.endsWith('_tests.py') ||
        name.includes('conftest')
    );
}

function extractFromHints(hints: string): Array<{ file: string; score: number }> {
    const results: Array<{ file: string; score: number }> = [];
    const seen = new Set<string>();

    if (!hints || hints.length === 0) return results;

    const directPaths = hints.match(/(?:^|\s|`|")([a-z_][a-z0-9_\/]*\.py)(?:\s|`|"|:|#|$)/gi) || [];
    for (const match of directPaths) {
        const file = match.replace(/^[\s`"]+|[\s`":,#]+$/g, '');
        const fileName = file.split('/').pop() || file;
        if (!seen.has(fileName) && fileName.endsWith('.py') && fileName.length > 3) {
            seen.add(fileName);
            results.push({ file: fileName, score: 0.88 });
        }
    }

    return results;
}

function extractCandidates(
    problem: string,
    hints: string,
    applyTestPenalty: boolean,
    debug: boolean = false
): Array<{ file: string; source: string; score: number; isPackage: boolean }> {
    const candidates: Array<{ file: string; source: string; score: number; isPackage: boolean }> = [];
    const seen = new Set<string>();

    const add = (file: string, source: string, score: number) => {
        let normalized = file.split('/').pop() || file;
        normalized = normalized.replace(/^['"`]|['"`]$/g, '');
        if (!seen.has(normalized) && normalized.endsWith('.py') && normalized !== '.py' && normalized.length > 3) {
            const isPackage = PACKAGE_NAMES.has(normalized.replace('.py', ''));
            seen.add(normalized);

            let adjustedScore = score;
            if (applyTestPenalty && isTestFile(normalized)) {
                if (debug) console.log(`  PENALTY: ${normalized} ${score} -> ${score - 0.3}`);
                adjustedScore -= 0.3;
            }

            if (debug) console.log(`  ADD: ${normalized} source=${source} score=${adjustedScore}`);
            candidates.push({ file: normalized, source, score: adjustedScore, isPackage });
        }
    };

    // HINTS FIRST
    const hintsFiles = extractFromHints(hints);
    for (const hf of hintsFiles) {
        add(hf.file, 'hints', hf.score);
    }

    // Backticks
    (problem.match(/`([^`]+\.py)`/g) || []).forEach(m => add(m.replace(/`/g, ''), 'backtick', 0.95));

    // Tracebacks - more specific pattern
    (problem.match(/File "([^"]+\.py)"/g) || []).forEach(m => {
        const f = m.replace(/File "|"/g, '');
        if (!f.includes('site-packages')) add(f, 'traceback', 0.92);
    });

    // TRACEBACK PATHS (the pylint/reporters/text.py:206 format)
    (problem.match(/([a-z_][a-z0-9_\/]*\.py):\d+/gi) || []).forEach(m => {
        const f = m.split(':')[0];
        if (debug) console.log(`  TRACEBACK PATH: ${m} -> ${f}`);
        add(f, 'traceback-path', 0.90);
    });

    // Package refs
    (problem.match(/[\w]+\.[\w]+(?:\.[a-z_]+)*/g) || []).forEach(ref => {
        const parts = ref.split('.');
        for (let i = parts.length - 1; i >= 1; i--) {
            if (!PACKAGE_NAMES.has(parts[i]) && parts[i].length > 2) {
                add(parts[i] + '.py', 'package-ref', 0.75);
                break;
            }
        }
    });

    // Imports
    (problem.match(/from\s+([\w.]+)\s+import/g) || []).forEach(imp => {
        const parts = imp.replace(/from\s+/, '').replace(/\s+import/, '').split('.');
        if (parts.length > 1) add(parts[parts.length - 1] + '.py', 'import', 0.72);
    });

    // Simple .py
    (problem.match(/[\w\/]+\.py/g) || []).forEach(f => {
        if (!f.includes('site-packages') && f.length < 60) add(f, 'regex', 0.60);
    });

    // Error locations
    (problem.match(/(?:in\s+|at\s+)([a-z_][a-z0-9_]*\.py)/gi) || []).forEach(loc => {
        add(loc.replace(/^(in|at)\s+/i, ''), 'error-loc', 0.78);
    });

    return candidates;
}

async function main() {
    const swePath = path.join(__dirname, 'swe-bench-real', 'all_instances.json');
    const sweInstances: SWEBenchInstance[] = JSON.parse(fs.readFileSync(swePath, 'utf8'));

    const inst = sweInstances.find(i => i.instance_id === 'pylint-dev__pylint-7993');
    if (!inst) {
        console.log('Instance not found');
        return;
    }

    console.log('='.repeat(70));
    console.log('DEBUG V18 SCORING: pylint-dev__pylint-7993');
    console.log('='.repeat(70));

    const goldPath = inst.patch.match(/diff --git a\/(.+?) b\//)?.[1] || '';
    console.log(`\nGold: ${goldPath}`);

    console.log('\n--- Extracting candidates with debug ---\n');
    const candidates = extractCandidates(inst.problem_statement, inst.hints_text || '', true, true);

    console.log('\n--- Final candidates sorted by score ---\n');
    const sorted = [...candidates].sort((a, b) => b.score - a.score);
    for (const c of sorted) {
        const match = goldPath.includes(c.file) ? '✅' : '';
        console.log(`  ${c.file.padEnd(20)} score=${c.score.toFixed(2)} source=${c.source} ${match}`);
    }

    console.log('\n--- Winner ---');
    const nonPackage = sorted.filter(c => !c.isPackage);
    const winner = nonPackage.length > 0 ? nonPackage[0] : sorted[0];
    console.log(`  ${winner.file} (score=${winner.score.toFixed(2)})`);

    const goldFile = goldPath.split('/').pop();
    console.log(`\n  Match: ${winner.file === goldFile ? 'YES ✅' : 'NO ❌'}`);
}

main().catch(console.error);
