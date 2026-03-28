import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const MAX_EDGE_PX = 1680;
const JPEG_QUALITY = 0.72;

export type PreparedChatImage = {
  uri: string;
  fileName: string;
  mimeType: string;
};

/**
 * Downscale and recompress photos before upload to cut upload + Cloudinary time.
 */
export async function prepareChatImageForUpload(
  uri: string,
  fileNameHint?: string | null,
): Promise<PreparedChatImage> {
  const base =
    fileNameHint?.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'photo';
  const outName = base.toLowerCase().endsWith('.jpg') || base.toLowerCase().endsWith('.jpeg')
    ? base
    : `${base.replace(/\.[^.]+$/, '')}.jpg`;

  try {
    const result = await manipulateAsync(
      uri,
      [{ resize: { width: MAX_EDGE_PX } }],
      {
        compress: JPEG_QUALITY,
        format: SaveFormat.JPEG,
      },
    );
    return {
      uri: result.uri,
      fileName: outName.endsWith('.jpg') ? outName : `${outName}.jpg`,
      mimeType: 'image/jpeg',
    };
  } catch {
    return {
      uri,
      fileName: outName,
      mimeType: 'image/jpeg',
    };
  }
}
