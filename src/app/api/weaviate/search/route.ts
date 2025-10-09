import { NextResponse } from 'next/server';
import { weaviateService } from '@/lib/weaviate';
import { qdrantService } from '@/lib/qdrant';
import { getCurrentDbType } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { className, query, limit = 10 } = body;
    
    if (!className || !query) {
      return NextResponse.json({ error: 'className and query are required' }, { status: 400 });
    }

    const dbType = getCurrentDbType();
    const service = dbType === 'qdrant' ? qdrantService : weaviateService;

    // For text search, convert to vector search for Qdrant if needed
    let results;
    if (dbType === 'qdrant') {
      // For now, we'll just return empty results for Qdrant text search
      // In a real implementation, you'd convert text to vectors using an embedding model
      results = [];
    } else {
      results = await service.searchObjects(className, query, limit);
    }
    
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error searching objects:', error);
    return NextResponse.json({ results: [], error: 'Search failed' }, { status: 500 });
  }
}