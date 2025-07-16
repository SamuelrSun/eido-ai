// src/pages/CalendarPage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { MainAppLayout } from '@/components/layout/MainAppLayout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChevronLeft, ChevronRight, Plus, Upload, MoreHorizontal, Loader2, Trash2, MapPin, Book, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addDays, addMonths, addWeeks, format, startOfDay, startOfWeek, subDays, subMonths, subWeeks, endOfWeek, isSameDay, isSameMonth, endOfMonth, startOfMonth } from 'date-fns';
import { classOpenAIConfigService, ClassConfig } from '@/services/classOpenAIConfig';
import { calendarEventService, CalendarEvent, NewCalendarEvent } from '@/services/calendarEventService';
import { useToast } from '@/hooks/use-toast';
import { SyllabusUploadDialog } from '@/components/calendar/SyllabusUploadDialog';
import { ProcessingLoader } from '@/components/calendar/ProcessingLoader';
import { EventConfirmationDialog, ParsedEvent } from '@/components/calendar/EventConfirmationDialog';
import { supabase } from '@/integrations/supabase/client';

// --- Dynamic Data Types ---
interface ClassConfigWithColor extends ClassConfig {
    color: string;
}

const COLOR_SWATCHES = [
    'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
];

// --- Helper Functions & Components ---
const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MiniCalendar = ({ date, setDate }: { date: Date, setDate: (date: Date) => void }) => {
    const handlePrevMonth = () => setDate(subMonths(date, 1));
    const handleNextMonth = () => setDate(addMonths(date, 1));

    const monthStart = startOfMonth(date);
    const startDate = startOfWeek(monthStart);
    const today = new Date();

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
                {days.map(d => (
                    <div key={d.toString()} className="flex items-center justify-center">
                        <button onClick={() => setDate(d)} className={cn(
                            "flex items-center justify-center h-7 w-7 rounded-full hover:bg-stone-200",
                            isSameDay(d, date) && "bg-stone-300",
                            isSameDay(d, today) && "bg-stone-700 text-white hover:bg-stone-600",
                            !isSameMonth(d, date) && "text-stone-300"
                        )}>
                            {d.getDate()}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const MonthView = ({ currentDate, classes, events, onDelete, onDayClick }: { currentDate: Date, classes: ClassConfigWithColor[], events: CalendarEvent[], onDelete: (id: string) => void, onDayClick: (date: Date) => void }) => {
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
                <div key={day} className="text-center text-sm font-semibold text-volcanic-900 py-2 border-b border-r border-marble-400">
                    {day}
                </div>
            ))}
            {days.map((day, index) => (
                <div key={index} className="relative border-b border-r border-marble-400 p-2 min-h-[120px] flex flex-col cursor-pointer" onClick={() => onDayClick(day)}>
                    <div className="flex justify-start">
                        <span className={cn(
                            "text-sm w-8 h-8 flex items-center justify-center rounded-full",
                            isSameDay(day, today) ? "bg-stone-700 text-white" : "text-volcanic-800",
                            !isSameMonth(day, currentDate) && !isSameDay(day, today) && "text-stone-400"
                        )}>
                            {day.getDate()}
                        </span>
                    </div>
                    <div className="mt-1 space-y-1 overflow-y-auto">
                        {events.filter(e => isSameDay(new Date(e.event_start), day)).map(event => {
                            const eventClass = classes.find(c => c.class_id === event.class_id);
                            return (
                                <div key={event.id} className={cn("group text-xs p-1 rounded-md text-white flex items-center justify-between", eventClass?.color)}>
                                    <span className="font-semibold truncate">{event.title}</span>
                                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); onDelete(event.id); }}>
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

const TimeAxis = () => (
    <div className="w-16 text-right pr-2">
        {Array.from({ length: 24 }).map((_, hour) => (
            <div key={hour} className="h-12 relative">
                <span className="text-xs text-volcanic-800 absolute -top-2 right-2">
                    {hour === 0 ? '' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </span>
            </div>
        ))}
    </div>
);

const WeekView = ({ currentDate, classes, events, onDelete, onTimeSlotClick }: { currentDate: Date, classes: ClassConfigWithColor[], events: CalendarEvent[], onDelete: (id: string) => void, onTimeSlotClick: (date: Date, hour: number, e: React.MouseEvent) => void }) => {
    const weekStart = startOfWeek(currentDate);
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
    const today = new Date();

    return (
        <div className="flex flex-1">
            <TimeAxis />
            <div className="flex-1 grid grid-cols-7">
                {weekDays.map(day => (
                    <div key={day.toISOString()} className="border-l border-marble-400">
                        <div className="text-center py-2 border-b border-marble-400">
                            <p className="text-xs text-volcanic-800">{format(day, 'EEE')}</p>
                            <div className="flex justify-center items-center">
                                <p className={cn(
                                    "text-lg font-semibold w-8 h-8 flex items-center justify-center rounded-full", 
                                    isSameDay(day, today) ? "bg-stone-700 text-white" : "text-volcanic-900"
                                )}>
                                    {format(day, 'd')}
                                </p>
                            </div>
                        </div>
                        <div className="relative h-full">
                            {Array.from({ length: 24 }).map((_, hour) => (
                                <div key={hour} className="h-12 border-b border-marble-400 cursor-pointer" onClick={(e) => onTimeSlotClick(day, hour, e)}></div>
                            ))}
                            {events.filter(e => isSameDay(new Date(e.event_start), day)).map(event => {
                                const eventDate = new Date(event.event_start);
                                const top = (eventDate.getHours() * 60 + eventDate.getMinutes()) / (24 * 60) * 100;
                                const duration = event.event_end ? (new Date(event.event_end).getTime() - eventDate.getTime()) / (1000 * 60) : 60;
                                const height = duration / (24 * 60) * 100;
                                const eventClass = classes.find(c => c.class_id === event.class_id);
                                return (
                                    <div key={event.id} style={{ top: `${top}%`, height: `${height}%` }} className={cn("absolute w-full p-2 rounded-lg text-white text-xs", eventClass?.color)}>
                                        <p className="font-bold">{event.title}</p>
                                        <p>{format(eventDate, 'p')}</p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const DayView = ({ currentDate, classes, events, onDelete, onTimeSlotClick }: { currentDate: Date, classes: ClassConfigWithColor[], events: CalendarEvent[], onDelete: (id: string) => void, onTimeSlotClick: (date: Date, hour: number, e: React.MouseEvent) => void }) => {
    return (
        <div className="flex flex-1">
            <TimeAxis />
            <div className="flex-1 border-l border-marble-400 relative">
                {Array.from({ length: 24 }).map((_, hour) => (
                    <div key={hour} className="h-12 border-b border-marble-400 cursor-pointer" onClick={(e) => onTimeSlotClick(currentDate, hour, e)}></div>
                ))}
                {events.filter(e => isSameDay(new Date(e.event_start), currentDate)).map(event => {
                    const eventDate = new Date(event.event_start);
                    const top = (eventDate.getHours() * 60 + eventDate.getMinutes()) / (24 * 60) * 100;
                    const duration = event.event_end ? (new Date(event.event_end).getTime() - eventDate.getTime()) / (1000 * 60) : 60;
                    const height = duration / (24 * 60) * 100;
                    const eventClass = classes.find(c => c.class_id === event.class_id);
                    return (
                        <div key={event.id} style={{ top: `${top}%`, height: `${height}%` }} className={cn("absolute w-full p-2 rounded-lg text-white text-xs", eventClass?.color)}>
                            <p className="font-bold">{event.title}</p>
                            <p>{format(eventDate, 'p')}</p>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

const CalendarViews = ({ view, currentDate, classes, events, onDelete, onDayClick, onTimeSlotClick }: { view: string, currentDate: Date, classes: ClassConfigWithColor[], events: CalendarEvent[], onDelete: (id: string) => void, onDayClick: (date: Date) => void, onTimeSlotClick: (date: Date, hour: number, e: React.MouseEvent) => void }) => {
    switch (view) {
        case 'day':
            return <DayView currentDate={currentDate} classes={classes} events={events} onDelete={onDelete} onTimeSlotClick={onTimeSlotClick} />;
        case 'week':
            return <WeekView currentDate={currentDate} classes={classes} events={events} onDelete={onDelete} onTimeSlotClick={onTimeSlotClick} />;
        case 'month':
        default:
            return <MonthView currentDate={currentDate} classes={classes} events={events} onDelete={onDelete} onDayClick={onDayClick} />;
    }
};

const CalendarPage = () => {
    const [view, setView] = useState('month');
    const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));
    const [classes, setClasses] = useState<ClassConfigWithColor[]>([]);
    const [isLoadingClasses, setIsLoadingClasses] = useState(true);
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(true);
    const [isAddEventOpen, setIsAddEventOpen] = useState(false);
    const [addEventDefaults, setAddEventDefaults] = useState<{ date: string, time: string } | null>(null);
    const [isSyllabusUploadOpen, setIsSyllabusUploadOpen] = useState(false);
    const [isProcessingSyllabus, setIsProcessingSyllabus] = useState(false);
    const [parsedEvents, setParsedEvents] = useState<ParsedEvent[]>([]);
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
    const [eventType, setEventType] = useState('event');
    const { toast } = useToast();

    const fetchAllData = useCallback(async () => {
        setIsLoadingClasses(true);
        setIsLoadingEvents(true);
        try {
            const [fetchedClasses, fetchedEvents] = await Promise.all([
                classOpenAIConfigService.getAllClasses(),
                calendarEventService.getEvents()
            ]);

            const classesWithColors = fetchedClasses.map((cls, index) => ({
                ...cls,
                color: COLOR_SWATCHES[index % COLOR_SWATCHES.length]
            }));
            setClasses(classesWithColors);
            setSelectedClasses(classesWithColors.map(c => c.class_id));
            setEvents(fetchedEvents);
        } catch (error) {
            toast({
                title: "Error fetching data",
                description: error instanceof Error ? error.message : "Could not load calendar data.",
                variant: "destructive",
            });
        } finally {
            setIsLoadingClasses(false);
            setIsLoadingEvents(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const handlePrev = () => {
        if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
        else if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
        else setCurrentDate(subDays(currentDate, 1));
    };

    const handleNext = () => {
        if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
        else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
        else setCurrentDate(addDays(currentDate, 1));
    };

    const handleToday = () => setCurrentDate(startOfDay(new Date()));

    const getHeaderTitle = () => {
        if (view === 'month') return format(currentDate, 'MMMM yyyy');
        if (view === 'week') {
            const start = startOfWeek(currentDate);
            const end = endOfWeek(currentDate);
            return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
        }
        return format(currentDate, 'MMMM d, yyyy');
    };
    
    const upcomingEvents = events
        .filter(e => {
            const eventDate = new Date(e.event_start);
            const today = new Date();
            const threeWeeksFromNow = addDays(today, 21);
            return eventDate >= today && eventDate <= threeWeeksFromNow;
        })
        .sort((a, b) => new Date(a.event_start).getTime() - new Date(b.event_start).getTime());

    const handleClassSelection = (classId: string) => {
        setSelectedClasses(prev => 
            prev.includes(classId) 
                ? prev.filter(id => id !== classId) 
                : [...prev, classId]
        );
    };

    const handleColorChange = (classId: string, newColor: string) => {
        setClasses(prev => prev.map(c => c.class_id === classId ? { ...c, color: newColor } : c));
    };

    const handleCreateEvent = async (eventData: NewCalendarEvent) => {
        try {
            const createdEvent = await calendarEventService.createEvent(eventData);
            setEvents(prev => [...prev, createdEvent]);
            toast({ title: "Event Created", description: `"${createdEvent.title}" has been added to your calendar.` });
            setIsAddEventOpen(false);
        } catch (error) {
            toast({ title: "Error", description: "Failed to create event.", variant: "destructive" });
        }
    };
    
    const handleDeleteEvent = async (eventId: string) => {
        try {
            await calendarEventService.deleteEvent(eventId);
            setEvents(prev => prev.filter(e => e.id !== eventId));
            toast({ title: "Event Deleted" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete event.", variant: "destructive" });
        }
    };

    const handleSyllabusUpload = async (uploadedFiles: File[], classId: string) => {
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
            
            const { data, error } = await supabase.functions.invoke('parse-syllabus', {
                body: { files: fileContents, class_id: classId }
            });

            if (error) throw new Error(error.message);
            
            const extractedEvents = data?.events;

            if (extractedEvents && Array.isArray(extractedEvents) && extractedEvents.length > 0) {
                setParsedEvents(extractedEvents);
                setIsConfirmationOpen(true);
            } else {
                toast({
                    title: "No Events Found",
                    description: "The AI processed the files but could not find any calendar events. Please try another file or add events manually.",
                    variant: "default",
                });
            }

        } catch (error) {
            toast({ title: "Syllabus Parsing Failed", description: error instanceof Error ? error.message : "An unknown error occurred.", variant: "destructive" });
        } finally {
            setIsProcessingSyllabus(false);
        }
    };

    const handleDayClick = (day: Date) => {
        setAddEventDefaults({
            date: format(day, 'yyyy-MM-dd'),
            time: format(new Date(), 'HH:mm')
        });
        setIsAddEventOpen(true);
    };

    const handleTimeSlotClick = (day: Date, hour: number, e: React.MouseEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const y = e.clientY - rect.top;
        const minute = y > rect.height / 2 ? 30 : 0;
        
        setAddEventDefaults({
            date: format(day, 'yyyy-MM-dd'),
            time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        });
        setIsAddEventOpen(true);
    };

    const filteredEvents = events.filter(e => e.class_id && selectedClasses.includes(e.class_id));

    return (
        <MainAppLayout pageTitle="Calendar | Eido AI">
            <Helmet>
                <style>{`
                    html, body, #root { font-family: "Trebuchet MS", sans-serif; }
                    .bg-mushroom-100 { background-color: #75909C; }
                    .bg-marble-100 { background-color: #F8F7F4; }
                    .border-marble-400 { border-color: rgb(221, 221, 221); }
                    .text-volcanic-900 { color: #212121; }
                    .text-volcanic-800 { color: #6B7280; }
                    .text-coral-500 { color: #ff7759; }
                    .bg-stone-700 { background-color: #44403c; }
                `}</style>
            </Helmet>
            <div className="flex-1 w-full bg-mushroom-100 flex flex-col relative">
                <main className="absolute inset-0 flex flex-row gap-3 px-3 pb-3">
                    {/* Left Sidebar */}
                    <div className="w-1/4 max-w-[300px] flex flex-col rounded-lg border border-marble-400 bg-white">
                        <ScrollArea className="flex-1">
                            <div className="p-4">
                                <Button className="w-full bg-stone-700 hover:bg-stone-800 text-white" onClick={() => setIsSyllabusUploadOpen(true)}>
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
                                                    className={cn(
                                                        "ml-2 text-sm cursor-pointer flex-1",
                                                        selectedClasses.includes(cls.class_id) ? 'text-volcanic-900' : 'text-volcanic-800'
                                                    )}
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
                                                                <button key={color} onClick={() => handleColorChange(cls.class_id, color)} className={cn("w-6 h-6 rounded-full", color)} />
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

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col rounded-lg border border-marble-400 bg-white overflow-hidden">
                        <header className="flex items-center justify-between p-3 border-b border-marble-400 flex-shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                    <span className="text-lg font-semibold text-volcanic-900">
                                        {getHeaderTitle()}
                                    </span>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrev}>
                                        <ChevronLeft className="h-5 w-5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNext}>
                                        <ChevronRight className="h-5 w-5" />
                                    </Button>
                                </div>
                                <Button variant="outline" size="sm" onClick={handleToday}>Today</Button>
                                <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add Event
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md p-0">
                                        <form onSubmit={(e) => {
                                            e.preventDefault();
                                            const formData = new FormData(e.currentTarget);
                                            const newEvent: NewCalendarEvent = {
                                                title: formData.get('title') as string,
                                                event_type: eventType,
                                                event_start: new Date(`${formData.get('date')}T${formData.get('time')}`).toISOString(),
                                                repeat_pattern: formData.get('repeat_pattern') as string,
                                                location: formData.get('location') as string,
                                                class_id: formData.get('class_id') as string,
                                                notes: formData.get('notes') as string
                                            };
                                            handleCreateEvent(newEvent);
                                        }}>
                                            <div className="p-6 space-y-4">
                                                <Input name="title" placeholder="Add title" className="text-lg h-12 border-0 focus-visible:ring-0 shadow-none px-0" autoComplete="off" />
                                                <ToggleGroup type="single" defaultValue={eventType} onValueChange={(value) => { if (value) setEventType(value) }} size="sm">
                                                    <ToggleGroupItem value="event">Event</ToggleGroupItem>
                                                    <ToggleGroupItem value="assignment">Assignment</ToggleGroupItem>
                                                    <ToggleGroupItem value="exam">Exam</ToggleGroupItem>
                                                </ToggleGroup>
                                                <div className="flex items-center gap-2">
                                                    <Input name="date" type="date" defaultValue={addEventDefaults?.date || format(new Date(), 'yyyy-MM-dd')} className="flex-1" autoComplete="off" />
                                                    <Input name="time" type="time" defaultValue={addEventDefaults?.time || format(new Date(), 'HH:mm')} className="flex-1" autoComplete="off" />
                                                </div>
                                                <Select name="repeat_pattern" defaultValue="none">
                                                    <SelectTrigger><SelectValue placeholder="Does not repeat" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">Does not repeat</SelectItem>
                                                        <SelectItem value="daily">Daily</SelectItem>
                                                        <SelectItem value="weekly">Weekly</SelectItem>
                                                        <SelectItem value="monthly">Monthly</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <div className="flex items-center gap-4">
                                                    <MapPin className="h-5 w-5 text-stone-500" />
                                                    <Input name="location" placeholder="Add location" className="border-0 focus-visible:ring-0 shadow-none px-0" autoComplete="off" />
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <Book className="h-5 w-5 text-stone-500" />
                                                    <Select name="class_id">
                                                        <SelectTrigger className="border-0 focus-visible:ring-0 shadow-none px-0"><SelectValue placeholder="Select a class" /></SelectTrigger>
                                                        <SelectContent>
                                                            {classes.map(c => <SelectItem key={c.class_id} value={c.class_id}>{c.class_name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="flex items-start gap-4">
                                                    <FileText className="h-5 w-5 text-stone-500 mt-2" />
                                                    <Textarea name="notes" placeholder="Add description or notes" className="border-0 focus-visible:ring-0 shadow-none px-0" />
                                                </div>
                                            </div>
                                            <DialogFooter className="bg-stone-50 px-6 py-3">
                                                <Button type="submit">Save</Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            <div className="flex items-center gap-2">
                                <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v)} size="sm">
                                    <ToggleGroupItem value="day">Day</ToggleGroupItem>
                                    <ToggleGroupItem value="week">Week</ToggleGroupItem>
                                    <ToggleGroupItem value="month">Month</ToggleGroupItem>
                                </ToggleGroup>
                            </div>
                        </header>
                        <div className="flex-1 overflow-auto">
                           <CalendarViews view={view} currentDate={currentDate} classes={classes} events={filteredEvents} onDelete={handleDeleteEvent} onDayClick={handleDayClick} onTimeSlotClick={handleTimeSlotClick} />
                        </div>
                    </div>
                </main>
                <SyllabusUploadDialog isOpen={isSyllabusUploadOpen} onClose={() => setIsSyllabusUploadOpen(false)} onUpload={handleSyllabusUpload} classes={classes} />
                <ProcessingLoader isOpen={isProcessingSyllabus} />
                <EventConfirmationDialog isOpen={isConfirmationOpen} onClose={() => setIsConfirmationOpen(false)} parsedEvents={parsedEvents} onConfirmEvent={handleCreateEvent} />
            </div>
        </MainAppLayout>
    );
};

export default CalendarPage;
