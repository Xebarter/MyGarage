import { getApiUrl } from '@/lib/config';

export async function uploadVehicleImage(localUri: string, mimeType = 'image/jpeg'): Promise<string> {
  const ext =
    mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : mimeType === 'image/gif' ? 'gif' : 'jpg';

  const formData = new FormData();
  formData.append(
    'file',
    {
      uri: localUri,
      name: `vehicle-${Date.now()}.${ext}`,
      type: mimeType,
    } as unknown as Blob,
  );

  const res = await fetch(`${getApiUrl()}/api/uploads/vehicle-image`, {
    method: 'POST',
    body: formData,
    headers: { Accept: 'application/json' },
  });

  const data = (await res.json().catch(() => ({}))) as { error?: string; url?: string };
  if (!res.ok) {
    throw new Error(data.error || `Upload failed (${res.status})`);
  }
  if (!data.url) {
    throw new Error('Upload failed');
  }
  return data.url;
}
