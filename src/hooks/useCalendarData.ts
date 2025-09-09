// src/hooks/useCalendarData.ts
import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { classOpenAIConfigService, ClassConfig } from '@/services/classOpenAIConfig';
import { calendarEventService, CalendarEvent, NewCalendarEvent } from '@/services/calendarEventService';
import { ClassConfigWithColor } from '@/components/calendar/types';
import { DeletionScope } from '@/components/calendar/DeleteRecurringEventDialog';
import { COLOR_PALETTE } from '@/components/calendar/colorUtils'; // IMPORT THE PALETTE

const COLOR_SWATCHES = COLOR_PALETTE.map(p => p.border); // USE THE BORDER CLASSES FOR DEFAULTS

export const useCalendarData = () => {
    const [classes, setClasses] = useState<ClassConfigWithColor[]>([]);
    const [isLoadingClasses, setIsLoadingClasses] = useState(true);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(true);
    const { toast } = useToast();

    const fetchAllData = useCallback(async () => {
        setIsLoadingClasses(true);
        setIsLoadingEvents(true);
        try {
            const [fetchedClasses, fetchedEvents] = await Promise.all([
                classOpenAIConfigService.getAllClasses(),
                calendarEventService.getEvents()
            ]);
            const classesWithColors = fetchedClasses.map((cls, index) => ({
                ...cls,
                color: cls.color || COLOR_SWATCHES[index % COLOR_SWATCHES.length]
            }));
            setClasses(classesWithColors);
            setEvents(fetchedEvents);
        } catch (error) {
            toast({ title: "Error fetching data", description: error instanceof Error ? error.message : "Could not load calendar data.", variant: "destructive" });
        } finally {
            setIsLoadingClasses(false);
            setIsLoadingEvents(false);
        }
    }, [toast]);

    useEffect(() => { fetchAllData(); }, [fetchAllData]);

    const updateClassColor = async (classId: string, newColor: string) => {
        try {
            const updatedClass = await classOpenAIConfigService.updateClassColor(classId, newColor);
            setClasses(prevClasses =>
                prevClasses.map(c =>
                    c.class_id === classId ? { ...c, color: updatedClass.color || c.color } : c
                )
            );
        } catch (error) {
            toast({ title: "Error", description: "Failed to update class color.", variant: "destructive" });
        }
    };

    const createEvent = async (eventData: NewCalendarEvent) => {
        try {
            const createdEvents = await calendarEventService.createEvent(eventData);
            setEvents(prev => [...prev, ...createdEvents]);
            const toastDescription = createdEvents.length > 1 ? `Your recurring event "${createdEvents[0].title}" has been scheduled.` : `"${createdEvents[0].title}" has been added.`;
            toast({ title: "Event Created", description: toastDescription });
            return true;
        } catch (error) {
            toast({ title: "Error", description: "Failed to create event.", variant: "destructive" });
            return false;
        }
    };

    const updateEvent = async (eventId: string, eventData: NewCalendarEvent) => {
        try {
            const updatedEvent = await calendarEventService.updateEvent(eventId, eventData);
            setEvents(prev => prev.map(e => e.id === eventId ? updatedEvent : e));
            toast({ title: "Event Updated", description: `"${updatedEvent.title}" has been updated.` });
            return true;
        } catch (error) {
            toast({ title: "Error", description: "Failed to update event.", variant: "destructive" });
            return false;
        }
    };

    const deleteEvent = async (event: CalendarEvent, scope: DeletionScope) => {
        try {
            await calendarEventService.deleteEvent(event, scope);
            await fetchAllData();
            toast({ title: "Event Deleted" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete event.", variant: "destructive" });
        }
    };

    return { classes, setClasses, isLoadingClasses, events, isLoadingEvents, createEvent, updateEvent, deleteEvent, updateClassColor };
};