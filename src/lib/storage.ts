import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';
import { AVATAR_SIZE, IMAGE_MAX_HEIGHT, IMAGE_MAX_WIDTH, IMAGE_QUALITY } from '../constants/config';

type ImageBucket = 'avatars' | 'book-covers';

// Resizes and compresses an image before upload.
async function resizeImage(
  uri: string,
  maxWidth: number,
  maxHeight: number
): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxWidth, height: maxHeight } }],
    { compress: IMAGE_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}

// Uploads an image to Supabase Storage and returns the public URL.
// Path format: {userId}/{folder}/{entityId}.jpg
export async function uploadImage(
  bucket: ImageBucket,
  userId: string,
  entityId: string,
  localUri: string
): Promise<string> {
  const isAvatar = bucket === 'avatars';
  const processedUri = await resizeImage(
    localUri,
    isAvatar ? AVATAR_SIZE : IMAGE_MAX_WIDTH,
    isAvatar ? AVATAR_SIZE : IMAGE_MAX_HEIGHT
  );

  // Fetch blob from the local file URI (works on both Android and iOS).
  const response = await fetch(processedUri);
  const blob = await response.blob();

  const path = `${userId}/${entityId}.jpg`;

  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
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
