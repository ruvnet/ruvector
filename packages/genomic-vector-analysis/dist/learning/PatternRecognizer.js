"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatternRecognizer = void 0;
class PatternRecognizer {
    db;
    patterns;
    learningRate;
    minConfidence;
    minFrequency;
    constructor(db, options = {}) {
        this.db = db;
        this.patterns = new Map();
        this.learningRate = options.learningRate ?? 0.01;
        this.minConfidence = options.minConfidence ?? 0.7;
        this.minFrequency = options.minFrequency ?? 3;
    }
    async trainFromCases(cases) {
        let correctPredictions = 0;
        let totalPredictions = 0;
        const extractedPatterns = await this.extractPatterns(cases);
        for (const clinicalCase of cases) {
            if (!clinicalCase.diagnosis)
                continue;
            const matchingPatterns = await this.findMatchingPatterns(clinicalCase);
            if (matchingPatterns.length > 0) {
                const predictedDiagnosis = matchingPatterns[0].metadata?.diagnosis;
                if (predictedDiagnosis === clinicalCase.diagnosis) {
                    correctPredictions++;
                }
                totalPredictions++;
            }
        }
        this.updatePatternConfidence(correctPredictions, totalPredictions);
        for (const pattern of extractedPatterns) {
            if (pattern.confidence >= this.minConfidence &&
                pattern.frequency >= this.minFrequency) {
                this.patterns.set(pattern.id, pattern);
            }
        }
        const accuracy = totalPredictions > 0
            ? correctPredictions / totalPredictions
            : 0;
        return {
            accuracy,
            precision: accuracy,
            recall: accuracy,
            f1Score: accuracy,
            loss: 1 - accuracy,
            epoch: 1,
        };
    }
    async extractPatterns(cases) {
        const patterns = [];
        const patternMap = new Map();
        for (const clinicalCase of cases) {
            if (!clinicalCase.diagnosis)
                continue;
            const key = this.generatePatternKey(clinicalCase);
            const existing = patternMap.get(key);
            if (existing) {
                existing.cases.push(clinicalCase);
                existing.count++;
            }
            else {
                patternMap.set(key, {
                    cases: [clinicalCase],
                    count: 1,
                });
            }
        }
        for (const [key, data] of patternMap) {
            const pattern = await this.createPattern(key, data.cases, data.count);
            patterns.push(pattern);
        }
        return patterns;
    }
    generatePatternKey(clinicalCase) {
        const phenotypes = clinicalCase.phenotypes
            .slice(0, 3)
            .map(p => p.id)
            .sort()
            .join('-');
        return `${clinicalCase.diagnosis}:${phenotypes}`;
    }
    async createPattern(key, cases, frequency) {
        const vectors = await Promise.all(cases.map(c => this.getCaseVector(c)));
        const centroid = this.calculateCentroid(vectors);
        const diagnosis = cases[0].diagnosis || 'unknown';
        const phenotypeIds = this.findCommonPhenotypes(cases);
        return {
            id: key,
            name: `Pattern: ${diagnosis}`,
            description: `Recurring pattern for ${diagnosis} with ${frequency} occurrences`,
            vectorRepresentation: centroid,
            frequency,
            confidence: this.calculateInitialConfidence(frequency, cases.length),
            examples: cases.slice(0, 5).map(c => c.id),
            metadata: {
                diagnosis,
                phenotypes: phenotypeIds,
                casesCount: cases.length,
            },
        };
    }
    async getCaseVector(clinicalCase) {
        const dimensions = 384;
        const vector = new Array(dimensions).fill(0);
        for (const phenotype of clinicalCase.phenotypes) {
            const hash = this.hashString(phenotype.id);
            const idx = hash % dimensions;
            vector[idx] += 1;
        }
        for (const variant of clinicalCase.variants) {
            const hash = this.hashString(`${variant.chromosome}:${variant.position}`);
            const idx = hash % dimensions;
            vector[idx] += 0.5;
        }
        const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        return vector.map(val => norm > 0 ? val / norm : val);
    }
    calculateCentroid(vectors) {
        if (vectors.length === 0) {
            return new Float32Array(384);
        }
        const dimensions = vectors[0].length;
        const centroid = new Array(dimensions).fill(0);
        for (const vector of vectors) {
            for (let i = 0; i < dimensions; i++) {
                centroid[i] += vector[i];
            }
        }
        for (let i = 0; i < dimensions; i++) {
            centroid[i] /= vectors.length;
        }
        return new Float32Array(centroid);
    }
    findCommonPhenotypes(cases) {
        const phenotypeCounts = new Map();
        for (const clinicalCase of cases) {
            for (const phenotype of clinicalCase.phenotypes) {
                phenotypeCounts.set(phenotype.id, (phenotypeCounts.get(phenotype.id) || 0) + 1);
            }
        }
        const threshold = cases.length * 0.5;
        return Array.from(phenotypeCounts.entries())
            .filter(([_, count]) => count >= threshold)
            .map(([id, _]) => id);
    }
    calculateInitialConfidence(frequency, total) {
        return Math.min(0.5 + (frequency / total) * 0.5, 0.95);
    }
    updatePatternConfidence(correct, total) {
        const validationAccuracy = total > 0 ? correct / total : 0;
        for (const pattern of this.patterns.values()) {
            const adjustment = this.learningRate * (validationAccuracy - pattern.confidence);
            pattern.confidence = Math.max(0, Math.min(1, pattern.confidence + adjustment));
        }
    }
    async findMatchingPatterns(clinicalCase, k = 5) {
        const caseVector = await this.getCaseVector(clinicalCase);
        const results = await this.db.search(caseVector, {
            k,
            threshold: this.minConfidence,
        });
        const patterns = [];
        for (const result of results) {
            const pattern = this.patterns.get(result.id);
            if (pattern) {
                patterns.push({
                    ...pattern,
                    metadata: {
                        ...pattern.metadata,
                        similarity: result.score,
                    },
                });
            }
        }
        return patterns;
    }
    async predict(clinicalCase) {
        const matchingPatterns = await this.findMatchingPatterns(clinicalCase, 3);
        if (matchingPatterns.length === 0) {
            return {
                diagnosis: 'unknown',
                confidence: 0,
                supportingPatterns: [],
            };
        }
        const topPattern = matchingPatterns[0];
        const diagnosis = topPattern.metadata?.diagnosis || 'unknown';
        const confidence = topPattern.confidence * (topPattern.metadata?.similarity || 0);
        return {
            diagnosis,
            confidence,
            supportingPatterns: matchingPatterns,
        };
    }
    getPatterns() {
        return Array.from(this.patterns.values());
    }
    getPattern(id) {
        return this.patterns.get(id);
    }
    clearPatterns() {
        this.patterns.clear();
    }
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
}
exports.PatternRecognizer = PatternRecognizer;
//# sourceMappingURL=PatternRecognizer.js.map