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
exports.VectorDatabase = void 0;
class VectorDatabase {
    config;
    vectors;
    index;
    wasm;
    constructor(config) {
        this.config = {
            metric: 'cosine',
            quantization: 'none',
            indexType: 'hnsw',
            efConstruction: 200,
            M: 16,
            nprobe: 10,
            useWasm: true,
            ...config,
        };
        this.vectors = new Map();
        this.initializeIndex();
    }
    async initializeIndex() {
        if (this.config.useWasm) {
            await this.loadWasmModule();
        }
        switch (this.config.indexType) {
            case 'hnsw':
                this.initializeHNSW();
                break;
            case 'ivf':
                this.initializeIVF();
                break;
            case 'flat':
                break;
            default:
                throw new Error(`Unsupported index type: ${this.config.indexType}`);
        }
    }
    async loadWasmModule() {
        try {
            const possiblePaths = [
                '../../wasm/genomic_vector_wasm',
                '../wasm/genomic_vector_wasm',
                './wasm/genomic_vector_wasm'
            ];
            for (const path of possiblePaths) {
                try {
                    const wasmModule = await Promise.resolve(`${path}`).then(s => __importStar(require(s)));
                    this.wasm = wasmModule;
                    return;
                }
                catch (e) {
                    continue;
                }
            }
            throw new Error('WASM module not found in any expected location');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.warn(`WASM acceleration not available (${errorMessage}). Using JavaScript fallback.`);
            this.config.useWasm = false;
            this.wasm = null;
        }
    }
    initializeHNSW() {
        this.index = {
            type: 'hnsw',
            M: this.config.M,
            efConstruction: this.config.efConstruction,
            graph: new Map(),
        };
    }
    initializeIVF() {
        this.index = {
            type: 'ivf',
            nprobe: this.config.nprobe,
            centroids: [],
            invLists: new Map(),
        };
    }
    async add(vector) {
        const vectorArray = Array.isArray(vector.values)
            ? vector.values
            : Array.from(vector.values);
        if (vectorArray.length !== this.config.dimensions) {
            throw new Error(`Vector dimension mismatch. Expected ${this.config.dimensions}, got ${vectorArray.length}`);
        }
        const normalizedVector = this.config.metric === 'cosine'
            ? this.normalizeVector(vectorArray)
            : vectorArray;
        const processedVector = this.config.quantization !== 'none'
            ? await this.quantizeVector(normalizedVector)
            : normalizedVector;
        this.vectors.set(vector.id, {
            ...vector,
            values: new Float32Array(processedVector),
        });
        await this.updateIndex(vector.id, processedVector);
    }
    async addBatch(vectors) {
        const promises = vectors.map(v => this.add(v));
        await Promise.all(promises);
    }
    async search(query, options = {}) {
        const { k = 10, threshold, filters, efSearch = 50, } = options;
        const queryArray = Array.isArray(query) ? query : Array.from(query);
        const normalizedQuery = this.config.metric === 'cosine'
            ? this.normalizeVector(queryArray)
            : queryArray;
        let candidates = await this.annSearch(normalizedQuery, Math.max(k * 2, efSearch));
        if (filters) {
            candidates = candidates.filter(c => this.matchesFilters(c, filters));
        }
        const results = [];
        for (const candidateId of candidates) {
            const vector = this.vectors.get(candidateId);
            if (!vector)
                continue;
            const score = await this.calculateSimilarity(normalizedQuery, Array.from(vector.values));
            results.push({
                id: candidateId,
                score,
                metadata: vector.metadata,
            });
        }
        const sortedResults = results.sort((a, b) => b.score - a.score);
        const filteredResults = threshold
            ? sortedResults.filter(r => r.score >= threshold)
            : sortedResults;
        return filteredResults.slice(0, k);
    }
    async annSearch(query, k) {
        if (this.config.indexType === 'flat') {
            return Array.from(this.vectors.keys()).slice(0, k);
        }
        if (this.config.indexType === 'hnsw') {
            return this.hnswSearch(query, k);
        }
        if (this.config.indexType === 'ivf') {
            return this.ivfSearch(query, k);
        }
        return [];
    }
    async hnswSearch(_query, k) {
        const candidates = Array.from(this.vectors.keys());
        return candidates.slice(0, k);
    }
    async ivfSearch(_query, k) {
        const candidates = Array.from(this.vectors.keys());
        return candidates.slice(0, k);
    }
    async calculateSimilarity(a, b) {
        if (this.config.useWasm && this.wasm) {
            try {
                const calc = new this.wasm.SimilarityCalculator();
                return calc.cosine_similarity(a, b);
            }
            catch (error) {
            }
        }
        switch (this.config.metric) {
            case 'cosine':
                return this.cosineSimilarity(a, b);
            case 'euclidean':
                return 1 / (1 + this.euclideanDistance(a, b));
            case 'dot':
                return this.dotProduct(a, b);
            default:
                return this.cosineSimilarity(a, b);
        }
    }
    cosineSimilarity(a, b) {
        const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        if (normA === 0 || normB === 0)
            return 0;
        return dotProduct / (normA * normB);
    }
    euclideanDistance(a, b) {
        return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
    }
    dotProduct(a, b) {
        return a.reduce((sum, val, i) => sum + val * b[i], 0);
    }
    normalizeVector(vector) {
        const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        if (norm === 0)
            return vector;
        return vector.map(val => val / norm);
    }
    async quantizeVector(vector) {
        switch (this.config.quantization) {
            case 'scalar':
                return this.scalarQuantize(vector);
            case 'product':
                return this.productQuantize(vector);
            case 'binary':
                return this.binaryQuantize(vector);
            default:
                return vector;
        }
    }
    scalarQuantize(vector) {
        const min = Math.min(...vector);
        const max = Math.max(...vector);
        const scale = (max - min) / 255;
        if (scale === 0)
            return vector;
        return vector.map(val => Math.round((val - min) / scale));
    }
    productQuantize(vector) {
        return vector;
    }
    binaryQuantize(vector) {
        return vector.map(val => (val > 0 ? 1 : 0));
    }
    async updateIndex(id, _vector) {
        if (this.config.indexType === 'hnsw') {
            this.index.graph.set(id, []);
        }
        else if (this.config.indexType === 'ivf') {
        }
    }
    matchesFilters(vectorId, filters) {
        const vector = this.vectors.get(vectorId);
        if (!vector || !vector.metadata)
            return false;
        return Object.entries(filters).every(([key, value]) => {
            return vector.metadata[key] === value;
        });
    }
    get(id) {
        return this.vectors.get(id);
    }
    async delete(id) {
        const deleted = this.vectors.delete(id);
        if (deleted && this.index) {
            this.index.graph?.delete(id);
        }
        return deleted;
    }
    getStats() {
        return {
            totalVectors: this.vectors.size,
            dimensions: this.config.dimensions,
            indexType: this.config.indexType,
            metric: this.config.metric,
        };
    }
    async clear() {
        this.vectors.clear();
        await this.initializeIndex();
    }
}
exports.VectorDatabase = VectorDatabase;
//# sourceMappingURL=VectorDatabase.js.map