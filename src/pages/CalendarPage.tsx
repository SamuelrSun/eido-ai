// src/pages/CalendarPage.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { MainAppLayout } from '@/components/layout/MainAppLayout';
import { startOfDay, subDays, subMonths, subWeeks, addMonths, addWeeks, format, addDays as addDaysHelper, addMinutes } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCalendarData } from '@/hooks/useCalendarData';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { CalendarSidebar } from '@/components/calendar/CalendarSidebar';
import { CalendarViews } from '@/components/calendar/CalendarViews';
import { SyllabusUploadDialog } from '@/components/calendar/SyllabusUploadDialog';
import { ProcessingLoader } from '@/components/calendar/ProcessingLoader';
import { EventConfirmationDialog, ParsedEvent } from '@/components/calendar/EventConfirmationDialog';
import { EventCreatorPopover } from '@/components/calendar/EventCreatorPopover';
import { ViewEventPopover } from '@/components/calendar/ViewEventPopover';
import { DeleteRecurringEventDialog, DeletionScope } from '@/components/calendar/DeleteRecurringEventDialog';
import { CalendarEvent, NewCalendarEvent } from '@/services/calendarEventService';

const CalendarPage = () => {
    const [view, setView] = useState('week');
    const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));
    const { classes, isLoadingClasses, events, createEvent, deleteEvent, updateEvent, updateClassColor } = useCalendarData();
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    
    const [creatorPopover, setCreatorPopover] = useState<{ anchor: HTMLElement | null; start: Date; end: Date } | null>(null);
    const [viewerPopover, setViewerPopover] = useState<{ anchor: HTMLElement; event: CalendarEvent } | null>(null);
    const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);
    const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);

    const [draftEvent, setDraftEvent] = useState<Partial<NewCalendarEvent> | null>(null);
    const [isCreatingEvent, setIsCreatingEvent] = useState(false);
    const [hasDragged, setHasDragged] = useState(false);

    const [isSyllabusUploadOpen, setIsSyllabusUploadOpen] = useState(false);
    const [isProcessingSyllabus, setIsProcessingSyllabus] = useState(false);
    const [parsedEvents, setParsedEvents] = useState<ParsedEvent[]>([]);
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
    const { toast } = useToast();
    
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const scrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const filteredEvents = useMemo(() => {
        return events
            .filter(e => e.class_id && selectedClasses.includes(e.class_id))
            .map(event => {
                const eventClass = classes.find(c => c.class_id === event.class_id);
                return { ...event, color: eventClass?.color };
            });
    }, [events, selectedClasses, classes]);

    useEffect(() => {
        if (!isLoadingClasses && classes.length > 0) {
            setSelectedClasses(classes.map(c => c.class_id));
        }
    }, [isLoadingClasses, classes]);

    const closeAllPopovers = () => {
        setCreatorPopover(null);
        setViewerPopover(null);
        setDraftEvent(null);
        setEventToEdit(null);
    };

    const handleEventCreateStart = useCallback((startDate: Date) => {
        closeAllPopovers();
        setIsCreatingEvent(true);
        setHasDragged(false);
        setDraftEvent({
            event_start: startDate.toISOString(),
            event_end: addMinutes(startDate, 60).toISOString(),
        });
    }, []);

    const handleEventCreateUpdate = useCallback((newTime: Date, e: React.MouseEvent) => {
        if (!isCreatingEvent || !draftEvent || !draftEvent.event_start) return;
        setHasDragged(true);
        const startDate = new Date(draftEvent.event_start);
        const newEndTime = newTime > addMinutes(startDate, 14) ? newTime : addMinutes(startDate, 15);
        setDraftEvent(prev => ({ ...prev, event_end: newEndTime.toISOString() }));
        if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
        const container = scrollContainerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        if (e.clientY > rect.bottom - 50) scrollIntervalRef.current = setInterval(() => { container.scrollTop += 15; }, 30);
        else if (e.clientY < rect.top + 50) scrollIntervalRef.current = setInterval(() => { container.scrollTop -= 15; }, 30);
    }, [isCreatingEvent, draftEvent]);

    const handleEventCreateEnd = useCallback((e: React.MouseEvent | MouseEvent) => {
        if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
        if (!isCreatingEvent || !draftEvent || !draftEvent.event_start) return;
        
        const finalDraftEvent = { ...draftEvent };
        if (!hasDragged) {
            finalDraftEvent.event_end = addMinutes(new Date(draftEvent.event_start), 60).toISOString();
        }
        
        setDraftEvent(finalDraftEvent);
        const anchorEl = document.querySelector('.draft-event-bubble') as HTMLElement || e.currentTarget as HTMLElement;
        setCreatorPopover({ anchor: anchorEl, start: new Date(finalDraftEvent.event_start!), end: new Date(finalDraftEvent.event_end!) });
        setIsCreatingEvent(false);
    }, [isCreatingEvent, draftEvent, hasDragged]);

    const handleEventClick = (event: CalendarEvent, anchorElement: HTMLElement) => {
        const isAlreadyOpen = viewerPopover?.event.id === event.id;
        closeAllPopovers();
        if (!isAlreadyOpen) {
            setViewerPopover({ event, anchor: anchorElement });
        }
    };
    
    const handleEditRequest = (event: CalendarEvent) => {
        setEventToEdit(event);
        const anchor = viewerPopover?.anchor || document.body;
        setViewerPopover(null);
        setCreatorPopover({
            anchor: anchor,
            start: new Date(event.event_start),
            end: event.event_end ? new Date(event.event_end) : addMinutes(new Date(event.event_start), 60)
        });
    };

    const handleDeleteRequest = (event: CalendarEvent) => {
        if (event.repeat_pattern && event.repeat_pattern !== 'none') {
            setEventToDelete(event);
        } else {
            deleteEvent(event, 'this');
        }
        setViewerPopover(null);
    };

    const confirmEventDeletion = async (scope: DeletionScope) => {
        if (!eventToDelete) return;
        await deleteEvent(eventToDelete, scope);
        setEventToDelete(null);
    };

    const handleSaveEvent = async (eventData: NewCalendarEvent, idToUpdate?: string) => {
        let success = false;
        if (idToUpdate) {
            success = await updateEvent(idToUpdate, eventData);
        } else {
            success = await createEvent(eventData);
        }
        if (success) closeAllPopovers();
        return success;
    };
    
    const handlePrev = () => {
        if (view === 'month') setCurrentDate(prev => subMonths(prev, 1));
        else if (view === 'week') setCurrentDate(prev => subWeeks(prev, 1));
        else setCurrentDate(prev => subDays(prev, 1));
    };

    const handleNext = () => {
        if (view === 'month') setCurrentDate(prev => addMonths(prev, 1));
        else if (view === 'week') setCurrentDate(prev => addWeeks(prev, 1));
        else setCurrentDate(prev => addDaysHelper(prev, 1));
    };

    const handleToday = () => setCurrentDate(startOfDay(new Date()));

    const handleSyllabusUpload = async (uploadedFiles: File[], classId: string) => {
        setIsSyllabusUploadOpen(false);
        setIsProcessingSyllabus(true);
        try {
            const fileContents = await Promise.all(
                uploadedFiles.map(file => 
                    new Promise<{ name: string; type: string; content: string }>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const base64Content = (e.target?.result as string).split(',')[1];
                            resolve({ name: file.name, type: file.type, content: base64Content });
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    })
                )
            );
            const { data, error } = await supabase.functions.invoke('parse-syllabus', { body: { files: fileContents, class_id: classId } });
            if (error) throw new Error(error.message);
            const extractedEvents = data?.events;
            if (extractedEvents && Array.isArray(extractedEvents) && extractedEvents.length > 0) {
                setParsedEvents(extractedEvents);
                setIsConfirmationOpen(true);
            } else {
                toast({ title: "No Events Found", description: "The AI could not find any calendar events in the file(s).", variant: "default" });
            }
        } catch (error) {
            toast({ title: "Syllabus Parsing Failed", description: error instanceof Error ? error.message : "An unknown error occurred.", variant: "destructive" });
        } finally {
            setIsProcessingSyllabus(false);
        }
    };

    const handleUpcomingEventSelect = (event: CalendarEvent) => {
        setCurrentDate(new Date(event.event_start));
        
        setTimeout(() => {
            const eventElement = document.querySelector(`[data-event-id="${event.id}"]`) as HTMLElement;
            if (eventElement) {
                handleEventClick(event, eventElement);
            } else {
                console.warn(`Could not find event element for id: ${event.id}`);
            }
        }, 100);
    };
    
    return (
        <MainAppLayout pageTitle="Calendar | Eido AI">
            <Helmet>
                <style>{`.calendar-grid { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }`}</style>
            </Helmet>
             <div className="flex-1 w-full bg-mushroom-100 flex flex-col relative">
                <main className="absolute inset-0 flex flex-row gap-3 px-3 pb-3">
                    <CalendarSidebar
                        currentDate={currentDate}
                        setCurrentDate={setCurrentDate}
                        classes={classes}
                        isLoadingClasses={isLoadingClasses}
                        selectedClasses={selectedClasses}
                        setSelectedClasses={setSelectedClasses}
                        onColorChange={updateClassColor}
                        upcomingEvents={events.filter(e => new Date(e.event_start) >= new Date()).sort((a,b) => new Date(a.event_start).getTime() - new Date(b.event_start).getTime()).slice(0, 5)}
                        onUploadSyllabusClick={() => setIsSyllabusUploadOpen(true)}
                        view={view as 'day' | 'week' | 'month'}
                        onUpcomingEventSelect={handleUpcomingEventSelect}
                    />
                    <div className="flex-1 flex flex-col rounded-lg border border-marble-400 bg-white overflow-hidden">
                        <CalendarHeader
                            view={view} currentDate={currentDate} onViewChange={(v) => { setView(v); closeAllPopovers(); }}
                            onPrev={handlePrev} onNext={handleNext} onToday={handleToday}
                            onAddEvent={() => toast({ title: "Action Hint", description: "Click and drag on the calendar grid to create a new event."})}
                        />
                        <div ref={scrollContainerRef} className="flex-1 overflow-auto">
                            <CalendarViews
                                view={view} currentDate={currentDate} classes={classes} events={filteredEvents}
                                draftEvent={draftEvent} isCreatingEvent={isCreatingEvent} onDelete={()=>{}}
                                onDayClick={(date) => { handleEventCreateStart(date); handleEventCreateEnd({ currentTarget: document.body } as any); }}
                                onEventCreateStart={handleEventCreateStart} onEventCreateUpdate={handleEventCreateUpdate}
                                onEventCreateEnd={handleEventCreateEnd} onEventClick={handleEventClick}
                            />
                        </div>
                    </div>
                </main>
        
                {creatorPopover && (
                    <EventCreatorPopover
                        anchorElement={creatorPopover.anchor}
                        startDate={creatorPopover.start}
                        endDate={creatorPopover.end}
                        onClose={closeAllPopovers}
                        onSave={handleSaveEvent}
                        eventToEdit={eventToEdit}
                        classes={classes}
                    />
                )}

                {viewerPopover && (
                    <ViewEventPopover
                        event={viewerPopover.event}
                        eventClass={classes.find(c => c.class_id === viewerPopover.event.class_id)}
                        anchorElement={viewerPopover.anchor}
                        onClose={closeAllPopovers}
                        onEdit={handleEditRequest}
                        onDelete={handleDeleteRequest}
                    />
                )}

                {eventToDelete && (
                    <DeleteRecurringEventDialog
                        isOpen={!!eventToDelete}
                        onClose={() => setEventToDelete(null)}
                        onConfirm={confirmEventDeletion}
                    />
                )}
                
                <SyllabusUploadDialog isOpen={isSyllabusUploadOpen} onClose={() => setIsSyllabusUploadOpen(false)} onUpload={handleSyllabusUpload} classes={classes} />
                <ProcessingLoader isOpen={isProcessingSyllabus} />
                <EventConfirmationDialog isOpen={isConfirmationOpen} onClose={() => setIsConfirmationOpen(false)} parsedEvents={parsedEvents} onConfirmEvent={(e) => createEvent(e)} />
            </div>
        </MainAppLayout>
    );
};

export default CalendarPage;