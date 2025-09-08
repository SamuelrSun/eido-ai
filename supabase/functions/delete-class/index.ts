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
    
    // --- Step 2: Fetch All Files for the Class ---
    const { data: filesToDelete, error: filesError } = await adminSupabase
        .from('files')
        .select('file_id, url, thumbnail_url, name') // also fetch name for logging
        .eq('class_id', class_id);

    if (filesError) {
        throw new Error(`Failed to fetch files for cleanup: ${filesError.message}`);
    }

    // --- MODIFICATION START: Explicitly log and delete each file ---
    // This avoids the faulty database trigger by logging activity with the correct user ID.
    if (filesToDelete && filesToDelete.length > 0) {
      console.log(`[delete-class] Found ${filesToDelete.length} files to manually delete and log.`);
      for (const file of filesToDelete) {
        // 1. Log the deletion activity with the authenticated user's ID.
        await adminSupabase.rpc('log_class_activity', {
            p_class_id: class_id,
            p_user_id: user.id,
            p_activity_type: 'file_deleted',
            p_details: { file_name: file.name }
        });
        // 2. Delete the file record from the database.
        await adminSupabase.from('files').delete().eq('file_id', file.file_id);
      }
      console.log(`[delete-class] ✅ Successfully logged and deleted ${filesToDelete.length} file records.`);
    }
    // --- MODIFICATION END ---

    // --- Step 3: Perform Cleanup on External Services (in parallel) ---
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

    // --- Step 4: Delete the single class record ---
    // All files are already gone, so the faulty trigger won't be fired by the cascade.
    // The cascade will still safely remove other related items like folders, members, etc.
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