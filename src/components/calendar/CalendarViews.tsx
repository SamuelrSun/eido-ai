// src/components/calendar/CalendarViews.tsx
import React from 'react';
import { MonthView } from './views/MonthView';
import { WeekView } from './views/WeekView';
import { DayView } from './views/DayView';
import { CalendarEvent, NewCalendarEvent } from '@/services/calendarEventService';
import { ClassConfigWithColor } from '@/features/calendar/types';

interface CalendarViewsProps {
    view: string;
    currentDate: Date;
    classes: ClassConfigWithColor[];
    events: CalendarEvent[];
    draftEvent: Partial<NewCalendarEvent> | null;
    isCreatingEvent: boolean;
    onDelete: (id: string) => void;
    onDayClick: (date: Date) => void;
    onEventCreateStart: (startDate: Date) => void;
    onEventCreateUpdate: (newTime: Date, e: React.MouseEvent) => void;
    onEventCreateEnd: (e: React.MouseEvent | MouseEvent) => void;
    onEventClick: (event: CalendarEvent, anchorElement: HTMLElement) => void;
}

export const CalendarViews: React.FC<CalendarViewsProps> = ({ view, ...props }) => {
    switch (view) {
        case 'day':
            return <DayView {...props} />;
        case 'week':
            return <WeekView {...props} />;
        case 'month':
        default:
            return <MonthView {...props} />;
    }
};