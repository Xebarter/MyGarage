import { NextRequest, NextResponse } from "next/server";

import { insertContactMessage } from "@/lib/supabase/contact-messages-repo";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clip(value: unknown, max: number): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Honeypot — treat as success so bots do not retry.
    const website = String(body.website ?? body.company ?? "").trim();
    if (website) {
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    const name = clip(body.name, 120);
    const email = clip(body.email, 254).toLowerCase();
    const phone = clip(body.phone, 40);
    const message = String(body.message ?? "").trim().slice(0, 4000);

    if (name.length < 2) {
      return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (message.length < 10) {
      return NextResponse.json({ error: "Please tell us a bit more about how we can help." }, { status: 400 });
    }

    const saved = await insertContactMessage({ name, email, phone, message });
    return NextResponse.json({ ok: true, id: saved.id }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/contact-messages]", error);
    return NextResponse.json({ error: "Unable to send your message. Please try again." }, { status: 500 });
  }
}
