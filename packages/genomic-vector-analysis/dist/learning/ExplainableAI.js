"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CounterfactualGenerator = exports.FeatureImportanceAnalyzer = exports.AttentionAnalyzer = exports.SHAPExplainer = void 0;
class SHAPExplainer {
    backgroundSamples;
    featureNames;
    baseValue;
    constructor(featureNames) {
        this.backgroundSamples = new Map();
        this.featureNames = featureNames;
        this.baseValue = 0;
    }
    fit(variants) {
        console.log(`Fitting SHAP explainer on ${variants.length} background samples`);
        for (const variant of variants) {
            const featureVector = this.featureNames.map(name => variant.features[name] || 0);
            this.backgroundSamples.set(JSON.stringify(variant.features), featureVector);
        }
        this.baseValue = variants.reduce((sum, v) => sum + v.priority, 0) / variants.length;
        console.log(`Base value: ${this.baseValue.toFixed(4)}`);
    }
    explain(variant, predictFunction) {
        const shapValues = [];
        const prediction = predictFunction(variant.features);
        for (const feature of this.featureNames) {
            const shapValue = this.computeKernelSHAP(feature, variant.features, predictFunction);
            shapValues.push({
                feature,
                value: variant.features[feature] || 0,
                baseValue: this.baseValue,
                shapValue,
                contribution: shapValue / Math.abs(prediction - this.baseValue) || 0
            });
        }
        shapValues.sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue));
        return shapValues;
    }
    computeKernelSHAP(feature, features, predictFunction) {
        const numSamples = Math.min(100, this.backgroundSamples.size);
        const backgroundArray = Array.from(this.backgroundSamples.keys()).slice(0, numSamples);
        let shapValue = 0;
        let weight = 0;
        for (let i = 0; i < numSamples; i++) {
            const background = JSON.parse(backgroundArray[i]);
            const withFeature = { ...background, [feature]: features[feature] };
            const predWith = predictFunction(withFeature);
            const predWithout = predictFunction(background);
            const coalitionWeight = this.shapleyKernelWeight(1, this.featureNames.length);
            shapValue += coalitionWeight * (predWith - predWithout);
            weight += coalitionWeight;
        }
        return weight > 0 ? shapValue / weight : 0;
    }
    shapleyKernelWeight(s, M) {
        if (s === 0 || s === M)
            return 1000;
        return (M - 1) / (this.binomial(M, s) * s * (M - s));
    }
    binomial(n, k) {
        if (k === 0 || k === n)
            return 1;
        if (k === 1 || k === n - 1)
            return n;
        let result = 1;
        for (let i = 0; i < k; i++) {
            result *= (n - i) / (i + 1);
        }
        return Math.round(result);
    }
    generateWaterfallPlot(shapValues) {
        const features = shapValues.map(s => s.feature);
        const values = shapValues.map(s => s.shapValue);
        const cumulative = [this.baseValue];
        for (const value of values) {
            cumulative.push(cumulative[cumulative.length - 1] + value);
        }
        return { features, values, cumulative };
    }
    generateForcePlot(shapValues) {
        const prediction = this.baseValue + shapValues.reduce((sum, s) => sum + s.shapValue, 0);
        const positiveContributions = shapValues.filter(s => s.shapValue > 0);
        const negativeContributions = shapValues.filter(s => s.shapValue < 0);
        return {
            baseValue: this.baseValue,
            prediction,
            positiveContributions,
            negativeContributions
        };
    }
}
exports.SHAPExplainer = SHAPExplainer;
class AttentionAnalyzer {
    numLayers;
    numHeads;
    constructor(numLayers = 12, numHeads = 12) {
        this.numLayers = numLayers;
        this.numHeads = numHeads;
    }
    extractAttentionWeights(sequence, modelOutput) {
        const tokens = this.tokenize(sequence);
        const weights = [];
        for (let layer = 0; layer < this.numLayers; layer++) {
            for (let head = 0; head < this.numHeads; head++) {
                for (let tokenIdx = 0; tokenIdx < tokens.length; tokenIdx++) {
                    const attentionScores = modelOutput.attentionWeights[layer][head] || [];
                    const topAttended = this.getTopAttendedTokens(attentionScores, tokens, 5);
                    weights.push({
                        layer,
                        head,
                        tokenIndex: tokenIdx,
                        attentionScores,
                        topAttendedTokens: topAttended
                    });
                }
            }
        }
        return weights;
    }
    analyzeGenomicAttention(sequence, attentionWeights) {
        const tokens = this.tokenize(sequence);
        const positionAttention = new Map();
        for (const weight of attentionWeights) {
            if (!positionAttention.has(weight.tokenIndex)) {
                positionAttention.set(weight.tokenIndex, []);
            }
            const avgScore = weight.attentionScores.reduce((a, b) => a + b, 0) /
                weight.attentionScores.length;
            positionAttention.get(weight.tokenIndex).push(avgScore);
        }
        const results = [];
        for (const [position, scores] of positionAttention.entries()) {
            const avgAttention = scores.reduce((a, b) => a + b, 0) / scores.length;
            const region = tokens[position] || '';
            results.push({
                position,
                region,
                avgAttention,
                importance: this.categorizeImportance(avgAttention)
            });
        }
        results.sort((a, b) => b.avgAttention - a.avgAttention);
        return results;
    }
    generateAttentionHeatmap(attentionWeights, layer, head) {
        const filtered = attentionWeights.filter(w => w.layer === layer && w.head === head);
        const size = Math.max(...filtered.map(w => w.attentionScores.length));
        const heatmap = Array(size).fill(0).map(() => Array(size).fill(0));
        for (const weight of filtered) {
            for (let i = 0; i < weight.attentionScores.length; i++) {
                heatmap[weight.tokenIndex][i] = weight.attentionScores[i];
            }
        }
        return heatmap;
    }
    tokenize(sequence) {
        const k = 6;
        const tokens = [];
        for (let i = 0; i <= sequence.length - k; i++) {
            tokens.push(sequence.substring(i, i + k));
        }
        return tokens;
    }
    getTopAttendedTokens(scores, tokens, topK) {
        const indexed = scores.map((score, index) => ({
            index,
            token: tokens[index] || '',
            score
        }));
        indexed.sort((a, b) => b.score - a.score);
        return indexed.slice(0, topK);
    }
    categorizeImportance(attention) {
        if (attention > 0.1)
            return 'high';
        if (attention > 0.05)
            return 'medium';
        return 'low';
    }
}
exports.AttentionAnalyzer = AttentionAnalyzer;
class FeatureImportanceAnalyzer {
    importanceScores;
    constructor() {
        this.importanceScores = new Map();
    }
    computePermutationImportance(data, predictFunction, nRepeats = 10) {
        console.log('Computing permutation importance...');
        const baselineAccuracy = this.evaluateAccuracy(data, predictFunction);
        const featureNames = Object.keys(data[0].features);
        const importances = [];
        for (const feature of featureNames) {
            let totalDrop = 0;
            for (let repeat = 0; repeat < nRepeats; repeat++) {
                const permuted = this.permuteFeature(data, feature);
                const permutedAccuracy = this.evaluateAccuracy(permuted, predictFunction);
                totalDrop += baselineAccuracy - permutedAccuracy;
            }
            const importance = totalDrop / nRepeats;
            this.importanceScores.set(feature, importance);
        }
        for (const [feature, importance] of this.importanceScores.entries()) {
            importances.push({
                feature,
                importance,
                rank: 0,
                category: this.categorizeFeature(feature)
            });
        }
        importances.sort((a, b) => b.importance - a.importance);
        importances.forEach((fi, index) => {
            fi.rank = index + 1;
        });
        return importances;
    }
    computeLocalImportance(instance, predictFunction, nSamples = 1000) {
        const perturbations = this.generatePerturbations(instance, nSamples);
        const predictions = perturbations.map(p => predictFunction(p.features));
        const weights = this.fitLinearModel(perturbations, predictions);
        const importances = [];
        for (const [feature, weight] of weights.entries()) {
            importances.push({
                feature,
                importance: Math.abs(weight),
                rank: 0,
                category: this.categorizeFeature(feature)
            });
        }
        importances.sort((a, b) => b.importance - a.importance);
        importances.forEach((fi, index) => {
            fi.rank = index + 1;
        });
        return importances;
    }
    evaluateAccuracy(data, predictFunction) {
        let correct = 0;
        for (const sample of data) {
            if (predictFunction(sample.features) === sample.label) {
                correct++;
            }
        }
        return correct / data.length;
    }
    permuteFeature(data, feature) {
        const values = data.map(d => d.features[feature]);
        for (let i = values.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [values[i], values[j]] = [values[j], values[i]];
        }
        return data.map((d, i) => ({
            features: { ...d.features, [feature]: values[i] },
            label: d.label
        }));
    }
    generatePerturbations(instance, nSamples) {
        const perturbations = [];
        for (let i = 0; i < nSamples; i++) {
            const perturbed = {};
            let distance = 0;
            for (const [feature, value] of Object.entries(instance)) {
                const noise = this.gaussianNoise(0, 0.1 * Math.abs(value));
                perturbed[feature] = value + noise;
                distance += noise * noise;
            }
            perturbations.push({
                features: perturbed,
                distance: Math.sqrt(distance)
            });
        }
        return perturbations;
    }
    fitLinearModel(samples, predictions) {
        const weights = new Map();
        const features = Object.keys(samples[0].features);
        for (const feature of features) {
            let numerator = 0;
            let denominator = 0;
            for (let i = 0; i < samples.length; i++) {
                const kernelWeight = Math.exp(-samples[i].distance);
                numerator += kernelWeight * samples[i].features[feature] * predictions[i];
                denominator += kernelWeight * samples[i].features[feature] ** 2;
            }
            weights.set(feature, denominator > 0 ? numerator / denominator : 0);
        }
        return weights;
    }
    gaussianNoise(mean, stddev) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return mean + stddev * z0;
    }
    categorizeFeature(feature) {
        if (feature.includes('variant') || feature.includes('gene') || feature.includes('mutation')) {
            return 'genomic';
        }
        else if (feature.includes('phenotype') || feature.includes('diagnosis')) {
            return 'clinical';
        }
        else if (feature.includes('age') || feature.includes('sex')) {
            return 'demographic';
        }
        else {
            return 'embedding';
        }
    }
}
exports.FeatureImportanceAnalyzer = FeatureImportanceAnalyzer;
class CounterfactualGenerator {
    featureRanges;
    constructor() {
        this.featureRanges = new Map();
    }
    learn(data) {
        const features = Object.keys(data[0]);
        for (const feature of features) {
            const values = data.map(d => d[feature]);
            this.featureRanges.set(feature, {
                min: Math.min(...values),
                max: Math.max(...values)
            });
        }
    }
    generate(original, targetPrediction, predictFunction, maxIterations = 1000) {
        let counterfactual = { ...original };
        let bestCounterfactual = { ...original };
        let bestDistance = Infinity;
        for (let iter = 0; iter < maxIterations; iter++) {
            const feature = this.selectFeatureToModify(original);
            counterfactual = this.modifyFeature(counterfactual, feature);
            const prediction = predictFunction(counterfactual);
            if (prediction === targetPrediction) {
                const distance = this.computeDistance(original, counterfactual);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestCounterfactual = { ...counterfactual };
                }
            }
        }
        if (bestDistance < Infinity) {
            return this.createExplanation(original, bestCounterfactual, bestDistance);
        }
        return null;
    }
    selectFeatureToModify(instance) {
        const features = Object.keys(instance);
        return features[Math.floor(Math.random() * features.length)];
    }
    modifyFeature(instance, feature) {
        const modified = { ...instance };
        const range = this.featureRanges.get(feature);
        if (range) {
            modified[feature] = range.min + Math.random() * (range.max - range.min);
        }
        else {
            modified[feature] *= (1 + (Math.random() - 0.5) * 0.1);
        }
        return modified;
    }
    computeDistance(original, counterfactual) {
        let distance = 0;
        for (const feature of Object.keys(original)) {
            const diff = Number(original[feature]) - Number(counterfactual[feature]);
            distance += diff * diff;
        }
        return Math.sqrt(distance);
    }
    createExplanation(original, counterfactual, distance) {
        const changes = [];
        for (const feature of Object.keys(original)) {
            if (original[feature] !== counterfactual[feature]) {
                const impact = Math.abs(Number(original[feature]) - Number(counterfactual[feature]));
                changes.push({
                    feature,
                    originalValue: original[feature],
                    counterfactualValue: counterfactual[feature],
                    impact
                });
            }
        }
        changes.sort((a, b) => b.impact - a.impact);
        return {
            original,
            counterfactual,
            changes,
            distance,
            validity: 1.0
        };
    }
}
exports.CounterfactualGenerator = CounterfactualGenerator;
//# sourceMappingURL=ExplainableAI.js.map