
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Trash } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarEvent } from "@/types/calendar";

const CLASS_COLORS = {
  "ITP457: Advanced Network Security": "#9b87f5",
  "ITP216: Applied Python Concepts": "#0EA5E9",
  "IR330: Politics of the World Economy": "#F97316"
};

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  onDelete: (id: string) => void;
  event: CalendarEvent | null;
}

export const EventModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete,
  event 
}: EventModalProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [className, setClassName] = useState<string>("ITP457: Advanced Network Security");
  
  // Reset form when modal opens or event changes
  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || "");
      setDate(new Date(event.date));
      setClassName(event.className);
    } else {
      setTitle("");
      setDescription("");
      setDate(new Date());
      setClassName("ITP457: Advanced Network Security");
    }
  }, [event, isOpen]);
  
  const handleSave = () => {
    if (!title.trim()) {
      return; // Simple validation
    }
    
    onSave({
      id: event?.id || "",
      title,
      description,
      date,
      className,
      color: CLASS_COLORS[className as keyof typeof CLASS_COLORS]
    });
  };
  
  const handleDelete = () => {
    if (event?.id) {
      onDelete(event.id);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {event ? "Edit Event" : "Add Event"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Event Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter event title"
              autoFocus
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(date) => date && setDate(date)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="class">Class</Label>
            <Select
              value={className}
              onValueChange={setClassName}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ITP457: Advanced Network Security">
                  ITP457: Advanced Network Security
                </SelectItem>
                <SelectItem value="ITP216: Applied Python Concepts">
                  ITP216: Applied Python Concepts
                </SelectItem>
                <SelectItem value="IR330: Politics of the World Economy">
                  IR330: Politics of the World Economy
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add event details"
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter className="flex justify-between sm:justify-between">
          {event?.id && (
            <Button 
              variant="destructive" 
              type="button" 
              onClick={handleDelete}
            >
              <Trash className="h-4 w-4 mr-1" />
              Delete
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
