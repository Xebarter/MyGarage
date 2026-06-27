import { createAdminClient } from '@/lib/supabase/admin';

import {
  isAdminEmailAllowlisted,
  metadataGrantsAdmin,
  parseAdminEmailAllowlist,
  userHasAdminAccess,
  userHasAdminPortalAccess,
} from '@/lib/auth-admin-shared';

export {
  isAdminEmailAllowlisted,
  metadataGrantsAdmin,
  parseAdminEmailAllowlist,
  userHasAdminAccess,
  userHasAdminPortalAccess,
} from '@/lib/auth-admin-shared';

/** Authoritative check via service role — reads fresh app_metadata from auth.users. */
export async function verifyAdminAccessForUserId(userId: string): Promise<boolean> {
  const id = userId.trim();
  if (!id) return false;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.getUserById(id);
    if (error || !data.user) {
      return false;
    }

    const user = data.user;
    if (isAdminEmailAllowlisted(user.email)) return true;
    return metadataGrantsAdmin(user.app_metadata as Record<string, unknown>);
  } catch (error) {
    console.error('verifyAdminAccessForUserId failed:', error);
    return false;
  }
}
