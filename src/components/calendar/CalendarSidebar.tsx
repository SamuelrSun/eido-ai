import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MiniCalendar } from './MiniCalendar';
import { Upload, MoreHorizontal, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ClassConfigWithColor } from '@/features/calendar/types';
import { CalendarEvent } from '@/services/calendarEventService';

const COLOR_SWATCHES = [
    'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
];

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
}

export const CalendarSidebar: React.FC<CalendarSidebarProps> = ({ currentDate, setCurrentDate, classes, isLoadingClasses, selectedClasses, setSelectedClasses, onColorChange, upcomingEvents, onUploadSyllabusClick }) => {
    
    const handleClassSelection = (classId: string) => {
        setSelectedClasses(
            selectedClasses.includes(classId)
                ? selectedClasses.filter(id => id !== classId)
                : [...selectedClasses, classId]
        );
    };

    return (
        <div className="w-1/4 max-w-[300px] flex flex-col rounded-lg border border-marble-400 bg-white">
            <ScrollArea className="flex-1">
                <div className="p-4">
                    <Button className="w-full bg-stone-700 hover:bg-stone-800 text-white" onClick={onUploadSyllabusClick}>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Syllabus
                    </Button>
                </div>
                <Separator />
                <div className="p-3">
                    <MiniCalendar date={currentDate} setDate={setCurrentDate} />
                </div>
                <Separator />
                <div className="p-4">
                    <h3 className="text-sm font-semibold text-volcanic-900 mb-3">Upcoming Events</h3>
                    <div className="space-y-3 max-h-28 overflow-y-auto pr-2">
                        {upcomingEvents.map(event => {
                            const eventClass = classes.find(c => c.class_id === event.class_id);
                            return (
                                <div key={event.id} className="flex items-start gap-3">
                                    <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", eventClass?.color)} />
                                    <div>
                                        <p className="text-sm font-medium text-volcanic-900">{event.title}</p>
                                        <p className="text-xs text-volcanic-800">{format(new Date(event.event_start), 'EEE, MMM d')}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
                <Separator />
                <div className="p-4">
                    <h3 className="text-sm font-semibold text-volcanic-900 mb-3">My Classes</h3>
                    {isLoadingClasses ? (
                        <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {classes.map(cls => (
                                <div key={cls.class_id} className="flex items-center group">
                                    <Checkbox
                                        id={`class-${cls.class_id}`}
                                        checked={selectedClasses.includes(cls.class_id)}
                                        onCheckedChange={() => handleClassSelection(cls.class_id)}
                                    />
                                    <div className={cn("w-2.5 h-2.5 rounded-full ml-2", cls.color)} />
                                    <label
                                        htmlFor={`class-${cls.class_id}`}
                                        className={cn("ml-2 text-sm cursor-pointer flex-1", selectedClasses.includes(cls.class_id) ? 'text-volcanic-900' : 'text-volcanic-800')}
                                    >
                                        {cls.class_name}
                                    </label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-2">
                                            <div className="grid grid-cols-6 gap-2">
                                                {COLOR_SWATCHES.map(color => (
                                                    <button key={color} onClick={() => onColorChange(cls.class_id, color)} className={cn("w-6 h-6 rounded-full", color)} />
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