// src/components/calendar/AddEventForm.tsx
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CalendarEvent, NewCalendarEvent } from '@/services/calendarEventService';
import { ClassConfig } from '@/services/classOpenAIConfig';
import { Book, FileText, MapPin, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { TimeInput } from '@/components/ui/time-input';

interface AddEventFormProps {
  onSave: (event: NewCalendarEvent, id?: string) => Promise<boolean>;
  onClose: () => void;
  defaults: { startDate: Date, endDate: Date };
  classes: ClassConfig[];
  eventToEdit?: CalendarEvent;
}

export const AddEventForm: React.FC<AddEventFormProps> = ({ onSave, onClose, defaults, classes, eventToEdit }) => {
    const [title, setTitle] = useState(eventToEdit?.title || '');
    const [eventType, setEventType] = useState(eventToEdit?.event_type || 'event');
    const [startTime, setStartTime] = useState(format(defaults.startDate, 'HH:mm'));
    const [endTime, setEndTime] = useState(format(defaults.endDate, 'HH:mm'));
    const [repeatPattern, setRepeatPattern] = useState(eventToEdit?.repeat_pattern || 'none');
    const [location, setLocation] = useState(eventToEdit?.location || '');
    const [classId, setClassId] = useState(eventToEdit?.class_id || '');
    const [notes, setNotes] = useState(eventToEdit?.notes || '');
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsSubmitting(true);

        const eventDate = format(defaults.startDate, 'yyyy-MM-dd');
        
        const eventPayload: NewCalendarEvent = {
            title: title || '(No title)',
            event_type: eventType,
            event_start: new Date(`${eventDate}T${startTime}`).toISOString(),
            event_end: new Date(`${eventDate}T${endTime}`).toISOString(),
            repeat_pattern: repeatPattern,
            location,
            class_id: classId,
            notes,
        };
        const success = await onSave(eventPayload, eventToEdit?.id);
        if (success) {
            onClose();
        }
        setIsSubmitting(false);
    };

    return (
        <div className="relative">
            <Button type="button" variant="ghost" size="icon" onClick={onClose} className="absolute top-3 right-3 h-7 w-7 text-stone-400 hover:text-stone-700 z-10">
                <X className="h-4 w-4" /><span className="sr-only">Close</span>
            </Button>
            <form onSubmit={handleSubmit} className="flex flex-col">
                <div className="p-4 pt-10 space-y-4">
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add title" className="text-lg h-12 px-0 border-0 border-b-2 border-stone-200 rounded-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0" autoComplete="off" autoFocus />
                    <ToggleGroup type="single" value={eventType} onValueChange={(value) => { if (value) setEventType(value) }} size="sm">
                        <ToggleGroupItem value="event">Event</ToggleGroupItem>
                        <ToggleGroupItem value="assignment">Assignment</ToggleGroupItem>
                        <ToggleGroupItem value="exam">Exam</ToggleGroupItem>
                    </ToggleGroup>
                    <div className="flex items-center gap-2 w-full">
                        <Input name="date" type="date" value={format(defaults.startDate, 'yyyy-MM-dd')} className="w-40 h-9" readOnly/>
                        <div className={cn("flex items-center justify-between flex-1 rounded-md border border-input bg-transparent text-sm h-9 px-3")}>
                            <TimeInput value={startTime} onChange={setStartTime} />
                            <span className="mx-2 text-muted-foreground">-</span>
                            <TimeInput value={endTime} onChange={setEndTime} />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Select name="repeat_pattern" value={repeatPattern} onValueChange={setRepeatPattern}>
                            <SelectTrigger className="bg-transparent border-0 border-b-2 border-stone-200 rounded-none shadow-none focus:ring-0 w-full focus:border-stone-400 text-muted-foreground data-[state=open]:text-foreground data-[placeholder]:text-muted-foreground h-9">
                                <SelectValue placeholder="Does not repeat" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Does not repeat</SelectItem>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-4">
                        <MapPin className="h-5 w-5 text-stone-500" />
                        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Add location" className="bg-transparent border-0 border-b-2 border-stone-200 rounded-none shadow-none focus:ring-0 focus:border-stone-400 h-9" autoComplete="off" />
                    </div>
                    <div className="flex items-center gap-4">
                        <Book className="h-5 w-5 text-stone-500" />
                        <Select name="class_id" value={classId} onValueChange={setClassId}>
                             <SelectTrigger className="bg-transparent border-0 border-b-2 border-stone-200 rounded-none shadow-none focus:ring-0 w-full focus:border-stone-400 text-muted-foreground data-[state=open]:text-foreground data-[placeholder]:text-muted-foreground h-9">
                                <SelectValue placeholder="Select a class" />
                            </SelectTrigger>
                            <SelectContent>
                                {classes.map(c => <SelectItem key={c.class_id} value={c.class_id}>{c.class_name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-start gap-4">
                        <FileText className="h-5 w-5 text-stone-500 mt-2 flex-shrink-0" />
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Add description or notes" className="bg-transparent" />
                    </div>
                </div>
                <div className="flex justify-end gap-2 bg-stone-50 px-4 py-3 border-t mt-auto">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save"}</Button>
                </div>
            </form>
        </div>
    );
};