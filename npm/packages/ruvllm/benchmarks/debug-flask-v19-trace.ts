/**
 * Full trace of V19 prediction for flask-4992
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

const HIGH_BASELINE_REPOS = new Set([
    'scikit-learn/scikit-learn',
    'mwaskom/seaborn',
    'astropy/astropy'
]);

function isTestFile(filename: string): boolean {
    const name = filename.toLowerCase();
    return name.startsWith('test_') || name === 'test.py';
}

function isAboutTesting(text: string): boolean {
    const lower = text.toLowerCase();
    return lower.includes('test case') || lower.includes('pytest');
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

function extractCandidates(problem: string, hints: string, applyTestPenalty: boolean): Array<{ file: string; source: string; score: number; isPackage: boolean }> {
    const candidates: Array<{ file: string; source: string; score: number; isPackage: boolean }> = [];
    const seen = new Set<string>();

    const add = (file: string, source: string, score: number) => {
        let normalized = file.split('/').pop() || file;
        normalized = normalized.replace(/^['"`]|['"`]$/g, '');
        if (!seen.has(normalized) && normalized.endsWith('.py') && normalized !== '.py' && normalized.length > 3) {
            const isPackage = PACKAGE_NAMES.has(normalized.replace('.py', ''));
            seen.add(normalized);
            let adjustedScore = score;
            if (applyTestPenalty && isTestFile(normalized)) adjustedScore -= 0.3;
            candidates.push({ file: normalized, source, score: adjustedScore, isPackage });
        }
    };

    // Module.Class refs
    (problem.match(/\b([a-z][a-z0-9_]*\.[A-Z][a-zA-Z]+)\b/g) || []).forEach(ref => {
        const parts = ref.split('.');
        if (parts.length === 2 && !PACKAGE_NAMES.has(parts[1].toLowerCase())) {
            const className = parts[1];
            const fileName = className.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '') + '.py';
            if (fileName.length >= 5) add(fileName, 'module-class', 0.75);
        }
    });

    // Class patterns
    const classPatterns = [/(?:class|\.)\s*([A-Z][a-zA-Z]+)(?:\s*\(|\.|\s*:|\s+)/g];
    for (const pattern of classPatterns) {
        const matches = problem.matchAll(pattern);
        for (const m of matches) {
            const className = m[1];
            const snakeName = className.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
            if (snakeName.length >= 3 && !PACKAGE_NAMES.has(snakeName)) {
                add(snakeName + '.py', 'class-inferred', 0.55);
            }
        }
    }

    return candidates;
}

function baseline(problem: string): string {
    const fileMatches = problem.match(/[\w\/]+\.py/g) || [];
    if (fileMatches.length > 0) return fileMatches[0].split('/').pop() || fileMatches[0];
    const moduleMatch = problem.match(/from\s+([\w.]+)\s+import/);
    if (moduleMatch) return moduleMatch[1].split('.').pop() + '.py';
    return 'unknown.py';
}

const swePath = path.join(__dirname, 'swe-bench-real', 'all_instances.json');
const sweInstances: SWEBenchInstance[] = JSON.parse(fs.readFileSync(swePath, 'utf8'));

const inst = sweInstances.find(i => i.instance_id === 'pallets__flask-4992');
if (!inst) {
    console.log('Instance not found');
    process.exit(1);
}

console.log('='.repeat(70));
console.log('FULL V19 TRACE: pallets__flask-4992');
console.log('='.repeat(70));

const goldPath = inst.patch.match(/diff --git a\/(.+?) b\//)?.[1] || '';
console.log(`\nGold: ${goldPath}`);

// Step 1: aboutTesting
const aboutTesting = isAboutTesting(inst.problem_statement);
console.log(`\n1. aboutTesting: ${aboutTesting}`);

// Step 2: HIGH_BASELINE_REPOS
console.log(`2. HIGH_BASELINE_REPOS.has('pallets/flask'): ${HIGH_BASELINE_REPOS.has('pallets/flask')}`);

// Step 3: extractCandidates
const candidates = extractCandidates(inst.problem_statement, inst.hints_text || '', !aboutTesting);
console.log(`3. Candidates extracted: ${candidates.length}`);
for (const c of candidates) {
    console.log(`   - ${c.file} (source=${c.source}, score=${c.score.toFixed(2)}, isPackage=${c.isPackage})`);
}

// Step 4: baseline
const baselinePred = baseline(inst.problem_statement);
console.log(`4. Baseline prediction: ${baselinePred}`);

// Step 5: extractFromHints
const hintsFiles = extractFromHints(inst.hints_text || '');
console.log(`5. Hints files: ${hintsFiles.length}`);
if (hintsFiles.length > 0) {
    console.log(`   Score >= 0.88: ${hintsFiles[0].score >= 0.88}`);
}

// Step 6: No candidates?
console.log(`6. candidates.length === 0: ${candidates.length === 0}`);

// Step 7: Single high-confidence?
console.log(`7. Single high-confidence: ${candidates.length === 1 && candidates[0].score >= 0.85}`);

// Step 8: Non-package filtering
const nonPackage = candidates.filter(c => !c.isPackage);
const workingCandidates = nonPackage.length > 0 ? nonPackage : candidates;
console.log(`8. Working candidates: ${workingCandidates.length}`);
for (const c of workingCandidates) {
    console.log(`   - ${c.file} (score=${c.score.toFixed(2)})`);
}

// Step 9: Baseline in candidates?
const baselineMatch = workingCandidates.find(c => c.file === baselinePred);
console.log(`9. Baseline (${baselinePred}) in candidates: ${!!baselineMatch}`);

// Step 10: Best candidate
workingCandidates.sort((a, b) => b.score - a.score);
console.log(`10. Best candidate: ${workingCandidates[0]?.file || 'none'}`);

// Note about ranker
console.log(`\n⚠️ Note: Ranker has 1 training sample for flask, threshold would be 0.95`);
console.log(`   Ranker likely doesn't have enough confidence, so best-candidate should be used.`);

console.log(`\n=== EXPECTED PREDICTION ===`);
console.log(`Method: best-candidate`);
console.log(`File: ${workingCandidates[0]?.file || 'unknown.py'}`);
console.log(`Match: ${goldPath.includes(workingCandidates[0]?.file || '') ? 'YES ✅' : 'NO ❌'}`);
