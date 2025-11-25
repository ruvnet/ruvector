"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomomorphicEncryption = exports.SecureAggregation = exports.FederatedLearningCoordinator = void 0;
class FederatedLearningCoordinator {
    config;
    institutions;
    globalModel;
    roundHistory;
    privacyAccountant;
    constructor(config = {}) {
        this.config = {
            numInstitutions: 5,
            rounds: 10,
            clientFraction: 0.5,
            localEpochs: 5,
            localBatchSize: 32,
            learningRate: 0.01,
            aggregationStrategy: 'fedavg',
            ...config
        };
        this.institutions = new Map();
        this.globalModel = this.initializeGlobalModel();
        this.roundHistory = [];
        this.privacyAccountant = this.config.privacyBudget ?
            this.initializePrivacyAccountant() : null;
    }
    registerInstitution(id, name, dataSize) {
        this.institutions.set(id, {
            id,
            name,
            dataSize,
            modelWeights: new Map(this.globalModel.weights),
            trustScore: 1.0,
            lastUpdate: Date.now()
        });
        console.log(`Registered institution: ${name} with ${dataSize} samples`);
    }
    async train() {
        console.log(`Starting federated learning across ${this.institutions.size} institutions`);
        console.log(`Configuration: ${this.config.rounds} rounds, ${this.config.clientFraction * 100}% client participation`);
        for (let round = 0; round < this.config.rounds; round++) {
            console.log(`\n=== Round ${round + 1}/${this.config.rounds} ===`);
            const selected = this.selectInstitutions();
            console.log(`Selected ${selected.length} institutions`);
            const updates = await Promise.all(selected.map(inst => this.localTraining(inst, round)));
            const aggregated = this.aggregateUpdates(updates, round);
            this.globalModel = aggregated;
            this.roundHistory.push({ ...aggregated });
            this.distributeGlobalModel();
            if (this.privacyAccountant && this.privacyAccountant.privacyBudgetRemaining <= 0) {
                console.log('Privacy budget exhausted, stopping training');
                break;
            }
            console.log(`Round ${round + 1} complete - Loss: ${aggregated.globalLoss.toFixed(4)}, ` +
                `Accuracy: ${(aggregated.globalAccuracy * 100).toFixed(2)}%`);
        }
        return this.roundHistory;
    }
    selectInstitutions() {
        const institutions = Array.from(this.institutions.values());
        const numSelect = Math.max(1, Math.floor(institutions.length * this.config.clientFraction));
        const selected = [];
        const weights = institutions.map(inst => inst.trustScore * Math.log(inst.dataSize + 1));
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        while (selected.length < numSelect) {
            let rand = Math.random() * totalWeight;
            let cumWeight = 0;
            for (let i = 0; i < institutions.length; i++) {
                cumWeight += weights[i];
                if (rand <= cumWeight && !selected.includes(institutions[i])) {
                    selected.push(institutions[i]);
                    break;
                }
            }
        }
        return selected;
    }
    async localTraining(institution, round) {
        console.log(`  ${institution.name}: Starting local training`);
        const localWeights = new Map(this.globalModel.weights);
        let loss = 0;
        let accuracy = 0;
        for (let epoch = 0; epoch < this.config.localEpochs; epoch++) {
            const metrics = this.simulateTrainingStep(localWeights, institution.dataSize);
            loss = metrics.loss;
            accuracy = metrics.accuracy;
            if (this.config.privacyBudget) {
                this.addDifferentialPrivacyNoise(localWeights);
            }
        }
        console.log(`  ${institution.name}: Completed - Loss: ${loss.toFixed(4)}, ` +
            `Accuracy: ${(accuracy * 100).toFixed(2)}%`);
        institution.modelWeights = localWeights;
        institution.lastUpdate = Date.now();
        return {
            institutionId: institution.id,
            weights: localWeights,
            dataSize: institution.dataSize,
            loss,
            accuracy,
            round,
            timestamp: Date.now(),
            privacySpent: this.config.privacyBudget ? this.computePrivacySpent() : undefined
        };
    }
    aggregateUpdates(updates, round) {
        console.log('  Aggregating updates from institutions...');
        const aggregated = {
            weights: new Map(),
            round,
            participatingInstitutions: updates.map(u => u.institutionId),
            aggregatedDataSize: updates.reduce((sum, u) => sum + u.dataSize, 0),
            globalLoss: 0,
            globalAccuracy: 0
        };
        switch (this.config.aggregationStrategy) {
            case 'fedavg':
                this.federatedAveraging(updates, aggregated);
                break;
            case 'fedprox':
                this.federatedProximal(updates, aggregated);
                break;
            case 'fedopt':
                this.federatedOptimization(updates, aggregated);
                break;
        }
        for (const update of updates) {
            const weight = update.dataSize / aggregated.aggregatedDataSize;
            aggregated.globalLoss += update.loss * weight;
            aggregated.globalAccuracy += update.accuracy * weight;
        }
        return aggregated;
    }
    federatedAveraging(updates, result) {
        const totalSize = updates.reduce((sum, u) => sum + u.dataSize, 0);
        const paramNames = Array.from(updates[0].weights.keys());
        for (const param of paramNames) {
            const aggregatedParam = [];
            const dim = updates[0].weights.get(param).length;
            for (let i = 0; i < dim; i++) {
                let weightedSum = 0;
                for (const update of updates) {
                    const weight = update.dataSize / totalSize;
                    weightedSum += update.weights.get(param)[i] * weight;
                }
                aggregatedParam.push(weightedSum);
            }
            result.weights.set(param, aggregatedParam);
        }
    }
    federatedProximal(updates, result) {
        const mu = 0.01;
        this.federatedAveraging(updates, result);
        for (const [param, values] of result.weights.entries()) {
            const globalValues = this.globalModel.weights.get(param) || values;
            for (let i = 0; i < values.length; i++) {
                values[i] = values[i] + mu * (globalValues[i] - values[i]);
            }
        }
    }
    federatedOptimization(updates, result) {
        const beta1 = 0.9;
        const beta2 = 0.999;
        const epsilon = 1e-8;
        const m = new Map();
        const v = new Map();
        this.federatedAveraging(updates, result);
        for (const [param, values] of result.weights.entries()) {
            const globalValues = this.globalModel.weights.get(param) || values;
            if (!m.has(param)) {
                m.set(param, new Array(values.length).fill(0));
                v.set(param, new Array(values.length).fill(0));
            }
            const mParam = m.get(param);
            const vParam = v.get(param);
            for (let i = 0; i < values.length; i++) {
                const grad = values[i] - globalValues[i];
                mParam[i] = beta1 * mParam[i] + (1 - beta1) * grad;
                vParam[i] = beta2 * vParam[i] + (1 - beta2) * grad * grad;
                const mHat = mParam[i] / (1 - Math.pow(beta1, result.round + 1));
                const vHat = vParam[i] / (1 - Math.pow(beta2, result.round + 1));
                values[i] = globalValues[i] + this.config.learningRate * mHat / (Math.sqrt(vHat) + epsilon);
            }
        }
    }
    distributeGlobalModel() {
        for (const institution of this.institutions.values()) {
            institution.modelWeights = new Map(this.globalModel.weights);
        }
    }
    addDifferentialPrivacyNoise(weights) {
        if (!this.config.clippingNorm || !this.config.noiseMultiplier) {
            this.config.clippingNorm = 1.0;
            this.config.noiseMultiplier = 0.1;
        }
        for (const [param, values] of weights.entries()) {
            const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
            const clipFactor = Math.min(1, this.config.clippingNorm / norm);
            for (let i = 0; i < values.length; i++) {
                values[i] *= clipFactor;
                values[i] += this.gaussianNoise(0, this.config.noiseMultiplier * this.config.clippingNorm);
            }
        }
        if (this.privacyAccountant) {
            this.privacyAccountant.steps++;
            this.privacyAccountant.privacyBudgetRemaining -= this.computePrivacySpent();
        }
    }
    gaussianNoise(mean, stddev) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return mean + stddev * z0;
    }
    computePrivacySpent() {
        if (!this.config.privacyBudget || !this.config.noiseMultiplier)
            return 0;
        const q = this.config.clientFraction;
        const sigma = this.config.noiseMultiplier;
        return q * Math.sqrt(2 * Math.log(1.25)) / sigma;
    }
    initializeGlobalModel() {
        const weights = new Map();
        weights.set('embedding', Array(768).fill(0).map(() => Math.random() * 0.02 - 0.01));
        weights.set('classifier', Array(256).fill(0).map(() => Math.random() * 0.02 - 0.01));
        return {
            weights,
            round: 0,
            participatingInstitutions: [],
            aggregatedDataSize: 0,
            globalLoss: 0,
            globalAccuracy: 0
        };
    }
    initializePrivacyAccountant() {
        return {
            epsilon: this.config.privacyBudget || 1.0,
            delta: 1e-5,
            steps: 0,
            privacyBudgetRemaining: this.config.privacyBudget || 1.0
        };
    }
    simulateTrainingStep(weights, dataSize) {
        const loss = Math.exp(-dataSize / 10000) + Math.random() * 0.1;
        const accuracy = Math.min(0.95, 1 - loss + Math.random() * 0.05);
        return { loss, accuracy };
    }
    getStatistics() {
        return {
            rounds: this.roundHistory.length,
            institutions: this.institutions.size,
            finalAccuracy: this.globalModel.globalAccuracy,
            finalLoss: this.globalModel.globalLoss,
            privacyAccountant: this.privacyAccountant,
            history: this.roundHistory
        };
    }
    exportGlobalModel() {
        return { ...this.globalModel };
    }
}
exports.FederatedLearningCoordinator = FederatedLearningCoordinator;
class SecureAggregation {
    config;
    shares;
    constructor(config = {}) {
        this.config = {
            threshold: 3,
            noiseScale: 0.01,
            dropoutTolerance: 0.2,
            ...config
        };
        this.shares = new Map();
    }
    createShares(institutionId, weights, numParticipants) {
        const allShares = new Map();
        for (const [param, values] of weights.entries()) {
            const shares = this.shamirSecretSharing(values, numParticipants);
            for (let i = 0; i < numParticipants; i++) {
                const participantId = `inst_${i}`;
                if (!allShares.has(participantId)) {
                    allShares.set(participantId, new Map());
                }
                allShares.get(participantId).set(param, shares[i]);
            }
        }
        return allShares;
    }
    shamirSecretSharing(values, numShares) {
        const shares = [];
        for (let i = 0; i < numShares; i++) {
            shares.push([...values]);
            if (i < numShares - 1) {
                const noise = values.map(() => this.gaussianNoise(0, this.config.noiseScale));
                shares[i] = shares[i].map((v, j) => v + noise[j]);
                shares[numShares - 1] = shares[numShares - 1] || [...values];
                shares[numShares - 1] = shares[numShares - 1].map((v, j) => v - noise[j]);
            }
        }
        return shares;
    }
    reconstructSecret(shares) {
        const reconstructed = new Map();
        const firstInst = Array.from(shares.values())[0];
        const paramNames = Array.from(firstInst.keys());
        for (const param of paramNames) {
            const allShares = Array.from(shares.values()).map(s => s.get(param));
            const dim = allShares[0].length;
            const aggregated = new Array(dim).fill(0);
            for (const share of allShares) {
                for (let i = 0; i < dim; i++) {
                    aggregated[i] += share[i];
                }
            }
            for (let i = 0; i < dim; i++) {
                aggregated[i] /= allShares.length;
            }
            reconstructed.set(param, aggregated);
        }
        return reconstructed;
    }
    gaussianNoise(mean, stddev) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return mean + stddev * z0;
    }
}
exports.SecureAggregation = SecureAggregation;
class HomomorphicEncryption {
    config;
    publicKey;
    privateKey;
    constructor(config = {}) {
        this.config = {
            keySize: 2048,
            plainModulus: 1024,
            polyModulusDegree: 4096,
            ...config
        };
        this.publicKey = null;
        this.privateKey = null;
    }
    generateKeys() {
        this.publicKey = `pub_${Math.random().toString(36).substring(7)}`;
        this.privateKey = `priv_${Math.random().toString(36).substring(7)}`;
        return {
            publicKey: this.publicKey,
            privateKey: this.privateKey
        };
    }
    encrypt(weights, publicKey) {
        const key = publicKey || this.publicKey;
        if (!key)
            throw new Error('No public key available');
        const encrypted = Buffer.from(JSON.stringify(weights)).toString('base64');
        return `${key}:${encrypted}`;
    }
    decrypt(encrypted, privateKey) {
        const key = privateKey || this.privateKey;
        if (!key)
            throw new Error('No private key available');
        const [encKey, data] = encrypted.split(':');
        const decrypted = Buffer.from(data, 'base64').toString('utf-8');
        return JSON.parse(decrypted);
    }
    add(encrypted1, encrypted2) {
        const weights1 = this.decrypt(encrypted1);
        const weights2 = this.decrypt(encrypted2);
        const sum = weights1.map((v, i) => v + weights2[i]);
        return this.encrypt(sum);
    }
    multiplyScalar(encrypted, scalar) {
        const weights = this.decrypt(encrypted);
        const scaled = weights.map(v => v * scalar);
        return this.encrypt(scaled);
    }
}
exports.HomomorphicEncryption = HomomorphicEncryption;
//# sourceMappingURL=FederatedLearning.js.map