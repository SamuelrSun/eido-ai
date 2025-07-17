// supabase/functions/create-recurring-event/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { addDays, addMonths, addWeeks } from 'npm:date-fns@3.6.0';
import { corsHeaders } from '../_shared/cors.ts';

// Type for the incoming event data from the client
type NewCalendarEvent = {
  class_id?: string | null;
  title: string;
  event_start: string;
  event_end?: string | null;
  location?: string | null;
  notes?: string | null;
  event_type?: string | null;
  repeat_pattern?: string | null;
};

// FIX: Define the shape of the object we are inserting into the database
type CalendarEventInsert = NewCalendarEvent & {
    user_id: string;
};


const getSupabaseClient = (req: Request): SupabaseClient => {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  );
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required.');

    const eventData: NewCalendarEvent = await req.json();
    
    if (!eventData.repeat_pattern || eventData.repeat_pattern === 'none') {
        const { data: singleEvent, error } = await supabase
            .from('calendar_events')
            .insert({ ...eventData, user_id: user.id })
            .select()
            .single();
        if (error) throw error;
        return new Response(JSON.stringify([singleEvent]), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // FIX: Initialize the array with the correct type
    const eventsToInsert: CalendarEventInsert[] = [];
    const initialStartDate = new Date(eventData.event_start);
    const initialEndDate = eventData.event_end ? new Date(eventData.event_end) : null;
    const duration = initialEndDate ? initialEndDate.getTime() - initialStartDate.getTime() : 0;
    
    const recurrenceLimit = addDays(new Date(), 365); 

    let currentDate = initialStartDate;
    while (currentDate <= recurrenceLimit) {
        const newEndDate = duration ? new Date(currentDate.getTime() + duration) : null;
        
        eventsToInsert.push({
            ...eventData,
            user_id: user.id,
            event_start: currentDate.toISOString(),
            event_end: newEndDate ? newEndDate.toISOString() : null,
        });

        switch (eventData.repeat_pattern) {
            case 'daily':
                currentDate = addDays(currentDate, 1);
                break;
            case 'weekly':
                currentDate = addWeeks(currentDate, 1);
                break;
            case 'monthly':
                currentDate = addMonths(currentDate, 1);
                break;
            default:
                currentDate = addDays(recurrenceLimit, 1); 
                break;
        }
    }
    
    if (eventsToInsert.length > 0) {
        const { data: createdEvents, error } = await supabase
            .from('calendar_events')
            .insert(eventsToInsert)
            .select();
        
        if (error) throw error;
        return new Response(JSON.stringify(createdEvents), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    return new Response(JSON.stringify([]), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});