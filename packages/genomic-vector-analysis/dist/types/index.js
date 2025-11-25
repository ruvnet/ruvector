"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemas = exports.EmbeddingModelSchema = exports.QuantizationSchema = exports.VectorMetricSchema = void 0;
const zod_1 = require("zod");
exports.VectorMetricSchema = zod_1.z.enum(['cosine', 'euclidean', 'hamming', 'manhattan', 'dot']);
exports.QuantizationSchema = zod_1.z.enum(['none', 'scalar', 'product', 'binary']);
exports.EmbeddingModelSchema = zod_1.z.enum([
    'kmer',
    'dna-bert',
    'nucleotide-transformer',
    'esm2',
    'protbert',
    'phenotype-bert',
    'custom'
]);
exports.schemas = {
    VectorMetric: exports.VectorMetricSchema,
    Quantization: exports.QuantizationSchema,
    EmbeddingModel: exports.EmbeddingModelSchema,
};
//# sourceMappingURL=index.js.map