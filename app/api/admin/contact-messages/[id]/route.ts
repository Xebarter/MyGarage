import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { userHasAdminAccess } from "@/lib/auth-admin";
import {
  deleteContactMessageById,
  isContactMessageStatus,
  serializeContactMessage,
  updateContactMessageById,
} from "@/lib/supabase/contact-messages-repo";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !userHasAdminAccess(user)) return null;
  return user;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Admin required" }, { status: 403 });
    }

    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Message id is required" }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const statusRaw = typeof body?.status === "string" ? body.status.trim() : undefined;
    const adminNotes = typeof body?.adminNotes === "string" ? body.adminNotes.slice(0, 4000) : undefined;

    if (statusRaw !== undefined && !isContactMessageStatus(statusRaw)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updated = await updateContactMessageById(id.trim(), {
      status: statusRaw && isContactMessageStatus(statusRaw) ? statusRaw : undefined,
      adminNotes,
    });
    if (!updated) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    return NextResponse.json(serializeContactMessage(updated));
  } catch (error) {
    console.error("[PATCH /api/admin/contact-messages/:id]", error);
    const message = error instanceof Error ? error.message : "Failed to update message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Admin required" }, { status: 403 });
    }

    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Message id is required" }, { status: 400 });
    }

    const deleted = await deleteContactMessageById(id.trim());
    if (!deleted) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/admin/contact-messages/:id]", error);
    const message = error instanceof Error ? error.message : "Failed to delete message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
