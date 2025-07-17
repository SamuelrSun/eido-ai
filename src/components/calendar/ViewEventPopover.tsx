// src/components/calendar/ViewEventPopover.tsx
import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarEvent } from '@/services/calendarEventService';
import { ClassConfigWithColor } from '@/features/calendar/types';
import { format } from 'date-fns';
import { MapPin, Edit, Trash2, X, Book, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ViewEventPopoverProps {
  event: CalendarEvent;
  eventClass: ClassConfigWithColor | undefined;
  anchorElement: HTMLElement;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
}

export const ViewEventPopover: React.FC<ViewEventPopoverProps> = ({ event, eventClass, anchorElement, onClose, onEdit, onDelete }) => {
  const [popoverSide, setPopoverSide] = useState<'right' | 'left'>('right');

  useEffect(() => {
    if (anchorElement) {
        const rect = anchorElement.getBoundingClientRect();
        const popoverWidth = 320; // from className="w-80"
        const spaceOnRight = window.innerWidth - rect.right;
        const spaceOnLeft = rect.left;

        // If not enough space on the right, but enough on the left, switch side
        if (spaceOnRight < popoverWidth + 10 && spaceOnLeft > popoverWidth + 10) {
            setPopoverSide('left');
        } else {
            setPopoverSide('right');
        }
    }
  }, [anchorElement]);
  
  const startTime = format(new Date(event.event_start), 'p');
  const endTime = event.event_end ? format(new Date(event.event_end), 'p') : '';
  const dayOfWeek = format(new Date(event.event_start), 'eeee, MMMM d');

  return (
    <Popover open={true} onOpenChange={onClose}>
      <PopoverAnchor asChild>
        <div style={{
            position: 'absolute',
            top: `${anchorElement.getBoundingClientRect().top}px`,
            left: `${popoverSide === 'right' ? anchorElement.getBoundingClientRect().right : anchorElement.getBoundingClientRect().left}px`
        }} />
      </PopoverAnchor>
      <PopoverContent
        className="w-80 p-0 shadow-xl"
        side={popoverSide}
        align="start"
        sideOffset={10}
        collisionPadding={10}
      >
        <div className="flex justify-end p-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(event)}><Edit className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(event)}><Trash2 className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="p-4 pt-0">
            <div className="flex items-center gap-4 mb-2">
                <div className={cn("w-4 h-4 rounded", eventClass?.color || 'bg-gray-500')} />
                <h3 className="text-2xl font-semibold">{event.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{dayOfWeek} • {startTime}{endTime && ` - ${endTime}`}</p>
            {event.location && (
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{event.location}</span>
                </div>
            )}
            {eventClass && (
                <div className="flex items-start gap-4 mt-2 text-sm text-muted-foreground">
                    <Book className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{eventClass.class_name}</span>
                </div>
            )}
            {event.notes && (
                <div className="flex items-start gap-4 mt-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <p className="whitespace-pre-wrap">{event.notes}</p>
                </div>
            )}
        </div>
      </PopoverContent>
    </Popover>
  );
};