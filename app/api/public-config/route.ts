import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

function readBinding(env: object | undefined, name: string): string {
  if (!env || !(name in env)) return "";
  const value = (env as Record<string, unknown>)[name];
  return typeof value === "string" ? value.trim() : "";
}

function readProcess(name: string): string {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

async function readPublicValue(name: string): Promise<string> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const fromBinding = readBinding(env, name);
    if (fromBinding) return fromBinding;
  } catch {
    /* next dev / non-Workers builds fall through to process.env */
  }
  return readProcess(name);
}

/** Browser bootstrap. The anon key is public; the service role key is never returned. */
export async function GET() {
  const url = await readPublicValue("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = await readPublicValue("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const body = `self.__MG_PUBLIC_ENV=${JSON.stringify({ url, anonKey })};`;

  return new Response(body, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
