"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AgenticSynthAdapter: () => AgenticSynthAdapter,
  IntegratedPsychoSymbolicSystem: () => IntegratedPsychoSymbolicSystem,
  RuvectorAdapter: () => RuvectorAdapter,
  createIntegratedSystem: () => createIntegratedSystem,
  quickStart: () => quickStart
});
module.exports = __toCommonJS(index_exports);
var import_psycho_symbolic_reasoner = require("psycho-symbolic-reasoner");
var import_agentic_synth = require("@ruvector/agentic-synth");

// src/adapters/ruvector-adapter.ts
var LRUCache = class {
  cache;
  maxSize;
  constructor(maxSize = 1e3) {
    this.cache = /* @__PURE__ */ new Map();
    this.maxSize = maxSize;
  }
  get(key) {
    if (!this.cache.has(key)) return void 0;
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }
  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
  clear() {
    this.cache.clear();
  }
  size() {
    return this.cache.size;
  }
};
var RuvectorAdapter = class {
  reasoner;
  vectorDB;
  // Ruvector instance (optional peer dependency)
  config;
  embeddingCache;
  available = false;
  constructor(reasoner, config) {
    this.reasoner = reasoner;
    this.config = config;
    this.embeddingCache = new LRUCache(1e3);
    this.detectAvailability();
  }
  /**
   * Detect if Ruvector is available
   */
  detectAvailability() {
    try {
      const { Ruvector } = require("ruvector");
      this.available = true;
    } catch {
      this.available = false;
      console.warn("Ruvector not available. Install with: npm install ruvector");
    }
  }
  /**
   * Check if adapter is available
   */
  isAvailable() {
    return this.available;
  }
  /**
   * Initialize vector database
   */
  async initialize() {
    if (!this.available) {
      throw new Error("Ruvector is not available");
    }
    const { Ruvector } = require("ruvector");
    this.vectorDB = new Ruvector({
      path: this.config.dbPath,
      dimensions: this.config.embeddingDimensions || 768
    });
    await this.vectorDB.initialize();
  }
  /**
   * Store knowledge graph nodes as vectors
   */
  async storeKnowledgeGraph(knowledgeBase) {
    if (!this.available) {
      console.warn("Ruvector not available, skipping vector storage");
      return;
    }
    const embeddings = [];
    for (const node of knowledgeBase.nodes) {
      const embedding = await this.generateEmbedding(node);
      embeddings.push({
        id: node.id,
        nodeData: node,
        embedding,
        metadata: {
          nodeType: node.type,
          relationships: this.getNodeRelationships(node.id, knowledgeBase.edges),
          properties: node.properties || {}
        }
      });
    }
    for (const emb of embeddings) {
      await this.vectorDB.insert({
        id: emb.id,
        vector: emb.embedding,
        metadata: emb.metadata
      });
    }
  }
  /**
   * Hybrid query: combine symbolic reasoning with vector search
   */
  async hybridQuery(query, options = {}) {
    const symbolicWeight = options.symbolicWeight || 0.6;
    const vectorWeight = options.vectorWeight || 0.4;
    const maxResults = options.maxResults || 10;
    const symbolicResults = await this.reasoner.queryGraph({
      pattern: query,
      maxResults,
      includeInference: true
    });
    if (!this.available) {
      return symbolicResults.nodes.map((node) => ({
        nodes: [node],
        score: symbolicWeight,
        reasoning: {
          symbolicMatch: 1,
          semanticMatch: 0,
          combinedScore: symbolicWeight
        }
      }));
    }
    const queryEmbedding = await this.generateEmbedding({ text: query });
    const vectorResults = await this.vectorDB.search(queryEmbedding, {
      limit: maxResults
    });
    const combinedResults = [];
    const nodeMap = /* @__PURE__ */ new Map();
    for (const node of symbolicResults.nodes) {
      nodeMap.set(node.id, {
        nodes: [node],
        score: 0,
        reasoning: {
          symbolicMatch: 1,
          semanticMatch: 0,
          combinedScore: 0
        }
      });
    }
    for (const result of vectorResults) {
      const nodeId = result.id;
      if (nodeMap.has(nodeId)) {
        const existing = nodeMap.get(nodeId);
        existing.reasoning.semanticMatch = result.score;
        existing.reasoning.combinedScore = symbolicWeight * existing.reasoning.symbolicMatch + vectorWeight * result.score;
      } else {
        nodeMap.set(nodeId, {
          nodes: [result.metadata],
          score: result.score,
          reasoning: {
            symbolicMatch: 0,
            semanticMatch: result.score,
            combinedScore: vectorWeight * result.score
          }
        });
      }
    }
    return Array.from(nodeMap.values()).sort((a, b) => b.reasoning.combinedScore - a.reasoning.combinedScore).slice(0, maxResults);
  }
  /**
   * Store reasoning session in vector memory
   */
  async storeReasoningSession(sessionId, results) {
    if (!this.available) return;
    const embedding = await this.generateEmbedding(results);
    await this.vectorDB.insert({
      id: `session_${sessionId}`,
      vector: embedding,
      metadata: {
        type: "reasoning_session",
        timestamp: Date.now(),
        results
      }
    });
  }
  /**
   * Retrieve similar reasoning sessions
   */
  async findSimilarSessions(query, limit = 5) {
    if (!this.available) return [];
    const embedding = await this.generateEmbedding(query);
    return await this.vectorDB.search(embedding, { limit });
  }
  /**
   * Generate embedding for content (simplified version)
   * In production, use proper embedding model
   */
  async generateEmbedding(content) {
    const text = JSON.stringify(content);
    const cacheKey = text.substring(0, 100);
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey);
    }
    const dims = this.config.embeddingDimensions || 768;
    const embedding = new Array(dims).fill(0);
    for (let i = 0; i < text.length; i++) {
      const idx = text.charCodeAt(i) % dims;
      embedding[idx] += 1;
    }
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    const normalized = embedding.map((val) => val / (magnitude || 1));
    this.embeddingCache.set(cacheKey, normalized);
    return normalized;
  }
  /**
   * Get relationships for a node
   */
  getNodeRelationships(nodeId, edges) {
    return edges.filter((edge) => edge.from === nodeId || edge.to === nodeId).map((edge) => `${edge.from}-${edge.relationship}-${edge.to}`);
  }
  /**
   * Clear embedding cache
   */
  clearCache() {
    this.embeddingCache.clear();
  }
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.embeddingCache.size,
      available: this.available
    };
  }
};

