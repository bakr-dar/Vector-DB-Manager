import { dbService } from '@/lib/db';
import { NextResponse } from 'next/server';
import { RequestWithCookies, DatabaseStatusResponse } from '@/types';

export async function GET(request: Request) {
  try {
    // Get database type from cookie or environment
    const cookies = (request as RequestWithCookies).cookies;
    const dbTypeCookie = cookies.get('db-type')?.value;
    const dbType = dbTypeCookie && ['weaviate', 'qdrant'].includes(dbTypeCookie) 
      ? dbTypeCookie 
      : (process.env.DATABASE_TYPE || 'weaviate');
    
    const connected = await dbService.checkConnection();
    const response: DatabaseStatusResponse = { 
      dbType, 
      connected,
      timestamp: new Date().toISOString()
    };
    return NextResponse.json(response);
  } catch {
    const response: DatabaseStatusResponse = { 
      dbType: process.env.DATABASE_TYPE || 'weaviate', 
      connected: false,
      error: 'Failed to check connection',
      timestamp: new Date().toISOString()
    };
    return NextResponse.json(response);
  }
}