export const MOBILE_APP_BUCKET = "mobile-apps";
export const MOBILE_APP_MAX_BYTES = 75 * 1024 * 1024;
export const MOBILE_APP_MIME_TYPES = [
  "application/vnd.android.package-archive",
  "application/octet-stream",
  "application/zip",
  "application/java-archive",
  "application/x-itunes-ipa",
] as const;

export const MOBILE_APP_PLATFORMS = ["android", "ios"] as const;
export type MobileAppPlatform = (typeof MOBILE_APP_PLATFORMS)[number];
export const MOBILE_APP_SIGNED_URL_SECONDS = 10 * 60;

export const MOBILE_APP_AUDIENCES = ["public", "vendor", "services"] as const;
export type MobileAppAudience = (typeof MOBILE_APP_AUDIENCES)[number];

export const MOBILE_APP_COPY: Record<
  MobileAppAudience,
  { title: string; description: string; sidebarLabel: string; adminTitle: string }
> = {
  public: {
    title: "MyGarage app",
    description: "Shop parts, track orders, and book services from your Android phone.",
    sidebarLabel: "Get the app",
    adminTitle: "Public app",
  },
  vendor: {
    title: "Supplier app",
    description: "Manage products, orders, and payouts from the MyGarage supplier app.",
    sidebarLabel: "Supplier app",
    adminTitle: "Supplier app",
  },
  services: {
    title: "Service provider app",
    description: "Take jobs and manage your services from the MyGarage provider app.",
    sidebarLabel: "Provider app",
    adminTitle: "Service provider app",
  },
};

const ALLOWED_MIME = new Set([
  "application/vnd.android.package-archive",
  "application/octet-stream",
  "application/zip",
  "application/java-archive",
  "application/x-itunes-ipa",
  "",
]);

const FILE_ID = String.raw`\d{13}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`;

export type MobileAppRelease = {
  audience: MobileAppAudience;
  platform: MobileAppPlatform;
  storagePath: string;
  fileName: string;
  fileSize: number;
  versionLabel: string;
  notes: string;
  updatedAt: string;
};

export type MobileAppPlatformDownload = {
  platform: MobileAppPlatform;
  fileName: string;
  fileSize: number;
  versionLabel: string;
  notes: string;
  updatedAt: string;
  downloadUrl: string;
};

export type MobileAppCatalog = {
  audience: MobileAppAudience;
  android: MobileAppPlatformDownload | null;
  ios: MobileAppPlatformDownload | null;
};

export function isMobileAppAudience(value: string): value is MobileAppAudience {
  return (MOBILE_APP_AUDIENCES as readonly string[]).includes(value);
}

export function isMobileAppPlatform(value: string): value is MobileAppPlatform {
  return (MOBILE_APP_PLATFORMS as readonly string[]).includes(value);
}

export function appFileExtension(platform: MobileAppPlatform): "apk" | "ipa" {
  return platform === "ios" ? "ipa" : "apk";
}

export function appContentType(platform: MobileAppPlatform, contentType: string): string {
  const mime = contentType.trim().toLowerCase();
  if (platform === "ios") {
    if (mime === "application/zip" || mime === "application/x-itunes-ipa") return mime;
    return "application/octet-stream";
  }
  if (mime === "application/octet-stream" || mime === "application/zip" || mime === "application/java-archive") {
    return mime;
  }
  return "application/vnd.android.package-archive";
}

export function validateAppUpload(
  platform: MobileAppPlatform,
  fileName: string,
  contentType: string,
  fileSize: number,
): string | null {
  const name = fileName.trim();
  const extension = appFileExtension(platform);
  if (!name.toLowerCase().endsWith(`.${extension}`)) {
    return platform === "ios" ? "Upload an iOS IPA file." : "Upload an Android APK file.";
  }
  if (!ALLOWED_MIME.has(contentType.trim().toLowerCase())) {
    return platform === "ios" ? "That file type is not an IPA." : "That file type is not an APK.";
  }
  if (!Number.isFinite(fileSize) || fileSize <= 0) return "Choose an app file.";
  if (fileSize > MOBILE_APP_MAX_BYTES) return "The file must be 75 MB or smaller.";
  return null;
}

export function cleanAppFileName(fileName: string, platform: MobileAppPlatform): string {
  const extension = appFileExtension(platform);
  const fallback = `app.${extension}`;
  const base = (fileName.split(/[/\\]/).pop() ?? fallback).trim();
  const cleaned = base.replace(/[^\w.\- ()]/g, "_").replace(/\s+/g, " ").trim() || fallback;
  const withExt = cleaned.toLowerCase().endsWith(`.${extension}`) ? cleaned : `${cleaned}.${extension}`;
  if (withExt.length <= 180) return withExt;
  return `${withExt.slice(0, 176)}.${extension}`;
}

export function isOwnedStoragePath(
  audience: MobileAppAudience,
  platform: MobileAppPlatform,
  storagePath: string,
): boolean {
  const extension = appFileExtension(platform);
  const modern = new RegExp(`^${audience}/${platform}/${FILE_ID}\\.${extension}$`);
  if (modern.test(storagePath)) return true;
  if (platform !== "android") return false;
  const legacy = new RegExp(`^${audience}/${FILE_ID}\\.apk$`);
  return legacy.test(storagePath);
}

export function cleanVersionLabel(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function cleanReleaseNotes(value: unknown): string {
  return String(value ?? "").replace(/\r\n/g, "\n").trim().slice(0, 1000);
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function appDownloadDismissKey(audience: MobileAppAudience): string {
  return `mygarage-app-download-dismissed:${audience}`;
}

export function startAppDownload(url: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function catalogStamp(catalog: MobileAppCatalog): string {
  return [catalog.android?.updatedAt ?? "", catalog.ios?.updatedAt ?? ""].join("|");
}

function readPlatform(
  platform: MobileAppPlatform,
  value: unknown,
): MobileAppPlatformDownload | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<MobileAppPlatformDownload>;
  if (!row.downloadUrl || !row.updatedAt || !row.fileName) return null;
  return {
    platform,
    fileName: row.fileName,
    fileSize: Number(row.fileSize) || 0,
    versionLabel: row.versionLabel ?? "",
    notes: row.notes ?? "",
    updatedAt: row.updatedAt,
    downloadUrl: row.downloadUrl,
  };
}

export type MobileAppFetchResult =
  | { status: "ready"; catalog: MobileAppCatalog }
  | { status: "empty"; catalog: MobileAppCatalog }
  | { status: "forbidden" }
  | { status: "error"; message: string };

export async function fetchMobileAppDownload(audience: MobileAppAudience): Promise<MobileAppFetchResult> {
  const empty: MobileAppCatalog = { audience, android: null, ios: null };
  try {
    const res = await fetch(`/api/mobile-apps/${audience}`, { cache: "no-store" });
    if (res.status === 401 || res.status === 403) return { status: "forbidden" };
    const body = (await res.json().catch(() => null)) as {
      error?: string;
      android?: unknown;
      ios?: unknown;
    } | null;
    if (!res.ok) {
      if (res.status === 404) return { status: "empty", catalog: empty };
      return { status: "error", message: body?.error || "Could not load the app download." };
    }
    const catalog: MobileAppCatalog = {
      audience,
      android: readPlatform("android", body?.android),
      ios: readPlatform("ios", body?.ios),
    };
    if (!catalog.android && !catalog.ios) return { status: "empty", catalog };
    return { status: "ready", catalog };
  } catch {
    return { status: "error", message: "Could not load the app download." };
  }
}
