import { listServiceRequestMessages, sendServiceRequestMessage } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const customerId = req.nextUrl.searchParams.get("customerId")?.trim();
    if (!customerId) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 });
    }

    const messages = await listServiceRequestMessages(id, customerId);
    return NextResponse.json(messages);
  } catch (error) {
    console.error("[buyer/service-requests/messages GET]", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const customerId = String(body?.customerId ?? "").trim();
    const message = String(body?.message ?? "").trim();

    if (!customerId || !message) {
      return NextResponse.json({ error: "customerId and message are required" }, { status: 400 });
    }

    const created = await sendServiceRequestMessage(id, customerId, message);
    if (!created) {
      return NextResponse.json({ error: "Service request not found" }, { status: 404 });
    }
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[buyer/service-requests/messages POST]", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
