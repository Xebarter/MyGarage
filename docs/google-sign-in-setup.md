# Google sign-in setup (Firebase + Supabase)

MyGarage uses **Firebase** for the Google popup and **Supabase** for the session the rest of the app expects.

---

## Part A — Firebase Console

Project: **mygarage-2688a** (or your Firebase project)

### 1. Enable Google sign-in

1. Open [Firebase Console](https://console.firebase.google.com/) → your project.
2. **Build** → **Authentication** → **Sign-in method**.
3. Click **Google** → turn **Enable** on.
4. Choose a **Project support email** → **Save**.

### 2. Authorized domains

1. Still under **Authentication** → **Settings** → **Authorized domains**.
2. Ensure these exist (add if missing):
   - `localhost` (local dev)
   - `mygarage.ug` (production)
   - `mygarage-2688a.firebaseapp.com` (usually added by default)

### 3. Web app config (for `.env`)

1. **Project settings** (gear) → **General** → **Your apps** → Web app.
2. Copy into `.env`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...   # optional
```

3. Restart the Next.js dev server after changing `.env` (`Ctrl+C`, then `npm run dev`).
4. On **Vercel/hosting**, add the same variables in the project **Environment Variables** and redeploy.

---

## Part B — Google Cloud (OAuth client)

Firebase creates a Google OAuth **Web client** automatically.

### 4. Find Client ID and Client Secret

1. Open [Google Cloud Console](https://console.cloud.google.com/) → select the **same project** linked to Firebase (often named like `mygarage-2688a`).
2. **APIs & Services** → **Credentials**.
3. Under **OAuth 2.0 Client IDs**, open the **Web client** used by Firebase (name often includes “Web client” or your Firebase app id).
4. Copy:
   - **Client ID**
   - **Client secret**

### 5. OAuth consent screen (if prompted)

1. **APIs & Services** → **OAuth consent screen**.
2. User type: **External** (or Internal for workspace-only).
3. Fill app name, support email, developer contact.
4. **Scopes**: default `email`, `profile`, `openid` are enough.
5. **Test users**: while in “Testing”, add your Gmail for testing.

---

## Part C — Supabase Dashboard

Project: **kystrhrzaliytdgfrfot** (your Supabase URL host)

Supabase must accept the **Google ID token** from the Firebase popup via `signInWithIdToken`.

### 6. Enable Google provider

1. [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. **Authentication** → **Providers** → **Google**.
3. Turn **Google Enabled** on.
4. Paste the **same** Client ID and Client Secret from Part B (Firebase’s Web client).
5. **Save**.

### 7. URL configuration

1. **Authentication** → **URL Configuration**.
2. **Site URL**: `https://mygarage.ug` (or `http://localhost:3000` while developing locally).
3. **Redirect URLs** — add each line you use:

```
http://localhost:3000/**
https://mygarage.ug/**
```

4. **Save**.

### 8. Email confirmations (optional for Google users)

Google users often skip email/password confirmation. Under **Authentication** → **Providers** / **Email**, adjust “Confirm email” if Google sign-ups should work without a confirmation email.

---

## Part D — Verify in the app

1. Open `/auth?role=buyer` (or vendor/services).
2. You should see **Continue with Google** above the email form.
3. Click it → Google account picker → you should land in the buyer dashboard (or phone step for new buyers).

### Common errors

| Symptom | Fix |
|--------|-----|
| No Google button | Add `NEXT_PUBLIC_FIREBASE_*` to `.env` or hosting env; restart/redeploy. |
| `auth/unauthorized-domain` | Add your domain under Firebase **Authorized domains**. |
| `Provider google is not enabled` | Enable Google in Supabase **Providers**. |
| `Invalid token` / JWT errors | Use the **same** Google Web Client ID in Supabase as Firebase/Google Cloud. |
| Works locally, not on production | Add Firebase + Supabase env/config on the host; redeploy. |

---

## How it works (short)

```text
User → Firebase Google popup → Google ID token
     → Supabase signInWithIdToken(provider: google)
     → Supabase session cookie → existing middleware & portals
```
