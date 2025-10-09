// Database Types
export interface DatabaseClass {
  class: string;
  properties?: DatabaseProperty[];
}

export interface DatabaseProperty {
  name: string;
  dataType: string[];
}

export interface DatabaseObject {
  id: string;
  properties: Record<string, unknown>;
  _additional?: Record<string, unknown>;
}

export interface DatabaseStats {
  totalClasses?: number;
  totalObjects?: number;
  version?: string;
  nodeInfo?: string;
  performanceMetrics?: PerformanceMetrics;
  clusterHealth?: ClusterHealth;
  shardDetails?: ShardDetail[];
  classStats?: ClassStat[];
  collectionDetails?: CollectionDetail[];
  qdrantMetrics?: QdrantMetrics;
}

export interface PerformanceMetrics {
  totalCollections?: number;
  totalNodes?: number;
  readyCollections?: number;
  healthyNodes?: number;
  indexedVectors?: number;
  totalVectors?: number;
  totalShards?: number;
  indexingShards?: number;
  totalBatchRate?: number;
  totalVectorQueue?: number;
}

export interface ClusterHealth {
  nodes: ClusterNode[];
}

export interface ClusterNode {
  name: string;
  status: 'HEALTHY' | 'INDEXING' | 'UNHEALTHY' | 'UNAVAILABLE';
  version: string;
  gitHash?: string;
  stats?: {
    shardCount: number;
  };
  batchStats?: {
    ratePerSecond: number;
  };
}

export interface ShardDetail {
  nodeName: string;
  shardName: string;
  className: string;
  objectCount: number;
  vectorIndexingStatus: 'READY' | 'INDEXING' | 'UNHEALTHY';
  vectorQueueLength: number;
}

export interface ClassStat {
  name: string;
  objectCount: number;
  properties: number;
}

export interface CollectionDetail {
  name: string;
  objectCount: number;
  vectorSize: number;
  distance: string;
  status: 'green' | 'indexing' | 'Error';
  indexingProgress: number;
  indexedVectors: number;
}

export interface QdrantMetrics {
  averageVectorSize?: number;
  distanceMetrics?: string[];
  indexingStatus?: IndexingStatus[];
  collectionsReady?: number;
  collectionsIndexing?: number;
}

export interface IndexingStatus {
  collection: string;
  status: 'green' | 'indexing' | 'Error';
  indexingProgress: number;
  indexedVectors: number;
  totalVectors: number;
}

// API Response Types
export interface DatabaseStatusResponse {
  dbType: string;
  connected: boolean;
  timestamp: string;
  error?: string;
}

// Request Types
export interface RequestWithCookies extends Request {
  cookies: {
    get: (name: string) => { value: string } | undefined;
  };
} 