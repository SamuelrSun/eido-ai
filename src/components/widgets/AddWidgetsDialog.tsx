
import { useState } from "react";
import {
  BookOpen,
  Calendar,
  Search,
  SquareCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WidgetCard } from "./WidgetCard";
import { useWidgets } from "@/hooks/use-widgets";

interface AddWidgetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Available widgets definitions
const availableWidgets = [
  {
    id: "flashcards",
    name: "Flashcards",
    description: "Create and study with interactive flashcards",
    path: "/flashcards",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    id: "quizzes",
    name: "Quizzes",
    description: "Test your knowledge with adaptive quizzes",
    path: "/quizzes",
    icon: <SquareCheck className="h-5 w-5" />,
  },
  {
    id: "calendar",
    name: "Calendar",
    description: "Track deadlines, exams and important dates",
    path: "/calendar",
    icon: <Calendar className="h-5 w-5" />,
  },
];

export function AddWidgetsDialog({ open, onOpenChange }: AddWidgetsDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { enabledWidgets, setEnabledWidgets } = useWidgets();
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>(enabledWidgets);

  // Handle search filtering
  const filteredWidgets = availableWidgets.filter(widget =>
    widget.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    widget.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Toggle widget selection
  const handleToggleWidget = (id: string) => {
    setSelectedWidgets(prev =>
      prev.includes(id) ? prev.filter(widgetId => widgetId !== id) : [...prev, id]
    );
  };

  // Save selected widgets
  const handleSaveWidgets = () => {
    setEnabledWidgets(selectedWidgets);
    onOpenChange(false);
  };

  // Reset to current enabled widgets
  const handleCancel = () => {
    setSelectedWidgets(enabledWidgets);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Widgets</DialogTitle>
        </DialogHeader>
        
        {/* Search box */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search widgets..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* Widget cards */}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto py-2">
          {filteredWidgets.length > 0 ? (
            filteredWidgets.map(widget => (
              <WidgetCard
                key={widget.id}
                id={widget.id}
                name={widget.name}
                description={widget.description}
                icon={widget.icon}
                isSelected={selectedWidgets.includes(widget.id)}
                onToggle={handleToggleWidget}
              />
            ))
          ) : (
            <p className="text-center text-sm text-muted-foreground py-4">
              No widgets found matching your search.
            </p>
          )}
        </div>
        
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSaveWidgets}>
            Add Selected Widgets
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
