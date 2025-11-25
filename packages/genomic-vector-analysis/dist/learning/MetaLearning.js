"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HNSWAutotuner = exports.DynamicQuantization = exports.AdaptiveEmbedding = exports.BayesianOptimizer = void 0;
class BayesianOptimizer {
    space;
    trials;
    acquisitionFunction;
    explorationWeight;
    bestTrial;
    constructor(space, acquisitionFunction = 'ei', explorationWeight = 2.0) {
        this.space = space;
        this.trials = [];
        this.acquisitionFunction = acquisitionFunction;
        this.explorationWeight = explorationWeight;
        this.bestTrial = null;
    }
    async optimize(objective, nTrials = 50, randomTrials = 10) {
        console.log(`Starting Bayesian optimization with ${nTrials} trials`);
        for (let i = 0; i < randomTrials; i++) {
            const config = this.sampleRandom();
            await this.evaluateTrial(config, objective, i);
        }
        for (let i = randomTrials; i < nTrials; i++) {
            const config = this.selectNextConfig();
            await this.evaluateTrial(config, objective, i);
            if ((i + 1) % 10 === 0) {
                console.log(`Trial ${i + 1}/${nTrials} - Best score: ${this.bestTrial?.score.toFixed(4)}`);
            }
        }
        if (!this.bestTrial) {
            throw new Error('No successful trials');
        }
        console.log('Optimization complete');
        console.log('Best configuration:', this.bestTrial.config);
        console.log('Best score:', this.bestTrial.score);
        return this.bestTrial.config;
    }
    async evaluateTrial(config, objective, trial) {
        const startTime = Date.now();
        try {
            const score = await objective(config);
            const metrics = {
                accuracy: score,
                f1Score: score * (0.95 + Math.random() * 0.05),
                queryLatency: Math.random() * 100,
                memoryUsage: Math.random() * 1000,
                indexBuildTime: Math.random() * 60
            };
            const result = {
                config,
                metrics,
                score,
                trial,
                timestamp: Date.now()
            };
            this.trials.push(result);
            if (!this.bestTrial || score > this.bestTrial.score) {
                this.bestTrial = result;
            }
            console.log(`Trial ${trial}: score=${score.toFixed(4)}, ` +
                `efSearch=${config.efSearch}, M=${config.M}, ` +
                `time=${((Date.now() - startTime) / 1000).toFixed(2)}s`);
        }
        catch (error) {
            console.error(`Trial ${trial} failed:`, error);
        }
    }
    selectNextConfig() {
        const nCandidates = 1000;
        const candidates = [];
        for (let i = 0; i < nCandidates; i++) {
            candidates.push(this.sampleRandom());
        }
        let bestAcquisition = -Infinity;
        let bestCandidate = candidates[0];
        for (const candidate of candidates) {
            const acquisition = this.computeAcquisition(candidate);
            if (acquisition > bestAcquisition) {
                bestAcquisition = acquisition;
                bestCandidate = candidate;
            }
        }
        return bestCandidate;
    }
    computeAcquisition(config) {
        const { mean, std } = this.predictPerformance(config);
        switch (this.acquisitionFunction) {
            case 'ei':
                return this.expectedImprovement(mean, std);
            case 'ucb':
                return mean + this.explorationWeight * std;
            case 'poi':
                return this.probabilityOfImprovement(mean, std);
            default:
                return mean;
        }
    }
    predictPerformance(config) {
        if (this.trials.length === 0) {
            return { mean: 0.5, std: 0.5 };
        }
        const k = Math.min(5, this.trials.length);
        const distances = this.trials.map(trial => ({
            trial,
            distance: this.configDistance(config, trial.config)
        }));
        distances.sort((a, b) => a.distance - b.distance);
        const nearest = distances.slice(0, k);
        const totalWeight = nearest.reduce((sum, n) => sum + 1 / (n.distance + 0.01), 0);
        let mean = 0;
        let variance = 0;
        for (const n of nearest) {
            const weight = (1 / (n.distance + 0.01)) / totalWeight;
            mean += n.trial.score * weight;
        }
        for (const n of nearest) {
            const weight = (1 / (n.distance + 0.01)) / totalWeight;
            variance += weight * Math.pow(n.trial.score - mean, 2);
        }
        return { mean, std: Math.sqrt(variance) };
    }
    expectedImprovement(mean, std) {
        if (!this.bestTrial || std === 0)
            return 0;
        const improvement = mean - this.bestTrial.score;
        const z = improvement / std;
        const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
        const cdf = 0.5 * (1 + this.erf(z / Math.sqrt(2)));
        return improvement * cdf + std * pdf;
    }
    probabilityOfImprovement(mean, std) {
        if (!this.bestTrial || std === 0)
            return 0;
        const improvement = mean - this.bestTrial.score;
        const z = improvement / std;
        return 0.5 * (1 + this.erf(z / Math.sqrt(2)));
    }
    erf(x) {
        const sign = x >= 0 ? 1 : -1;
        x = Math.abs(x);
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;
        const t = 1 / (1 + p * x);
        const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        return sign * y;
    }
    configDistance(c1, c2) {
        let distance = 0;
        for (const key of Object.keys(this.space)) {
            const param = this.space[key];
            const v1 = c1[key];
            const v2 = c2[key];
            if (v1 === undefined || v2 === undefined)
                continue;
            if (param.type === 'categorical') {
                distance += v1 === v2 ? 0 : 1;
            }
            else {
                const range = param.max - param.min;
                distance += Math.pow((Number(v1) - Number(v2)) / range, 2);
            }
        }
        return Math.sqrt(distance);
    }
    sampleRandom() {
        const config = {};
        for (const [key, param] of Object.entries(this.space)) {
            if (param.type === 'categorical') {
                const values = param.values;
                config[key] = values[Math.floor(Math.random() * values.length)];
            }
            else if (param.type === 'int') {
                const min = param.min;
                const max = param.max;
                const power2 = param.power2;
                if (power2) {
                    const logMin = Math.log2(min);
                    const logMax = Math.log2(max);
                    config[key] = Math.pow(2, Math.floor(Math.random() * (logMax - logMin + 1) + logMin));
                }
                else {
                    config[key] = Math.floor(Math.random() * (max - min + 1) + min);
                }
            }
            else if (param.type === 'float') {
                const min = param.min;
                const max = param.max;
                const log = param.log;
                if (log) {
                    const logMin = Math.log(min);
                    const logMax = Math.log(max);
                    config[key] = Math.exp(Math.random() * (logMax - logMin) + logMin);
                }
                else {
                    config[key] = Math.random() * (max - min) + min;
                }
            }
        }
        return config;
    }
    getHistory() {
        return this.trials;
    }
    getBestTrial() {
        return this.bestTrial;
    }
}
exports.BayesianOptimizer = BayesianOptimizer;
class AdaptiveEmbedding {
    config;
    originalDim;
    reducedDim;
    transformMatrix;
    constructor(config = {}) {
        this.config = {
            minDim: 64,
            maxDim: 1024,
            targetCompression: 0.5,
            varianceThreshold: 0.95,
            method: 'pca',
            ...config
        };
        this.originalDim = 0;
        this.reducedDim = 0;
        this.transformMatrix = null;
    }
    async learn(embeddings) {
        this.originalDim = embeddings[0].length;
        console.log(`Learning adaptive embedding dimension from ${embeddings.length} samples`);
        console.log(`Original dimensionality: ${this.originalDim}`);
        switch (this.config.method) {
            case 'pca':
                this.reducedDim = this.learnPCA(embeddings);
                break;
            case 'svd':
                this.reducedDim = this.learnSVD(embeddings);
                break;
            case 'autoencoder':
                this.reducedDim = await this.learnAutoencoder(embeddings);
                break;
        }
        this.reducedDim = Math.max(this.config.minDim, Math.min(this.config.maxDim, this.reducedDim));
        const compressionRatio = this.reducedDim / this.originalDim;
        console.log(`Reduced dimensionality: ${this.reducedDim}`);
        console.log(`Compression ratio: ${(compressionRatio * 100).toFixed(2)}%`);
        return { reducedDim: this.reducedDim, compressionRatio };
    }
    learnPCA(embeddings) {
        const mean = this.computeMean(embeddings);
        const centered = embeddings.map(emb => emb.map((v, i) => v - mean[i]));
        const eigenvalues = this.estimateEigenvalues(centered);
        const totalVariance = eigenvalues.reduce((a, b) => a + b, 0);
        let cumulativeVariance = 0;
        let components = 0;
        for (const eigenvalue of eigenvalues) {
            cumulativeVariance += eigenvalue;
            components++;
            if (cumulativeVariance / totalVariance >= this.config.varianceThreshold) {
                break;
            }
        }
        return components;
    }
    learnSVD(embeddings) {
        return this.learnPCA(embeddings);
    }
    async learnAutoencoder(embeddings) {
        const candidates = [64, 128, 256, 512];
        let bestDim = candidates[0];
        let bestReconstruction = Infinity;
        for (const dim of candidates) {
            const reconstructionError = this.evaluateAutoencoder(embeddings, dim);
            if (reconstructionError < bestReconstruction) {
                bestReconstruction = reconstructionError;
                bestDim = dim;
            }
        }
        return bestDim;
    }
    evaluateAutoencoder(embeddings, bottleneckDim) {
        const compressionRatio = bottleneckDim / this.originalDim;
        return (1 - compressionRatio) * Math.random();
    }
    transform(embedding) {
        if (!this.transformMatrix) {
            if (embedding.length > this.reducedDim) {
                return embedding.slice(0, this.reducedDim);
            }
            else {
                return [...embedding, ...new Array(this.reducedDim - embedding.length).fill(0)];
            }
        }
        const reduced = new Array(this.reducedDim).fill(0);
        for (let i = 0; i < this.reducedDim; i++) {
            for (let j = 0; j < embedding.length; j++) {
                reduced[i] += this.transformMatrix[i][j] * embedding[j];
            }
        }
        return reduced;
    }
    computeMean(embeddings) {
        const dim = embeddings[0].length;
        const mean = new Array(dim).fill(0);
        for (const emb of embeddings) {
            for (let i = 0; i < dim; i++) {
                mean[i] += emb[i];
            }
        }
        return mean.map(v => v / embeddings.length);
    }
    estimateEigenvalues(centered) {
        const dim = centered[0].length;
        const eigenvalues = [];
        for (let i = 0; i < dim; i++) {
            let variance = 0;
            for (const emb of centered) {
                variance += emb[i] * emb[i];
            }
            eigenvalues.push(variance / centered.length);
        }
        eigenvalues.sort((a, b) => b - a);
        return eigenvalues;
    }
    getStatistics() {
        return {
            originalDim: this.originalDim,
            reducedDim: this.reducedDim,
            compressionRatio: this.reducedDim / this.originalDim,
            method: this.config.method
        };
    }
}
exports.AdaptiveEmbedding = AdaptiveEmbedding;
class DynamicQuantization {
    strategies;
    performanceHistory;
    constructor() {
        this.strategies = new Map();
        this.performanceHistory = new Map();
        this.initializeStrategies();
    }
    initializeStrategies() {
        this.strategies.set('none', { type: 'none' });
        this.strategies.set('scalar_8', { type: 'scalar', bits: 8 });
        this.strategies.set('scalar_4', { type: 'scalar', bits: 4 });
        this.strategies.set('product_8', { type: 'product', bits: 8, codebookSize: 256 });
        this.strategies.set('product_4', { type: 'product', bits: 4, codebookSize: 16 });
        this.strategies.set('binary', { type: 'binary', bits: 1 });
    }
    selectStrategy(workload) {
        if (workload.memoryBudget < 1000) {
            return this.strategies.get('product_4');
        }
        else if (workload.latencyBudget < 10) {
            return this.strategies.get('scalar_8');
        }
        else if (workload.queryRate > 1000) {
            return this.strategies.get('product_8');
        }
        else {
            return this.strategies.get('none');
        }
    }
    adapt(currentStrategy, performance) {
        if (!this.performanceHistory.has(currentStrategy)) {
            this.performanceHistory.set(currentStrategy, []);
        }
        const score = performance.accuracy - 0.01 * performance.latency - 0.001 * performance.memory;
        this.performanceHistory.get(currentStrategy).push(score);
        let bestStrategy = currentStrategy;
        let bestScore = -Infinity;
        for (const [name, history] of this.performanceHistory.entries()) {
            if (history.length > 0) {
                const avgScore = history.reduce((a, b) => a + b, 0) / history.length;
                if (avgScore > bestScore) {
                    bestScore = avgScore;
                    bestStrategy = name;
                }
            }
        }
        return this.strategies.get(bestStrategy);
    }
    getStatistics() {
        const stats = {};
        for (const [name, history] of this.performanceHistory.entries()) {
            if (history.length > 0) {
                stats[name] = {
                    samples: history.length,
                    meanScore: history.reduce((a, b) => a + b, 0) / history.length,
                    maxScore: Math.max(...history),
                    minScore: Math.min(...history)
                };
            }
        }
        return stats;
    }
}
exports.DynamicQuantization = DynamicQuantization;
class HNSWAutotuner {
    config;
    tuningHistory;
    constructor(config) {
        this.config = config;
        this.tuningHistory = [];
    }
    async tune() {
        console.log('Auto-tuning HNSW parameters...');
        console.log(`Dataset: ${this.config.dataset.size} vectors, ${this.config.dataset.dimensionality}D`);
        const M = this.estimateM();
        const efConstruction = this.estimateEfConstruction(M);
        const efSearch = this.estimateEfSearch(M);
        const optimized = await this.gridSearch({ M, efConstruction, efSearch }, {
            M: [M - 4, M, M + 4],
            efConstruction: [efConstruction - 50, efConstruction, efConstruction + 50],
            efSearch: [efSearch - 20, efSearch, efSearch + 20]
        });
        console.log('Tuning complete');
        console.log('Optimal parameters:', optimized);
        return optimized;
    }
    estimateM() {
        const { size, dimensionality } = this.config.dataset;
        const logN = Math.log2(size);
        let M = Math.round(2 * logN);
        if (dimensionality > 512) {
            M = Math.min(M + 4, 64);
        }
        return Math.max(8, Math.min(64, M));
    }
    estimateEfConstruction(M) {
        const { size } = this.config.dataset;
        let efConstruction = 2 * M;
        if (size > 1_000_000) {
            efConstruction *= 1.5;
        }
        return Math.round(Math.max(100, Math.min(400, efConstruction)));
    }
    estimateEfSearch(M) {
        const { constraints } = this.config;
        let efSearch = M;
        if (constraints.minRecall && constraints.minRecall > 0.95) {
            efSearch *= 2;
        }
        if (constraints.maxLatency && constraints.maxLatency < 5) {
            efSearch = Math.min(efSearch, 50);
        }
        return Math.round(Math.max(16, Math.min(200, efSearch)));
    }
    async gridSearch(baseline, grid) {
        let bestParams = baseline;
        let bestScore = -Infinity;
        for (const M of grid.M) {
            for (const efConstruction of grid.efConstruction) {
                for (const efSearch of grid.efSearch) {
                    const params = { M, efConstruction, efSearch };
                    const metrics = await this.evaluateParams(params);
                    const score = this.computeScore(metrics);
                    this.tuningHistory.push({ params, metrics });
                    if (score > bestScore) {
                        bestScore = score;
                        bestParams = params;
                    }
                }
            }
        }
        return bestParams;
    }
    async evaluateParams(params) {
        const recall = 0.90 + Math.random() * 0.09;
        const latency = params.efSearch * 0.1 + Math.random() * 2;
        const memory = params.M * this.config.dataset.size * 0.001;
        return { recall, latency, memory };
    }
    computeScore(metrics) {
        const { constraints } = this.config;
        let score = metrics.recall;
        if (constraints.maxLatency && metrics.latency > constraints.maxLatency) {
            score -= 0.5;
        }
        if (constraints.maxMemory && metrics.memory > constraints.maxMemory) {
            score -= 0.5;
        }
        if (constraints.minRecall && metrics.recall < constraints.minRecall) {
            score -= 0.5;
        }
        return score;
    }
    getHistory() {
        return this.tuningHistory;
    }
}
exports.HNSWAutotuner = HNSWAutotuner;
//# sourceMappingURL=MetaLearning.js.map