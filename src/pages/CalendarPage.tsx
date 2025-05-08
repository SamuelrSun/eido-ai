
import { useState } from "react";
import { Calendar } from "@/components/calendar/CalendarDisplay";
import { EventModal } from "@/components/calendar/EventModal";
import { SyllabusUploader } from "@/components/calendar/SyllabusUploader";
import { ClassFilter, CLASS_COLORS } from "@/components/calendar/ClassFilter";
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
      color: CLASS_COLORS["ITP457: Advanced Network Security"]
    },
    {
      id: "2",
      title: "Final Project Due",
      description: "Python data analysis project",
      date: new Date(2025, 4, 25),
      className: "ITP216: Applied Python Concepts",
      color: CLASS_COLORS["ITP216: Applied Python Concepts"]
    },
    {
      id: "3",
      title: "Essay Deadline",
      description: "5-page analysis of global trade policies",
      date: new Date(2025, 4, 10),
      className: "IR330: Politics of the World Economy",
      color: CLASS_COLORS["IR330: Politics of the World Economy"]
    },
    {
      id: "4",
      title: "Web Project Due",
      description: "Personal portfolio website",
      date: new Date(2025, 4, 18),
      className: "ITP104: Intro to Web Development",
      color: CLASS_COLORS["ITP104: Intro to Web Development"]
    },
    {
      id: "5",
      title: "Business Pitch",
      description: "Present startup idea to class",
      date: new Date(2025, 4, 20),
      className: "BAEP470: The Entrepreneurial Mindset",
      color: CLASS_COLORS["BAEP470: The Entrepreneurial Mindset"]
    },
    {
      id: "6",
      title: "Lab Report Due",
      description: "Genetics experiment analysis",
      date: new Date(2025, 4, 12),
      className: "BISC110: Good Genes, Bad Genes",
      color: CLASS_COLORS["BISC110: Good Genes, Bad Genes"]
    }
  ]);

  const [visibleClasses, setVisibleClasses] = useState<string[]>(Object.keys(CLASS_COLORS));
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

  const handleFilterChange = (selectedClasses: string[]) => {
    setVisibleClasses(selectedClasses);
  };

  // Filter events based on visible classes
  const filteredEvents = events.filter(event => visibleClasses.includes(event.className));

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Academic Calendar" 
        description="Manage your class schedule, assignments, and exams"
      />
      
      <div className="flex flex-col space-y-6">
        {/* Upcoming Events and Syllabus Uploader side by side */}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/3">
            <div className="bg-white rounded-lg shadow p-4 h-80">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold">Upcoming Events</h2>
                <Button onClick={handleAddNewEvent} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Add Event
                </Button>
              </div>
              
              <div className="space-y-1 overflow-y-auto max-h-[280px]">
                {filteredEvents.length === 0 ? (
                  <p className="text-gray-500 text-sm">No events scheduled</p>
                ) : (
                  filteredEvents
                    .sort((a, b) => a.date.getTime() - b.date.getTime())
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
                          })} • {event.className.split(":")[0]}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
          
          <div className="w-full md:w-1/3">
            <div className="h-80">
              <ClassFilter onFilterChange={handleFilterChange} />
            </div>
          </div>
          
          <div className="w-full md:w-1/3">
            <div className="h-80">
              <SyllabusUploader onEventsAdded={handleSyllabusEvents} />
            </div>
          </div>
        </div>
        
        {/* Full width calendar with increased height */}
        <div className="w-full">
          <div className="bg-white rounded-lg shadow p-4 min-h-[70vh]">
            <Calendar 
              events={filteredEvents} 
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
