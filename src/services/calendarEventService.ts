// src/services/calendarEventService.ts
import { supabase } from "@/integrations/supabase/client";
import { DeletionScope } from "@/components/calendar/DeleteRecurringEventDialog";

export interface CalendarEvent {
    id: string;
    user_id: string;
    class_id?: string | null;
    title: string;
    event_start: string;
    event_end?: string | null;
    location?: string | null;
    notes?: string | null;
    event_type?: string | null;
    created_at: string;
    repeat_pattern?: string | null;
}

export type NewCalendarEvent = Omit<CalendarEvent, 'id' | 'user_id' | 'created_at'>;

export const calendarEventService = {
    async getEvents(): Promise<CalendarEvent[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        const { data, error } = await supabase.from('calendar_events').select('*').eq('user_id', user.id);
        if (error) throw error;
        return data || [];
    },

    async createEvent(eventData: NewCalendarEvent): Promise<CalendarEvent[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User must be authenticated to create an event.");
        const { data, error } = await supabase.functions.invoke('create-recurring-event', { body: eventData });
        if (error) throw error;
        return data;
    },

    async updateEvent(eventId: string, eventData: NewCalendarEvent): Promise<CalendarEvent> {
        const { data, error } = await supabase
            .from('calendar_events')
            .update(eventData)
            .eq('id', eventId)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteEvent(event: CalendarEvent, scope: DeletionScope): Promise<void> {
        const { error } = await supabase.functions.invoke('delete-recurring-event', {
            body: { event, scope },
        });
        if (error) throw error;
    },
};