// src/components/calendar/views/DayView.tsx
import React from 'react';
import { cn } from '@/lib/utils';
import { format, isSameDay, addMinutes } from 'date-fns';
import { TimeAxis } from './TimeAxis';
import { CalendarEvent, NewCalendarEvent } from '@/services/calendarEventService';
import { ClassConfigWithColor } from '@/features/calendar/types';

interface DayViewProps {
  currentDate: Date;
  classes: ClassConfigWithColor[];
  events: CalendarEvent[];
  draftEvent: Partial<NewCalendarEvent> | null;
  isCreatingEvent: boolean;
  onEventCreateStart: (startDate: Date) => void;
  onEventCreateUpdate: (newTime: Date, e: React.MouseEvent) => void;
  onEventCreateEnd: (e: React.MouseEvent) => void;
  onEventClick: (event: CalendarEvent, anchorElement: HTMLElement) => void;
}

export const DayView: React.FC<DayViewProps> = ({ 
    currentDate, classes, events, draftEvent, isCreatingEvent,
    onEventCreateStart, onEventCreateUpdate, onEventCreateEnd, onEventClick
}) => {
    
    const calculateDateFromY = (y: number, day: Date, containerHeight: number): Date => {
        const totalMinutes = (y / containerHeight) * 24 * 60;
        const snappedTotalMinutes = Math.round(totalMinutes / 15) * 15;
        const hour = Math.floor(snappedTotalMinutes / 60);
        const minute = snappedTotalMinutes % 60;
        const newDate = new Date(day);
        newDate.setHours(hour, minute, 0, 0);
        return newDate;
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('.event-bubble')) return;
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const totalMinutes = (y / rect.height) * 24 * 60;
        const hour = Math.floor(totalMinutes / 60);
        const minute = totalMinutes % 60;
        const snappedMinute = minute < 30 ? 0 : 30;
        const startDate = new Date(currentDate);
        startDate.setHours(hour, snappedMinute, 0, 0);
        onEventCreateStart(startDate);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isCreatingEvent) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const newTime = calculateDateFromY(y, currentDate, rect.height);
        onEventCreateUpdate(newTime, e);
    };

    return (
        <div className="flex flex-1">
            <TimeAxis />
            <div 
                className="flex-1 border-l border-marble-400 relative calendar-grid"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={onEventCreateEnd}
                onMouseLeave={(e) => { if (isCreatingEvent) onEventCreateEnd(e); }}
            >
                {Array.from({ length: 24 }).map((_, hour) => (
                    <div key={hour} className="h-12 border-b border-marble-400"></div>
                ))}
                
                {draftEvent && draftEvent.event_start && isSameDay(new Date(draftEvent.event_start), currentDate) && (() => {
                    const startDate = new Date(draftEvent.event_start);
                    const endDate = draftEvent.event_end ? new Date(draftEvent.event_end) : new Date(startDate.getTime() + 60 * 60 * 1000);
                    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
                    const endMinutes = Math.max(endDate.getHours() * 60 + endDate.getMinutes(), startMinutes + 15);
                    const top = (startMinutes / (24 * 60)) * 100;
                    const duration = endMinutes - startMinutes;
                    const height = (duration / (24 * 60)) * 100;
                    const draftClass = classes.find(c => c.class_id === draftEvent.class_id);
                    return (
                        <div style={{ top: `${top}%`, height: `${height}%` }} className={cn("absolute w-full p-2 rounded-lg text-white text-xs z-20 pointer-events-none draft-event-bubble", draftClass?.color || 'bg-stone-500')}>
                            <p className="font-bold">{draftEvent.title || '(No title)'}</p>
                            <p>{format(startDate, 'p')} - {format(endDate, 'p')}</p>
                        </div>
                    );
                })()}

                {events.filter(e => isSameDay(new Date(e.event_start), currentDate)).map(event => {
                    const eventDate = new Date(event.event_start);
                    const endDate = event.event_end ? new Date(event.event_end) : addMinutes(eventDate, 60);
                    const top = (eventDate.getHours() * 60 + eventDate.getMinutes()) / (24 * 60) * 100;
                    const duration = (endDate.getTime() - eventDate.getTime()) / (1000 * 60);
                    const height = (duration / (24 * 60)) * 100;
                    const eventClass = classes.find(c => c.class_id === event.class_id);
                    const isShort = duration < 45;
                    return (
                        <div
                            key={event.id}
                            data-event-id={event.id}
                            style={{ top: `${top}%`, height: `${height}%` }} 
                            className={cn("absolute w-[calc(100%-8px)] p-1 rounded text-white text-xs z-10 event-bubble cursor-pointer", eventClass?.color || 'bg-gray-500')}
                            onClick={(e) => onEventClick(event, e.currentTarget)}
                            onMouseDown={(e) => e.stopPropagation()}
                            onMouseUp={(e) => e.stopPropagation()}
                        >
                             <p className="font-bold truncate">{event.title}</p>
                             {isShort ? (
                                <p className="truncate text-white/80">
                                    {format(eventDate, 'p')}
                                    {event.location && `, ${event.location}`}
                                </p>
                             ) : (
                                <>
                                    <p className="truncate text-white/80">{format(eventDate, 'p')} - {format(endDate, 'p')}</p>
                                    {event.location && <p className="truncate text-white/80">{event.location}</p>}
                                </>
                             )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};