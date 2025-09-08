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

    // --- MODIFICATION START: Comprehensive and explicit deletion of all dependent DB records ---
    // This avoids using ON DELETE CASCADE which was causing the trigger to fail.

    console.log(`[delete-class] Starting manual deletion of dependent database records for class ${class_id}.`);

    // The order of deletion matters to respect foreign key constraints.
    // We delete records that depend on other records first.

    // 1. Delete from 'message_sources' which depends on 'chat_messages'
    const { data: messages, error: msgError } = await adminSupabase.from('chat_messages').select('id').eq('class_id', class_id);
    if (msgError) throw new Error(`Failed to fetch chat messages for cleanup: ${msgError.message}`);
    if (messages && messages.length > 0) {
        const messageIds = messages.map(m => m.id);
        await adminSupabase.from('message_sources').delete().in('message_id', messageIds);
    }
    
    // 2. Now delete from tables that directly reference the 'classes' table.
    const tablesToDeleteFrom = [
        'chat_messages', 'calendar_events', 'quiz_questions', 'quizzes', 'flashcards',
        '"flashcard-decks"', 'files', 'folders', 'class_members', 'class_activity'
    ];

    for (const table of tablesToDeleteFrom) {
        const { error: deleteChildError } = await adminSupabase.from(table).delete().eq('class_id', class_id);
        if (deleteChildError) {
            console.warn(`Could not clean up table '${table}' for class ${class_id}: ${deleteChildError.message}`);
        }
    }
    
    console.log(`[delete-class] ✅ Manual deletion of dependent records complete.`);
    // --- MODIFICATION END ---


    // --- Step 5: Finally, delete the class record itself ---
    // Since all child records are gone, no cascades will fire.
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