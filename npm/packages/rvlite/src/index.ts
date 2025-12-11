/**
 * RvLite - Lightweight Vector Database SDK
 *
 * A unified database combining:
 * - Vector similarity search
 * - SQL queries with vector distance operations
 * - Cypher property graph queries
 * - SPARQL RDF triple queries
 *
 * @example
 * ```typescript
 * import { RvLite } from 'rvlite';
 *
 * const db = new RvLite({ dimensions: 384 });
 *
 * // Insert vectors
 * db.insert([0.1, 0.2, ...], { text: "Hello world" });
 *
 * // Search similar
 * const results = db.search([0.1, 0.2, ...], 5);
 *
 * // SQL with vector distance
 * db.sql("SELECT * FROM vectors WHERE distance(embedding, ?) < 0.5");
 *
 * // Cypher graph queries
 * db.cypher("CREATE (p:Person {name: 'Alice'})");
 *
 * // SPARQL RDF queries
 * db.sparql("SELECT ?s ?p ?o WHERE { ?s ?p ?o }");
 * ```
 */

// Re-export WASM module for advanced usage
export * from '../dist/wasm/rvlite.js';

export interface RvLiteConfig {
  dimensions?: number;
  distanceMetric?: 'cosine' | 'euclidean' | 'dotproduct';
}

export interface SearchResult {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface QueryResult {
  columns?: string[];
  rows?: unknown[][];
  [key: string]: unknown;
}

/**
 * Main RvLite class - wraps the WASM module with a friendly API
 */
export class RvLite {
  private wasm: any;
  private config: RvLiteConfig;
  private initialized: boolean = false;

  constructor(config: RvLiteConfig = {}) {
    this.config = {
      dimensions: config.dimensions || 384,
      distanceMetric: config.distanceMetric || 'cosine',
    };
  }

  /**
   * Initialize the WASM module (called automatically on first use)
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    // Dynamic import to support both Node.js and browser
    const wasmModule = await import('../dist/wasm/rvlite.js');
    await wasmModule.default();

    this.wasm = new wasmModule.RvLite({
      dimensions: this.config.dimensions,
      distance_metric: this.config.distanceMetric,
    });

    this.initialized = true;
  }

  private async ensureInit(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }

  // ============ Vector Operations ============

  /**
   * Insert a vector with optional metadata
   */
  async insert(
    vector: number[],
    metadata?: Record<string, unknown>
  ): Promise<string> {
    await this.ensureInit();
    return this.wasm.insert(vector, metadata || null);
  }

  /**
   * Insert a vector with a specific ID
   */
  async insertWithId(
    id: string,
    vector: number[],
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.ensureInit();
    this.wasm.insert_with_id(id, vector, metadata || null);
  }

  /**
   * Search for similar vectors
   */
  async search(query: number[], k: number = 5): Promise<SearchResult[]> {
    await this.ensureInit();
    return this.wasm.search(query, k);
  }

  /**
   * Get a vector by ID
   */
  async get(id: string): Promise<{ vector: number[]; metadata?: Record<string, unknown> } | null> {
    await this.ensureInit();
    return this.wasm.get(id);
  }

  /**
   * Delete a vector by ID
   */
  async delete(id: string): Promise<boolean> {
    await this.ensureInit();
    return this.wasm.delete(id);
  }

  /**
   * Get the number of vectors
   */
  async len(): Promise<number> {
    await this.ensureInit();
    return this.wasm.len();
  }

  // ============ SQL Operations ============

  /**
   * Execute a SQL query
   *
   * Supports vector distance operations:
   * - distance(col, vector) - Calculate distance
   * - vec_search(col, vector, k) - Find k nearest
   */
  async sql(query: string): Promise<QueryResult> {
    await this.ensureInit();
    return this.wasm.sql(query);
  }

  // ============ Cypher Operations ============

  /**
   * Execute a Cypher graph query
   *
   * Supports:
   * - CREATE (n:Label {props})
   * - MATCH (n:Label) WHERE ... RETURN n
   * - CREATE (a)-[:REL]->(b)
   */
  async cypher(query: string): Promise<QueryResult> {
    await this.ensureInit();
    return this.wasm.cypher(query);
  }

  /**
   * Get Cypher graph statistics
   */
  async cypherStats(): Promise<{ node_count: number; edge_count: number }> {
    await this.ensureInit();
    return this.wasm.cypher_stats();
  }

  // ============ SPARQL Operations ============

