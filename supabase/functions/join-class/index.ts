// supabase/functions/join-class/index.ts
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

    const { invite_code } = await req.json();
    if (!invite_code) throw new Error('An invite code is required.');

    const adminSupabaseClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { data: classData, error: classError } = await adminSupabaseClient
      .from('classes')
      .select('class_id, owner_id')
      .eq('invite_code', invite_code)
      .single();

    if (classError || !classData) {
      return new Response(JSON.stringify({ error: "Invalid invite code. Please check the code and try again." }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (classData.owner_id === user.id) {
        return new Response(JSON.stringify({ error: "You are the owner of this class." }), {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const { data: existingMembership, error: membershipError } = await adminSupabaseClient
        .from('class_members')
        .select('role')
        .eq('class_id', classData.class_id)
        .eq('user_id', user.id)
        .maybeSingle();
    
    if (membershipError) throw membershipError;

    if (existingMembership) {
        const message = "You are already a member of this class.";
        return new Response(JSON.stringify({ error: message }), {
            status: 409, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // --- FIX 1: Change role from 'pending' to 'member' ---
    const { error: insertError } = await adminSupabaseClient
      .from('class_members')
      .insert({
        class_id: classData.class_id,
        user_id: user.id,
        role: 'member', 
      });

    if (insertError) throw insertError;

    // --- FIX 2: Update success message to reflect immediate access ---
    return new Response(JSON.stringify({ message: "Successfully joined the class!" }), {
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