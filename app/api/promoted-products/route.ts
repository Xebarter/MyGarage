import { NextRequest, NextResponse } from "next/server";
import { createPromoCarouselItem, getPromoCarouselItems } from "@/lib/db";

export async function GET() {
  try {
    const items = await getPromoCarouselItems();
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Failed to fetch promoted products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const created = await createPromoCarouselItem(body);
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create promoted product" }, { status: 500 });
  }
}

