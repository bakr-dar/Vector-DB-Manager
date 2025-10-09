import { NextResponse } from 'next/server';
import { weaviateService } from '@/lib/weaviate';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ className: string; id: string }> }
) {
  try {
    const { className, id } = await params;
    const body = await request.json();
    const result = await weaviateService.updateObject(id, className, body.properties);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error updating object:', error);
    return NextResponse.json({ success: false, error: 'Failed to update object' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ className: string; id: string }> }
) {
  try {
    const { className, id } = await params;
    await weaviateService.deleteObject(id, className);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting object:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete object' }, { status: 500 });
  }
}