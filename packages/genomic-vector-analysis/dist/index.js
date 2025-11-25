"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERSION = exports.GenomicVectorDB = exports.schemas = exports.createPlugin = exports.PluginManager = exports.ModelVersionManager = exports.IncrementalIndexUpdater = exports.ForgettingPrevention = exports.OnlineLearner = exports.CounterfactualGenerator = exports.FeatureImportanceAnalyzer = exports.AttentionAnalyzer = exports.SHAPExplainer = exports.HNSWAutotuner = exports.DynamicQuantization = exports.AdaptiveEmbedding = exports.BayesianOptimizer = exports.HomomorphicEncryption = exports.SecureAggregation = exports.FederatedLearningCoordinator = exports.FewShotLearner = exports.DomainAdaptation = exports.FineTuningEngine = exports.PreTrainedModelRegistry = exports.ExperienceReplayBuffer = exports.MultiArmedBandit = exports.PolicyGradientOptimizer = exports.QLearningOptimizer = exports.PatternRecognizer = exports.KmerEmbedding = exports.VectorDatabase = void 0;
var VectorDatabase_1 = require("./core/VectorDatabase");
Object.defineProperty(exports, "VectorDatabase", { enumerable: true, get: function () { return VectorDatabase_1.VectorDatabase; } });
var KmerEmbedding_1 = require("./embeddings/KmerEmbedding");
Object.defineProperty(exports, "KmerEmbedding", { enumerable: true, get: function () { return KmerEmbedding_1.KmerEmbedding; } });
var PatternRecognizer_1 = require("./learning/PatternRecognizer");
Object.defineProperty(exports, "PatternRecognizer", { enumerable: true, get: function () { return PatternRecognizer_1.PatternRecognizer; } });
var ReinforcementLearning_1 = require("./learning/ReinforcementLearning");
Object.defineProperty(exports, "QLearningOptimizer", { enumerable: true, get: function () { return ReinforcementLearning_1.QLearningOptimizer; } });
Object.defineProperty(exports, "PolicyGradientOptimizer", { enumerable: true, get: function () { return ReinforcementLearning_1.PolicyGradientOptimizer; } });
Object.defineProperty(exports, "MultiArmedBandit", { enumerable: true, get: function () { return ReinforcementLearning_1.MultiArmedBandit; } });
Object.defineProperty(exports, "ExperienceReplayBuffer", { enumerable: true, get: function () { return ReinforcementLearning_1.ExperienceReplayBuffer; } });
var TransferLearning_1 = require("./learning/TransferLearning");
Object.defineProperty(exports, "PreTrainedModelRegistry", { enumerable: true, get: function () { return TransferLearning_1.PreTrainedModelRegistry; } });
Object.defineProperty(exports, "FineTuningEngine", { enumerable: true, get: function () { return TransferLearning_1.FineTuningEngine; } });
Object.defineProperty(exports, "DomainAdaptation", { enumerable: true, get: function () { return TransferLearning_1.DomainAdaptation; } });
Object.defineProperty(exports, "FewShotLearner", { enumerable: true, get: function () { return TransferLearning_1.FewShotLearner; } });
var FederatedLearning_1 = require("./learning/FederatedLearning");
Object.defineProperty(exports, "FederatedLearningCoordinator", { enumerable: true, get: function () { return FederatedLearning_1.FederatedLearningCoordinator; } });
Object.defineProperty(exports, "SecureAggregation", { enumerable: true, get: function () { return FederatedLearning_1.SecureAggregation; } });
Object.defineProperty(exports, "HomomorphicEncryption", { enumerable: true, get: function () { return FederatedLearning_1.HomomorphicEncryption; } });
var MetaLearning_1 = require("./learning/MetaLearning");
Object.defineProperty(exports, "BayesianOptimizer", { enumerable: true, get: function () { return MetaLearning_1.BayesianOptimizer; } });
Object.defineProperty(exports, "AdaptiveEmbedding", { enumerable: true, get: function () { return MetaLearning_1.AdaptiveEmbedding; } });
Object.defineProperty(exports, "DynamicQuantization", { enumerable: true, get: function () { return MetaLearning_1.DynamicQuantization; } });
Object.defineProperty(exports, "HNSWAutotuner", { enumerable: true, get: function () { return MetaLearning_1.HNSWAutotuner; } });
var ExplainableAI_1 = require("./learning/ExplainableAI");
Object.defineProperty(exports, "SHAPExplainer", { enumerable: true, get: function () { return ExplainableAI_1.SHAPExplainer; } });
Object.defineProperty(exports, "AttentionAnalyzer", { enumerable: true, get: function () { return ExplainableAI_1.AttentionAnalyzer; } });
Object.defineProperty(exports, "FeatureImportanceAnalyzer", { enumerable: true, get: function () { return ExplainableAI_1.FeatureImportanceAnalyzer; } });
Object.defineProperty(exports, "CounterfactualGenerator", { enumerable: true, get: function () { return ExplainableAI_1.CounterfactualGenerator; } });
var ContinuousLearning_1 = require("./learning/ContinuousLearning");
Object.defineProperty(exports, "OnlineLearner", { enumerable: true, get: function () { return ContinuousLearning_1.OnlineLearner; } });
Object.defineProperty(exports, "ForgettingPrevention", { enumerable: true, get: function () { return ContinuousLearning_1.ForgettingPrevention; } });
Object.defineProperty(exports, "IncrementalIndexUpdater", { enumerable: true, get: function () { return ContinuousLearning_1.IncrementalIndexUpdater; } });
Object.defineProperty(exports, "ModelVersionManager", { enumerable: true, get: function () { return ContinuousLearning_1.ModelVersionManager; } });
var PluginManager_1 = require("./plugins/PluginManager");
Object.defineProperty(exports, "PluginManager", { enumerable: true, get: function () { return PluginManager_1.PluginManager; } });
Object.defineProperty(exports, "createPlugin", { enumerable: true, get: function () { return PluginManager_1.createPlugin; } });
const VectorDatabase_2 = require("./core/VectorDatabase");
const KmerEmbedding_2 = require("./embeddings/KmerEmbedding");
const PatternRecognizer_2 = require("./learning/PatternRecognizer");
const PluginManager_2 = require("./plugins/PluginManager");
var types_1 = require("./types");
Object.defineProperty(exports, "schemas", { enumerable: true, get: function () { return types_1.schemas; } });
class GenomicVectorDB {
    db;
    embeddings;
    learning;
    plugins;
    constructor(config = {}) {
        this.db = new VectorDatabase_2.VectorDatabase(config.database || {
            dimensions: 384,
            metric: 'cosine',
            quantization: 'none',
            indexType: 'hnsw',
        });
        this.embeddings = new KmerEmbedding_2.KmerEmbedding(config.embeddings || {
            model: 'kmer',
            dimensions: 384,
            kmerSize: 6,
        });
        this.learning = new PatternRecognizer_2.PatternRecognizer(this.db);
        this.plugins = new PluginManager_2.PluginManager({
            db: this.db,
            embeddings: this.embeddings,
            config: config.plugins || {},
        });
    }
    async addSequence(id, sequence, metadata) {
        const embedding = await this.embeddings.embed(sequence);
        await this.db.add({
            id,
            values: embedding.vector,
            metadata: {
                ...metadata,
                sequence,
                inputLength: embedding.inputLength,
            },
        });
    }
    async searchBySequence(sequence, k = 10) {
        const embedding = await this.embeddings.embed(sequence);
        return this.db.search(embedding.vector, { k });
    }
    async searchByText(query, k = 10) {
        const embedding = await this.embeddings.embed(query);
        return this.db.search(embedding.vector, { k });
    }
}
exports.GenomicVectorDB = GenomicVectorDB;
exports.VERSION = '1.0.0';
//# sourceMappingURL=index.js.map