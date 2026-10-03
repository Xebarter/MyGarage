export const MOBILE_APP_BUCKET = "mobile-apps";
export const MOBILE_APP_MAX_BYTES = 75 * 1024 * 1024;
export const MOBILE_APP_MIME_TYPES = [
  "application/vnd.android.package-archive",
  "application/octet-stream",
  "application/zip",
  "application/java-archive",
] as const;
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
  "",
]);

const STORAGE_PATH =
  /^(public|vendor|services)\/\d{13}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.apk$/;

export type MobileAppRelease = {
  audience: MobileAppAudience;
  storagePath: string;
  fileName: string;
  fileSize: number;
  versionLabel: string;
  notes: string;
  updatedAt: string;
};

export type MobileAppDownloadInfo = {
  audience: MobileAppAudience;
  fileName: string;
  fileSize: number;
  versionLabel: string;
  notes: string;
  updatedAt: string;
  downloadUrl: string;
};

export function isMobileAppAudience(value: string): value is MobileAppAudience {
  return (MOBILE_APP_AUDIENCES as readonly string[]).includes(value);
}

export function apkContentType(contentType: string): string {
  const mime = contentType.trim().toLowerCase();
  if (mime === "application/octet-stream" || mime === "application/zip" || mime === "application/java-archive") {
    return mime;
  }
  return "application/vnd.android.package-archive";
}

export function validateApkUpload(fileName: string, contentType: string, fileSize: number): string | null {
  const name = fileName.trim();
  if (!name.toLowerCase().endsWith(".apk")) return "Upload an Android APK file.";
  if (!ALLOWED_MIME.has(contentType.trim().toLowerCase())) return "That file type is not an APK.";
  if (!Number.isFinite(fileSize) || fileSize <= 0) return "Choose an APK file.";
  if (fileSize > MOBILE_APP_MAX_BYTES) return "APK must be 75 MB or smaller.";
  return null;
}

export function cleanApkFileName(fileName: string): string {
  const base = (fileName.split(/[/\\]/).pop() ?? "app.apk").trim();
  const cleaned = base.replace(/[^\w.\- ()]/g, "_").replace(/\s+/g, " ").trim() || "app.apk";
  const withExt = cleaned.toLowerCase().endsWith(".apk") ? cleaned : `${cleaned}.apk`;
  if (withExt.length <= 180) return withExt;
  return `${withExt.slice(0, 176)}.apk`;
}

export function isOwnedStoragePath(audience: MobileAppAudience, storagePath: string): boolean {
  return STORAGE_PATH.test(storagePath) && storagePath.startsWith(`${audience}/`);
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

export function startApkDownload(url: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export type MobileAppFetchResult =
  | { status: "ready"; info: MobileAppDownloadInfo }
  | { status: "empty" }
  | { status: "forbidden" }
  | { status: "error"; message: string };

export async function fetchMobileAppDownload(audience: MobileAppAudience): Promise<MobileAppFetchResult> {
  try {
    const res = await fetch(`/api/mobile-apps/${audience}`, { cache: "no-store" });
    if (res.status === 404) return { status: "empty" };
    if (res.status === 401 || res.status === 403) return { status: "forbidden" };
    const body = (await res.json().catch(() => null)) as { error?: string } & Partial<MobileAppDownloadInfo> | null;
    if (!res.ok || !body?.downloadUrl || !body.updatedAt || !body.fileName) {
      return { status: "error", message: body?.error || "Could not load the app download." };
    }
    return {
      status: "ready",
      info: {
        audience,
        fileName: body.fileName,
        fileSize: Number(body.fileSize) || 0,
        versionLabel: body.versionLabel ?? "",
        notes: body.notes ?? "",
        updatedAt: body.updatedAt,
        downloadUrl: body.downloadUrl,
      },
    };
  } catch {
    return { status: "error", message: "Could not load the app download." };
  }
}
