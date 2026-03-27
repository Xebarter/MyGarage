import { getAnalytics } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const analytics = await getAnalytics();
    return NextResponse.json(analytics);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
