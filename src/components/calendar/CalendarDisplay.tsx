
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarEvent } from "@/types/calendar";

interface CalendarProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export function Calendar({ events, onEventClick }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Get current month and year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  // Get the first day of the month
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
  
  // Get the number of days in the month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  // Get days from previous month to display
  const daysFromPreviousMonth = startingDayOfWeek;
  
  // Calculate total days to display (previous month + current month + next month to fill grid)
  const totalDays = Math.ceil((daysInMonth + daysFromPreviousMonth) / 7) * 7;
  
  // Days of the week
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  // Month names
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };
  
  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };
  
  // Go to today
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // Filter events for the current month
  const eventsThisMonth = events.filter(event => {
    return event.date.getMonth() === currentMonth && 
           event.date.getFullYear() === currentYear;
  });

  // Group events by date
  const eventsByDate: Record<number, CalendarEvent[]> = {};
  eventsThisMonth.forEach(event => {
    const day = event.date.getDate();
    if (!eventsByDate[day]) {
      eventsByDate[day] = [];
    }
    eventsByDate[day].push(event);
  });
  
  // Render calendar days
  const renderCalendarDays = () => {
    const calendarDays = [];
    
    // Add days from previous month
    const previousMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = 0; i < daysFromPreviousMonth; i++) {
      const day = previousMonthDays - daysFromPreviousMonth + i + 1;
      calendarDays.push(
        <div 
          key={`prev-${i}`} 
          className="h-24 border p-1 text-gray-400 bg-gray-50"
        >
          {day}
        </div>
      );
    }
    
    // Add days from current month
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
      const isToday = 
        i === today.getDate() && 
        currentMonth === today.getMonth() && 
        currentYear === today.getFullYear();
      
      const eventsForDay = eventsByDate[i] || [];
      
      calendarDays.push(
        <div 
          key={`current-${i}`} 
          className={`min-h-24 border p-1 ${isToday ? "bg-blue-50 border-blue-200" : ""}`}
        >
          <div className="flex justify-between">
            <span className={`text-sm font-medium ${isToday ? "bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center" : ""}`}>
              {i}
            </span>
            {isToday && <span className="text-xs text-blue-500">Today</span>}
          </div>
          
          <div className="mt-1 space-y-1 overflow-y-auto max-h-[80px]">
            {eventsForDay.map(event => (
              <div 
                key={event.id}
                onClick={() => onEventClick(event)}
                style={{ backgroundColor: `${event.color}20`, borderLeftColor: event.color }}
                className="text-xs p-1 rounded truncate cursor-pointer border-l-2"
              >
                {event.title}
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    // Add days from next month to fill grid
    const remainingDays = totalDays - (daysInMonth + daysFromPreviousMonth);
    for (let i = 1; i <= remainingDays; i++) {
      calendarDays.push(
        <div 
          key={`next-${i}`} 
          className="h-24 border p-1 text-gray-400 bg-gray-50"
        >
          {i}
        </div>
      );
    }
    
    return calendarDays;
  };
  
  return (
    <div className="w-full">
      {/* Calendar Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {monthNames[currentMonth]} {currentYear}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0">
        {/* Days of the week header */}
        {daysOfWeek.map(day => (
          <div 
            key={day} 
            className="p-2 text-center font-medium bg-gray-100 border"
          >
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {renderCalendarDays()}
      </div>
    </div>
  );
}
