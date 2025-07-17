// supabase/functions/delete-recurring-event/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required.');

    const { event, scope } = await req.json();
    if (!event || !event.id || !scope) {
      throw new Error('Event ID and deletion scope are required.');
    }

    let query = supabase.from('calendar_events').delete().eq('user_id', user.id);

    // To delete 'all' events of a recurring series, we need a way to group them.
    // A simple way is by title and original start time properties if a 'series_id' isn't present.
    // For this implementation, we'll assume events with the same title and start time components (hour, minute) are part of a series.
    // A more robust solution would involve adding a `series_id` to your `calendar_events` table.
    
    const originalStartDate = new Date(event.event_start);

    switch (scope) {
      case 'this':
        query = query.eq('id', event.id);
        break;
      case 'following':
        query = query
          .eq('title', event.title)
          .gte('event_start', event.event_start);
        break;
      case 'all':
        query = query.eq('title', event.title);
        // This is a simplification. A true "all" would need a series_id.
        // This will delete all events with the same title.
        break;
      default:
        throw new Error('Invalid deletion scope.');
    }

    const { error } = await query;
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});