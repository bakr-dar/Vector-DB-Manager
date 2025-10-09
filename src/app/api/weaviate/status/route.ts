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
    
    const connected = await service.checkConnection();
    return NextResponse.json({ connected });
  } catch (error) {
    console.error('Connection check failed:', error);
    return NextResponse.json({ connected: false, error: 'Connection failed' });
  }
}