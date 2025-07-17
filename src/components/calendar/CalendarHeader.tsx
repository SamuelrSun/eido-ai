import React from 'react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';

interface CalendarHeaderProps {
  view: string;
  currentDate: Date;
  onViewChange: (view: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onAddEvent: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({ view, currentDate, onViewChange, onPrev, onNext, onToday, onAddEvent }) => {
    const getHeaderTitle = () => {
        if (view === 'month') return format(currentDate, 'MMMM yyyy');
        if (view === 'week') {
            const start = startOfWeek(currentDate);
            const end = endOfWeek(currentDate);
            return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
        }
        return format(currentDate, 'MMMM d, yyyy');
    };

    return (
        <header className="flex items-center justify-between p-3 border-b border-marble-400 flex-shrink-0">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                    <span className="text-lg font-semibold text-volcanic-900 min-w-[200px]">
                        {getHeaderTitle()}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrev}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNext}>
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
                <Button variant="outline" size="sm" onClick={onToday}>Today</Button>
                <Button size="sm" onClick={onAddEvent}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Event
                </Button>
            </div>
            <div className="flex items-center gap-2">
                <ToggleGroup type="single" value={view} onValueChange={(v) => v && onViewChange(v)} size="sm">
                    <ToggleGroupItem value="day">Day</ToggleGroupItem>
                    <ToggleGroupItem value="week">Week</ToggleGroupItem>
                    <ToggleGroupItem value="month">Month</ToggleGroupItem>
                </ToggleGroup>
            </div>
        </header>
    );
};