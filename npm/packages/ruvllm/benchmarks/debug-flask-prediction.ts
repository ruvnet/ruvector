import * as fs from 'fs';
import * as path from 'path';

interface SWEBenchInstance {
    instance_id: string;
    repo: string;
    patch: string;
    problem_statement: string;
    hints_text: string;
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

const swePath = path.join(__dirname, 'swe-bench-real', 'all_instances.json');
const sweInstances: SWEBenchInstance[] = JSON.parse(fs.readFileSync(swePath, 'utf8'));

const inst = sweInstances.find(i => i.instance_id === 'pallets__flask-4992');
if (inst) {
    console.log('=== FLASK-4992 HINTS ===\n');
    console.log(inst.hints_text || '(none)');

    console.log('\n=== HINTS EXTRACTION ===');
    const hintsFiles = extractFromHints(inst.hints_text || '');
    console.log(hintsFiles);

    if (hintsFiles.length > 0 && hintsFiles[0].score >= 0.88) {
        console.log(`\n⚠️ HINTS-DIRECT would be used: ${hintsFiles[0].file}`);
    } else {
        console.log('\n✅ No hints-direct, will use candidates');
    }
}
