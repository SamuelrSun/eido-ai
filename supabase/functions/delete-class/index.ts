// supabase/functions/delete-class/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
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
      throw new Error('Class ID is required.');
    }
    
    // 1. Verify ownership
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
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Delete all associated data
    // The database schema should have ON DELETE CASCADE for these, but we'll be explicit.
    // The order matters to respect foreign key constraints if cascade is not set.
    
    // Message Sources -> Chat Messages
    const { data: messages } = await adminSupabase.from('chat_messages').select('id').eq('class_id', class_id);
    if (messages && messages.length > 0) {
      const messageIds = messages.map(m => m.id);
      await adminSupabase.from('message_sources').delete().in('message_id', messageIds);
    }
    await adminSupabase.from('chat_messages').delete().eq('class_id', class_id);

    // Conversations
    await adminSupabase.from('conversations').delete().eq('class_id', class_id);
    
    // Files (this is complex because it involves storage, we assume files are handled by cascade or are deleted separately)
    // Note: A more robust solution would also delete from Storage and Weaviate here.
    // The user's current flow has this logic in the frontend hook, which is okay for now.
    await adminSupabase.from('files').delete().eq('class_id', class_id);

    // Folders
    await adminSupabase.from('folders').delete().eq('class_id', class_id);

    // Members
    await adminSupabase.from('class_members').delete().eq('class_id', class_id);
    
    // 3. Finally, delete the class itself
    const { error: deleteError } = await adminSupabase
      .from('classes')
      .delete()
      .eq('class_id', class_id);

    if (deleteError) {
      throw deleteError;
    }

    // 4. (Optional but recommended) Trigger Weaviate cleanup
    await adminSupabase.functions.invoke('delete-weaviate-chunks-by-class', {
        body: { class_id_to_delete: class_id }
    });

    return new Response(JSON.stringify({ success: true, message: "Class and all associated data deleted." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});