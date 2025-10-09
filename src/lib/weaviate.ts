import weaviate, { WeaviateClient, ApiKey } from 'weaviate-ts-client';

class WeaviateService {
  private client: WeaviateClient;

  constructor() {
    const url = process.env.WEAVIATE_URL || 'http://localhost:8080';
    
    // Parse the URL to handle cases where /v1 is already included
    let cleanUrl = url;
    if (url.endsWith('/v1')) {
      cleanUrl = url.slice(0, -3);
    }
    
    const config = {
      scheme: cleanUrl.startsWith('https') ? 'https' : 'http',
      host: cleanUrl.replace(/https?:\/\//, ''),
      ...(process.env.WEAVIATE_API_KEY && { 
        apiKey: new ApiKey(process.env.WEAVIATE_API_KEY) 
      })
    };

    this.client = weaviate.client(config);
  }

  async getSchema() {
    try {
      return await this.client.schema.getter().do();
    } catch (error) {
      console.error('Error fetching schema:', error);
      throw error;
    }
  }

  async getClasses() {
    try {
      const schema = await this.getSchema();
      return schema.classes || [];
    } catch (error) {
      console.error('Error fetching classes:', error);
      return [];
    }
  }

  async getClassObjects(className: string, limit: number = 20, offset: number = 0) {
    try {
      const query = this.client.data
        .getter()
        .withClassName(className)
        .withLimit(Math.min(limit + offset, 1000)); // Cap at 1000 to prevent memory issues

      const result = await query.do();
      const allObjects = result.objects || [];

      // Client-side pagination
      if (offset > 0) {
        console.warn(`Weaviate: Offset not natively supported, using client-side pagination (offset=${offset}, limit=${limit})`);
      }
      const paginatedObjects = allObjects.slice(offset, offset + limit);

      return paginatedObjects;
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

      console.log(`Pagination calc: totalCount=${totalCount}, limit=${limit}, offset=${offset}, totalPages=${totalPages}, currentPage=${currentPage}`);

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

  async searchObjects(className: string, query: string, limit: number = 10) {
    try {
      // Get class properties to build proper field query
      const properties = await this.getClassProperties(className);
      const propertyFields = properties.map(p => p.name).join(' ');
      
      // Try nearText search first
      let result;
      try {
        result = await this.client.graphql
          .get()
          .withClassName(className)
          .withNearText({ concepts: [query] })
          .withLimit(limit)
          .withFields(`_additional { id } ${propertyFields}`)
          .do();
        
        if (result.data?.Get?.[className]?.length > 0) {
          // Transform to match REST API format with properties object
          return result.data.Get[className].map((obj: Record<string, unknown>) => ({
            id: (obj._additional as Record<string, unknown>)?.id,
            properties: Object.fromEntries(
              properties.map(p => [p.name, obj[p.name as keyof typeof obj]]).filter(([, value]) => value !== undefined)
            ),
            _additional: obj._additional
          }));
        }
      } catch (nearTextError) {
        console.log('NearText search failed, trying property-based search:', nearTextError);
      }

      // Fallback to property-based search using REST API
      const searchableProps = properties.filter(p => 
        (p.dataType && p.dataType.includes('string')) || (p.dataType && p.dataType.includes('text'))
      );

      if (searchableProps.length === 0) {
        return [];
      }

      // Use REST API for more reliable search
      const restResult = await this.client.data
        .getter()
        .withClassName(className)
        .withLimit(limit)
        .do();

      // Filter results client-side for property matching
      const filtered = (restResult.objects || []).filter(obj => {
        if (!obj.properties) return false;
        
        return searchableProps.some(prop => {
          const value = obj.properties?.[prop.name as string];
          return value && 
                 typeof value === 'string' && 
                 value.toLowerCase().includes(query.toLowerCase());
        });
      });

      return filtered;
    } catch (error) {
      console.error(`Error searching objects in ${className}:`, error);
      return [];
    }
  }

  async getClassProperties(className: string) {
    try {
      const schema = await this.getSchema();
      const classData = schema.classes?.find(cls => cls.class === className);
      return classData?.properties || [];
    } catch (error) {
      console.error(`Error getting properties for class ${className}:`, error);
      return [];
    }
  }

  async createObject(className: string, properties: Record<string, unknown>) {
    try {
      return await this.client.data
        .creator()
        .withClassName(className)
        .withProperties(properties)
        .do();
    } catch (error) {
      console.error(`Error creating object in ${className}:`, error);
      throw error;
    }
  }

  async updateObject(id: string, className: string, properties: Record<string, unknown>) {
    try {
      return await this.client.data
        .updater()
        .withId(id)
        .withClassName(className)
        .withProperties(properties)
        .do();
    } catch (error) {
      console.error(`Error updating object ${id}:`, error);
      throw error;
    }
  }

  async deleteObject(id: string, className: string) {
    try {
      return await this.client.data
        .deleter()
        .withId(id)
        .withClassName(className)
        .do();
    } catch (error) {
      console.error(`Error deleting object ${id}:`, error);
      throw error;
    }
  }

  async checkConnection() {
    try {
      await this.client.misc.liveChecker().do();
      return true;
    } catch (error) {
      console.error('Weaviate connection failed:', error);
      return false;
    }
  }

  async createClass(classDefinition: Record<string, unknown>) {
    try {
      return await this.client.schema.classCreator().withClass(classDefinition).do();
    } catch (error) {
      console.error('Error creating class:', error);
      throw error;
    }
  }

  async deleteClass(className: string) {
    try {
      return await this.client.schema.classDeleter().withClassName(className).do();
    } catch (error) {
      console.error(`Error deleting class ${className}:`, error);
      throw error;
    }
  }

  async getDatabaseStats() {
    try {
      const meta = await this.client.misc.metaGetter().do();
      const schema = await this.getSchema();
      
      // Calculate total objects across all classes
      let totalObjects = 0;
      const classStats = [];

      for (const cls of schema.classes || []) {
        try {
          await this.getClassObjects(cls.class!, 1);
          const count = await this.getClassObjectCount(cls.class!);
          totalObjects += count;
          classStats.push({
            name: cls.class!,
            objectCount: count,
            properties: cls.properties?.length || 0
          });
        } catch (error) {
          console.error(`Error getting stats for class ${cls.class}:`, error);
          classStats.push({
            name: cls.class,
            objectCount: 0,
            properties: cls.properties?.length || 0
          });
        }
      }

      return {
        version: meta.version || 'Unknown',
        totalClasses: schema.classes?.length || 0,
        totalObjects,
        classStats,
        modules: meta.modules || {},
        nodeInfo: meta.hostname || 'Unknown'
      };
    } catch (error) {
      console.error('Error fetching database stats:', error);
      throw error;
    }
  }

  async getClusterNodes() {
    try {
      // Make raw HTTP request to nodes endpoint
      const url = process.env.WEAVIATE_URL || 'http://localhost:8080';
      const cleanUrl = url.endsWith('/v1') ? url : `${url}/v1`;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (process.env.WEAVIATE_API_KEY) {
        headers['Authorization'] = `Bearer ${process.env.WEAVIATE_API_KEY}`;
      }

      const response = await fetch(`${cleanUrl}/nodes?output=verbose`, {
        headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching cluster nodes:', error);
      return { nodes: [] };
    }
  }

  async getClusterStatistics() {
    try {
      const url = process.env.WEAVIATE_URL || 'http://localhost:8080';
      const cleanUrl = url.endsWith('/v1') ? url : `${url}/v1`;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (process.env.WEAVIATE_API_KEY) {
        headers['Authorization'] = `Bearer ${process.env.WEAVIATE_API_KEY}`;
      }

      const response = await fetch(`${cleanUrl}/cluster/statistics`, {
        headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching cluster statistics:', error);
      return { statistics: [], synchronized: false };
    }
  }

  async getEnhancedStats() {
    try {
      const [basicStats, clusterNodes, clusterStats] = await Promise.all([
        this.getDatabaseStats(),
        this.getClusterNodes(),
        this.getClusterStatistics()
      ]);

      // Extract performance metrics from nodes
      const performanceMetrics = {
        totalNodes: clusterNodes.nodes?.length || 0,
        healthyNodes: clusterNodes.nodes?.filter((n: Record<string, unknown>) => n.status === 'HEALTHY').length || 0,
        totalShards: 0,
        indexingShards: 0,
        totalBatchRate: 0,
        totalVectorQueue: 0
      };

      const shardDetails = [];

      if (clusterNodes.nodes) {
        for (const node of clusterNodes.nodes) {
          if (node.stats) {
            performanceMetrics.totalShards += node.stats.shardCount || 0;
          }
          
          if (node.batchStats) {
            performanceMetrics.totalBatchRate += node.batchStats.ratePerSecond || 0;
          }

          if (node.shards) {
            performanceMetrics.indexingShards += node.shards.filter((s: Record<string, unknown>) => s.vectorIndexingStatus === 'INDEXING').length;
            
            for (const shard of node.shards) {
              performanceMetrics.totalVectorQueue += shard.vectorQueueLength || 0;
              shardDetails.push({
                nodeName: node.name,
                shardName: shard.name,
                className: shard.class,
                objectCount: shard.objectCount || 0,
                vectorIndexingStatus: shard.vectorIndexingStatus || 'READY',
                vectorQueueLength: shard.vectorQueueLength || 0
              });
            }
          }
        }
      }

      return {
        ...basicStats,
        clusterHealth: {
          nodes: clusterNodes.nodes || [],
          synchronized: clusterStats.synchronized || false,
          statistics: clusterStats.statistics || []
        },
        performanceMetrics,
        shardDetails
      };
    } catch (error) {
      console.error('Error fetching enhanced stats:', error);
      throw error;
    }
  }

  async getClassObjectCount(className: string) {
    try {
      const result = await this.client.graphql
        .aggregate()
        .withClassName(className)
        .withFields('meta { count }')
        .do();
      
      return result.data?.Aggregate?.[className]?.[0]?.meta?.count || 0;
    } catch (error) {
      console.error(`Error getting object count for class ${className}:`, error);
      return 0;
    }
  }

  async bulkDeleteObjects(className: string, objectIds: string[]) {
    try {
      const results = [];
      for (const id of objectIds) {
        try {
          await this.deleteObject(id, className);
          results.push({ id, success: true });
        } catch (error) {
          results.push({ id, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
      return results;
    } catch (error) {
      console.error('Error in bulk delete:', error);
      throw error;
    }
  }
}

export const weaviateService = new WeaviateService();