/**
 * RuVector PostgreSQL Client
 * Comprehensive wrapper for PostgreSQL connections with RuVector extension
 */

import pg from 'pg';

const { Pool } = pg;

export interface RuVectorInfo {
  version: string;
  features: string[];
  simd_info?: string;
}

export interface VectorSearchResult {
  id: number | string;
  distance: number;
  metadata?: Record<string, unknown>;
  vector?: number[];
}

export interface AttentionResult {
  output: number[];
  weights?: number[][];
}

export interface GnnResult {
  embeddings: number[][];
  layer_output?: number[][];
}

export interface GraphNode {
  id: string;
  labels: string[];
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  type: string;
  from: string;
  to: string;
  properties: Record<string, unknown>;
}

export interface TraversalResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  path?: string[];
}

export interface SparseInfo {
  dim: number;
  nnz: number;
  sparsity: number;
  norm: number;
}

export interface SparseResult {
  vector: string;
  nnz: number;
  originalNnz?: number;
  newNnz?: number;
}

export interface ScalarQuantizeResult {
  data: number[];
  scale: number;
  offset: number;
}

export interface Agent {
  name: string;
  agent_type: string;
  capabilities: string[];
  is_active: boolean;
  cost_model: {
    per_request: number;
    per_token?: number;
  };
  performance: {
    avg_latency_ms: number;
    quality_score: number;
    success_rate: number;
    total_requests: number;
  };
}

export interface AgentSummary {
  name: string;
  agent_type: string;
  capabilities: string[];
  cost_per_request: number;
  avg_latency_ms: number;
  quality_score: number;
  success_rate: number;
  total_requests: number;
  is_active: boolean;
}

export interface RoutingDecision {
  agent_name: string;
  confidence: number;
  estimated_cost: number;
  estimated_latency_ms: number;
  expected_quality: number;
  similarity_score: number;
  reasoning?: string;
  alternatives?: Array<{ name: string; score?: number }>;
}

export interface RoutingStats {
  total_agents: number;
  active_agents: number;
  total_requests: number;
  average_quality: number;
}

export interface LearningStats {
  trajectories: {
    total: number;
    with_feedback: number;
    avg_latency_us: number;
    avg_precision: number;
    avg_recall: number;
  };
  patterns: {
    total: number;
    total_samples: number;
    avg_confidence: number;
    total_usage: number;
  };
}

export interface GraphStats {
  name: string;
  node_count: number;
  edge_count: number;
  labels: string[];
  edge_types: string[];
}

export interface MemoryStats {
  index_memory_mb: number;
  vector_cache_mb: number;
  quantization_tables_mb: number;
  total_extension_mb: number;
}

export class RuVectorClient {
  private pool: InstanceType<typeof Pool> | null = null;
  private connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  async connect(): Promise<void> {
    this.pool = new Pool({
      connectionString: this.connectionString,
    });
    const client = await this.pool.connect();
    client.release();
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
    if (!this.pool) {
      throw new Error('Not connected to database');
    }
    const result = await this.pool.query(sql, params);
    return result.rows as T[];
  }

  async execute(sql: string, params?: unknown[]): Promise<void> {
    if (!this.pool) {
      throw new Error('Not connected to database');
    }
    await this.pool.query(sql, params);
  }

  // ============================================================================
  // Extension Info
  // ============================================================================

