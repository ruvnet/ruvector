export interface SHAPValue {
    feature: string;
    value: number;
    baseValue: number;
    shapValue: number;
    contribution: number;
}
export interface FeatureImportance {
    feature: string;
    importance: number;
    rank: number;
    category: 'genomic' | 'clinical' | 'demographic' | 'embedding';
}
export interface AttentionWeights {
    layer: number;
    head: number;
    tokenIndex: number;
    attentionScores: number[];
    topAttendedTokens: Array<{
        index: number;
        token: string;
        score: number;
    }>;
}
export interface CounterfactualExplanation {
    original: Record<string, any>;
    counterfactual: Record<string, any>;
    changes: Array<{
        feature: string;
        originalValue: any;
        counterfactualValue: any;
        impact: number;
    }>;
    distance: number;
    validity: number;
}
export interface ExplanationContext {
    variantId: string;
    prediction: string;
    confidence: number;
    referencePopulation?: string;
}
export declare class SHAPExplainer {
    private backgroundSamples;
    private featureNames;
    private baseValue;
    constructor(featureNames: string[]);
    fit(variants: Array<{
        features: Record<string, number>;
        priority: number;
    }>): void;
    explain(variant: {
        features: Record<string, number>;
    }, predictFunction: (features: Record<string, number>) => number): SHAPValue[];
    private computeKernelSHAP;
    private shapleyKernelWeight;
    private binomial;
    generateWaterfallPlot(shapValues: SHAPValue[]): {
        features: string[];
        values: number[];
        cumulative: number[];
    };
    generateForcePlot(shapValues: SHAPValue[]): {
        baseValue: number;
        prediction: number;
        positiveContributions: SHAPValue[];
        negativeContributions: SHAPValue[];
    };
}
export declare class AttentionAnalyzer {
    private numLayers;
    private numHeads;
    constructor(numLayers?: number, numHeads?: number);
    extractAttentionWeights(sequence: string, modelOutput: {
        attentionWeights: number[][][];
    }): AttentionWeights[];
    analyzeGenomicAttention(sequence: string, attentionWeights: AttentionWeights[]): Array<{
        position: number;
        region: string;
        avgAttention: number;
        importance: string;
    }>;
    generateAttentionHeatmap(attentionWeights: AttentionWeights[], layer: number, head: number): number[][];
    private tokenize;
    private getTopAttendedTokens;
    private categorizeImportance;
}
export declare class FeatureImportanceAnalyzer {
    private importanceScores;
    constructor();
    computePermutationImportance(data: Array<{
        features: Record<string, number>;
        label: string;
    }>, predictFunction: (features: Record<string, number>) => string, nRepeats?: number): FeatureImportance[];
    computeLocalImportance(instance: Record<string, number>, predictFunction: (features: Record<string, number>) => number, nSamples?: number): FeatureImportance[];
    private evaluateAccuracy;
    private permuteFeature;
    private generatePerturbations;
    private fitLinearModel;
    private gaussianNoise;
    private categorizeFeature;
}
export declare class CounterfactualGenerator {
    private featureRanges;
    constructor();
    learn(data: Array<Record<string, number>>): void;
    generate(original: Record<string, any>, targetPrediction: string, predictFunction: (features: Record<string, any>) => string, maxIterations?: number): CounterfactualExplanation | null;
    private selectFeatureToModify;
    private modifyFeature;
    private computeDistance;
    private createExplanation;
}
//# sourceMappingURL=ExplainableAI.d.ts.map