// src/adapters/agentic-synth-adapter.ts
var AgenticSynthAdapter = class {
  reasoner;
  synth;
  generationHistory;
  constructor(reasoner, synth) {
    this.reasoner = reasoner;
    this.synth = synth;
    this.generationHistory = /* @__PURE__ */ new Map();
  }
  /**
   * Generate synthetic data guided by psychological reasoning
   */
  async generateWithPsychoGuidance(type, baseOptions, psychoConfig) {
    console.log("\u{1F9E0} Applying psycho-symbolic reasoning to data generation...");
    const preferenceInsights = await this.analyzePreferences(psychoConfig.userPreferences || []);
    const enhancedSchema = await this.enhanceSchemaWithReasoning(
      baseOptions.schema || {},
      preferenceInsights,
      psychoConfig
    );
    const generationOptions = {
      ...baseOptions,
      schema: enhancedSchema.schema,
      // Add psychological constraints
      constraints: [
        ...baseOptions.constraints || [],
        ...this.createPsychologicalConstraints(psychoConfig)
      ]
    };
    const result = await this.synth.generate(type, generationOptions);
    const validatedData = await this.validatePsychologically(
      result.data,
      psychoConfig
    );
    this.storeGenerationHistory(type, {
      config: psychoConfig,
      schema: enhancedSchema,
      result: validatedData,
      timestamp: Date.now()
    });
    return {
      ...result,
      data: validatedData.data,
      psychoMetrics: {
        preferenceAlignment: enhancedSchema.reasoning.preferenceAlignment,
        sentimentMatch: validatedData.sentimentMatch,
        contextualFit: enhancedSchema.reasoning.contextualFit,
        qualityScore: validatedData.qualityScore
      },
      suggestions: enhancedSchema.suggestions
    };
  }
  /**
   * Analyze user preferences using psycho-symbolic reasoning
   */
  async analyzePreferences(preferences) {
    if (preferences.length === 0) {
      return { preferences: [], patterns: [] };
    }
    const insights = {
      preferences: [],
      patterns: [],
      emotionalTone: "neutral",
      priorityFactors: []
    };
    for (const pref of preferences) {
      const extracted = await this.reasoner.extractPreferences(pref);
      insights.preferences.push(...extracted.preferences);
      const sentiment = await this.reasoner.extractSentiment(pref);
      if (sentiment.primaryEmotion) {
        insights.emotionalTone = sentiment.primaryEmotion;
      }
    }
    insights.patterns = this.identifyPreferencePatterns(insights.preferences);
    insights.priorityFactors = this.extractPriorityFactors(insights.preferences);
    return insights;
  }
  /**
   * Enhance schema with reasoning insights
   */
  async enhanceSchemaWithReasoning(baseSchema, preferenceInsights, psychoConfig) {
    const enhancedSchema = { ...baseSchema };
    const suggestions = [];
    let preferenceAlignment = 0.5;
    let contextualFit = 0.5;
    let psychologicalValidity = 0.5;
    if (preferenceInsights.patterns.length > 0) {
      for (const pattern of preferenceInsights.patterns) {
        if (pattern.type === "likes" && !enhancedSchema[pattern.subject]) {
          enhancedSchema[pattern.subject] = {
            type: "string",
            preferenceWeight: pattern.strength,
            psychoGuidance: `User prefers ${pattern.object}`
          };
          suggestions.push(`Added field '${pattern.subject}' based on user preference`);
          preferenceAlignment += 0.1;
        }
      }
    }
    if (psychoConfig.targetSentiment) {
      enhancedSchema._sentimentConstraint = {
        target: psychoConfig.targetSentiment.score,
        emotion: psychoConfig.targetSentiment.emotion
      };
      psychologicalValidity += 0.2;
    }
    if (psychoConfig.contextualFactors) {
      enhancedSchema._contextualFactors = psychoConfig.contextualFactors;
      contextualFit += 0.3;
    }
    preferenceAlignment = Math.min(1, preferenceAlignment);
    contextualFit = Math.min(1, contextualFit);
    psychologicalValidity = Math.min(1, psychologicalValidity);
    return {
      schema: enhancedSchema,
      reasoning: {
        preferenceAlignment,
        contextualFit,
        psychologicalValidity
      },
      suggestions
    };
  }
  /**
   * Create psychological constraints for generation
   */
  createPsychologicalConstraints(config) {
    const constraints = [];
    if (config.targetSentiment) {
      constraints.push(`sentiment_score >= ${config.targetSentiment.score - 0.2}`);
      constraints.push(`sentiment_score <= ${config.targetSentiment.score + 0.2}`);
    }
    if (config.contextualFactors?.constraints) {
      constraints.push(...config.contextualFactors.constraints);
    }
    if (config.qualityThreshold) {
      constraints.push(`quality >= ${config.qualityThreshold}`);
    }
    return constraints;
  }
  /**
   * Validate generated data against psychological criteria
   */
  async validatePsychologically(data, config) {
    let sentimentMatch = 0;
    let qualityScore = 0;
    const validatedData = [];
    for (const item of data) {
      const text = this.extractTextFromItem(item);
      if (text && config.targetSentiment) {
        const sentiment = await this.reasoner.extractSentiment(text);
        const sentimentDiff = Math.abs(sentiment.score - config.targetSentiment.score);
        if (sentimentDiff <= 0.3) {
          sentimentMatch++;
          validatedData.push({
            ...item,
            _psychoMetrics: {
              sentimentScore: sentiment.score,
              emotion: sentiment.primaryEmotion,
              confidence: sentiment.confidence
            }
          });
        }
      } else {
        validatedData.push(item);
      }
    }
    sentimentMatch = data.length > 0 ? sentimentMatch / data.length : 0;
    qualityScore = validatedData.length / Math.max(data.length, 1);
    return {
      data: validatedData,
      sentimentMatch,
      qualityScore,
      validatedCount: validatedData.length,
      totalCount: data.length
    };
  }
  /**
   * Plan optimal data generation strategy using GOAP
   */
  async planGenerationStrategy(goal, constraints) {
    console.log("\u{1F3AF} Planning generation strategy with GOAP...");
    const plan = await this.reasoner.plan({
      goal,
      currentState: {
        dataCount: 0,
        quality: 0,
        constraints
      },
      availableActions: [
        "generate_batch",
        "validate_quality",
        "adjust_parameters",
        "refine_schema"
      ]
    });
    return {
      steps: plan.steps || [],
      estimatedTime: plan.estimatedTime || 0,
      estimatedQuality: plan.estimatedQuality || 0.5,
      recommendations: plan.recommendations || []
    };
  }
  /**
   * Identify patterns in preferences
   */
  identifyPreferencePatterns(preferences) {
    const patterns = [];
    const typeGroups = /* @__PURE__ */ new Map();
    for (const pref of preferences) {
      if (!typeGroups.has(pref.type)) {
        typeGroups.set(pref.type, []);
      }
      typeGroups.get(pref.type).push(pref);
    }
    for (const [type, prefs] of typeGroups) {
      if (prefs.length >= 2) {
        patterns.push({
          type,
          count: prefs.length,
          avgStrength: prefs.reduce((sum, p) => sum + p.strength, 0) / prefs.length,
          items: prefs
        });
      }
    }
    return patterns;
  }
  /**
   * Extract priority factors from preferences
   */
  extractPriorityFactors(preferences) {
    return preferences.filter((p) => p.strength > 0.7).map((p) => p.subject).slice(0, 5);
  }
  /**
   * Extract text from data item for sentiment analysis
   */
  extractTextFromItem(item) {
    if (typeof item === "string") return item;
    if (item.text) return item.text;
    if (item.content) return item.content;
    if (item.description) return item.description;
    return JSON.stringify(item);
  }
  /**
   * Store generation history for learning
   */
  storeGenerationHistory(type, entry) {
    if (!this.generationHistory.has(type)) {
      this.generationHistory.set(type, []);
    }
    const history = this.generationHistory.get(type);
    history.push(entry);
    if (history.length > 100) {
      history.shift();
    }
  }
  /**
   * Get generation insights from history
   */
  getGenerationInsights(type) {
    if (type) {
      return {
        type,
        count: this.generationHistory.get(type)?.length || 0,
        history: this.generationHistory.get(type) || []
      };
    }
    const insights = {};
    for (const [key, value] of this.generationHistory) {
      insights[key] = {
        count: value.length,
        avgQuality: value.reduce((sum, e) => sum + (e.result?.qualityScore || 0), 0) / value.length
      };
    }
    return insights;
  }
  /**
   * Clear generation history
   */
  clearHistory() {
    this.generationHistory.clear();
  }
};

