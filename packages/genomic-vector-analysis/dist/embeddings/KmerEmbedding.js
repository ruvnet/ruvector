"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KmerEmbedding = void 0;
class KmerEmbedding {
    config;
    kmerCache;
    wasm;
    constructor(config = {}) {
        this.config = {
            model: 'kmer',
            dimensions: 384,
            kmerSize: 6,
            stride: 1,
            maxLength: 10000,
            normalization: 'l2',
            useCache: true,
            batchSize: 32,
            ...config,
        };
        this.kmerCache = new Map();
        this.initializeWasm();
    }
    async initializeWasm() {
        try {
            const wasmModule = await Promise.resolve().then(() => __importStar(require('../../wasm/genomic_vector_wasm')));
            this.wasm = wasmModule;
        }
        catch (_error) {
            this.wasm = null;
        }
    }
    async embed(sequence) {
        const startTime = Date.now();
        if (this.config.useCache && this.kmerCache.has(sequence)) {
            return {
                vector: this.kmerCache.get(sequence),
                model: 'kmer',
                inputLength: sequence.length,
                processingTime: Date.now() - startTime,
            };
        }
        if (this.wasm) {
            try {
                const embedder = new this.wasm.KmerEmbedder(this.config.kmerSize, this.config.dimensions);
                const vector = new Float32Array(embedder.embed(sequence));
                if (this.config.useCache) {
                    this.kmerCache.set(sequence, vector);
                }
                return {
                    vector,
                    model: 'kmer',
                    inputLength: sequence.length,
                    processingTime: Date.now() - startTime,
                };
            }
            catch (error) {
                console.warn('WASM embedding failed, falling back to JavaScript');
            }
        }
        const vector = this.generateKmerEmbedding(sequence);
        const normalizedVector = this.config.normalization === 'l2'
            ? this.l2Normalize(vector)
            : vector;
        const result = new Float32Array(normalizedVector);
        if (this.config.useCache) {
            this.kmerCache.set(sequence, result);
        }
        return {
            vector: result,
            model: 'kmer',
            inputLength: sequence.length,
            processingTime: Date.now() - startTime,
        };
    }
    generateKmerEmbedding(sequence) {
        const embedding = new Array(this.config.dimensions).fill(0);
        const cleanSeq = sequence.toUpperCase().replace(/[^ACGT]/g, '');
        if (cleanSeq.length < this.config.kmerSize) {
            return embedding;
        }
        const kmers = [];
        for (let i = 0; i <= cleanSeq.length - this.config.kmerSize; i += this.config.stride) {
            kmers.push(cleanSeq.slice(i, i + this.config.kmerSize));
        }
        const kmerCounts = new Map();
        for (const kmer of kmers) {
            kmerCounts.set(kmer, (kmerCounts.get(kmer) || 0) + 1);
        }
        for (const [kmer, count] of kmerCounts) {
            const hash = this.hashKmer(kmer);
            const idx = hash % this.config.dimensions;
            embedding[idx] += count;
        }
        return embedding;
    }
    hashKmer(kmer) {
        let hash = 0;
        for (let i = 0; i < kmer.length; i++) {
            hash = ((hash << 5) - hash) + kmer.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
    l2Normalize(vector) {
        const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        if (norm === 0)
            return vector;
        return vector.map(val => val / norm);
    }
    async embedBatch(sequences) {
        const results = [];
        for (let i = 0; i < sequences.length; i += this.config.batchSize) {
            const batch = sequences.slice(i, i + this.config.batchSize);
            const batchResults = await Promise.all(batch.map(seq => this.embed(seq)));
            results.push(...batchResults);
        }
        return results;
    }
    clearCache() {
        this.kmerCache.clear();
    }
    getCacheStats() {
        return {
            size: this.kmerCache.size,
            hitRate: 0,
        };
    }
}
exports.KmerEmbedding = KmerEmbedding;
//# sourceMappingURL=KmerEmbedding.js.map