import { deleteVendor, getVendor, updateVendor } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vendor = await getVendor(id);
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    return NextResponse.json(vendor);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch vendor' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Only admins may toggle verification flags.
    if (body && (body.vendorVerified !== undefined || body.servicesVerified !== undefined)) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const appRole = String(user?.app_metadata?.role ?? "").toLowerCase();
      const appRoles = Array.isArray(user?.app_metadata?.roles)
        ? (user?.app_metadata?.roles as unknown[]).map((r) => String(r).toLowerCase())
        : [];
      const isAdminUser = appRole === "admin" || appRoles.includes("admin");

      if (!isAdminUser) {
        delete body.vendorVerified;
        delete body.servicesVerified;
      }
    }
    const vendor = await updateVendor(id, body);
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    return NextResponse.json(vendor);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteVendor(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[DELETE /api/vendors/:id]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
