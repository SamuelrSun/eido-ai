// src/components/calendar/CalendarHeader.tsx
import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import ShimmerButton from '../ui/ShimmerButton';

interface CalendarHeaderProps {
  view: string;
  currentDate: Date;
  onViewChange: (view: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onAddEvent: (anchorElement: HTMLElement) => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({ view, currentDate, onViewChange, onPrev, onNext, onToday, onAddEvent }) => {
    const addEventButtonRef = useRef<HTMLButtonElement>(null);

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
        <header className="flex items-center justify-between p-3 border-b border-neutral-800 flex-shrink-0 bg-neutral-950">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                     <span className="text-lg font-semibold text-white min-w-[200px]">
                        {getHeaderTitle()}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-white" onClick={onPrev}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-white" onClick={onNext}>
                         <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
                 <Button variant="outline" size="sm" className="bg-transparent text-neutral-200 border-neutral-700 hover:bg-neutral-800" onClick={onToday}>Today</Button>
                <ShimmerButton 
                    ref={addEventButtonRef} 
                    size="sm" 
                    variant="outline"
                    onClick={() => { if (addEventButtonRef.current) onAddEvent(addEventButtonRef.current); }}
                    className="bg-transparent border-neutral-400 text-neutral-200 hover:bg-blue-950/80 hover:border-blue-500 hover:text-neutral-100"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Event
                </ShimmerButton>
            </div>
             <div className="flex items-center gap-2">
                {/* --- MODIFICATION START: Removed height/font overrides and gap-0 --- */}
                <ToggleGroup type="single" value={view} onValueChange={(v) => v && onViewChange(v)} size="sm" className="border border-neutral-800 rounded-md p-0">
                    <ToggleGroupItem value="day" className={cn("text-neutral-400 hover:bg-neutral-800 rounded-none rounded-l-md data-[state=on]:bg-neutral-800 data-[state=on]:text-white")}>Day</ToggleGroupItem>
                    <ToggleGroupItem value="week" className={cn("text-neutral-400 hover:bg-neutral-800 rounded-none border-l border-neutral-800 data-[state=on]:bg-neutral-800 data-[state=on]:text-white")}>Week</ToggleGroupItem>
                    <ToggleGroupItem value="month" className={cn("text-neutral-400 hover:bg-neutral-800 rounded-none rounded-r-md border-l border-neutral-800 data-[state=on]:bg-neutral-800 data-[state=on]:text-white")}>Month</ToggleGroupItem>
                </ToggleGroup>
                {/* --- MODIFICATION END --- */}
            </div>
        </header>
    );
};