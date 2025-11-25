import type { VectorDatabaseConfig, Vector, VectorSearchResult, SearchOptions, VectorMetric } from '../types';
export declare class VectorDatabase {
    private config;
    private vectors;
    private index;
    private wasm;
    constructor(config: VectorDatabaseConfig);
    private initializeIndex;
    private loadWasmModule;
    private initializeHNSW;
    private initializeIVF;
    add(vector: Vector): Promise<void>;
    addBatch(vectors: Vector[]): Promise<void>;
    search(query: Float32Array | number[], options?: SearchOptions): Promise<VectorSearchResult[]>;
    private annSearch;
    private hnswSearch;
    private ivfSearch;
    private calculateSimilarity;
    private cosineSimilarity;
    private euclideanDistance;
    private dotProduct;
    private normalizeVector;
    private quantizeVector;
    private scalarQuantize;
    private productQuantize;
    private binaryQuantize;
    private updateIndex;
    private matchesFilters;
    get(id: string): Vector | undefined;
    delete(id: string): Promise<boolean>;
    getStats(): {
        totalVectors: number;
        dimensions: number;
        indexType: string;
        metric: VectorMetric;
    };
    clear(): Promise<void>;
}
//# sourceMappingURL=VectorDatabase.d.ts.map