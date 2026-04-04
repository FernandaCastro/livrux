import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';
import { AVATAR_SIZE, IMAGE_QUALITY } from '../constants/config';

type ImageBucket = 'avatars';

// Resizes and compresses an image before upload, returning base64-encoded data.
async function resizeImage(
  uri: string,
  maxWidth: number,
  maxHeight: number
): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxWidth, height: maxHeight } }],
    { compress: IMAGE_QUALITY, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  return result.base64!;
}

// Decodes a base64 string into an ArrayBuffer.
// Using ArrayBuffer avoids the React Native Blob serialization bug that causes
// StorageUnknownError: Network request failed when uploading to Supabase Storage.
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Uploads an image to Supabase Storage and returns the public URL.
// Path format: {userId}/{entityId}.jpg
export async function uploadImage(
  bucket: ImageBucket,
  userId: string,
  entityId: string,
  localUri: string
): Promise<string> {
  const base64 = await resizeImage(localUri, AVATAR_SIZE, AVATAR_SIZE);

  const arrayBuffer = base64ToArrayBuffer(base64);
  const path = `${userId}/${entityId}.jpg`;

  const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
    contentType: 'image/jpeg',
    upsert: true, // overwrite if the user updates the photo
  });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// Deletes an image from Supabase Storage (e.g., when a reader or book is deleted).
export async function deleteImage(
  bucket: ImageBucket,
  userId: string,
  entityId: string
): Promise<void> {
  const path = `${userId}/${entityId}.jpg`;
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}
