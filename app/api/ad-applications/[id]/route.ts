import { getAdApplication, updateAdApplication } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const existing = await getAdApplication(id);
    if (!existing) {
      return NextResponse.json({ error: 'Ad application not found' }, { status: 404 });
    }

    const updated = await updateAdApplication(id, { status });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update ad application' }, { status: 500 });
  }
}
