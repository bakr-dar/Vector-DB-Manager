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
    
    const classes = await service.getClasses();
    return NextResponse.json({ classes });
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json({ classes: [], error: 'Failed to fetch classes' }, { status: 500 });
  }
}