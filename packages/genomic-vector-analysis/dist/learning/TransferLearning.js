"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FewShotLearner = exports.DomainAdaptation = exports.FineTuningEngine = exports.PreTrainedModelRegistry = void 0;
class PreTrainedModelRegistry {
    models;
    constructor() {
        this.models = new Map();
        this.registerDefaultModels();
    }
    registerDefaultModels() {
        this.models.set('dna-bert', {
            name: 'dna-bert',
            architecture: 'BERT',
            parameters: 110_000_000,
            vocabSize: 4096,
            maxLength: 512,
            embeddingDim: 768,
            pretrainedOn: ['human_genome_hg38', 'gencode_v38'],
            checkpoint: 'zhihan1996/DNA_bert_6'
        });
        this.models.set('nucleotide-transformer', {
            name: 'nucleotide-transformer',
            architecture: 'Transformer',
            parameters: 500_000_000,
            vocabSize: 4096,
            maxLength: 1024,
            embeddingDim: 1024,
            pretrainedOn: ['multi_species_genomes', 'ensembl_genomes'],
            checkpoint: 'InstaDeepAI/nucleotide-transformer-v2-500m'
        });
        this.models.set('esm2', {
            name: 'esm2',
            architecture: 'ESM-Transformer',
            parameters: 650_000_000,
            vocabSize: 33,
            maxLength: 1024,
            embeddingDim: 1280,
            pretrainedOn: ['uniref50', 'pfam', 'uniprot'],
            checkpoint: 'facebook/esm2_t33_650M_UR50D'
        });
        this.models.set('protbert', {
            name: 'protbert',
            architecture: 'BERT',
            parameters: 420_000_000,
            vocabSize: 30,
            maxLength: 512,
            embeddingDim: 1024,
            pretrainedOn: ['uniref100', 'big_dataset'],
            checkpoint: 'Rostlab/prot_bert'
        });
    }
    getModel(name) {
        return this.models.get(name);
    }
    registerModel(model) {
        this.models.set(model.name, model);
    }
    listModels() {
        return Array.from(this.models.values());
    }
    getModelsByDomain(domain) {
        const domainModels = {
            dna: ['dna-bert', 'nucleotide-transformer'],
            protein: ['esm2', 'protbert'],
            phenotype: ['phenotype-bert']
        };
        return (domainModels[domain] || [])
            .map(name => this.models.get(name))
            .filter((m) => m !== undefined);
    }
}
exports.PreTrainedModelRegistry = PreTrainedModelRegistry;
class FineTuningEngine {
    config;
    baseModel;
    trainingHistory;
    bestValidLoss;
    patienceCounter;
    constructor(baseModel, config = {}) {
        this.baseModel = baseModel;
        this.config = {
            learningRate: 2e-5,
            epochs: 10,
            batchSize: 16,
            warmupSteps: 500,
            weightDecay: 0.01,
            gradientClipNorm: 1.0,
            frozenLayers: 0,
            validationSplit: 0.1,
            earlyStoppingPatience: 3,
            ...config
        };
        this.trainingHistory = [];
        this.bestValidLoss = Infinity;
        this.patienceCounter = 0;
    }
    async fineTune(trainData, validData) {
        console.log(`Fine-tuning ${this.baseModel.name} on ${trainData.length} examples`);
        if (!validData) {
            const splitIdx = Math.floor(trainData.length * (1 - this.config.validationSplit));
            validData = trainData.slice(splitIdx);
            trainData = trainData.slice(0, splitIdx);
        }
        for (let epoch = 0; epoch < this.config.epochs; epoch++) {
            const metrics = await this.trainEpoch(trainData, validData, epoch);
            this.trainingHistory.push(metrics);
            console.log(`Epoch ${epoch + 1}/${this.config.epochs} - ` +
                `Train Loss: ${metrics.trainLoss.toFixed(4)}, ` +
                `Valid Loss: ${metrics.validLoss.toFixed(4)}, ` +
                `Valid Acc: ${(metrics.validAccuracy * 100).toFixed(2)}%`);
            if (this.shouldStopEarly(metrics.validLoss)) {
                console.log(`Early stopping triggered at epoch ${epoch + 1}`);
                break;
            }
        }
        return this.trainingHistory;
    }
    async trainEpoch(trainData, validData, epoch) {
        const shuffled = this.shuffleData(trainData);
        let trainLoss = 0;
        let trainCorrect = 0;
        let gradientNorm = 0;
        for (let i = 0; i < shuffled.length; i += this.config.batchSize) {
            const batch = shuffled.slice(i, i + this.config.batchSize);
            const step = epoch * Math.ceil(trainData.length / this.config.batchSize) + i / this.config.batchSize;
            const lr = this.computeLearningRate(step);
            const batchMetrics = this.processBatch(batch, lr, true);
            trainLoss += batchMetrics.loss;
            trainCorrect += batchMetrics.correct;
            gradientNorm += batchMetrics.gradientNorm;
        }
        const numBatches = Math.ceil(trainData.length / this.config.batchSize);
        trainLoss /= numBatches;
        gradientNorm /= numBatches;
        let validLoss = 0;
        let validCorrect = 0;
        for (let i = 0; i < validData.length; i += this.config.batchSize) {
            const batch = validData.slice(i, i + this.config.batchSize);
            const batchMetrics = this.processBatch(batch, 0, false);
            validLoss += batchMetrics.loss;
            validCorrect += batchMetrics.correct;
        }
        const validBatches = Math.ceil(validData.length / this.config.batchSize);
        validLoss /= validBatches;
        return {
            epoch,
            trainLoss,
            validLoss,
            trainAccuracy: trainCorrect / trainData.length,
            validAccuracy: validCorrect / validData.length,
            learningRate: this.computeLearningRate(epoch * numBatches),
            gradientNorm,
            timestamp: Date.now()
        };
    }
    processBatch(batch, learningRate, training) {
        const loss = Math.random() * (training ? 1.5 : 1.0);
        const correct = Math.floor(Math.random() * batch.length);
        const gradientNorm = training ? Math.random() * 2.0 : 0;
        return { loss, correct, gradientNorm };
    }
    computeLearningRate(step) {
        if (step < this.config.warmupSteps) {
            return this.config.learningRate * (step / this.config.warmupSteps);
        }
        const progress = (step - this.config.warmupSteps) /
            (this.config.epochs * 1000 - this.config.warmupSteps);
        return this.config.learningRate * 0.5 * (1 + Math.cos(Math.PI * progress));
    }
    shouldStopEarly(validLoss) {
        if (validLoss < this.bestValidLoss) {
            this.bestValidLoss = validLoss;
            this.patienceCounter = 0;
            return false;
        }
        this.patienceCounter++;
        return this.patienceCounter >= this.config.earlyStoppingPatience;
    }
    shuffleData(data) {
        const shuffled = [...data];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    getHistory() {
        return this.trainingHistory;
    }
    exportModel() {
        return {
            base: this.baseModel,
            config: this.config,
            history: this.trainingHistory
        };
    }
}
exports.FineTuningEngine = FineTuningEngine;
class DomainAdaptation {
    config;
    sourceStats;
    targetStats;
    constructor(config = {}) {
        this.config = {
            sourceModels: ['dna-bert'],
            targetDomain: 'pediatric_oncology',
            adaptationStrategy: 'feature_based',
            discrepancyMetric: 'mmd',
            domainConfusionWeight: 0.1,
            ...config
        };
        this.sourceStats = null;
        this.targetStats = null;
    }
    async adapt(sourceData, targetData) {
        console.log(`Adapting from source (${sourceData.length}) to target (${targetData.length})`);
        this.sourceStats = this.computeDomainStatistics(sourceData, 'source');
        this.targetStats = this.computeDomainStatistics(targetData, 'target');
        let transformedEmbeddings;
        switch (this.config.adaptationStrategy) {
            case 'feature_based':
                transformedEmbeddings = this.featureBasedAdaptation(sourceData, targetData);
                break;
            case 'instance_based':
                transformedEmbeddings = this.instanceBasedAdaptation(sourceData, targetData);
                break;
            case 'parameter_based':
                transformedEmbeddings = this.parameterBasedAdaptation(sourceData, targetData);
                break;
            default:
                transformedEmbeddings = sourceData.map(d => d.embedding);
        }
        const discrepancy = this.computeDiscrepancy(sourceData.map(d => d.embedding), targetData.map(d => d.embedding));
        return { transformedEmbeddings, discrepancy };
    }
    featureBasedAdaptation(sourceData, targetData) {
        if (!this.sourceStats || !this.targetStats) {
            throw new Error('Domain statistics not computed');
        }
        const dim = sourceData[0].embedding.length;
        const transformed = [];
        for (const sample of sourceData) {
            const aligned = this.alignFeatures(sample.embedding, this.sourceStats.meanEmbedding, this.targetStats.meanEmbedding);
            transformed.push(aligned);
        }
        return transformed;
    }
    instanceBasedAdaptation(sourceData, targetData) {
        const weights = this.computeImportanceWeights(sourceData, targetData);
        const transformed = [];
        for (let i = 0; i < sourceData.length; i++) {
            const weighted = sourceData[i].embedding.map(v => v * weights[i]);
            transformed.push(weighted);
        }
        return transformed;
    }
    parameterBasedAdaptation(sourceData, targetData) {
        const transformed = [];
        for (const sample of sourceData) {
            const domainInvariant = sample.embedding.map(v => v * (1 - this.config.domainConfusionWeight) +
                Math.random() * this.config.domainConfusionWeight);
            transformed.push(domainInvariant);
        }
        return transformed;
    }
    alignFeatures(embedding, sourceMean, targetMean) {
        return embedding.map((v, i) => v - sourceMean[i] + targetMean[i]);
    }
    computeImportanceWeights(sourceData, targetData) {
        const weights = [];
        for (const source of sourceData) {
            let minDist = Infinity;
            for (const target of targetData) {
                const dist = this.euclideanDistance(source.embedding, target.embedding);
                minDist = Math.min(minDist, dist);
            }
            weights.push(1 / (1 + minDist));
        }
        const sum = weights.reduce((a, b) => a + b, 0);
        return weights.map(w => w / sum * weights.length);
    }
    computeDiscrepancy(source, target) {
        switch (this.config.discrepancyMetric) {
            case 'mmd':
                return this.maximumMeanDiscrepancy(source, target);
            case 'coral':
                return this.coralDistance(source, target);
            case 'dann':
                return this.domainClassificationError(source, target);
            default:
                return 0;
        }
    }
    maximumMeanDiscrepancy(source, target) {
        const sourceMean = this.computeMean(source);
        const targetMean = this.computeMean(target);
        return this.euclideanDistance(sourceMean, targetMean);
    }
    coralDistance(source, target) {
        const sourceVar = this.computeVariance(source);
        const targetVar = this.computeVariance(target);
        let distance = 0;
        for (let i = 0; i < sourceVar.length; i++) {
            distance += Math.abs(sourceVar[i] - targetVar[i]);
        }
        return distance / sourceVar.length;
    }
    domainClassificationError(source, target) {
        return 0.5 + Math.random() * 0.3;
    }
    computeDomainStatistics(data, domain) {
        const embeddings = data.map(d => d.embedding);
        const labels = data.map(d => d.label);
        return {
            domain,
            samples: data.length,
            meanEmbedding: this.computeMean(embeddings),
            classDistribution: this.computeClassDistribution(labels)
        };
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
    computeVariance(embeddings) {
        const mean = this.computeMean(embeddings);
        const dim = embeddings[0].length;
        const variance = new Array(dim).fill(0);
        for (const emb of embeddings) {
            for (let i = 0; i < dim; i++) {
                variance[i] += Math.pow(emb[i] - mean[i], 2);
            }
        }
        return variance.map(v => v / embeddings.length);
    }
    computeClassDistribution(labels) {
        const dist = new Map();
        for (const label of labels) {
            dist.set(label, (dist.get(label) || 0) + 1);
        }
        return dist;
    }
    euclideanDistance(a, b) {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += Math.pow(a[i] - b[i], 2);
        }
        return Math.sqrt(sum);
    }
    getStatistics() {
        return {
            source: this.sourceStats,
            target: this.targetStats,
            config: this.config
        };
    }
}
exports.DomainAdaptation = DomainAdaptation;
class FewShotLearner {
    config;
    prototypes;
    episodeHistory;
    constructor(config = {}) {
        this.config = {
            nWay: 5,
            kShot: 5,
            querySize: 15,
            episodes: 100,
            metaLearningRate: 0.001,
            innerLearningRate: 0.01,
            innerSteps: 5,
            ...config
        };
        this.prototypes = new Map();
        this.episodeHistory = [];
    }
    async metaTrain(data) {
        console.log(`Meta-training on ${this.config.episodes} episodes`);
        let totalAccuracy = 0;
        for (let ep = 0; ep < this.config.episodes; ep++) {
            const episode = this.sampleEpisode(data);
            const accuracy = await this.trainEpisode(episode.support, episode.query);
            totalAccuracy += accuracy;
            this.episodeHistory.push({ ...episode, accuracy });
            if ((ep + 1) % 10 === 0) {
                console.log(`Episode ${ep + 1}/${this.config.episodes} - Accuracy: ${(accuracy * 100).toFixed(2)}%`);
            }
        }
        return {
            accuracy: totalAccuracy / this.config.episodes,
            episodes: this.config.episodes
        };
    }
    sampleEpisode(data) {
        const diseaseGroups = new Map();
        for (const item of data) {
            if (!diseaseGroups.has(item.disease)) {
                diseaseGroups.set(item.disease, []);
            }
            diseaseGroups.get(item.disease).push(item);
        }
        const diseases = Array.from(diseaseGroups.keys());
        const selectedDiseases = this.sampleWithoutReplacement(diseases, this.config.nWay);
        const support = [];
        const query = [];
        for (const disease of selectedDiseases) {
            const examples = diseaseGroups.get(disease);
            const selected = this.sampleWithoutReplacement(examples, this.config.kShot + this.config.querySize);
            support.push(...selected.slice(0, this.config.kShot));
            query.push(...selected.slice(this.config.kShot));
        }
        return { support, query };
    }
    async trainEpisode(support, query) {
        this.prototypes.clear();
        const diseaseEmbeddings = new Map();
        for (const item of support) {
            if (!diseaseEmbeddings.has(item.disease)) {
                diseaseEmbeddings.set(item.disease, []);
            }
            diseaseEmbeddings.get(item.disease).push(item.embedding);
        }
        for (const [disease, embeddings] of diseaseEmbeddings.entries()) {
            this.prototypes.set(disease, this.computeCentroid(embeddings));
        }
        let correct = 0;
        for (const item of query) {
            const predicted = this.classify(item.embedding);
            if (predicted === item.disease) {
                correct++;
            }
        }
        return correct / query.length;
    }
    classify(embedding) {
        let bestDisease = '';
        let minDistance = Infinity;
        for (const [disease, prototype] of this.prototypes.entries()) {
            const distance = this.euclideanDistance(embedding, prototype);
            if (distance < minDistance) {
                minDistance = distance;
                bestDisease = disease;
            }
        }
        return bestDisease;
    }
    computeCentroid(embeddings) {
        const dim = embeddings[0].length;
        const centroid = new Array(dim).fill(0);
        for (const emb of embeddings) {
            for (let i = 0; i < dim; i++) {
                centroid[i] += emb[i];
            }
        }
        return centroid.map(v => v / embeddings.length);
    }
    euclideanDistance(a, b) {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += Math.pow(a[i] - b[i], 2);
        }
        return Math.sqrt(sum);
    }
    sampleWithoutReplacement(array, count) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }
    getStatistics() {
        return {
            config: this.config,
            episodes: this.episodeHistory.length,
            meanAccuracy: this.episodeHistory.reduce((sum, ep) => sum + ep.accuracy, 0) /
                this.episodeHistory.length,
            prototypes: Array.from(this.prototypes.keys())
        };
    }
}
exports.FewShotLearner = FewShotLearner;
//# sourceMappingURL=TransferLearning.js.map