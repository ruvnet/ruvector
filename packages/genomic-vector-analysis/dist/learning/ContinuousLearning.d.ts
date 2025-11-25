export interface OnlineLearningConfig {
    learningRate: number;
    momentumDecay: number;
    windowSize: number;
    updateFrequency: number;
    adaptiveLearningRate: boolean;
    miniBatchSize: number;
}
export interface ModelVersion {
    version: string;
    timestamp: number;
    parameters: Map<string, number[]>;
    performance: {
        accuracy: number;
        loss: number;
        samplesSeen: number;
    };
    metadata: {
        description?: string;
        author?: string;
        tags?: string[];
    };
}
export interface IncrementalUpdate {
    id: string;
    timestamp: number;
    addedVectors: number;
    updatedVectors: number;
    deletedVectors: number;
    indexRebuildTime: number;
    performanceImpact: {
        queryLatencyChange: number;
        recallChange: number;
    };
}
export interface ForgettingMetrics {
    pastTaskAccuracy: Map<string, number>;
    currentTaskAccuracy: number;
    forgettingRate: number;
    retentionRate: number;
    transferScore: number;
}
export interface ReplayBuffer {
    capacity: number;
    samples: Array<{
        id: string;
        data: any;
        label: string;
        importance: number;
        timestamp: number;
    }>;
    strategy: 'reservoir' | 'priority' | 'cluster';
}
export declare class OnlineLearner {
    private config;
    private modelWeights;
    private gradientMomentum;
    private samplesSeen;
    private recentSamples;
    private performanceHistory;
    constructor(config?: Partial<OnlineLearningConfig>);
    processNewCase(data: any, label: string, predictFunction: (data: any) => {
        prediction: string;
        confidence: number;
    }): Promise<{
        updated: boolean;
        performance: {
            accuracy: number;
            loss: number;
        };
    }>;
    private updateModel;
    private processBatch;
    private updateWeights;
    private adaptLearningRate;
    private createMiniBatches;
    private getLatestPerformance;
    exportState(): {
        weights: Map<string, number[]>;
        samplesSeen: number;
        performance: Array<{
            samples: number;
            accuracy: number;
            loss: number;
        }>;
    };
    reset(): void;
}
export declare class ForgettingPrevention {
    private replayBuffer;
    private taskMemories;
    private ewcFisherInformation;
    private regularizationStrength;
    constructor(bufferCapacity?: number, strategy?: 'reservoir' | 'priority' | 'cluster', regularizationStrength?: number);
    storeSample(id: string, data: any, label: string, importance?: number): void;
    private replaceSample;
    private findMostSimilar;
    private computeSimilarity;
    sampleReplay(batchSize: number): typeof this.replayBuffer.samples;
    computeEWCPenalty(currentWeights: Map<string, number[]>, previousWeights: Map<string, number[]>): number;
    computeFisherInformation(samples: typeof this.replayBuffer.samples, computeGradients: (sample: any) => Map<string, number[]>): void;
    evaluateForgetting(currentWeights: Map<string, number[]>, evaluateTask: (taskId: string, weights: Map<string, number[]>) => number): ForgettingMetrics;
    private computeForgettingRate;
    storeTaskSnapshot(taskId: string, version: ModelVersion): void;
    getBufferStatistics(): {
        capacity: number;
        size: number;
        strategy: "reservoir" | "priority" | "cluster";
        avgImportance: number;
    };
}
export declare class IncrementalIndexUpdater {
    private indexVersion;
    private updateHistory;
    private pendingUpdates;
    private batchThreshold;
    constructor(batchThreshold?: number);
    queueAdd(vectorId: string, vector: number[]): void;
    queueUpdate(vectorId: string, vector: number[]): void;
    queueDelete(vectorId: string): void;
    private checkBatchThreshold;
    applyBatchUpdate(): Promise<IncrementalUpdate>;
    forceUpdate(): Promise<IncrementalUpdate | null>;
    getStatistics(): {
        currentVersion: number;
        pendingUpdates: number;
        totalUpdates: number;
        totalVectorsAdded: number;
        totalVectorsUpdated: number;
        totalVectorsDeleted: number;
        avgRebuildTime: number;
    };
}
export declare class ModelVersionManager {
    private versions;
    private currentVersion;
    private maxVersions;
    private rollbackHistory;
    constructor(maxVersions?: number);
    createVersion(parameters: Map<string, number[]>, performance: ModelVersion['performance'], metadata?: ModelVersion['metadata']): string;
    rollback(targetVersion: string, reason?: string): boolean;
    checkAndRollback(currentPerformance: {
        accuracy: number;
        loss: number;
    }): boolean;
    getVersion(version: string): ModelVersion | undefined;
    getCurrentVersion(): ModelVersion | undefined;
    listVersions(): ModelVersion[];
    compareVersions(v1: string, v2: string): {
        version1: ModelVersion | undefined;
        version2: ModelVersion | undefined;
        performanceDiff: {
            accuracyDiff: number;
            lossDiff: number;
            samplesDiff: number;
        };
    } | null;
    private incrementVersion;
    private pruneOldVersions;
    exportHistory(): {
        currentVersion: string;
        versions: ModelVersion[];
        rollbackHistory: {
            from: string;
            to: string;
            timestamp: number;
            reason: string;
        }[];
    };
}
//# sourceMappingURL=ContinuousLearning.d.ts.map