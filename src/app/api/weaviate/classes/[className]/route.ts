import { NextResponse } from 'next/server';
import { weaviateService } from '@/lib/weaviate';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ className: string }> }
) {
  try {
    const { className } = await params;
    await weaviateService.deleteClass(className);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting class:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete class' }, { status: 500 });
  }
}