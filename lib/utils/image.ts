import { createClient } from "@/lib/supabase/client";

/**
 * Upload an image to Supabase Storage
 */
export async function uploadImage(
  file: File,
  bucket: "team-logos" | "user-avatars",
  path: string
): Promise<string | null> {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: true,
    });

  if (error) {
    console.error("Error uploading image:", error);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrl;
}

/**
 * Delete an image from Supabase Storage
 */
export async function deleteImage(
  bucket: "team-logos" | "user-avatars",
  path: string
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    console.error("Error deleting image:", error);
    return false;
  }

  return true;
}

/**
 * Generate a unique filename for an uploaded image
 * Uses folder structure: userId/timestamp.ext
 * This matches the RLS policy that restricts users to their own folder
 */
export function generateImageFilename(userId: string, file: File): string {
  const extension = file.name.split(".").pop();
  const timestamp = Date.now();
  return `${userId}/${timestamp}.${extension}`;
}
