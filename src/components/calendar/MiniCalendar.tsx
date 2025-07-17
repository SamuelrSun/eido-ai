// src/components/calendar/MiniCalendar.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays, addMonths, format, startOfMonth, startOfWeek, subMonths, isSameDay, isSameMonth, endOfWeek, isWithinInterval } from 'date-fns';

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface MiniCalendarProps {
    date: Date;
    setDate: (date: Date) => void;
    view: 'day' | 'week' | 'month';
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({ date, setDate, view }) => {
    const handlePrevMonth = () => setDate(subMonths(date, 1));
    const handleNextMonth = () => setDate(addMonths(date, 1));

    const monthStart = startOfMonth(date);
    const startDate = startOfWeek(monthStart);
    const today = new Date();
    
    // Logic for week view highlighting
    const weekStart = startOfWeek(date);
    const weekEnd = endOfWeek(date);

    const days = [];
    let day = startDate;
    for (let i = 0; i < 35; i++) { // Display 5 weeks for consistency
        days.push(day);
        day = addDays(day, 1);
    }

    return (
        <div className="p-1">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-volcanic-900">
                    {format(date, 'MMMM yyyy')}
                </span>
                <div className="flex items-center -mr-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-y-1 text-center text-xs text-volcanic-800">
                {daysOfWeek.map(day => <div key={day}>{day[0]}</div>)}
                {days.map((d, index) => {
                    const isInWeek = view === 'week' && isWithinInterval(d, { start: weekStart, end: weekEnd });
                    const isWeekStart = isSameDay(d, weekStart);
                    const isWeekEnd = isSameDay(d, weekEnd);

                    return (
                        <div key={d.toString()} className={cn(
                            "flex items-center justify-center",
                            isInWeek && "bg-stone-100",
                            isWeekStart && "rounded-l-full",
                            isWeekEnd && "rounded-r-full"
                        )}>
                            <button onClick={() => setDate(d)} className={cn(
                                "flex items-center justify-center h-7 w-7 rounded-full hover:bg-stone-200 transition-colors",
                                isSameDay(d, date) && "bg-stone-300 font-bold",
                                isSameDay(d, today) && "bg-stone-700 text-white hover:bg-stone-600",
                                !isSameMonth(d, date) && !isInWeek && "text-stone-300"
                            )}>
                                {d.getDate()}
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};