// src/index.ts
var IntegratedPsychoSymbolicSystem = class {
  reasoner;
  synth;
  ruvectorAdapter;
  synthAdapter;
  initialized = false;
  constructor(config = {}) {
    this.reasoner = new import_psycho_symbolic_reasoner.PsychoSymbolicReasoner({
      enableGraphReasoning: config.reasoner?.enableGraphReasoning ?? true,
      enableAffectExtraction: config.reasoner?.enableAffectExtraction ?? true,
      enablePlanning: config.reasoner?.enablePlanning ?? true,
      logLevel: config.reasoner?.logLevel || "info"
    });
    this.synth = new import_agentic_synth.AgenticSynth({
      provider: config.synth?.provider || "gemini",
      apiKey: config.synth?.apiKey || process.env.GEMINI_API_KEY,
      model: config.synth?.model,
      cacheStrategy: config.synth?.cache?.enabled ? "memory" : "none",
      maxCacheSize: config.synth?.cache?.maxSize
    });
    this.synthAdapter = new AgenticSynthAdapter(this.reasoner, this.synth);
    if (config.vector) {
      this.ruvectorAdapter = new RuvectorAdapter(this.reasoner, {
        dbPath: config.vector.dbPath || "./data/psycho-vector.db",
        collectionName: config.vector.collectionName || "psycho-knowledge",
        embeddingDimensions: config.vector.dimensions || 768,
        enableSemanticCache: config.vector.enableSemanticCache ?? true
      });
    }
  }
  /**
   * Initialize all components
   */
  async initialize() {
    if (this.initialized) return;
    console.log("\u{1F680} Initializing Integrated Psycho-Symbolic System...");
    await this.reasoner.initialize();
    console.log("\u2705 Psycho-Symbolic Reasoner initialized");
    if (this.ruvectorAdapter?.isAvailable()) {
      await this.ruvectorAdapter.initialize();
      console.log("\u2705 Ruvector adapter initialized");
    }
    this.initialized = true;
    console.log("\u2728 System ready!");
  }
  /**
   * Generate synthetic data with psychological reasoning
   *
   * Example:
   * ```typescript
   * const result = await system.generateIntelligently('structured', {
   *   count: 100,
   *   schema: { name: 'string', age: 'number' }
   * }, {
   *   targetSentiment: { score: 0.7, emotion: 'happy' },
   *   userPreferences: ['I prefer concise data', 'Focus on quality over quantity']
   * });
   * ```
   */
  async generateIntelligently(type, baseOptions, psychoConfig = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    return await this.synthAdapter.generateWithPsychoGuidance(
      type,
      baseOptions,
      psychoConfig
    );
  }
  /**
   * Perform hybrid reasoning query (symbolic + vector)
   *
   * Example:
   * ```typescript
   * const results = await system.intelligentQuery(
   *   'Find activities that reduce stress',
   *   { symbolicWeight: 0.6, vectorWeight: 0.4 }
   * );
   * ```
   */
  async intelligentQuery(query, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    if (this.ruvectorAdapter?.isAvailable()) {
      return await this.ruvectorAdapter.hybridQuery(query, options);
    } else {
      return await this.reasoner.queryGraph({
        pattern: query,
        maxResults: options.maxResults || 10,
        includeInference: true
      });
    }
  }
  /**
   * Load knowledge base into both symbolic and vector stores
   */
  async loadKnowledgeBase(knowledgeBase) {
    if (!this.initialized) {
      await this.initialize();
    }
    await this.reasoner.loadKnowledgeBase(knowledgeBase);
    if (this.ruvectorAdapter?.isAvailable()) {
      await this.ruvectorAdapter.storeKnowledgeGraph(knowledgeBase);
    }
  }
  /**
   * Analyze text for sentiment and preferences
   */
  async analyzeText(text) {
    if (!this.initialized) {
      await this.initialize();
    }
    const [sentiment, preferences] = await Promise.all([
      this.reasoner.extractSentiment(text),
      this.reasoner.extractPreferences(text)
    ]);
    return { sentiment, preferences };
  }
  /**
   * Plan data generation strategy using GOAP
   */
  async planDataGeneration(goal, constraints) {
    if (!this.initialized) {
      await this.initialize();
    }
    return await this.synthAdapter.planGenerationStrategy(goal, constraints);
  }
  /**
   * Get system statistics and insights
   */
  getSystemInsights() {
    return {
      initialized: this.initialized,
      components: {
        reasoner: "psycho-symbolic-reasoner",
        synth: "agentic-synth",
        vector: this.ruvectorAdapter?.isAvailable() ? "ruvector" : "not-available"
      },
      adapters: {
        synthHistory: this.synthAdapter.getGenerationInsights(),
        vectorCache: this.ruvectorAdapter?.getCacheStats() || null
      }
    };
  }
  /**
   * Shutdown and cleanup
   */
  async shutdown() {
    if (this.ruvectorAdapter) {
      this.ruvectorAdapter.clearCache();
    }
    this.synthAdapter.clearHistory();
    this.initialized = false;
  }
};
function createIntegratedSystem(config = {}) {
  return new IntegratedPsychoSymbolicSystem(config);
}
async function quickStart(apiKey) {
  const system = createIntegratedSystem({
    synth: {
      provider: "gemini",
      apiKey: apiKey || process.env.GEMINI_API_KEY,
      cache: { enabled: true }
    },
    reasoner: {
      enableGraphReasoning: true,
      enableAffectExtraction: true,
      enablePlanning: true
    }
  });
  await system.initialize();
  return system;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AgenticSynthAdapter,
  IntegratedPsychoSymbolicSystem,
  RuvectorAdapter,
  createIntegratedSystem,
  quickStart
});
