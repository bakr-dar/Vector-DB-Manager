import { weaviateService } from './weaviate';
import { qdrantService } from './qdrant';

// Function to get current database type from cookie or environment
function getCurrentDbType() {
  if (typeof window !== 'undefined') {
    // Client-side: check localStorage first, then cookie
    const stored = localStorage.getItem('db-type');
    if (stored && ['weaviate', 'qdrant'].includes(stored)) {
      return stored;
    }
    
    // Check cookie
    const cookies = document.cookie.split(';');
    const dbTypeCookie = cookies.find(c => c.trim().startsWith('db-type='));
    if (dbTypeCookie) {
      const value = dbTypeCookie.split('=')[1];
      if (['weaviate', 'qdrant'].includes(value)) {
        return value;
      }
    }
  }
  
  // Fallback to environment variable
  return process.env.DATABASE_TYPE || 'weaviate';
}

// Function to get the appropriate service
function getDbService() {
  const dbType = getCurrentDbType();
  return dbType === 'qdrant' ? qdrantService : weaviateService;
}

// Create a typed interface for the database service
interface DatabaseService {
  checkConnection: () => Promise<boolean>;
  getClasses: () => Promise<Record<string, unknown>[]>;
  getClassObjects: (className: string, limit?: number, offset?: number) => Promise<Record<string, unknown>[]>;
  getClassObjectsWithCount: (className: string, limit?: number, offset?: number) => Promise<{
    objects: Record<string, unknown>[];
    totalCount: number;
    hasMore: boolean;
    currentPage: number;
    totalPages: number;
  }>;
  getEnhancedStats: () => Promise<Record<string, unknown>>;
  getDatabaseStats: () => Promise<Record<string, unknown>>;
  createObject: (className: string, properties: Record<string, unknown>) => Promise<Record<string, unknown>>;
  updateObject: (id: string, className: string, properties: Record<string, unknown>) => Promise<Record<string, unknown>>;
  deleteObject: (id: string, className: string) => Promise<Record<string, unknown>>;
  createClass: (classDefinition: { class: string; properties?: unknown[] }) => Promise<Record<string, unknown>>;
  deleteClass: (className: string) => Promise<Record<string, unknown>>;
  searchObjects: (className: string, query: Record<string, unknown>, limit?: number) => Promise<Record<string, unknown>[]>;
  getClassProperties: (className: string) => Promise<Record<string, unknown>[]>;
  bulkDeleteObjects: (className: string, objectIds: string[]) => Promise<Record<string, unknown>[]>;
  getClassObjectCount: (className: string) => Promise<number>;
}

// Export a proxy object that dynamically selects the service
export const dbService: DatabaseService = new Proxy({} as DatabaseService, {
  get(target, prop) {
    const service = getDbService();
    const value = (service as unknown as Record<string, unknown>)[prop as string];
    return typeof value === 'function' ? value.bind(service) : value;
  }
});

// Export utility functions
export { getCurrentDbType };