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
    return name.startsWith('test_') || name === 'test.py';
}

function baseline(problem: string, applyTestPenalty: boolean): string {
    const fileMatches = problem.match(/[\w\/]+\.py/g) || [];
    console.log('Baseline file matches:', fileMatches);

    if (fileMatches.length === 0) {
        const moduleMatch = problem.match(/from\s+([\w.]+)\s+import/);
        if (moduleMatch) {
            console.log('Using module match:', moduleMatch[1]);
            return moduleMatch[1].split('.').pop() + '.py';
        }
        return 'unknown.py';
    }

    if (applyTestPenalty) {
        const nonTest = fileMatches.filter(f => !isTestFile(f.split('/').pop() || f));
        if (nonTest.length > 0) {
            return nonTest[0].split('/').pop() || nonTest[0];
        }
    }

    return fileMatches[0].split('/').pop() || fileMatches[0];
}

const swePath = path.join(__dirname, 'swe-bench-real', 'all_instances.json');
const sweInstances: SWEBenchInstance[] = JSON.parse(fs.readFileSync(swePath, 'utf8'));

const inst = sweInstances.find(i => i.instance_id === 'pallets__flask-4992');
if (inst) {
    console.log('=== BASELINE FOR FLASK-4992 ===\n');
    const result = baseline(inst.problem_statement, true);
    console.log('\nBaseline result:', result);
}
