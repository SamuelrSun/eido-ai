// supabase/functions/leave-class/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await userSupabaseClient.auth.getUser();
    if (!user) throw new Error('User not authenticated.');

    const { class_id } = await req.json();
    if (!class_id) throw new Error('A class_id is required.');
    
    // Use the admin client to perform the deletion
    const adminSupabaseClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // First, verify the user is not the owner of the class
    const { data: classData, error: classError } = await adminSupabaseClient
        .from('classes')
        .select('owner_id')
        .eq('class_id', class_id)
        .single();

    if (classError) throw new Error("Could not find the specified class.");
    if (classData.owner_id === user.id) {
        return new Response(JSON.stringify({ error: "The class owner cannot leave the class. You can delete the class instead." }), {
            status: 403, // Forbidden
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Proceed with deleting the membership record
    const { error: deleteError } = await adminSupabaseClient
      .from('class_members')
      .delete()
      .eq('class_id', class_id)
      .eq('user_id', user.id);

    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ message: "Successfully left the class." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});