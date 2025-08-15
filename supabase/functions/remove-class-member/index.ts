// supabase/functions/remove-class-member/index.ts
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
    const { data: { user: requestingUser } } = await userSupabaseClient.auth.getUser();
    if (!requestingUser) throw new Error('User not authenticated.');

    const { class_id, member_id } = await req.json();
    if (!class_id || !member_id) {
      throw new Error('class_id and member_id are required.');
    }

    if (requestingUser.id === member_id) {
        throw new Error("You cannot remove yourself using this function. Please use the 'Leave Class' option.");
    }
    
    const adminSupabaseClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Verify that the requesting user is the owner of the class
    const { data: classData, error: classError } = await adminSupabaseClient
        .from('classes')
        .select('owner_id')
        .eq('class_id', class_id)
        .single();

    if (classError) throw new Error("Could not find the specified class.");
    if (classData.owner_id !== requestingUser.id) {
        return new Response(JSON.stringify({ error: "Only the class owner can remove members." }), {
            status: 403, // Forbidden
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Proceed with removing the specified member
    const { error: deleteError } = await adminSupabaseClient
      .from('class_members')
      .delete()
      .eq('class_id', class_id)
      .eq('user_id', member_id);

    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ message: "Member removed successfully." }), {
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