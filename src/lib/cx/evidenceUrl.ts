import { supabase } from "@/integrations/supabase/client";

/**
 * Given the value stored in evidences.file_url (either a storage path
 * like "<actionId>/<file>" OR a legacy public URL containing
 * "/storage/v1/object/public/evidences/..."), return a signed URL valid
 * for 1 hour. The bucket is private — signed URLs are required.
 */
export async function getEvidenceSignedUrl(stored: string): Promise<string> {
  let path = stored;
  const marker = "/storage/v1/object/public/evidences/";
  const idx = stored.indexOf(marker);
  if (idx >= 0) path = stored.slice(idx + marker.length);
  // Also handle already-signed URLs (full http URL without the public marker)
  if (stored.startsWith("http") && idx < 0) {
    // Try to extract path after "/evidences/"
    const m = stored.match(/\/evidences\/(.+?)(\?|$)/);
    if (m) path = m[1];
  }
  const { data, error } = await supabase.storage.from("evidences").createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
