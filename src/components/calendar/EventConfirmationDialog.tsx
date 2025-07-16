// src/components/calendar/EventConfirmationDialog.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NewCalendarEvent } from '@/services/calendarEventService';

export interface ParsedEvent {
  id: string;
  title: string;
  event_type: 'event' | 'assignment' | 'exam';
  date: string | null;
  time: string | null;
  location: string | null;
  notes: string | null;
  repeat_pattern?: string | null;
}

interface EventCardProps {
  event: ParsedEvent;
  onAdd: (event: NewCalendarEvent) => void;
  onDelete: (id: string) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onAdd, onDelete }) => {
    const [title, setTitle] = useState(event.title);
    const [date, setDate] = useState(event.date || '');
    const [time, setTime] = useState(event.time || '');
    const [location, setLocation] = useState(event.location || '');
    const [notes, setNotes] = useState(event.notes || '');
    const [eventType, setEventType] = useState(event.event_type);
    const [repeatPattern, setRepeatPattern] = useState(event.repeat_pattern || 'none');

    const handleAddClick = () => {
        const newEvent: NewCalendarEvent = {
            title,
            event_type: eventType,
            event_start: date && time ? new Date(`${date}T${time}`).toISOString() : new Date().toISOString(),
            location,
            notes,
            repeat_pattern: repeatPattern,
        };
        onAdd(newEvent);
    };

    return (
        <Card>
            <CardContent className="pt-6 space-y-3">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event Title" className="text-md font-semibold"/>
                <ToggleGroup type="single" value={eventType} onValueChange={(value) => { if (value) setEventType(value as any) }} size="sm">
                    <ToggleGroupItem value="event">Event</ToggleGroupItem>
                    <ToggleGroupItem value="assignment">Assignment</ToggleGroupItem>
                    <ToggleGroupItem value="exam">Exam</ToggleGroupItem>
                </ToggleGroup>
                <div className="flex gap-2">
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
                 <Select value={repeatPattern} onValueChange={setRepeatPattern}>
                    <SelectTrigger><SelectValue placeholder="Does not repeat" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Does not repeat</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                </Select>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" />
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" />
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => onDelete(event.id)}>
                    <Trash2 className="h-4 w-4 mr-2"/>
                    Delete
                </Button>
                <Button size="sm" onClick={handleAddClick}>Add to Calendar</Button>
            </CardFooter>
        </Card>
    );
};


interface EventConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  parsedEvents: ParsedEvent[];
  onConfirmEvent: (event: NewCalendarEvent) => void;
}

export const EventConfirmationDialog: React.FC<EventConfirmationDialogProps> = ({ isOpen, onClose, parsedEvents, onConfirmEvent }) => {
  const [eventsToConfirm, setEventsToConfirm] = useState<ParsedEvent[]>([]);

  useEffect(() => {
    const sortedEvents = [...parsedEvents].sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateA - dateB;
    });
    setEventsToConfirm(sortedEvents.map((e, i) => ({ ...e, id: `parsed-${i}` })));
  }, [parsedEvents]);

  const handleAddEvent = (eventToAdd: NewCalendarEvent) => {
    onConfirmEvent(eventToAdd);
  };

  const handleDeleteEvent = (eventId: string) => {
    setEventsToConfirm(prev => prev.filter(e => e.id !== eventId));
  };
  
  const handleConfirmAndAdd = (eventData: NewCalendarEvent, eventId: string) => {
      handleAddEvent(eventData);
      handleDeleteEvent(eventId);
  }

  useEffect(() => {
    if (isOpen && eventsToConfirm.length === 0 && parsedEvents.length > 0) {
      onClose();
    }
  }, [eventsToConfirm, isOpen, onClose, parsedEvents]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Confirm Extracted Events</DialogTitle>
          <DialogDescription>
            The AI found the following events. Review, edit, and add them to your calendar.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] my-4">
          <div className="space-y-4 pr-6">
            {eventsToConfirm.map((event) => (
              <EventCard 
                key={event.id}
                event={event}
                onAdd={(newEvent) => handleConfirmAndAdd(newEvent, event.id)}
                onDelete={() => handleDeleteEvent(event.id)}
              />
            ))}
             {eventsToConfirm.length === 0 && (
                <div className="text-center py-10 text-stone-500">All events have been processed!</div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};