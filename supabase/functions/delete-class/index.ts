// supabase/functions/delete-class/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user } } = await createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    ).auth.getUser();

    if (!user) {
      throw new Error('User not authenticated.');
    }

    const { class_id } = await req.json();
    if (!class_id) {
      throw new Error("'class_id' is required in the request body.");
    }

    // --- Step 1: Verify Ownership ---
    const { data: classData, error: ownerError } = await adminSupabase
      .from('classes')
      .select('owner_id')
      .eq('class_id', class_id)
      .single();

    if (ownerError || !classData) {
      throw new Error('Class not found or you do not have permission to delete it.');
    }
    if (classData.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: "Only the class owner can delete the class." }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // --- Step 2: Fetch All Files for External Cleanup ---
    const { data: filesToDelete, error: filesError } = await adminSupabase
        .from('files')
        .select('file_id, url, thumbnail_url')
        .eq('class_id', class_id);

    if (filesError) {
        throw new Error(`Failed to fetch files for cleanup: ${filesError.message}`);
    }

    // --- Step 3: Perform Cleanup on External Services (Weaviate, Cloudinary, Storage) ---
    const cleanupPromises: Promise<any>[] = [];
    if (filesToDelete && filesToDelete.length > 0) {
        const storagePaths = filesToDelete
            .map(file => file.url ? new URL(file.url).pathname.split('/public/file_storage/')[1] : null)
            .filter((path): path is string => path !== null);

        if (storagePaths.length > 0) {
            cleanupPromises.push(adminSupabase.storage.from('file_storage').remove(storagePaths));
        }
        for (const file of filesToDelete) {
            if (file.thumbnail_url) {
                cleanupPromises.push(adminSupabase.functions.invoke('delete-from-cloudinary', { body: { file_id: file.file_id } }));
            }
        }
    }
    cleanupPromises.push(adminSupabase.functions.invoke('delete-weaviate-chunks-by-class', { body: { class_id_to_delete: class_id } }));
    
    await Promise.allSettled(cleanupPromises);
    console.log(`[delete-class] External services cleanup complete for class ${class_id}.`);
    
    // --- Step 4: Delete the single class record ---
    // With the corrected database trigger, we can now safely rely on ON DELETE CASCADE.
    const { error: deleteError } = await adminSupabase
      .from('classes')
      .delete()
      .eq('class_id', class_id);

    if (deleteError) throw deleteError;
    
    return new Response(JSON.stringify({ success: true, message: "Class and all associated data have been deleted." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`[delete-class function error]: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});