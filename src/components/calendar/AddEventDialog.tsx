import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { NewCalendarEvent } from '@/services/calendarEventService';
import { ClassConfig } from '@/services/classOpenAIConfig';
import { Book, FileText, MapPin } from 'lucide-react';
import { format } from 'date-fns';

interface AddEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: NewCalendarEvent) => Promise<boolean>;
  defaults: { date: string, time: string } | null;
  classes: ClassConfig[];
}

export const AddEventDialog: React.FC<AddEventDialogProps> = ({ isOpen, onClose, onSubmit, defaults, classes }) => {
    const [eventType, setEventType] = useState('event');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Use a key to force re-mount when dialog opens, ensuring defaults are applied
    const dialogKey = isOpen ? Date.now() : 'closed';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget as HTMLFormElement);
        const newEvent: NewCalendarEvent = {
            title: formData.get('title') as string,
            event_type: eventType,
            event_start: new Date(`${formData.get('date')}T${formData.get('time')}`).toISOString(),
            repeat_pattern: formData.get('repeat_pattern') as string,
            location: formData.get('location') as string,
            class_id: formData.get('class_id') as string,
            notes: formData.get('notes') as string
        };
        const success = await onSubmit(newEvent);
        if (success) {
            onClose();
        }
        setIsSubmitting(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md p-0" key={dialogKey}>
                <form onSubmit={handleSubmit}>
                    <DialogHeader className="p-6 pb-0">
                        <DialogTitle>Add Event</DialogTitle>
                    </DialogHeader>
                    <div className="p-6 space-y-4">
                        <Input name="title" placeholder="Add title" className="text-lg h-12 border-0 focus-visible:ring-0 shadow-none px-0" autoComplete="off" />
                        <ToggleGroup type="single" defaultValue={eventType} onValueChange={(value) => { if (value) setEventType(value) }} size="sm">
                            <ToggleGroupItem value="event">Event</ToggleGroupItem>
                            <ToggleGroupItem value="assignment">Assignment</ToggleGroupItem>
                            <ToggleGroupItem value="exam">Exam</ToggleGroupItem>
                        </ToggleGroup>
                        <div className="flex items-center gap-2">
                            <Input name="date" type="date" defaultValue={defaults?.date || format(new Date(), 'yyyy-MM-dd')} className="flex-1" autoComplete="off" />
                            <Input name="time" type="time" defaultValue={defaults?.time || format(new Date(), 'HH:mm')} className="flex-1" autoComplete="off" />
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
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};