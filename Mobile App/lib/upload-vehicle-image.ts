import { File, UploadType } from 'expo-file-system';

import { getApiUrl } from '@/lib/config';

export async function uploadVehicleImage(localUri: string, mimeType = 'image/jpeg'): Promise<string> {
  const file = new File(localUri);
  const result = await file.upload(`${getApiUrl()}/api/uploads/vehicle-image`, {
    uploadType: UploadType.MULTIPART,
    fieldName: 'file',
    mimeType,
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
