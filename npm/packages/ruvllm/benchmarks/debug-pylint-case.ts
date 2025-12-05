/**
 * Debug the pylint-7993 case where test.py is picked over text.py
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

async function main() {
    const swePath = path.join(__dirname, 'swe-bench-real', 'all_instances.json');
    const sweInstances: SWEBenchInstance[] = JSON.parse(fs.readFileSync(swePath, 'utf8'));

    const inst = sweInstances.find(i => i.instance_id === 'pylint-dev__pylint-7993');
    if (!inst) {
        console.log('Instance not found');
        return;
    }

    console.log('='.repeat(70));
    console.log('DEBUG: pylint-dev__pylint-7993');
    console.log('='.repeat(70));

    const goldPath = inst.patch.match(/diff --git a\/(.+?) b\//)?.[1] || '';
    console.log(`\nGold: ${goldPath}`);

    // Extract all .py files mentioned
    const pyFiles = inst.problem_statement.match(/\b([a-z_][a-z0-9_]*\.py)\b/gi) || [];
    console.log(`\nPy files found: ${pyFiles.join(', ')}`);

    for (const f of pyFiles) {
        console.log(`  ${f}: isTestFile = ${isTestFile(f)}`);
    }

    // Show where text.py appears
    const textPyMatches = inst.problem_statement.match(/.{0,50}text\.py.{0,50}/gi) || [];
    console.log(`\nContext where text.py appears:`);
    for (const m of textPyMatches) {
        console.log(`  "...${m}..."`);
    }

    // Show where test.py appears
    const testPyMatches = inst.problem_statement.match(/.{0,50}test\.py.{0,50}/gi) || [];
    console.log(`\nContext where test.py appears:`);
    for (const m of testPyMatches) {
        console.log(`  "...${m}..."`);
    }

    // Check full problem
    console.log('\n--- Full Problem Statement ---');
    console.log(inst.problem_statement);

    console.log('\n--- Hints ---');
    console.log(inst.hints_text || '(none)');
}

main().catch(console.error);
