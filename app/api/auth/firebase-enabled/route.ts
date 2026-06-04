import { NextResponse } from "next/server";

/** Runtime check so the auth UI reflects .env without relying only on client bundle inlining. */
export async function GET() {
  const enabled = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim());
  return NextResponse.json({ enabled });
}
