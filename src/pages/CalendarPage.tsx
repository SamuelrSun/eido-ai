
import { useState, useEffect } from "react";
import { Calendar } from "@/components/calendar/CalendarDisplay";
import { EventModal } from "@/components/calendar/EventModal";
import { SyllabusUploader } from "@/components/calendar/SyllabusUploader";
import { ClassFilter, CLASS_COLORS } from "@/components/calendar/ClassFilter";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { CalendarEvent } from "@/types/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { toast } from "sonner";

const CalendarPage = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleClasses, setVisibleClasses] = useState<string[]>(Object.keys(CLASS_COLORS));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<CalendarEvent | null>(null);
  
  // Fetch events from Supabase when component mounts
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('calendar_events')
          .select('*');
          
        if (error) {
          console.error("Error fetching events:", error);
          toast.error("Failed to load calendar events");
          return;
        }
        
        // Transform the data to match our CalendarEvent type
        const calendarEvents: CalendarEvent[] = data.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description || "",
          date: new Date(item.date),
          className: item.class_name,
          color: item.color
        }));
        
        setEvents(calendarEvents);
      } catch (error) {
        console.error("Error in fetchEvents:", error);
        toast.error("Failed to load calendar events");
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, []);
  
  const handleAddEvent = async (event: CalendarEvent) => {
    try {
      if (currentEvent) {
        // Update existing event in Supabase
        const { error } = await supabase
          .from('calendar_events')
          .update({
            title: event.title,
            description: event.description,
            date: event.date.toISOString().split('T')[0],
            class_name: event.className,
            color: event.color
          })
          .eq('id', event.id);
          
        if (error) {
          console.error("Error updating event:", error);
          toast.error("Failed to update event");
          return;
        }
        
        // Update local state
        setEvents(events.map(e => e.id === event.id ? event : e));
        toast.success("Event updated successfully");
      } else {
        // Add new event to Supabase
        const { data, error } = await supabase
          .from('calendar_events')
          .insert({
            title: event.title,
            description: event.description,
            date: event.date.toISOString().split('T')[0],
            class_name: event.className,
            color: event.color
          })
          .select('id')
          .single();
          
        if (error) {
          console.error("Error adding event:", error);
          toast.error("Failed to add event");
          return;
        }
        
        // Add to local state with the returned ID
        setEvents([...events, { ...event, id: data.id }]);
        toast.success("Event added successfully");
      }
    } catch (error) {
      console.error("Error in handleAddEvent:", error);
      toast.error("An error occurred while saving the event");
    } finally {
      setIsModalOpen(false);
      setCurrentEvent(null);
    }
  };
  
  const handleDeleteEvent = async (id: string) => {
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error("Error deleting event:", error);
        toast.error("Failed to delete event");
        return;
      }
      
      // Update local state
      setEvents(events.filter(event => event.id !== id));
      toast.success("Event deleted successfully");
    } catch (error) {
      console.error("Error in handleDeleteEvent:", error);
      toast.error("An error occurred while deleting the event");
    } finally {
      setIsModalOpen(false);
      setCurrentEvent(null);
    }
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
              
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
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
              )}
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
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
              </div>
            ) : (
              <Calendar 
                events={filteredEvents} 
                onEventClick={handleEditEvent} 
              />
            )}
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
