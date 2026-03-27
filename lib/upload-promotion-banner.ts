export type UploadPromotionBannerProgress = {
  loaded: number;
  total: number;
  percent: number;
};

export async function uploadPromotionBanner(
  file: File,
  opts?: { signal?: AbortSignal; onProgress?: (p: UploadPromotionBannerProgress) => void },
): Promise<string> {
  const { signal, onProgress } = opts ?? {};
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  return await new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/uploads/promotion-banner", true);

    const abort = () => {
      try {
        xhr.abort();
      } catch {
        // ignore
      }
    };
    if (signal) {
      signal.addEventListener("abort", abort, { once: true });
    }

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const total = Math.max(0, evt.total || 0);
      const loaded = Math.max(0, Math.min(evt.loaded || 0, total || evt.loaded || 0));
      const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
      onProgress?.({ loaded, total, percent });
    };

    xhr.onerror = () => {
      if (signal) signal.removeEventListener("abort", abort);
      reject(new Error("Upload failed"));
    };

    xhr.onload = () => {
      if (signal) signal.removeEventListener("abort", abort);
      try {
        const raw = xhr.responseText || "";
        const data = raw ? (JSON.parse(raw) as { error?: string; url?: string }) : {};
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error(data.error || "Upload failed"));
          return;
        }
        if (!data.url) {
          reject(new Error("Upload failed"));
          return;
        }
        resolve(data.url);
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Upload failed"));
      }
    };

    const fd = new FormData();
    fd.append("file", file);
    xhr.send(fd);
  });
}

