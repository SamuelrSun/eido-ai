// src/components/calendar/CalendarSidebar.tsx
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MiniCalendar } from './MiniCalendar';
import { Upload, MoreHorizontal, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ClassConfigWithColor } from '@/components/calendar/types';
import { CalendarEvent } from '@/services/calendarEventService';
import { COLOR_PALETTE, getSwatchColor } from '@/components/calendar/colorUtils.ts';
import ShimmerButton from '../ui/ShimmerButton';
import { Button } from '../ui/button';

// --- MODIFICATION: Re-added the missing interface definition ---
interface CalendarSidebarProps {
    currentDate: Date;
    setCurrentDate: (date: Date) => void;
    classes: ClassConfigWithColor[];
    isLoadingClasses: boolean;
    selectedClasses: string[];
    setSelectedClasses: (ids: string[]) => void;
    onColorChange: (classId: string, newColor: string) => void;
    upcomingEvents: CalendarEvent[];
    onUploadSyllabusClick: () => void;
    view: 'day' | 'week' | 'month';
    onUpcomingEventSelect: (event: CalendarEvent) => void;
}

export const CalendarSidebar: React.FC<CalendarSidebarProps> = ({ 
    currentDate, setCurrentDate, classes, isLoadingClasses, 
    selectedClasses, setSelectedClasses, onColorChange, 
    upcomingEvents, onUploadSyllabusClick, view, onUpcomingEventSelect
}) => {
    
    const handleClassSelection = (classId: string) => {
        setSelectedClasses(
            selectedClasses.includes(classId)
                ? selectedClasses.filter(id => id !== classId)
                : [...selectedClasses, classId]
        );
    };

    return (
         <div className="w-1/4 max-w-[300px] flex flex-col rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-300">
            <ScrollArea className="flex-1">
                <div className="p-4">
                    {/* --- MODIFICATION: Added bg-transparent --- */}
                    <ShimmerButton 
                        size="sm" 
                        variant="outline"
                        className="w-full bg-transparent border-neutral-400 text-neutral-200 hover:bg-blue-950/80 hover:border-blue-500 hover:text-neutral-100" 
                        onClick={onUploadSyllabusClick}
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Syllabus
                    </ShimmerButton>
                </div>
                <Separator className="bg-neutral-800" />
                <div className="p-3">
                    <MiniCalendar date={currentDate} setDate={setCurrentDate} view={view} />
                </div>
                <Separator className="bg-neutral-800" />
                <div className="p-4">
                    <h3 className="text-sm font-semibold text-neutral-200 mb-3">Upcoming Events</h3>
                    <div className="space-y-1 max-h-28 overflow-y-auto pr-2">
                        {upcomingEvents.map(event => {
                            const eventClass = classes.find(c => c.class_id === event.class_id);
                            return (
                                <div 
                                    key={event.id} 
                                    className="flex items-start gap-3 p-2 rounded-md cursor-pointer hover:bg-neutral-800/50 transition-colors"
                                    onClick={() => onUpcomingEventSelect(event)}
                                >
                                    <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", getSwatchColor(eventClass?.color))} />
                                    <div>
                                        <p className="text-sm font-medium text-neutral-100">{event.title}</p>
                                        <p className="text-xs text-neutral-400">{`${format(new Date(event.event_start), 'p')} • ${format(new Date(event.event_start), 'EEE, MMM d')}`}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
                <Separator className="bg-neutral-800" />
                <div className="p-4">
                    <h3 className="text-sm font-semibold text-neutral-200 mb-3">My Classes</h3>
                    {isLoadingClasses ? (
                        <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {classes.map(cls => (
                                <div key={cls.class_id} className="flex items-center group">
                                    <Checkbox
                                        id={`class-${cls.class_id}`}
                                        checked={selectedClasses.includes(cls.class_id)}
                                        onCheckedChange={() => handleClassSelection(cls.class_id)}
                                        className="border-neutral-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                    />
                                    <div className={cn("w-2.5 h-2.5 rounded-full ml-2", getSwatchColor(cls.color))} />
                                    <label
                                        htmlFor={`class-${cls.class_id}`}
                                        className={cn("ml-2 text-sm cursor-pointer flex-1", selectedClasses.includes(cls.class_id) ? 'text-neutral-100' : 'text-neutral-400')}
                                    >
                                        {cls.class_name}
                                    </label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-white hover:bg-neutral-700">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-2 bg-neutral-800 border-neutral-700">
                                            <div className="grid grid-cols-6 gap-1">
                                                {COLOR_PALETTE.map(color => (
                                                    <button
                                                        key={color.name}
                                                        onClick={() => onColorChange(cls.class_id, color.border)}
                                                        className={cn("w-6 h-6 rounded-full flex items-center justify-center border-2", color.border, color.bg)}
                                                        aria-label={`Set color to ${color.name}`}
                                                    >
                                                        {cls.color === color.border && <Check className="h-4 w-4 text-white stroke-[3px]" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};