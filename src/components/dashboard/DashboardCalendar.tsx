// src/components/dashboard/DashboardCalendar.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useCalendarData } from '@/hooks/useCalendarData';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { WeekView } from '@/components/calendar/views/WeekView';
import { DayView } from '@/components/calendar/views/DayView';
import { MonthView } from '@/components/calendar/views/MonthView';
import { startOfDay, subWeeks, addWeeks, addDays, subDays, addMonths, subMonths } from 'date-fns';

interface DashboardCalendarProps {
  onAddEventClick: () => void;
}

export const DashboardCalendar: React.FC<DashboardCalendarProps> = ({ onAddEventClick }) => {
  const [calendarDate, setCalendarDate] = useState(startOfDay(new Date()));
  const [calendarView, setCalendarView] = useState('week'); // 'day', 'week', 'month'
  const { classes, events, isLoadingClasses } = useCalendarData();
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoadingClasses && classes.length > 0) {
      setSelectedClasses(classes.map(c => c.class_id));
    }
  }, [isLoadingClasses, classes]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => e.class_id && selectedClasses.includes(e.class_id));
  }, [events, selectedClasses]);

  const handlePrev = () => {
    switch (calendarView) {
      case 'day':
        setCalendarDate(prev => subDays(prev, 1));
        break;
      case 'week':
        setCalendarDate(prev => subWeeks(prev, 1));
        break;
      case 'month':
        setCalendarDate(prev => subMonths(prev, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (calendarView) {
      case 'day':
        setCalendarDate(prev => addDays(prev, 1));
        break;
      case 'week':
        setCalendarDate(prev => addWeeks(prev, 1));
        break;
      case 'month':
        setCalendarDate(prev => addMonths(prev, 1));
        break;
    }
  };
  
  const handleToday = () => setCalendarDate(startOfDay(new Date()));

  const renderCalendarView = () => {
    switch (calendarView) {
      case 'day':
        return <DayView 
                  currentDate={calendarDate} 
                  classes={classes} 
                  events={filteredEvents}
                  draftEvent={null}
                  isCreatingEvent={false}
                  onEventCreateStart={() => {}}
                  onEventCreateUpdate={() => {}}
                  onEventCreateEnd={() => {}}
                  onEventClick={() => {}}
                />;
      case 'month':
        return <MonthView 
                  currentDate={calendarDate}
                  classes={classes}
                  events={filteredEvents}
                  onDelete={() => {}}
                  onDayClick={(date) => {
                    setCalendarView('day');
                    setCalendarDate(date);
                  }}
                  onEventClick={() => {}}
                />;
      case 'week':
      default:
        return <WeekView
                  currentDate={calendarDate}
                  classes={classes}
                  events={filteredEvents}
                  draftEvent={null}
                  isCreatingEvent={false}
                  onEventCreateStart={() => {}}
                  onEventCreateUpdate={() => {}}
                  onEventCreateEnd={() => {}}
                  onEventClick={() => {}}
                />;
    }
  };

  return (
    <div className="rounded-lg border border-marble-400 bg-white overflow-hidden flex flex-col h-[450px]">
      <CalendarHeader
        view={calendarView}
        currentDate={calendarDate}
        onViewChange={setCalendarView}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onAddEvent={onAddEventClick}
      />
      <div className="flex-1 overflow-auto">
        {renderCalendarView()}
      </div>
    </div>
  );
};
