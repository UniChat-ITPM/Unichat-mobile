import { File } from 'expo-file-system';

/**
 * Read a local file URI and return a base64 data-URI string
 * suitable for the `profilePhoto` field of PUT /api/user/:id.
 */
export async function toBase64DataUri(
  fileUri: string,
  mimeType: string,
): Promise<string> {
  const file = new File(fileUri);
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return `data:${mimeType};base64,${base64}`;
}
