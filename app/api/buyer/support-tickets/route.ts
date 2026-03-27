import { createBuyerSupportTicket, getBuyerSupportTickets } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }
    const tickets = await getBuyerSupportTickets(customerId);
    return NextResponse.json(tickets);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch buyer support tickets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, subject, message, orderId, priority } = body;
    if (!customerId || !subject || !message) {
      return NextResponse.json({ error: 'customerId, subject and message are required' }, { status: 400 });
    }
    const created = await createBuyerSupportTicket({
      customerId,
      subject,
      message,
      orderId,
      priority: priority || 'normal',
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create support ticket' }, { status: 500 });
  }
}
