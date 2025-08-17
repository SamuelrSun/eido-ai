// src/components/calendar/views/WeekView.tsx
import React from 'react';
import { cn } from '@/lib/utils';
import { format, addDays, startOfWeek, isSameDay, addMinutes } from 'date-fns';
import { TimeAxis } from './TimeAxis';
import { CalendarEvent, NewCalendarEvent } from '@/services/calendarEventService';
import { ClassConfigWithColor } from '@/components/calendar/types';
import { normalizeColorClasses } from '@/components/calendar/colorUtils'; // IMPORT THE NEW HELPER

interface WeekViewProps {
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

export const WeekView: React.FC<WeekViewProps> = ({ 
    currentDate, classes, events, draftEvent, isCreatingEvent,
    onEventCreateStart, onEventCreateUpdate, onEventCreateEnd, onEventClick
}) => {
    const weekStart = startOfWeek(currentDate);
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
    const today = new Date();

    const calculateDateFromY = (y: number, day: Date, containerHeight: number): Date => {
        const totalMinutes = (y / containerHeight) * 24 * 60;
        const snappedTotalMinutes = Math.round(totalMinutes / 15) * 15;
        const hour = Math.floor(snappedTotalMinutes / 60);
        const minute = snappedTotalMinutes % 60;
        const newDate = new Date(day);
        newDate.setHours(hour, minute, 0, 0);
        return newDate;
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, day: Date) => {
         if ((e.target as HTMLElement).closest('.event-bubble')) return;
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const totalMinutes = (y / rect.height) * 24 * 60;
        const hour = Math.floor(totalMinutes / 60);
        const minute = totalMinutes % 60;
        const snappedMinute = minute < 30 ? 0 : 30;
        const startDate = new Date(day);
        startDate.setHours(hour, snappedMinute, 0, 0);
        onEventCreateStart(startDate);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, day: Date) => {
        if (!isCreatingEvent) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const newTime = calculateDateFromY(y, day, rect.height);
        onEventCreateUpdate(newTime, e);
    };
    
    return (
        <div className="flex flex-col flex-1">
             <div className="flex sticky top-0 bg-neutral-950 z-20">
                <div className="w-16 shrink-0"></div>
                <div className="flex-1 grid grid-cols-7">
                    {weekDays.map((day) => (
                        <div key={day.toISOString()} className="text-center py-2 border-b border-l border-neutral-800">
                            <p className="text-xs text-neutral-400">{format(day, 'EEE')}</p>
                            <p className={cn("text-lg font-semibold w-8 h-8 flex items-center justify-center mx-auto text-neutral-200", isSameDay(day, today) && "bg-blue-600 text-white rounded-full")}>
                                {format(day, 'd')}
                             </p>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex flex-1">
                <TimeAxis />
                <div className="flex-1 grid grid-cols-7">
                    {weekDays.map(day => (
                        <div key={day.toISOString()} className="relative border-l border-neutral-800 calendar-grid"
                            onMouseDown={(e) => handleMouseDown(e, day)}
                             onMouseMove={(e) => handleMouseMove(e, day)}
                             onMouseUp={onEventCreateEnd}
                            onMouseLeave={(e) => { if (isCreatingEvent) onEventCreateEnd(e); }}>
                             {Array.from({ length: 24 }).map((_, hour) => <div key={hour} className="h-12 border-b border-neutral-800"></div>)}
                        
                             {draftEvent && draftEvent.event_start && isSameDay(new Date(draftEvent.event_start), day) && (() => {
                                const startDate = new Date(draftEvent.event_start);
                                const endDate = draftEvent.event_end ? new Date(draftEvent.event_end) : new Date(startDate.getTime() + 60 * 60 * 1000);
                                const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
                                const endMinutes = Math.max(endDate.getHours() * 60 + endDate.getMinutes(), startMinutes + 15);
                                const top = (startMinutes / (24 * 60)) * 100;
                                const duration = endMinutes - startMinutes;
                                const height = (duration / (24 * 60)) * 100;
                                const draftClass = classes.find(c => c.class_id === draftEvent.class_id);
                                const { borderColor, bgColor } = normalizeColorClasses(draftClass?.color);
                                return (
                                    <div style={{ top: `${top}%`, height: `${height}%` }} className={cn("absolute w-full p-2 rounded-lg text-white text-xs z-20 pointer-events-none draft-event-bubble border", borderColor, bgColor)}>
                                        <p className="font-bold">{draftEvent.title || '(No title)'}</p>
                                          <p>{format(startDate, 'p')} - {format(endDate, 'p')}</p>
                                    </div>
                                 );
                            })()}

                            {events.filter(e => isSameDay(new Date(e.event_start), day)).map(event => {
                                const eventDate = new Date(event.event_start);
                                const endDate = event.event_end ? new Date(event.event_end) : addMinutes(eventDate, 60);
                                const top = (eventDate.getHours() * 60 + eventDate.getMinutes()) / (24 * 60) * 100;
                                const duration = (endDate.getTime() - eventDate.getTime()) / (1000 * 60);
                                const height = (duration / (24 * 60)) * 100;
                                const eventClass = classes.find(c => c.class_id === event.class_id);
                                const isShort = duration < 45;
                                const { borderColor, bgColor } = normalizeColorClasses(eventClass?.color);
                                return (
                                     <div
                                        key={event.id}
                                        data-event-id={event.id}
                                        style={{ top: `${top}%`, height: `${height}%` }}
                                        className={cn("absolute w-[calc(100%-8px)] left-1 p-1 rounded-lg text-white text-xs z-10 event-bubble cursor-pointer border", borderColor, bgColor)}
                                        onClick={(e) => { e.stopPropagation(); onEventClick(event, e.currentTarget); }}
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
                    ))}
                </div>
            </div>
        </div>
    );
};