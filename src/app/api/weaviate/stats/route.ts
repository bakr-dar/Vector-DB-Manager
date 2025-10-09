import { NextResponse } from 'next/server';
import { weaviateService } from '@/lib/weaviate';
import { qdrantService } from '@/lib/qdrant';
import { getCurrentDbType } from '@/lib/db';

export async function GET() {
  try {
    const dbType = getCurrentDbType();
    const service = dbType === 'qdrant' ? qdrantService : weaviateService;
    
    const stats = await service.getDatabaseStats();
    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching database stats:', error);
    return NextResponse.json({ stats: null, error: 'Failed to fetch stats' }, { status: 500 });
  }
}