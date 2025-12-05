import * as fs from 'fs';
import * as path from 'path';

interface SWEBenchInstance {
    instance_id: string;
    repo: string;
    patch: string;
}

const swePath = path.join(__dirname, 'swe-bench-real', 'all_instances.json');
const sweInstances: SWEBenchInstance[] = JSON.parse(fs.readFileSync(swePath, 'utf8'));

const flaskInstances = sweInstances.filter(i => i.repo === 'pallets/flask');
console.log(`Total flask instances: ${flaskInstances.length}`);

const splitIdx = Math.floor(flaskInstances.length * 0.6);
console.log(`Split index: ${splitIdx}`);

console.log('\nTRAIN SET:');
for (let i = 0; i < splitIdx; i++) {
    console.log(`  ${flaskInstances[i].instance_id}`);
}

console.log('\nTEST SET:');
for (let i = splitIdx; i < flaskInstances.length; i++) {
    console.log(`  ${flaskInstances[i].instance_id}`);
}
