// src/components/calendar/views/MonthView.tsx
import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { addDays, endOfMonth, endOfWeek, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { CalendarEvent } from '@/services/calendarEventService';
import { ClassConfigWithColor } from '@/components/calendar/types';
import { normalizeColorClasses } from '@/components/calendar/colorUtils'; // IMPORT THE NEW HELPER

interface MonthViewProps {
  currentDate: Date;
  classes: ClassConfigWithColor[];
  events: CalendarEvent[];
  onDelete: (id: string) => void;
  onDayClick: (date: Date, anchorElement: HTMLElement) => void;
  onEventClick: (event: CalendarEvent, anchorElement: HTMLElement) => void;
}

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const MonthView: React.FC<MonthViewProps> = ({ currentDate, classes, events, onDelete, onDayClick, onEventClick }) => {
    const today = new Date();
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = [];
    let day = startDate;

    while (day <= endDate) {
        days.push(day);
        day = addDays(day, 1);
    }

    return (
        <div className="grid grid-cols-7 flex-1">
             {daysOfWeek.map(day => (
                <div key={day} className="text-center text-sm font-semibold text-neutral-300 py-2 border-b border-r border-neutral-800">
                    {day}
                </div>
            ))}
             {days.map((day, index) => (
                <div key={index} className="relative border-b border-r border-neutral-800 p-2 min-h-[120px] flex flex-col cursor-pointer hover:bg-neutral-800/50 transition-colors" onClick={(e) => onDayClick(day, e.currentTarget)}>
                    <div className="flex justify-start">
                        <span className={cn(
                            "text-sm w-8 h-8 flex items-center justify-center rounded-full",
                            isSameDay(day, today) ? "bg-blue-600 text-white" : "text-neutral-200",
                            !isSameMonth(day, currentDate) && !isSameDay(day, today) && "text-neutral-600"
                        )}>
                            {day.getDate()}
                        </span>
                    </div>
                    <div className="mt-1 space-y-1 overflow-y-auto">
                        {events.filter(e => isSameDay(new Date(e.event_start), day)).map(event => {
                            const eventClass = classes.find(c => c.class_id === event.class_id);
                            const { borderColor, bgColor } = normalizeColorClasses(eventClass?.color);
                            return (
                                 <div 
                                     key={event.id} 
                                     data-event-id={event.id}
                                     className={cn("group text-xs p-1 rounded-md text-white flex items-center justify-between border", borderColor, bgColor)}
                                     onClick={(e) => {
                                        e.stopPropagation();
                                        onEventClick(event, e.currentTarget);
                                     }}
                                >
                                     <span className="font-semibold truncate">{event.title}</span>
                                     <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-white/70 hover:text-white hover:bg-white/10" onClick={(e) => { e.stopPropagation(); onDelete(event.id); }}>
                                         <Trash2 className="h-3 w-3" />
                                     </Button>
                                 </div>
                            )
                        })}
                    </div>
                 </div>
            ))}
        </div>
    );
};