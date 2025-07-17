// src/components/calendar/EventCreatorPopover.tsx
import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { AddEventForm } from './AddEventForm';
import { CalendarEvent, NewCalendarEvent } from '@/services/calendarEventService';
import { ClassConfig } from '@/services/classOpenAIConfig';

interface EventCreatorPopoverProps {
    anchorElement: HTMLElement | null;
    startDate: Date;
    endDate: Date;
    onClose: () => void;
    onSave: (event: NewCalendarEvent, id?: string) => Promise<boolean>;
    classes: ClassConfig[];
    eventToEdit?: CalendarEvent | null;
}

export const EventCreatorPopover: React.FC<EventCreatorPopoverProps> = ({ anchorElement, startDate, endDate, onClose, onSave, classes, eventToEdit }) => {
    const [popoverSide, setPopoverSide] = useState<'right' | 'left'>('right');

    useEffect(() => {
        if (anchorElement) {
            const rect = anchorElement.getBoundingClientRect();
            const popoverWidth = 400; 

            if (rect.right + popoverWidth > window.innerWidth) {
                setPopoverSide('left');
            } else {
                setPopoverSide('right');
            }
        }
    }, [anchorElement]);

    if (!anchorElement) return null;

    const defaults = {
        startDate: startDate,
        endDate: endDate,
    };

    const style: React.CSSProperties = {
        position: 'absolute',
        top: `${anchorElement.getBoundingClientRect().top}px`,
        left: `${anchorElement.getBoundingClientRect().right}px`,
    };

    const styleLeft: React.CSSProperties = {
        position: 'absolute',
        top: `${anchorElement.getBoundingClientRect().top}px`,
        left: `${anchorElement.getBoundingClientRect().left}px`,
    };

    return (
        <Popover open={true} onOpenChange={onClose}>
            <PopoverAnchor style={popoverSide === 'right' ? style : styleLeft} />
            <PopoverContent 
                className="w-96 p-0" 
                side={popoverSide} 
                align="start" 
                sideOffset={5}
                collisionPadding={10} 
            >
                <AddEventForm
                    onSave={onSave}
                    onClose={onClose}
                    defaults={defaults}
                    classes={classes}
                    eventToEdit={eventToEdit}
                />
            </PopoverContent>
        </Popover>
    );
};