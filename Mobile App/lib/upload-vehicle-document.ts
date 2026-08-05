import { File, UploadType } from 'expo-file-system';

import { getApiUrl } from '@/lib/config';

function mimeFromExtension(extension: string): string {
  const ext = extension.toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/jpeg';
}

export async function uploadVehicleDocument(localUri: string, mimeType?: string): Promise<string> {
  const file = new File(localUri);
  const resolvedMime = mimeType || mimeFromExtension(file.extension);

  const result = await file.upload(`${getApiUrl()}/api/uploads/vehicle-document`, {
    uploadType: UploadType.MULTIPART,
    fieldName: 'file',
    mimeType: resolvedMime,
    headers: { Accept: 'application/json' },
  });

  let data: { error?: string; url?: string } = {};
  try {
    data = result.body ? (JSON.parse(result.body) as { error?: string; url?: string }) : {};
  } catch {
    // response was not JSON
  }

  if (result.status < 200 || result.status >= 300) {
    throw new Error(data.error || `Upload failed (${result.status})`);
  }
  if (!data.url) {
    throw new Error('Upload failed');
  }
  return data.url;
}
