/**
 * Analyze hints_text and 0% repos for optimization opportunities
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

const swePath = path.join(__dirname, 'swe-bench-real', 'all_instances.json');
const data: SWEBenchInstance[] = JSON.parse(fs.readFileSync(swePath, 'utf8'));

console.log('=== HINTS_TEXT ANALYSIS ===\n');
let withHints = 0, totalHintsLen = 0;
for (const inst of data) {
    if (inst.hints_text && inst.hints_text.trim().length > 0) {
        withHints++;
        totalHintsLen += inst.hints_text.length;
    }
}
console.log(`Instances with hints: ${withHints}/${data.length} (${(withHints/data.length*100).toFixed(1)}%)`);
if (withHints > 0) {
    console.log(`Avg hints length: ${Math.round(totalHintsLen / withHints)} chars\n`);
}

// Sample hints that mention .py files
console.log('=== SAMPLE HINTS WITH FILE MENTIONS ===\n');
let count = 0;
for (const inst of data) {
    if (inst.hints_text && inst.hints_text.includes('.py') && count < 3) {
        console.log(`Instance: ${inst.instance_id}`);
        console.log(`Hints: ${inst.hints_text.substring(0, 400)}...\n`);
        count++;
    }
}

// Check 0% repos for patterns
console.log('\n=== 0% REPOS DEEP DIVE ===\n');
const zeroRepos = ['pallets/flask', 'psf/requests', 'pydata/xarray', 'pylint-dev/pylint'];
for (const repo of zeroRepos) {
    const repoInst = data.filter(i => i.repo === repo);
    const testInst = repoInst.slice(Math.floor(repoInst.length * 0.6));
    console.log(`\n${repo} (${testInst.length} test instances):`);
    for (const inst of testInst.slice(0, 2)) {
        const gold = inst.patch.match(/diff --git a\/(.+?) b\//)?.[1] || '';
        const goldDir = gold.split('/').slice(0, -1).join('/');
        const goldFile = gold.split('/').pop();
        console.log(`  ${inst.instance_id}:`);
        console.log(`    Gold: ${gold}`);
        console.log(`    Dir pattern: ${goldDir}`);
        console.log(`    Has hints: ${inst.hints_text?.length > 0 ? 'yes' : 'no'}`);
        if (inst.hints_text?.length > 0) {
            console.log(`    Hints preview: ${inst.hints_text.substring(0, 200)}...`);
        }
    }
}

// Analyze gold file patterns across all repos
console.log('\n\n=== GOLD FILE DIRECTORY PATTERNS ===\n');
const dirPatterns: Map<string, number> = new Map();
for (const inst of data) {
    const gold = inst.patch.match(/diff --git a\/(.+?) b\//)?.[1] || '';
    const parts = gold.split('/');
    if (parts.length >= 2) {
        const topDir = parts[0];
        dirPatterns.set(topDir, (dirPatterns.get(topDir) || 0) + 1);
    }
}
const sortedDirs = Array.from(dirPatterns.entries()).sort((a, b) => b[1] - a[1]);
console.log('Top-level directories in gold files:');
for (const [dir, count] of sortedDirs.slice(0, 15)) {
    console.log(`  ${dir}: ${count}`);
}
