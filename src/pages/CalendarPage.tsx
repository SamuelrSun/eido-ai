
import { useState } from "react";
import { Calendar } from "@/components/calendar/CalendarDisplay";
import { EventModal } from "@/components/calendar/EventModal";
import { SyllabusUploader } from "@/components/calendar/SyllabusUploader";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CalendarEvent } from "@/types/calendar";

const CalendarPage = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([
    {
      id: "1",
      title: "Midterm Exam",
      description: "ITP457 Network Security midterm",
      date: new Date(2025, 4, 15),
      className: "ITP457: Advanced Network Security",
      color: "#9b87f5" // Purple
    },
    {
      id: "2",
      title: "Final Project Due",
      description: "Python data analysis project",
      date: new Date(2025, 4, 25),
      className: "ITP216: Applied Python Concepts",
      color: "#0EA5E9" // Blue
    },
    {
      id: "3",
      title: "Essay Deadline",
      description: "5-page analysis of global trade policies",
      date: new Date(2025, 4, 10),
      className: "IR330: Politics of the World Economy",
      color: "#F97316" // Orange
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<CalendarEvent | null>(null);

  const handleAddEvent = (event: CalendarEvent) => {
    if (currentEvent) {
      // Update existing event
      setEvents(events.map(e => e.id === event.id ? event : e));
    } else {
      // Add new event
      setEvents([...events, { ...event, id: crypto.randomUUID() }]);
    }
    setIsModalOpen(false);
    setCurrentEvent(null);
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(events.filter(event => event.id !== id));
    setIsModalOpen(false);
    setCurrentEvent(null);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setCurrentEvent(event);
    setIsModalOpen(true);
  };

  const handleAddNewEvent = () => {
    setCurrentEvent(null);
    setIsModalOpen(true);
  };

  const handleSyllabusEvents = (newEvents: CalendarEvent[]) => {
    setEvents([...events, ...newEvents]);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Academic Calendar" 
        description="Manage your class schedule, assignments, and exams"
      />
      
      <div className="flex flex-col space-y-6">
        {/* Upcoming Events and Syllabus Uploader side by side */}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/2">
            <div className="bg-white rounded-lg shadow p-4 h-52">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold">Upcoming Events</h2>
                <Button onClick={handleAddNewEvent} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Add Event
                </Button>
              </div>
              
              <div className="space-y-1 overflow-y-auto max-h-[160px]">
                {events.length === 0 ? (
                  <p className="text-gray-500 text-sm">No events scheduled</p>
                ) : (
                  events
                    .sort((a, b) => a.date.getTime() - b.date.getTime())
                    .slice(0, 3)
                    .map(event => (
                      <div
                        key={event.id}
                        onClick={() => handleEditEvent(event)}
                        className="p-1 rounded cursor-pointer hover:bg-gray-50 border-l-4 text-sm"
                        style={{ borderLeftColor: event.color }}
                      >
                        <div className="font-medium">{event.title}</div>
                        <div className="text-xs text-gray-500">
                          {event.date.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </div>
                      </div>
                    ))
                )}
                
                {events.length > 3 && (
                  <div className="text-center mt-1">
                    <Button variant="link" className="text-xs p-0 h-auto">
                      View all ({events.length})
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="w-full md:w-1/2">
            <div className="h-52">
              <SyllabusUploader onEventsAdded={handleSyllabusEvents} />
            </div>
          </div>
        </div>
        
        {/* Full width calendar with increased height */}
        <div className="w-full">
          <div className="bg-white rounded-lg shadow p-4 min-h-[70vh]">
            <Calendar 
              events={events} 
              onEventClick={handleEditEvent} 
            />
          </div>
        </div>
      </div>
      
      <EventModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setCurrentEvent(null);
        }}
        onSave={handleAddEvent}
        onDelete={handleDeleteEvent}
        event={currentEvent}
      />
    </div>
  );
};

export default CalendarPage;
