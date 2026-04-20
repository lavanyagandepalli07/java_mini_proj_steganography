import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const authEnabled = Boolean(supabaseUrl && supabaseKey);
export const supabase: SupabaseClient | null = authEnabled ? createClient(supabaseUrl, supabaseKey) : null;

export async function uploadStego(blob: Blob, extension: string): Promise<string | null> {
  if (!supabase) return null;
  const uuid = crypto.randomUUID();
  const filename = `${uuid}.${extension}`;
  
  const { data, error } = await supabase.storage
    .from('stego-shares')
    .upload(filename, blob);
    
  if (error) {
    console.error('Upload error:', error);
    return null;
  }
  return uuid;
}

export async function downloadStego(uuid: string, extension: string): Promise<Blob | null> {
  if (!supabase) return null;
  const filename = `${uuid}.${extension}`;
  
  const { data, error } = await supabase.storage
    .from('stego-shares')
    .download(filename);
    
  if (error) {
    console.error('Download error:', error);
    return null;
  }
  return data;
}

export async function deleteStego(uuid: string, extension: string): Promise<boolean> {
  if (!supabase) return false;
  const filename = `${uuid}.${extension}`;
  
  const { error } = await supabase.storage
    .from('stego-shares')
    .remove([filename]);
    
  if (error) {
    console.error('Delete error:', error);
    return false;
  }
  return true;
}
