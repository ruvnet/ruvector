"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExperienceReplayBuffer = exports.MultiArmedBandit = exports.PolicyGradientOptimizer = exports.QLearningOptimizer = void 0;
class QLearningOptimizer {
    config;
    qTable;
    replayBuffer;
    currentExplorationRate;
    stepCount;
    constructor(config = {}) {
        this.config = {
            learningRate: 0.1,
            discountFactor: 0.95,
            explorationRate: 1.0,
            explorationDecay: 0.995,
            minExplorationRate: 0.01,
            replayBufferSize: 10000,
            batchSize: 32,
            updateFrequency: 10,
            ...config
        };
        this.qTable = new Map();
        this.replayBuffer = [];
        this.currentExplorationRate = this.config.explorationRate;
        this.stepCount = 0;
    }
    selectAction(state) {
        if (Math.random() < this.currentExplorationRate) {
            return this.getRandomAction();
        }
        return this.getBestAction(state);
    }
    update(experience) {
        this.replayBuffer.push(experience);
        if (this.replayBuffer.length > this.config.replayBufferSize) {
            this.replayBuffer.shift();
        }
        this.stepCount++;
        if (this.stepCount % this.config.updateFrequency === 0) {
            this.batchUpdate();
        }
        this.currentExplorationRate = Math.max(this.config.minExplorationRate, this.currentExplorationRate * this.config.explorationDecay);
    }
    batchUpdate() {
        const batchSize = Math.min(this.config.batchSize, this.replayBuffer.length);
        const batch = this.sampleExperiences(batchSize);
        for (const experience of batch) {
            const stateKey = this.serializeState(experience.state);
            const actionKey = this.serializeAction(experience.action);
            if (!this.qTable.has(stateKey)) {
                this.qTable.set(stateKey, new Map());
            }
            const stateActions = this.qTable.get(stateKey);
            const currentQ = stateActions.get(actionKey) || 0;
            let maxNextQ = 0;
            if (!experience.done) {
                const nextStateKey = this.serializeState(experience.nextState);
                const nextStateActions = this.qTable.get(nextStateKey);
                if (nextStateActions) {
                    maxNextQ = Math.max(...Array.from(nextStateActions.values()));
                }
            }
            const tdTarget = experience.reward + this.config.discountFactor * maxNextQ;
            const newQ = currentQ + this.config.learningRate * (tdTarget - currentQ);
            stateActions.set(actionKey, newQ);
        }
    }
    sampleExperiences(count) {
        const sampled = [];
        const indices = new Set();
        while (indices.size < count) {
            indices.add(Math.floor(Math.random() * this.replayBuffer.length));
        }
        for (const idx of indices) {
            sampled.push(this.replayBuffer[idx]);
        }
        return sampled;
    }
    getBestAction(state) {
        const stateKey = this.serializeState(state);
        const stateActions = this.qTable.get(stateKey);
        if (!stateActions || stateActions.size === 0) {
            return this.getRandomAction();
        }
        let bestAction = null;
        let bestValue = -Infinity;
        for (const [action, value] of stateActions.entries()) {
            if (value > bestValue) {
                bestValue = value;
                bestAction = action;
            }
        }
        return bestAction ? this.deserializeAction(bestAction) : this.getRandomAction();
    }
    getRandomAction() {
        const actionTypes = [
            'adjust_ef_search',
            'adjust_M',
            'adjust_ef_construction',
            'change_quantization'
        ];
        const type = actionTypes[Math.floor(Math.random() * actionTypes.length)];
        switch (type) {
            case 'adjust_ef_search':
                return { type, value: Math.floor(Math.random() * 200) + 50 };
            case 'adjust_M':
                return { type, value: Math.floor(Math.random() * 32) + 8 };
            case 'adjust_ef_construction':
                return { type, value: Math.floor(Math.random() * 300) + 100 };
            case 'change_quantization':
                return { type, value: ['none', 'scalar', 'product'][Math.floor(Math.random() * 3)] };
            default:
                return { type: 'adjust_ef_search', value: 100 };
        }
    }
    serializeState(state) {
        return JSON.stringify({
            qc: Math.round(state.queryComplexity * 10) / 10,
            ds: Math.round(state.datasetSize / 1000),
            dim: state.dimensionality,
            ef: state.currentIndexParams.efSearch,
            m: state.currentIndexParams.M
        });
    }
    serializeAction(action) {
        return `${action.type}:${action.value}`;
    }
    deserializeAction(actionStr) {
        const [type, valueStr] = actionStr.split(':');
        const value = isNaN(Number(valueStr)) ? valueStr : Number(valueStr);
        return { type: type, value };
    }
    getStatistics() {
        return {
            stateCount: this.qTable.size,
            totalQValues: Array.from(this.qTable.values()).reduce((sum, actions) => sum + actions.size, 0),
            replayBufferSize: this.replayBuffer.length,
            explorationRate: this.currentExplorationRate,
            stepCount: this.stepCount
        };
    }
    exportQTable() {
        const values = [];
        for (const [state, actions] of this.qTable.entries()) {
            for (const [action, value] of actions.entries()) {
                values.push({ state, action, value });
            }
        }
        return values;
    }
    importQTable(values) {
        this.qTable.clear();
        for (const { state, action, value } of values) {
            if (!this.qTable.has(state)) {
                this.qTable.set(state, new Map());
            }
            this.qTable.get(state).set(action, value);
        }
    }
}
exports.QLearningOptimizer = QLearningOptimizer;
class PolicyGradientOptimizer {
    config;
    policy;
    trajectory;
    baselineValue;
    constructor(config = {}) {
        this.config = {
            learningRate: 0.01,
            gamma: 0.99,
            entropy: 0.01,
            ...config
        };
        this.policy = new Map();
        this.trajectory = [];
        this.baselineValue = 0;
    }
    sampleAction(state) {
        const stateKey = this.serializeState(state);
        const actionProbs = this.getActionProbabilities(stateKey);
        const rand = Math.random();
        let cumProb = 0;
        for (const [action, prob] of actionProbs.entries()) {
            cumProb += prob;
            if (rand <= cumProb) {
                return this.deserializeAction(action);
            }
        }
        return this.getRandomAction();
    }
    updatePolicy(experience) {
        this.trajectory.push(experience);
        if (experience.done) {
            this.performPolicyUpdate();
            this.trajectory = [];
        }
    }
    performPolicyUpdate() {
        const returns = this.calculateReturns();
        const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        this.baselineValue = 0.9 * this.baselineValue + 0.1 * meanReturn;
        for (let t = 0; t < this.trajectory.length; t++) {
            const { state, action } = this.trajectory[t];
            const advantage = returns[t] - this.baselineValue;
            this.updatePolicyParams(state, action, advantage);
        }
    }
    calculateReturns() {
        const returns = [];
        let G = 0;
        for (let t = this.trajectory.length - 1; t >= 0; t--) {
            G = this.trajectory[t].reward + this.config.gamma * G;
            returns.unshift(G);
        }
        return returns;
    }
    updatePolicyParams(state, action, advantage) {
        const stateKey = this.serializeState(state);
        const actionKey = this.serializeAction(action);
        if (!this.policy.has(stateKey)) {
            this.policy.set(stateKey, new Map());
        }
        const statePolicy = this.policy.get(stateKey);
        const currentLogit = statePolicy.get(actionKey) || 0;
        const newLogit = currentLogit + this.config.learningRate * advantage;
        statePolicy.set(actionKey, newLogit);
        this.applyEntropyRegularization(stateKey);
    }
    applyEntropyRegularization(stateKey) {
        const statePolicy = this.policy.get(stateKey);
        if (!statePolicy)
            return;
        const logits = Array.from(statePolicy.values());
        const entropy = this.calculateEntropy(logits);
        if (entropy < this.config.entropy) {
            for (const [action, logit] of statePolicy.entries()) {
                statePolicy.set(action, logit * 0.95);
            }
        }
    }
    calculateEntropy(logits) {
        const probs = this.softmax(logits);
        let entropy = 0;
        for (const p of probs) {
            if (p > 0) {
                entropy -= p * Math.log(p);
            }
        }
        return entropy;
    }
    getActionProbabilities(stateKey) {
        const statePolicy = this.policy.get(stateKey);
        const probs = new Map();
        if (!statePolicy || statePolicy.size === 0) {
            const actions = this.getAllPossibleActions();
            const uniformProb = 1.0 / actions.length;
            for (const action of actions) {
                probs.set(this.serializeAction(action), uniformProb);
            }
            return probs;
        }
        const logits = Array.from(statePolicy.values());
        const probValues = this.softmax(logits);
        const actions = Array.from(statePolicy.keys());
        for (let i = 0; i < actions.length; i++) {
            probs.set(actions[i], probValues[i]);
        }
        return probs;
    }
    softmax(logits) {
        const max = Math.max(...logits);
        const exps = logits.map(l => Math.exp(l - max));
        const sum = exps.reduce((a, b) => a + b, 0);
        return exps.map(e => e / sum);
    }
    getAllPossibleActions() {
        return [
            { type: 'adjust_ef_search', value: 100 },
            { type: 'adjust_M', value: 16 },
            { type: 'adjust_ef_construction', value: 200 }
        ];
    }
    serializeState(state) {
        return JSON.stringify({
            qc: state.queryComplexity,
            ds: state.datasetSize,
            dim: state.dimensionality
        });
    }
    serializeAction(action) {
        return `${action.type}:${action.value}`;
    }
    deserializeAction(actionStr) {
        const [type, valueStr] = actionStr.split(':');
        const value = isNaN(Number(valueStr)) ? valueStr : Number(valueStr);
        return { type: type, value };
    }
    getRandomAction() {
        const actions = this.getAllPossibleActions();
        return actions[Math.floor(Math.random() * actions.length)];
    }
}
exports.PolicyGradientOptimizer = PolicyGradientOptimizer;
class MultiArmedBandit {
    arms;
    totalPulls;
    ucbConstant;
    constructor(models, ucbConstant = 2.0) {
        this.arms = new Map();
        this.totalPulls = 0;
        this.ucbConstant = ucbConstant;
        for (const model of models) {
            this.arms.set(model, {
                model,
                pulls: 0,
                totalReward: 0,
                meanReward: 0,
                confidence: Infinity
            });
        }
    }
    selectModel() {
        for (const arm of this.arms.values()) {
            if (arm.pulls === 0) {
                return arm.model;
            }
        }
        let bestModel = null;
        let bestUCB = -Infinity;
        for (const arm of this.arms.values()) {
            const ucb = this.calculateUCB(arm);
            if (ucb > bestUCB) {
                bestUCB = ucb;
                bestModel = arm.model;
            }
        }
        return bestModel || 'kmer';
    }
    updateReward(model, reward) {
        const arm = this.arms.get(model);
        if (!arm)
            return;
        arm.pulls++;
        arm.totalReward += reward;
        arm.meanReward = arm.totalReward / arm.pulls;
        this.totalPulls++;
        arm.confidence = this.calculateUCB(arm);
    }
    calculateUCB(arm) {
        if (arm.pulls === 0)
            return Infinity;
        const exploration = Math.sqrt((this.ucbConstant * Math.log(this.totalPulls)) / arm.pulls);
        return arm.meanReward + exploration;
    }
    selectModelThompson() {
        let bestModel = null;
        let bestSample = -Infinity;
        for (const arm of this.arms.values()) {
            const alpha = arm.totalReward + 1;
            const beta = arm.pulls - arm.totalReward + 1;
            const sample = this.betaSample(alpha, beta);
            if (sample > bestSample) {
                bestSample = sample;
                bestModel = arm.model;
            }
        }
        return bestModel || 'kmer';
    }
    betaSample(alpha, beta) {
        const mean = alpha / (alpha + beta);
        const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
        return mean + Math.sqrt(variance) * this.normalSample();
    }
    normalSample() {
        const u1 = Math.random();
        const u2 = Math.random();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }
    getStatistics() {
        const stats = {
            totalPulls: this.totalPulls,
            arms: {}
        };
        for (const [model, arm] of this.arms.entries()) {
            stats.arms[model] = {
                pulls: arm.pulls,
                meanReward: arm.meanReward,
                confidence: arm.confidence,
                regret: this.calculateRegret(arm)
            };
        }
        return stats;
    }
    calculateRegret(arm) {
        const bestMean = Math.max(...Array.from(this.arms.values()).map(a => a.meanReward));
        return (bestMean - arm.meanReward) * arm.pulls;
    }
    reset() {
        for (const arm of this.arms.values()) {
            arm.pulls = 0;
            arm.totalReward = 0;
            arm.meanReward = 0;
            arm.confidence = Infinity;
        }
        this.totalPulls = 0;
    }
}
exports.MultiArmedBandit = MultiArmedBandit;
class ExperienceReplayBuffer {
    buffer;
    maxSize;
    prioritized;
    priorities;
    constructor(maxSize = 10000, prioritized = false) {
        this.buffer = [];
        this.maxSize = maxSize;
        this.prioritized = prioritized;
        this.priorities = [];
    }
    add(experience, priority = 1.0) {
        if (this.buffer.length >= this.maxSize) {
            this.buffer.shift();
            if (this.prioritized) {
                this.priorities.shift();
            }
        }
        this.buffer.push(experience);
        if (this.prioritized) {
            this.priorities.push(priority);
        }
    }
    sample(batchSize) {
        if (this.buffer.length === 0)
            return [];
        const size = Math.min(batchSize, this.buffer.length);
        if (!this.prioritized) {
            return this.uniformSample(size);
        }
        else {
            return this.prioritizedSample(size);
        }
    }
    uniformSample(size) {
        const sampled = [];
        const indices = new Set();
        while (indices.size < size && indices.size < this.buffer.length) {
            indices.add(Math.floor(Math.random() * this.buffer.length));
        }
        for (const idx of indices) {
            sampled.push(this.buffer[idx]);
        }
        return sampled;
    }
    prioritizedSample(size) {
        const sampled = [];
        const totalPriority = this.priorities.reduce((a, b) => a + b, 0);
        for (let i = 0; i < size; i++) {
            let rand = Math.random() * totalPriority;
            let cumProb = 0;
            for (let j = 0; j < this.buffer.length; j++) {
                cumProb += this.priorities[j];
                if (rand <= cumProb) {
                    sampled.push(this.buffer[j]);
                    break;
                }
            }
        }
        return sampled;
    }
    updatePriority(index, priority) {
        if (this.prioritized && index >= 0 && index < this.priorities.length) {
            this.priorities[index] = priority;
        }
    }
    size() {
        return this.buffer.length;
    }
    clear() {
        this.buffer = [];
        this.priorities = [];
    }
}
exports.ExperienceReplayBuffer = ExperienceReplayBuffer;
//# sourceMappingURL=ReinforcementLearning.js.map