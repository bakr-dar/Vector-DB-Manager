interface QdrantCollection {
  name: string;
}

interface QdrantPoint {
  id: string;
  payload: Record<string, unknown>;
}

class QdrantService {
  private baseUrl: string;
  private apiKey: string | undefined;

  constructor() {
    this.baseUrl = process.env.QDRANT_URL || 'http://localhost:6333';
    this.apiKey = process.env.QDRANT_API_KEY;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    };

    if (this.apiKey) {
      headers['api-key'] = this.apiKey;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }

    const jsonResponse = await response.json();
    return jsonResponse;
  }

  async getCollections() {
    try {
      const response = await this.makeRequest('/collections');
      return response.result.collections.map((c: QdrantCollection) => ({ name: c.name }));
    } catch (error) {
      console.error('Error fetching collections:', error);
      return [];
    }
  }

  // Alias for getCollections to match Weaviate interface
  async getClasses() {
    try {
      const collections = await this.getCollections();
      return collections.map((c: { name: string }) => ({ class: c.name, properties: [] }));
    } catch (error) {
      console.error('Error fetching classes:', error);
      return [];
    }
  }

  async getCollectionObjects(collectionName: string, limit: number = 20, offset: string | null = null) {
    try {
      const body: Record<string, unknown> = {
        limit,
        with_payload: true,
        with_vector: false
      };

      // Only add offset if it's not null
      if (offset !== null) {
        body.offset = offset;
      }

      const response = await this.makeRequest(`/collections/${collectionName}/points/scroll`, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      if (!response.result || !response.result.points) {
        return [];
      }

      const points = response.result.points.map((p: QdrantPoint) => ({
        id: p.id,
        properties: p.payload,
      }));

      return points;
    } catch (error) {
      console.error(`Error fetching points for collection ${collectionName}:`, error);
      return [];
    }
  }

  // Alias for getCollectionObjects to match Weaviate interface
  async getClassObjects(className: string, limit: number = 20, offset: number = 0) {
    try {
      const offsetId = offset > 0 ? offset.toString() : null;
      return await this.getCollectionObjects(className, limit, offsetId);
    } catch (error) {
      console.error(`Error fetching objects for class ${className}:`, error);
      return [];
    }
  }

  async getClassObjectsWithCount(className: string, limit: number = 20, offset: number = 0) {
    try {
      const [objects, totalCount] = await Promise.all([
        this.getClassObjects(className, limit, offset),
        this.getClassObjectCount(className)
      ]);

      const totalPages = Math.max(1, Math.ceil(totalCount / limit));
      const currentPage = Math.floor(offset / limit) + 1;

      return {
        objects,
        totalCount,
        hasMore: offset + limit < totalCount,
        currentPage,
        totalPages
      };
    } catch (error) {
      console.error(`Error fetching objects with count for class ${className}:`, error);
      return {
        objects: [],
        totalCount: 0,
        hasMore: false,
        currentPage: 1,
        totalPages: 1
      };
    }
  }

  async getClassObjectCount(className: string) {
    try {
      const response = await this.makeRequest(`/collections/${className}`);
      return response.result.points_count || 0;
    } catch (error) {
      console.error(`Error getting object count for class ${className}:`, error);
      return 0;
    }
  }

  async searchObjects(collectionName: string, query: number[], limit: number = 10) {
    try {
      const body = {
        vector: query,
        limit,
        with_payload: true
      };

      const response = await this.makeRequest(`/collections/${collectionName}/points/search`, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      return response.result.map((r: QdrantPoint & { score: number }) => ({
        id: r.id,
        properties: r.payload,
        score: r.score,
      }));
    } catch (error) {
      console.error(`Error searching in ${collectionName}:`, error);
      return [];
    }
  }

  async createCollection(collectionName: string, vectorSize: number) {
    try {
      const body = {
        vectors: {
          size: vectorSize,
          distance: 'Cosine',
        },
      };

      await this.makeRequest(`/collections/${collectionName}`, {
        method: 'PUT',
        body: JSON.stringify(body)
      });

      return { success: true };
    } catch (error) {
      console.error('Error creating collection:', error);
      throw error;
    }
  }

  // Alias for createCollection to match Weaviate interface
  async createClass(classDefinition: { class: string; properties?: unknown[] }) {
    try {
      const vectorSize = 384; // Default vector size, should be configurable
      return await this.createCollection(classDefinition.class, vectorSize);
    } catch (error) {
      console.error('Error creating class:', error);
      throw error;
    }
  }

  async deleteCollection(collectionName: string) {
    try {
      await this.makeRequest(`/collections/${collectionName}`, {
        method: 'DELETE'
      });
      return { success: true };
    } catch (error) {
      console.error(`Error deleting collection ${collectionName}:`, error);
      throw error;
    }
  }

  // Alias for deleteCollection to match Weaviate interface
  async deleteClass(className: string) {
    try {
      return await this.deleteCollection(className);
    } catch (error) {
      console.error(`Error deleting class ${className}:`, error);
      throw error;
    }
  }

  async checkConnection() {
    try {
      await this.makeRequest('/collections');
      return true;
    } catch (error) {
      console.error('Qdrant connection failed:', error);
      return false;
    }
  }

  async getDatabaseStats() {
    try {
      const collections = await this.getCollections();
      let totalObjects = 0;
      const classStats = [];

      // Get Qdrant version
      let qdrantVersion = 'Unknown';
      try {
        const versionResp = await this.makeRequest('/version');
        if (versionResp && versionResp.version) {
          qdrantVersion = versionResp.version;
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          // Only log in development
          console.debug('Qdrant version not available:', String(error));
        }
        // Otherwise, suppress
      }

      // Get cluster info if available
      let clusterInfo = null;
      try {
        clusterInfo = await this.makeRequest('/cluster');
      } catch (error) {
        // Cluster info might not be available in single-node setups
        console.debug('Cluster info not available:', error);
      }

      for (const collection of collections) {
        try {
          const count = await this.getClassObjectCount(collection.name);
          totalObjects += count;
          
          // Get collection details
          let collectionInfo = null;
          try {
            collectionInfo = await this.makeRequest(`/collections/${collection.name}`);
          } catch (error) {
            console.debug(`Could not fetch collection info for ${collection.name}:`, error);
          }

          classStats.push({
            name: collection.name,
            objectCount: count,
            properties: 0, // Qdrant doesn't have a direct equivalent
            vectorSize: collectionInfo?.result?.config?.params?.vectors?.size || 'Unknown',
            distance: collectionInfo?.result?.config?.params?.vectors?.distance || 'Unknown',
            status: collectionInfo?.result?.status || 'Unknown',
            indexedVectorsCount: collectionInfo?.result?.indexed_vectors_count || 0,
            payloadSchema: collectionInfo?.result?.payload_schema || {}
          });
        } catch (error) {
          console.error(`Error getting stats for collection ${collection.name}:`, error);
          classStats.push({
            name: collection.name,
            objectCount: 0,
            properties: 0,
            vectorSize: 'Unknown',
            distance: 'Unknown',
            status: 'Error',
            indexedVectorsCount: 0,
            payloadSchema: {}
          });
        }
      }

      return {
        version: qdrantVersion,
        totalClasses: collections.length,
        totalObjects,
        classStats,
        modules: {},
        nodeInfo: `Qdrant Instance`,
        clusterInfo: clusterInfo?.result || null
      };
    } catch (error) {
      console.error('Error fetching database stats:', error);
      throw error;
    }
  }

  async getEnhancedStats() {
    try {
      const basicStats = await this.getDatabaseStats();
      
      // Calculate enhanced metrics from collection stats
      const totalVectorSize = basicStats.classStats.reduce((sum, stat) => {
        const size = typeof stat.vectorSize === 'number' ? stat.vectorSize : 0;
        return sum + (size * stat.objectCount);
      }, 0);

      const indexingStatus = basicStats.classStats.map(stat => ({
        collection: stat.name,
        status: stat.status,
        indexedVectors: stat.indexedVectorsCount,
        totalVectors: stat.objectCount,
        indexingProgress: stat.objectCount > 0 ? (stat.indexedVectorsCount / stat.objectCount * 100).toFixed(1) : '0'
      }));

      // Unique distance metrics being used
      const distanceMetrics = [...new Set(basicStats.classStats.map(stat => stat.distance).filter(d => d !== 'Unknown'))];

      return {
        ...basicStats,
        // Qdrant-specific enhanced stats
        qdrantMetrics: {
          totalVectorSize,
          distanceMetrics,
          indexingStatus,
          collectionsIndexing: basicStats.classStats.filter(stat => stat.status === 'indexing').length,
          collectionsReady: basicStats.classStats.filter(stat => stat.status === 'green').length,
          averageVectorSize: basicStats.totalClasses > 0 ? 
            Math.round(basicStats.classStats.reduce((sum, stat) => sum + (typeof stat.vectorSize === 'number' ? stat.vectorSize : 0), 0) / basicStats.totalClasses) : 0
        },
        // Keep some compatibility with Weaviate format but adapt for Qdrant
        clusterHealth: basicStats.clusterInfo ? {
          status: 'healthy',
          nodes: [{
            name: 'qdrant-node',
            status: 'HEALTHY',
            version: basicStats.version,
            gitHash: 'unknown'
          }]
        } : null,
        performanceMetrics: {
          totalNodes: 1,
          healthyNodes: 1,
          totalCollections: basicStats.totalClasses,
          readyCollections: basicStats.classStats.filter(stat => stat.status === 'green').length,
          indexingCollections: basicStats.classStats.filter(stat => stat.status === 'indexing').length,
          totalVectors: basicStats.totalObjects,
          indexedVectors: basicStats.classStats.reduce((sum, stat) => sum + stat.indexedVectorsCount, 0)
        },
        // Collection details formatted for display
        collectionDetails: basicStats.classStats.map(stat => ({
          name: stat.name,
          objectCount: stat.objectCount,
          vectorSize: stat.vectorSize,
          distance: stat.distance,
          status: stat.status,
          indexedVectors: stat.indexedVectorsCount,
          indexingProgress: stat.objectCount > 0 ? ((stat.indexedVectorsCount / stat.objectCount) * 100).toFixed(1) : '0',
          payloadFields: Object.keys(stat.payloadSchema || {}).length
        }))
      };
    } catch (error) {
      console.error('Error fetching enhanced stats:', error);
      throw error;
    }
  }

  async createObject(className: string, properties: Record<string, unknown>) {
    try {
      // For Qdrant, we need a vector. Let's create a placeholder vector for now
      const vector: number[] = new Array(384).fill(0); // Default 384-dimensional zero vector
      
      const point = {
        id: Date.now().toString(), // Simple ID generation as string
        vector: vector,
        payload: properties
      };

      const body = {
        points: [point],
        wait: true
      };

      await this.makeRequest(`/collections/${className}/points`, {
        method: 'PUT',
        body: JSON.stringify(body)
      });

      return { success: true, id: point.id };
    } catch (error) {
      console.error('Error creating object:', error);
      throw error;
    }
  }
}

export const qdrantService = new QdrantService();