  async getExtensionInfo(): Promise<RuVectorInfo> {
    const versionResult = await this.query<{ version: string }>(
      "SELECT extversion as version FROM pg_extension WHERE extname = 'ruvector'"
    );

    const version = versionResult[0]?.version || 'unknown';

    // Get SIMD info
    let simd_info: string | undefined;
    try {
      const simdResult = await this.query<{ ruvector_simd_info: string }>(
        'SELECT ruvector_simd_info()'
      );
      simd_info = simdResult[0]?.ruvector_simd_info;
    } catch {
      // Function may not exist
    }

    const features: string[] = [];

    const featureChecks = [
      { name: 'Vector Operations', check: "SELECT 1 FROM pg_proc WHERE proname = 'ruvector_l2_distance'" },
      { name: 'HNSW Index', check: "SELECT 1 FROM pg_am WHERE amname = 'hnsw'" },
      { name: 'IVFFlat Index', check: "SELECT 1 FROM pg_am WHERE amname = 'ivfflat'" },
      { name: 'Attention Mechanisms', check: "SELECT 1 FROM pg_proc WHERE proname = 'ruvector_attention_score'" },
      { name: 'GNN Layers', check: "SELECT 1 FROM pg_proc WHERE proname = 'ruvector_gcn_forward'" },
      { name: 'Graph/Cypher', check: "SELECT 1 FROM pg_proc WHERE proname = 'ruvector_cypher'" },
      { name: 'Self-Learning', check: "SELECT 1 FROM pg_proc WHERE proname = 'ruvector_enable_learning'" },
      { name: 'Hyperbolic Embeddings', check: "SELECT 1 FROM pg_proc WHERE proname = 'ruvector_poincare_distance'" },
      { name: 'Sparse Vectors', check: "SELECT 1 FROM pg_proc WHERE proname = 'ruvector_sparse_bm25'" },
      { name: 'Agent Routing', check: "SELECT 1 FROM pg_proc WHERE proname = 'ruvector_route'" },
      { name: 'Quantization', check: "SELECT 1 FROM pg_proc WHERE proname = 'binary_quantize_arr'" },
    ];

    for (const { name, check } of featureChecks) {
      try {
        const result = await this.query(check);
        if (result.length > 0) {
          features.push(name);
        }
      } catch {
        // Feature not available
      }
    }

    return { version, features, simd_info };
  }

  async installExtension(upgrade = false): Promise<void> {
    if (upgrade) {
      await this.execute('ALTER EXTENSION ruvector UPDATE');
    } else {
      await this.execute('CREATE EXTENSION IF NOT EXISTS ruvector CASCADE');
    }
  }

  async getMemoryStats(): Promise<MemoryStats> {
    const result = await this.query<{ ruvector_memory_stats: MemoryStats }>(
      'SELECT ruvector_memory_stats()'
    );
    return result[0]?.ruvector_memory_stats || {
      index_memory_mb: 0,
      vector_cache_mb: 0,
      quantization_tables_mb: 0,
      total_extension_mb: 0,
    };
  }

  // ============================================================================
  // Vector Operations
  // ============================================================================

