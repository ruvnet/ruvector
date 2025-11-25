import type { Pattern, LearningMetrics, ClinicalCase } from '../types';
import { VectorDatabase } from '../core/VectorDatabase';
export declare class PatternRecognizer {
    private db;
    private patterns;
    private learningRate;
    private minConfidence;
    private minFrequency;
    constructor(db: VectorDatabase, options?: {
        learningRate?: number;
        minConfidence?: number;
        minFrequency?: number;
    });
    trainFromCases(cases: ClinicalCase[]): Promise<LearningMetrics>;
    private extractPatterns;
    private generatePatternKey;
    private createPattern;
    private getCaseVector;
    private calculateCentroid;
    private findCommonPhenotypes;
    private calculateInitialConfidence;
    private updatePatternConfidence;
    findMatchingPatterns(clinicalCase: ClinicalCase, k?: number): Promise<Pattern[]>;
    predict(clinicalCase: ClinicalCase): Promise<{
        diagnosis: string;
        confidence: number;
        supportingPatterns: Pattern[];
    }>;
    getPatterns(): Pattern[];
    getPattern(id: string): Pattern | undefined;
    clearPatterns(): void;
    private hashString;
}
//# sourceMappingURL=PatternRecognizer.d.ts.map