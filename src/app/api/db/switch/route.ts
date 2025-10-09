import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { dbType } = await request.json();
    
    if (!['weaviate', 'qdrant'].includes(dbType)) {
      return NextResponse.json(
        { error: 'Invalid database type. Must be "weaviate" or "qdrant"' },
        { status: 400 }
      );
    }

    // Store the selection in a way that persists across requests
    // For now, we'll use a simple approach with response headers
    const response = NextResponse.json({ 
      success: true, 
      dbType,
      message: `Switched to ${dbType} database` 
    });
    
    // Set a cookie to persist the database selection
    response.cookies.set('db-type', dbType, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });
    
    return response;
  } catch {
    return NextResponse.json(
      { error: 'Failed to switch database' },
      { status: 500 }
    );
  }
}