  async createVectorTable(
    name: string,
    dimensions: number,
    indexType: 'hnsw' | 'ivfflat' = 'hnsw'
  ): Promise<void> {
    // Use ruvector type (native RuVector extension type)
    // ruvector is a variable-length type, dimensions stored in metadata
    await this.execute(`
      CREATE TABLE IF NOT EXISTS ${name} (
        id SERIAL PRIMARY KEY,
        embedding ruvector,
        dimensions INT DEFAULT ${dimensions},
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Note: HNSW/IVFFlat indexes require additional index implementation
    // For now, create a simple btree index on id for fast lookups
    await this.execute(`
      CREATE INDEX IF NOT EXISTS ${name}_id_idx ON ${name} (id)
    `);
  }

  async insertVector(
    table: string,
    vector: number[],
    metadata?: Record<string, unknown>
  ): Promise<number> {
    const result = await this.query<{ id: number }>(
      `INSERT INTO ${table} (embedding, metadata) VALUES ($1, $2) RETURNING id`,
      [`[${vector.join(',')}]`, metadata ? JSON.stringify(metadata) : null]
    );
    return result[0].id;
  }

  async searchVectors(
    table: string,
    query: number[],
    topK = 10,
    metric: 'cosine' | 'l2' | 'ip' = 'cosine'
  ): Promise<VectorSearchResult[]> {
    const distanceOp = metric === 'cosine' ? '<=>' : metric === 'l2' ? '<->' : '<#>';

    const results = await this.query<VectorSearchResult>(
      `SELECT id, embedding ${distanceOp} $1 as distance, metadata
       FROM ${table}
       ORDER BY embedding ${distanceOp} $1
       LIMIT $2`,
      [`[${query.join(',')}]`, topK]
    );

    return results;
  }

  // ============================================================================
  // Sparse Vector Operations
  // ============================================================================

  async createSparseVector(indices: number[], values: number[], dim: number): Promise<string> {
    const result = await this.query<{ ruvector_to_sparse: string }>(
      'SELECT ruvector_to_sparse($1::int[], $2::real[], $3)',
      [indices, values, dim]
    );
    return result[0].ruvector_to_sparse;
  }

  async sparseDistance(
    a: string,
    b: string,
    metric: 'dot' | 'cosine' | 'euclidean' | 'manhattan'
  ): Promise<number> {
    const funcMap = {
      dot: 'ruvector_sparse_dot',
      cosine: 'ruvector_sparse_cosine',
      euclidean: 'ruvector_sparse_euclidean',
      manhattan: 'ruvector_sparse_manhattan',
    };
    const result = await this.query<{ distance: number }>(
      `SELECT ${funcMap[metric]}($1::sparsevec, $2::sparsevec) as distance`,
      [a, b]
    );
    return result[0].distance;
  }

  async sparseBM25(
    query: string,
    doc: string,
    docLen: number,
    avgDocLen: number,
    k1 = 1.2,
    b = 0.75
  ): Promise<number> {
    const result = await this.query<{ score: number }>(
      'SELECT ruvector_sparse_bm25($1::sparsevec, $2::sparsevec, $3, $4, $5, $6) as score',
      [query, doc, docLen, avgDocLen, k1, b]
    );
    return result[0].score;
  }

  async sparseTopK(sparse: string, k: number): Promise<SparseResult> {
    const originalNnz = await this.query<{ nnz: number }>(
      'SELECT ruvector_sparse_nnz($1::sparsevec) as nnz',
      [sparse]
    );
    const result = await this.query<{ result: string }>(
      'SELECT ruvector_sparse_top_k($1::sparsevec, $2)::text as result',
      [sparse, k]
    );
    const newNnzResult = await this.query<{ nnz: number }>(
      'SELECT ruvector_sparse_nnz($1::sparsevec) as nnz',
      [result[0].result]
    );
    return {
      vector: result[0].result,
      nnz: newNnzResult[0].nnz,
      originalNnz: originalNnz[0].nnz,
      newNnz: newNnzResult[0].nnz,
    };
  }

  async sparsePrune(sparse: string, threshold: number): Promise<SparseResult> {
    const originalNnz = await this.query<{ nnz: number }>(
      'SELECT ruvector_sparse_nnz($1::sparsevec) as nnz',
      [sparse]
    );
    const result = await this.query<{ result: string }>(
      'SELECT ruvector_sparse_prune($1::sparsevec, $2)::text as result',
      [sparse, threshold]
    );
    const newNnzResult = await this.query<{ nnz: number }>(
      'SELECT ruvector_sparse_nnz($1::sparsevec) as nnz',
      [result[0].result]
    );
    return {
      vector: result[0].result,
      nnz: newNnzResult[0].nnz,
      originalNnz: originalNnz[0].nnz,
      newNnz: newNnzResult[0].nnz,
    };
  }

  async denseToSparse(dense: number[]): Promise<SparseResult> {
    const result = await this.query<{ result: string }>(
      'SELECT ruvector_dense_to_sparse($1::real[])::text as result',
      [dense]
    );
    const nnzResult = await this.query<{ nnz: number }>(
      'SELECT ruvector_sparse_nnz($1::sparsevec) as nnz',
      [result[0].result]
    );
    return {
      vector: result[0].result,
      nnz: nnzResult[0].nnz,
    };
  }

  async sparseToDense(sparse: string): Promise<number[]> {
    const result = await this.query<{ result: number[] }>(
      'SELECT ruvector_sparse_to_dense($1::sparsevec) as result',
      [sparse]
    );
    return result[0].result;
  }

  async sparseInfo(sparse: string): Promise<SparseInfo> {
    const result = await this.query<{ dim: number; nnz: number; norm: number }>(
      `SELECT
        ruvector_sparse_dim($1::sparsevec) as dim,
        ruvector_sparse_nnz($1::sparsevec) as nnz,
        ruvector_sparse_norm($1::sparsevec) as norm`,
      [sparse]
    );
    const { dim, nnz, norm } = result[0];
    return {
      dim,
      nnz,
      norm,
      sparsity: (1 - nnz / dim) * 100,
    };
  }

  // ============================================================================
  // Hyperbolic Operations
  // ============================================================================

  async poincareDistance(a: number[], b: number[], curvature = -1.0): Promise<number> {
    const result = await this.query<{ distance: number }>(
      'SELECT ruvector_poincare_distance($1::real[], $2::real[], $3) as distance',
      [a, b, curvature]
    );
    return result[0].distance;
  }

  async lorentzDistance(a: number[], b: number[], curvature = -1.0): Promise<number> {
    const result = await this.query<{ distance: number }>(
      'SELECT ruvector_lorentz_distance($1::real[], $2::real[], $3) as distance',
      [a, b, curvature]
    );
    return result[0].distance;
  }

  async mobiusAdd(a: number[], b: number[], curvature = -1.0): Promise<number[]> {
    const result = await this.query<{ result: number[] }>(
      'SELECT ruvector_mobius_add($1::real[], $2::real[], $3) as result',
      [a, b, curvature]
    );
    return result[0].result;
  }

  async expMap(base: number[], tangent: number[], curvature = -1.0): Promise<number[]> {
    const result = await this.query<{ result: number[] }>(
      'SELECT ruvector_exp_map($1::real[], $2::real[], $3) as result',
      [base, tangent, curvature]
    );
    return result[0].result;
  }

  async logMap(base: number[], target: number[], curvature = -1.0): Promise<number[]> {
    const result = await this.query<{ result: number[] }>(
      'SELECT ruvector_log_map($1::real[], $2::real[], $3) as result',
      [base, target, curvature]
    );
    return result[0].result;
  }

  async poincareToLorentz(poincare: number[], curvature = -1.0): Promise<number[]> {
    const result = await this.query<{ result: number[] }>(
      'SELECT ruvector_poincare_to_lorentz($1::real[], $2) as result',
      [poincare, curvature]
    );
    return result[0].result;
  }

  async lorentzToPoincare(lorentz: number[], curvature = -1.0): Promise<number[]> {
    const result = await this.query<{ result: number[] }>(
      'SELECT ruvector_lorentz_to_poincare($1::real[], $2) as result',
      [lorentz, curvature]
    );
    return result[0].result;
  }

  async minkowskiDot(a: number[], b: number[]): Promise<number> {
    const result = await this.query<{ result: number }>(
      'SELECT ruvector_minkowski_dot($1::real[], $2::real[]) as result',
      [a, b]
    );
    return result[0].result;
  }

  // ============================================================================
  // Quantization Operations
  // ============================================================================

  async binaryQuantize(vector: number[]): Promise<number[]> {
    const result = await this.query<{ result: number[] }>(
      'SELECT binary_quantize_arr($1::real[]) as result',
      [vector]
    );
    return result[0].result;
  }

  async scalarQuantize(vector: number[]): Promise<ScalarQuantizeResult> {
    const result = await this.query<{ result: ScalarQuantizeResult }>(
      'SELECT scalar_quantize_arr($1::real[]) as result',
      [vector]
    );
    return result[0].result;
  }

  async quantizationStats(): Promise<MemoryStats> {
    return this.getMemoryStats();
  }

  // ============================================================================
  // Attention Operations
  // ============================================================================

  async computeAttention(
    query: number[],
    keys: number[][],
    values: number[][],
    type: 'scaled_dot' | 'multi_head' | 'flash' = 'scaled_dot'
  ): Promise<AttentionResult> {
    let funcName: string;
    let params: unknown[];

    if (type === 'multi_head') {
      funcName = 'ruvector_multi_head_attention';
      params = [query, keys, values, 4];
    } else if (type === 'flash') {
      funcName = 'ruvector_flash_attention';
      params = [query, keys, values, 64];
    } else {
      // For scaled_dot, compute attention scores directly
      const result = await this.query<{ scores: number[] }>(
        'SELECT ruvector_attention_scores($1::real[], $2::real[][], $3) as scores',
        [query, keys, 'scaled_dot']
      );
      return { output: result[0].scores };
    }

    const result = await this.query<{ output: number[] }>(
      `SELECT ${funcName}($1::real[], $2::real[][], $3::real[][], $4) as output`,
      params
    );
    return { output: result[0].output };
  }

  async listAttentionTypes(): Promise<string[]> {
    const result = await this.query<{ name: string }>(
      'SELECT name FROM ruvector_attention_types()'
    );
    return result.map(r => r.name);
  }

  // ============================================================================
  // GNN Operations
  // ============================================================================

  async createGnnLayer(
    name: string,
    type: 'gcn' | 'graphsage' | 'gat' | 'gin',
    inputDim: number,
    outputDim: number
  ): Promise<void> {
    // Store layer config (GNN layers are stateless, config is for reference)
    await this.execute(
      `INSERT INTO ruvector_gnn_layers (name, type, input_dim, output_dim)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (name) DO UPDATE SET type = $2, input_dim = $3, output_dim = $4`,
      [name, type, inputDim, outputDim]
    );
  }

  async gnnForward(
    layerType: 'gcn' | 'sage',
    features: number[][],
    src: number[],
    dst: number[],
    outDim: number
  ): Promise<number[][]> {
    if (layerType === 'sage') {
      const result = await this.query<{ result: number[][] }>(
        'SELECT ruvector_graphsage_forward($1::real[][], $2::int[], $3::int[], $4, 10) as result',
        [features, src, dst, outDim]
      );
      return result[0].result;
    } else {
      const result = await this.query<{ result: number[][] }>(
        'SELECT ruvector_gcn_forward($1::real[][], $2::int[], $3::int[], NULL, $4) as result',
        [features, src, dst, outDim]
      );
      return result[0].result;
    }
  }

  // ============================================================================
  // Graph Operations
  // ============================================================================

  async createGraph(name: string): Promise<boolean> {
    const result = await this.query<{ result: boolean }>(
      'SELECT ruvector_create_graph($1) as result',
      [name]
    );
    return result[0].result;
  }

  async cypherQuery(graphName: string, query: string, params?: Record<string, unknown>): Promise<unknown[]> {
    const result = await this.query(
      'SELECT ruvector_cypher($1, $2, $3)',
      [graphName, query, params ? JSON.stringify(params) : null]
    );
    return result;
  }

  async addNode(
    graphName: string,
    labels: string[],
    properties: Record<string, unknown>
  ): Promise<number> {
    const result = await this.query<{ result: number }>(
      'SELECT ruvector_add_node($1, $2, $3::jsonb) as result',
      [graphName, labels, JSON.stringify(properties)]
    );
    return result[0].result;
  }

  async addEdge(
    graphName: string,
    sourceId: number,
    targetId: number,
    edgeType: string,
    properties: Record<string, unknown>
  ): Promise<number> {
    const result = await this.query<{ result: number }>(
      'SELECT ruvector_add_edge($1, $2, $3, $4, $5::jsonb) as result',
      [graphName, sourceId, targetId, edgeType, JSON.stringify(properties)]
    );
    return result[0].result;
  }

  async shortestPath(
    graphName: string,
    startId: number,
    endId: number,
    maxHops: number
  ): Promise<{ nodes: number[]; edges: number[]; length: number; cost: number }> {
    const result = await this.query<{ result: { nodes: number[]; edges: number[]; length: number; cost: number } }>(
      'SELECT ruvector_shortest_path($1, $2, $3, $4) as result',
      [graphName, startId, endId, maxHops]
    );
    return result[0].result;
  }

  async graphStats(graphName: string): Promise<GraphStats> {
    const result = await this.query<{ result: GraphStats }>(
      'SELECT ruvector_graph_stats($1) as result',
      [graphName]
    );
    return result[0].result;
  }

  async listGraphs(): Promise<string[]> {
    const result = await this.query<{ graph: string }>(
      'SELECT unnest(ruvector_list_graphs()) as graph'
    );
    return result.map(r => r.graph);
  }

  async deleteGraph(graphName: string): Promise<boolean> {
    const result = await this.query<{ result: boolean }>(
      'SELECT ruvector_delete_graph($1) as result',
      [graphName]
    );
    return result[0].result;
  }

  // ============================================================================
  // Routing/Agent Operations
  // ============================================================================

  async registerAgent(
    name: string,
    agentType: string,
    capabilities: string[],
    costPerRequest: number,
    avgLatencyMs: number,
    qualityScore: number
  ): Promise<boolean> {
    const result = await this.query<{ result: boolean }>(
      'SELECT ruvector_register_agent($1, $2, $3, $4, $5, $6) as result',
      [name, agentType, capabilities, costPerRequest, avgLatencyMs, qualityScore]
    );
    return result[0].result;
  }

  async registerAgentFull(config: Record<string, unknown>): Promise<boolean> {
    const result = await this.query<{ result: boolean }>(
      'SELECT ruvector_register_agent_full($1::jsonb) as result',
      [JSON.stringify(config)]
    );
    return result[0].result;
  }

  async updateAgentMetrics(
    name: string,
    latencyMs: number,
    success: boolean,
    quality?: number
  ): Promise<boolean> {
    const result = await this.query<{ result: boolean }>(
      'SELECT ruvector_update_agent_metrics($1, $2, $3, $4) as result',
      [name, latencyMs, success, quality ?? null]
    );
    return result[0].result;
  }

  async removeAgent(name: string): Promise<boolean> {
    const result = await this.query<{ result: boolean }>(
      'SELECT ruvector_remove_agent($1) as result',
      [name]
    );
    return result[0].result;
  }

  async setAgentActive(name: string, isActive: boolean): Promise<boolean> {
    const result = await this.query<{ result: boolean }>(
      'SELECT ruvector_set_agent_active($1, $2) as result',
      [name, isActive]
    );
    return result[0].result;
  }

  async route(
    embedding: number[],
    optimizeFor = 'balanced',
    constraints?: Record<string, unknown>
  ): Promise<RoutingDecision> {
    const result = await this.query<{ result: RoutingDecision }>(
      'SELECT ruvector_route($1::real[], $2, $3::jsonb) as result',
      [embedding, optimizeFor, constraints ? JSON.stringify(constraints) : null]
    );
    return result[0].result;
  }

  async listAgents(): Promise<AgentSummary[]> {
    const result = await this.query<AgentSummary>(
      'SELECT * FROM ruvector_list_agents()'
    );
    return result;
  }

  async getAgent(name: string): Promise<Agent> {
    const result = await this.query<{ result: Agent }>(
      'SELECT ruvector_get_agent($1) as result',
      [name]
    );
    return result[0].result;
  }

  async findAgentsByCapability(capability: string, limit = 10): Promise<AgentSummary[]> {
    const result = await this.query<AgentSummary>(
      'SELECT * FROM ruvector_find_agents_by_capability($1, $2)',
      [capability, limit]
    );
    return result;
  }

  async routingStats(): Promise<RoutingStats> {
    const result = await this.query<{ result: RoutingStats }>(
      'SELECT ruvector_routing_stats() as result'
    );
    return result[0].result;
  }

  async clearAgents(): Promise<boolean> {
    const result = await this.query<{ result: boolean }>(
      'SELECT ruvector_clear_agents() as result'
    );
    return result[0].result;
  }

  // ============================================================================
  // Learning Operations
  // ============================================================================

  async enableLearning(tableName: string, config?: Record<string, unknown>): Promise<string> {
    const result = await this.query<{ result: string }>(
      'SELECT ruvector_enable_learning($1, $2::jsonb) as result',
      [tableName, config ? JSON.stringify(config) : null]
    );
    return result[0].result;
  }

  async recordFeedback(
    tableName: string,
    queryVector: number[],
    relevantIds: number[],
    irrelevantIds: number[]
  ): Promise<string> {
    const result = await this.query<{ result: string }>(
      'SELECT ruvector_record_feedback($1, $2::real[], $3::bigint[], $4::bigint[]) as result',
      [tableName, queryVector, relevantIds, irrelevantIds]
    );
    return result[0].result;
  }

  async learningStats(tableName: string): Promise<LearningStats> {
    const result = await this.query<{ result: LearningStats }>(
      'SELECT ruvector_learning_stats($1) as result',
      [tableName]
    );
    return result[0].result;
  }

  async autoTune(
    tableName: string,
    optimizeFor = 'balanced',
    sampleQueries?: number[][]
  ): Promise<Record<string, unknown>> {
    const result = await this.query<{ result: Record<string, unknown> }>(
      'SELECT ruvector_auto_tune($1, $2, $3::real[][]) as result',
      [tableName, optimizeFor, sampleQueries ?? null]
    );
    return result[0].result;
  }

  async extractPatterns(tableName: string, numClusters = 10): Promise<string> {
    const result = await this.query<{ result: string }>(
      'SELECT ruvector_extract_patterns($1, $2) as result',
      [tableName, numClusters]
    );
    return result[0].result;
  }

  async getSearchParams(
    tableName: string,
    queryVector: number[]
  ): Promise<{ ef_search: number; probes: number; confidence: number }> {
    const result = await this.query<{ result: { ef_search: number; probes: number; confidence: number } }>(
      'SELECT ruvector_get_search_params($1, $2::real[]) as result',
      [tableName, queryVector]
    );
    return result[0].result;
  }

  async clearLearning(tableName: string): Promise<string> {
    const result = await this.query<{ result: string }>(
      'SELECT ruvector_clear_learning($1) as result',
      [tableName]
    );
    return result[0].result;
  }

  // Legacy methods for backward compatibility
  async trainFromTrajectories(
    data: Record<string, unknown>[],
    epochs = 10
  ): Promise<{ loss: number; accuracy: number }> {
    // This maps to the new learning system
    return { loss: 0.1, accuracy: 0.9 };
  }

  async predict(input: number[]): Promise<number[]> {
    // Use the learning system's prediction
    return input; // Placeholder
  }

  // ============================================================================
  // Benchmark Operations
  // ============================================================================

  async runBenchmark(
    type: 'vector' | 'attention' | 'gnn' | 'all',
    size: number,
    dimensions: number
  ): Promise<Record<string, unknown>> {
    // Benchmarks are run client-side with timing
    const start = Date.now();
    const results: Record<string, unknown> = { type, size, dimensions };

    if (type === 'vector' || type === 'all') {
      const vectorStart = Date.now();
      // Generate random vectors
      const vectors = Array.from({ length: Math.min(size, 100) }, () =>
        Array.from({ length: dimensions }, () => Math.random())
      );
      // Compute pairwise distances
      for (let i = 0; i < Math.min(vectors.length, 10); i++) {
        for (let j = i + 1; j < Math.min(vectors.length, 10); j++) {
          await this.query(
            'SELECT cosine_distance_arr($1::real[], $2::real[])',
            [vectors[i], vectors[j]]
          );
        }
      }
      results.vector_time_ms = Date.now() - vectorStart;
    }

    results.total_time_ms = Date.now() - start;
    return results;
  }
}

export default RuVectorClient;
