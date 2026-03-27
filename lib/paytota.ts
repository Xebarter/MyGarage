import crypto from "crypto";

type JsonRecord = Record<string, unknown>;

const DEFAULT_BASE_URL = "https://gate.paytota.com";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

export function getPaytotaConfig() {
  const baseUrl = (process.env.PAYTOTA_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
  const secretKey = getRequiredEnv("PAYTOTA_SECRET_KEY");
  const brandId = getRequiredEnv("PAYTOTA_BRAND_ID");
  return { baseUrl, secretKey, brandId };
}

function buildAuthHeaders(secretKey: string, contentType = "application/json"): HeadersInit {
  return {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": contentType,
  };
}

async function parsePaytotaResponse(res: Response) {
  const text = await res.text();
  let data: JsonRecord | null = null;
  try {
    data = text ? (JSON.parse(text) as JsonRecord) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const nestedError = (data?.error as JsonRecord | undefined) ?? (data?.details as JsonRecord | undefined);
    const messageCandidate =
      (typeof data?.message === "string" && data.message) ||
      (typeof nestedError?.message === "string" && nestedError.message) ||
      (typeof data?.error === "string" && (data.error as string)) ||
      (typeof data?.details === "string" && (data.details as string));

    // Paytota sometimes returns validation errors without a stable `error.message` field.
    // Fall back to the raw response body to make debugging possible.
    const fallback = text?.trim() ? `Paytota request failed (${res.status}): ${text.trim()}` : `Paytota request failed with status ${res.status}`;
    throw new Error(messageCandidate ? `Paytota request failed (${res.status}): ${messageCandidate}` : fallback);
  }
  return data ?? {};
}

export async function createPurchase(payload: JsonRecord) {
  const { baseUrl, secretKey } = getPaytotaConfig();
  const res = await fetch(`${baseUrl}/api/v1/purchases/`, {
    method: "POST",
    headers: buildAuthHeaders(secretKey),
    body: JSON.stringify(payload),
  });
  return parsePaytotaResponse(res);
}

export async function createPayout(payload: JsonRecord) {
  const { baseUrl, secretKey } = getPaytotaConfig();
  const res = await fetch(`${baseUrl}/api/v1/payouts/`, {
    method: "POST",
    headers: buildAuthHeaders(secretKey),
    body: JSON.stringify(payload),
  });
  return parsePaytotaResponse(res);
}

export async function executePayout(executionUrl: string, payload: JsonRecord) {
  const { secretKey } = getPaytotaConfig();
  const res = await fetch(executionUrl, {
    method: "POST",
    headers: buildAuthHeaders(secretKey),
    body: JSON.stringify(payload),
  });
  return parsePaytotaResponse(res);
}

function normalizePem(key: string): string {
  const trimmed = key.trim();
  if (trimmed.includes("\\n")) return trimmed.replace(/\\n/g, "\n");
  return trimmed;
}

export function verifyPaytotaSignature(rawBody: Buffer, signature: string | null): boolean {
  if (!signature) return false;

  const key =
    process.env.PAYTOTA_WEBHOOK_PUBLIC_KEY ||
    process.env.PAYTOTA_WEBHOOK_SECRET ||
    process.env.NEXT_PUBLIC_PAYTOTA_PUBLIC_KEY;

  if (!key || key.trim().length === 0) {
    throw new Error("Missing PAYTOTA webhook public key env variable");
  }

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(rawBody);
  verifier.end();

  return verifier.verify(normalizePem(key), Buffer.from(signature, "base64"));
}

