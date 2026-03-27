import { getCustomerByEmail, getCustomers, createCustomer } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    if (email) {
      const customer = await getCustomerByEmail(email);
      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }
      return NextResponse.json(customer);
    }
    const customers = await getCustomers();
    return NextResponse.json(customers);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const customer = await createCustomer(body);
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
