import type { EmbeddingConfig, EmbeddingResult } from '../types';
export declare class KmerEmbedding {
    private config;
    private kmerCache;
    private wasm;
    constructor(config?: Partial<EmbeddingConfig>);
    private initializeWasm;
    embed(sequence: string): Promise<EmbeddingResult>;
    private generateKmerEmbedding;
    private hashKmer;
    private l2Normalize;
    embedBatch(sequences: string[]): Promise<EmbeddingResult[]>;
    clearCache(): void;
    getCacheStats(): {
        size: number;
        hitRate: number;
    };
}
//# sourceMappingURL=KmerEmbedding.d.ts.map