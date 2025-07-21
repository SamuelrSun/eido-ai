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
      label: format(date, 'h:mm a').replace(' AM', 'am').replace(' PM', 'pm'),
    });
  }
  return options;
};

// Helper to parse various time string formats
const parseTimeString = (timeStr: string): string | null => {
    if (!timeStr) return null;
    const normalizedStr = timeStr.toLowerCase().replace(/[\s.]/g, '');
    const patterns = [
        { regex: /^(\d{1,2}):(\d{2})([ap]m?)$/, format: "h:mma" },
        { regex: /^(\d{1,2})([ap]m?)$/, format: "ha" },
        { regex: /^(\d{1,2}):(\d{2})$/, format: "H:mm" },
        { regex: /^(\d{3,4})$/, format: "HHmm" },
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
    
    if (/^\d{1,2}$/.test(normalizedStr)) {
        const hour = parseInt(normalizedStr, 10);
        if (hour >= 0 && hour < 24) {
             const date = new Date();
             date.setHours(hour, 0);
             return format(date, 'HH:mm');
        }
    }

    return null;
};


export const TimeInput: React.FC<TimeInputProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const timeOptions = useMemo(generateTimeOptions, []);
  const popoverContentRef = useRef<HTMLDivElement>(null);
  
  const displayValue = useMemo(() => {
    if (!value) return '';
    const [hour, minute] = value.split(':').map(Number);
    
    if (isNaN(hour) || isNaN(minute)) return '';
    const date = new Date();
    date.setHours(hour, minute);
    return format(date, 'h:mm a').replace(' AM', 'am').replace(' PM', 'pm');
  }, [value]);

  const [inputValue, setInputValue] = useState(displayValue);

  useEffect(() => {
    if (isOpen && value) {
        setTimeout(() => {
            const selectedElement = popoverContentRef.current?.querySelector(`[data-value="${value}"]`);
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'center', behavior: 'instant' });
            }
        }, 100);
    }
  }, [isOpen, value]);

  useEffect(() => {
    setInputValue(displayValue);
  }, [displayValue]);

  const handleSelect = (newTimeValue: string) => {
    setIsSelecting(true);
    onChange(newTimeValue);
    setIsOpen(false);
    setTimeout(() => setIsSelecting(false), 100);
  };
  
  const handleManualInput = () => {
    const parsedTime = parseTimeString(inputValue);
    if (parsedTime) {
      onChange(parsedTime);
    } else {
      setInputValue(displayValue);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Input
          type="text"
          value={inputValue}
          onFocus={(e) => {
            if (!hasBeenOpened) {
              setHasBeenOpened(true);
              setTimeout(() => {
                setIsOpen(true);
                setTimeout(() => e.currentTarget.select(), 10);
              }, 10);
            } else {
              setIsOpen(true);
              setTimeout(() => e.currentTarget.select(), 0);
            }
          }}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={() => {
            if (isSelecting) return;
            setTimeout(() => {
                if (isOpen && !popoverContentRef.current?.contains(document.activeElement)) {
                    handleManualInput();
                    setIsOpen(false);
                }
            }, 50);
          }}
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
        ref={popoverContentRef}
        className="w-[var(--radix-popover-trigger-width)] p-0" 
        align="start"
        onMouseDown={(e) => e.preventDefault()}
      >
        <Command>
          <CommandList>
            <ScrollArea className="h-60">
              {timeOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  data-value={option.value}
                  value={option.label}
                  onSelect={() => handleSelect(option.value)}
                  className={cn(
                    "flex justify-center text-sm whitespace-nowrap",
                    "data-[selected='true']:bg-stone-700 data-[selected='true']:text-stone-50",
                    value === option.value && "bg-stone-100 font-medium"
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