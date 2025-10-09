import { NextResponse } from 'next/server';
import { weaviateService } from '@/lib/weaviate';

export async function GET() {
  try {
    const schema = await weaviateService.getSchema();
    return NextResponse.json({ schema });
  } catch (error) {
    console.error('Error fetching schema:', error);
    return NextResponse.json({ schema: null, error: 'Failed to fetch schema' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await weaviateService.createClass(body);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error creating class:', error);
    return NextResponse.json({ success: false, error: 'Failed to create class' }, { status: 500 });
  }
}