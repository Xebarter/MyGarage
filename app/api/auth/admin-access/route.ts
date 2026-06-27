import { NextResponse } from 'next/server';

import { userHasAdminAccess, verifyAdminAccessForUserId } from '@/lib/auth-admin';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ allowed: false }, { status: 401 });
    }

    // Fast path: env allowlist or JWT app_metadata already has admin.
    if (userHasAdminAccess(user)) {
      return NextResponse.json({ allowed: true, source: 'session' });
    }

    // Authoritative path: read fresh app_metadata from Supabase Auth (post-SQL grant).
    const allowed = await verifyAdminAccessForUserId(user.id);
    return NextResponse.json({ allowed, source: allowed ? 'database' : 'denied' });
  } catch (error) {
    console.error('[GET /api/auth/admin-access]', error);
    return NextResponse.json({ allowed: false, error: 'check_failed' }, { status: 500 });
  }
}
