import { NextResponse } from 'next/server';
import { weaviateService } from '@/lib/weaviate';
import { qdrantService } from '@/lib/qdrant';

export async function GET(request: Request) {
  try {
    // Get database type from cookie or default to environment variable
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [key, value] = c.trim().split('=');
        return [key, value];
      }).filter(([key]) => key)
    );
    
    const dbType = cookies['db-type'] || process.env.DATABASE_TYPE || 'weaviate';
    const service = dbType === 'qdrant' ? qdrantService : weaviateService;
    
    const enhancedStats = await service.getEnhancedStats();
    return NextResponse.json({ stats: enhancedStats });
  } catch (error) {
    console.error('Error fetching enhanced stats:', error);
    return NextResponse.json({ stats: null, error: 'Failed to fetch enhanced stats' }, { status: 500 });
  }
}