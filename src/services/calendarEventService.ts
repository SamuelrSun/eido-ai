// src/services/calendarEventService.ts
import { supabase } from "@/integrations/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";

// This type should match the structure of your 'calendar_events' table
export interface CalendarEvent {
    id: string;
    user_id: string;
    class_id?: string | null;
    title: string;
    event_start: string; // TIMESTAMPTZ is a string
    event_end?: string | null;
    location?: string | null;
    notes?: string | null;
    event_type?: string | null;
    created_at: string;
    repeat_pattern?: string | null; // Add the new field
}

// Type for creating a new event, omitting fields that are auto-generated
export type NewCalendarEvent = Omit<CalendarEvent, 'id' | 'user_id' | 'created_at'>;

export const calendarEventService = {
    /**
     * Fetches all calendar events for the currently authenticated user.
     */
    async getEvents(): Promise<CalendarEvent[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.log("No user logged in, returning empty array for events.");
            return [];
        }

        const { data, error } = await supabase
            .from('calendar_events')
            .select('*')
            .eq('user_id', user.id);

        if (error) {
            console.error("Error fetching calendar events:", error);
            throw error;
        }

        return data || [];
    },

    /**
     * Creates a new calendar event.
     * @param eventData - The data for the new event.
     */
    async createEvent(eventData: NewCalendarEvent): Promise<CalendarEvent> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User must be authenticated to create an event.");

        const { data, error } = await supabase
            .from('calendar_events')
            .insert({ ...eventData, user_id: user.id })
            .select()
            .single();

        if (error) {
            console.error("Error creating calendar event:", error);
            throw error;
        }

        return data;
    },

    /**
     * Deletes a calendar event by its ID.
     * @param eventId - The ID of the event to delete.
     */
    async deleteEvent(eventId: string): Promise<{ error: PostgrestError | null }> {
        const { error } = await supabase
            .from('calendar_events')
            .delete()
            .eq('id', eventId);
        
        if (error) {
            console.error("Error deleting calendar event:", error);
        }

        return { error };
    },
};