  /**
   * Execute a SPARQL query
   *
   * Supports SELECT, ASK queries over RDF triples
   */
  async sparql(query: string): Promise<QueryResult> {
    await this.ensureInit();
    return this.wasm.sparql(query);
  }

  /**
   * Add an RDF triple
   */
  async addTriple(
    subject: string,
    predicate: string,
    object: string,
    graph?: string
  ): Promise<void> {
    await this.ensureInit();
    this.wasm.add_triple(subject, predicate, object, graph || null);
  }

  /**
   * Get the number of triples
   */
  async tripleCount(): Promise<number> {
    await this.ensureInit();
    return this.wasm.triple_count();
  }

  // ============ Persistence ============

  /**
   * Export database state to JSON
   */
  async exportJson(): Promise<unknown> {
    await this.ensureInit();
    return this.wasm.export_json();
  }

  /**
   * Import database state from JSON
   */
  async importJson(data: unknown): Promise<void> {
    await this.ensureInit();
    this.wasm.import_json(data);
  }

  /**
   * Save to IndexedDB (browser only)
   */
  async save(): Promise<void> {
    await this.ensureInit();
    return this.wasm.save();
  }

  /**
   * Load from IndexedDB (browser only)
   */
  static async load(config: RvLiteConfig = {}): Promise<RvLite> {
    const instance = new RvLite(config);
    await instance.init();

    // Dynamic import for WASM
    const wasmModule = await import('../dist/wasm/rvlite.js');
    instance.wasm = await wasmModule.RvLite.load(config);

    return instance;
  }

  /**
   * Clear IndexedDB storage (browser only)
   */
  static async clearStorage(): Promise<void> {
    const wasmModule = await import('../dist/wasm/rvlite.js');
    return wasmModule.RvLite.clear_storage();
  }
}

// ============ Convenience Functions ============

/**
 * Create a new RvLite instance (async factory)
 */
export async function createRvLite(config: RvLiteConfig = {}): Promise<RvLite> {
  const db = new RvLite(config);
  await db.init();
  return db;
}

/**
 * Generate embeddings using various providers
 */
export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

/**
 * Create an embedding provider using Anthropic Claude
 */
export function createAnthropicEmbeddings(apiKey?: string): EmbeddingProvider {
  // Note: Claude doesn't have native embeddings, this is a placeholder
  // Users should use their own embedding provider
  throw new Error(
    'Anthropic does not provide embeddings. Use createOpenAIEmbeddings or a custom provider.'
  );
}

/**
 * Semantic Memory - Higher-level API for AI memory applications
 *
 * Combines vector search with knowledge graph storage
 */
export class SemanticMemory {
  private db: RvLite;
  private embedder?: EmbeddingProvider;

  constructor(db: RvLite, embedder?: EmbeddingProvider) {
    this.db = db;
    this.embedder = embedder;
  }

  /**
   * Store a memory with semantic embedding
   */
  async store(
    key: string,
    content: string,
    embedding?: number[],
    metadata?: Record<string, unknown>
  ): Promise<void> {
    let vector = embedding;
    if (!vector && this.embedder) {
      vector = await this.embedder.embed(content);
    }

    if (vector) {
      await this.db.insertWithId(key, vector, { content, ...metadata });
    }

    // Also store as graph node
    await this.db.cypher(
      `CREATE (m:Memory {key: "${key}", content: "${content.replace(/"/g, '\\"')}", timestamp: ${Date.now()}})`
    );
  }

  /**
   * Query memories by semantic similarity
   */
  async query(
    queryText: string,
    embedding?: number[],
    k: number = 5
  ): Promise<SearchResult[]> {
    let vector = embedding;
    if (!vector && this.embedder) {
      vector = await this.embedder.embed(queryText);
    }

    if (!vector) {
      throw new Error('No embedding provided and no embedder configured');
    }

    return this.db.search(vector, k);
  }

  /**
   * Add a relationship between memories
   */
  async addRelation(
    fromKey: string,
    relation: string,
    toKey: string
  ): Promise<void> {
    await this.db.cypher(
      `MATCH (a:Memory {key: "${fromKey}"}), (b:Memory {key: "${toKey}"}) CREATE (a)-[:${relation}]->(b)`
    );
  }

  /**
   * Find related memories through graph traversal
   */
  async findRelated(key: string, depth: number = 2): Promise<QueryResult> {
    return this.db.cypher(
      `MATCH (m:Memory {key: "${key}"})-[*1..${depth}]-(related:Memory) RETURN DISTINCT related`
    );
  }
}

export default RvLite;
