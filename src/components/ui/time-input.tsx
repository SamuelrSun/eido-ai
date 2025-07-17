// src/components/ui/time-input.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, parse } from 'date-fns';

interface TimeInputProps {
  value: string; // Expects "HH:mm" format
  onChange: (value: string) => void; // Returns "HH:mm" format
}

// Helper to generate time options
const generateTimeOptions = () => {
  const options = [];
  const date = new Date();
  for (let i = 0; i < 24 * 4; i++) {
    const minutes = i * 15;
    date.setHours(0, minutes, 0, 0);
    options.push({
      value: format(date, 'HH:mm'),
      label: format(date, 'hh:mm a'),
    });
  }
  return options;
};

// Helper to parse various time string formats
const parseTimeString = (timeStr: string): string | null => {
    if (!timeStr) return null;
    
    // Normalize input: remove spaces, dots, and make am/pm lowercase
    const normalizedStr = timeStr.toLowerCase().replace(/[\s.]/g, '');

    // Define parsing patterns and their corresponding date-fns format strings
    const patterns = [
        { regex: /^(\d{1,2}):(\d{2})([ap]m?)$/, format: "h:mma" }, // 10:30am, 10:30a, 10:30 am
        { regex: /^(\d{1,2})([ap]m?)$/, format: "ha" },           // 10am, 10a
        { regex: /^(\d{1,2}):(\d{2})$/, format: "H:mm" },         // 10:30 (24hr), 22:30
        { regex: /^(\d{3,4})$/, format: "HHmm" },                 // 1030, 2230
    ];

    for (const pattern of patterns) {
        if (pattern.regex.test(normalizedStr)) {
            try {
                const parsedDate = parse(normalizedStr, pattern.format, new Date());
                if (!isNaN(parsedDate.getTime())) {
                    return format(parsedDate, 'HH:mm');
                }
            } catch (e) { /* continue */ }
        }
    }
    
    // Fallback for simple numbers like "9" -> "09:00" or "17" -> "17:00"
    if (/^\d{1,2}$/.test(normalizedStr)) {
        const hour = parseInt(normalizedStr, 10);
        if (hour >= 0 && hour < 24) {
             const date = new Date();
             date.setHours(hour, 0);
             return format(date, 'HH:mm');
        }
    }

    return null; // Return null if all parsing fails
};


export const TimeInput: React.FC<TimeInputProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeOptions = useMemo(generateTimeOptions, []);
  
  const displayValue = useMemo(() => {
    if (!value) return '';
    const [hour, minute] = value.split(':').map(Number);
    if (isNaN(hour) || isNaN(minute)) return '';
    const date = new Date();
    date.setHours(hour, minute);
    return format(date, 'p').replace(' ', '').toLowerCase(); // e.g., "10:30am"
  }, [value]);

  const [inputValue, setInputValue] = useState(displayValue);

  // Scroll to the active time when the popover opens
  useEffect(() => {
    if (isOpen) {
        setTimeout(() => {
            const selectedElement = document.querySelector(`[data-value="${value}"]`);
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest' });
            }
        }, 0);
    }
  }, [isOpen, value]);

  // Update internal input value when the external value prop changes
  useEffect(() => {
    setInputValue(displayValue);
  }, [displayValue]);

  const handleSelect = (newTimeValue: string) => {
    onChange(newTimeValue);
    setIsOpen(false);
  };
  
  const handleManualInput = () => {
    const parsedTime = parseTimeString(inputValue);
    if (parsedTime) {
      onChange(parsedTime);
    } else {
      setInputValue(displayValue); // Revert to last valid time on failed parse
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Input
          type="text"
          value={inputValue}
          onFocus={(e) => {
            setIsOpen(true);
            e.currentTarget.select();
          }}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleManualInput}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleManualInput();
              e.currentTarget.blur();
            }
          }}
          className={cn(
            "w-full border-none bg-transparent p-0 text-center focus:outline-none focus-visible:ring-0",
          )}
        />
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0" 
        align="start"
      >
        <Command>
          <CommandList>
            <ScrollArea className="h-60">
              {timeOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  data-value={option.value} // Add data-value for scrolling
                  value={option.label}
                  onSelect={() => handleSelect(option.value)}
                  className={cn(
                    "flex justify-center text-sm",
                    // Use charcoal color for selection
                    value === option.value && "bg-stone-700 text-stone-50"
                  )}
                >
                  {option.label}
                </CommandItem>
              ))}
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};