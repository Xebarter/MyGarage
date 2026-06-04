# Google sign-in setup (Supabase OAuth)

MyGarage uses **Supabase Google OAuth** (redirect to Google, then back to `/auth`). Firebase env vars are **optional** (Analytics only) and are **not** required for Google sign-in.

---

## Why you saw `invalid_client` / invalid client secret (Firebase)

That error came from **Firebase Authentication** using a wrong Google OAuth **client secret** at:

`https://mygarage-2688a.firebaseapp.com/__/auth/handler`

Common causes:

- Pasting **Supabase** Google credentials into **Firebase** (or the reverse).
- Rotating the secret in Google Cloud but not updating the console that uses it.
- Using a deleted or wrong OAuth “Web client”.

The app no longer uses Firebase for the Google popup. Configure Google **once** in **Supabase** (below).

---

## Step 1 — Google Cloud OAuth client (for Supabase)

1. Open [Google Cloud Console](https://console.cloud.google.com/) → project linked to your app (e.g. `mygarage-2688a` or a dedicated project).
2. **APIs & Services** → **OAuth consent screen** — complete app name, support email, scopes (`email`, `profile`, `openid`). Add **test users** while in Testing mode.
3. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**.
4. Application type: **Web application**.
5. **Authorized JavaScript origins** (add all you use):
   - `http://localhost:3000`
   - `https://mygarage.ug`
6. **Authorized redirect URIs** — copy the exact callback from Supabase (Step 2), typically:
   - `https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback`  
     Example: `https://kystrhrzaliytdgfrfot.supabase.co/auth/v1/callback`
7. Create → copy **Client ID** and **Client secret**.

---

## Step 2 — Supabase Dashboard

Project: **kystrhrzaliytdgfrfot** (from `NEXT_PUBLIC_SUPABASE_URL`)

1. **Authentication** → **Providers** → **Google** → Enable.
2. Paste **Client ID** and **Client secret** from Step 1 (same pair).
3. Copy the **Callback URL** shown on that page into Google redirect URIs if you have not already.
4. **Authentication** → **URL Configuration**:
   - **Site URL:** `https://mygarage.ug` (or `http://localhost:3000` for local dev)
   - **Redirect URLs:**
     ```
     http://localhost:3000/**
     https://mygarage.ug/**
     ```
5. **Save**.

---

## Step 3 — App environment

```env
NEXT_PUBLIC_APP_URL=https://mygarage.ug
NEXT_PUBLIC_SUPABASE_URL=https://kystrhrzaliytdgfrfot.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Restart dev server or redeploy after changes.

---

## Step 4 — Test

1. Open `/auth?role=buyer`.
2. Click **Continue with Google**.
3. You should leave the site briefly, sign in with Google, return to `/auth`, then redirect to `/buyer` (or phone step for new buyers).

---

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| `redirect_uri_mismatch` | Add Supabase callback URL exactly in Google **Authorized redirect URIs**. |
| `invalid_client` | Client ID and secret in Supabase must match the **same** Google OAuth Web client. |
| `access_denied` | Add your Gmail under OAuth consent **Test users** (Testing mode). |
| Returns to `/auth` but not signed in | Check Supabase **Redirect URLs** include your site with `/**`. |
| Works on localhost, not production | Set `NEXT_PUBLIC_APP_URL` and Supabase redirect URLs for `https://mygarage.ug`. |

---

## Optional — Firebase (Analytics only)

If you use Firebase Analytics, keep `NEXT_PUBLIC_FIREBASE_*` in `.env`. Do **not** rely on Firebase Authentication for Google login unless you fix its OAuth secret separately in Firebase Console → Authentication → Google.
