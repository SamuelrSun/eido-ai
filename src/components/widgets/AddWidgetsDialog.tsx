
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WidgetCard } from "./WidgetCard";
import { useWidgets, WidgetType } from "@/hooks/use-widgets";
import { useClassWidgets } from "@/hooks/use-class-widgets";
import { BookOpen, Database, FileInput, Search, SquareCheck } from "lucide-react";

interface AddWidgetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classMode?: boolean;
  currentClassName?: string;
}

interface WidgetOption {
  id: WidgetType;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export function AddWidgetsDialog({
  open,
  onOpenChange,
  classMode = false,
  currentClassName = ""
}: AddWidgetsDialogProps) {
  // Use either class widgets or global widgets based on mode
  const { enabledWidgets: globalWidgets, toggleWidget: globalToggleWidget } = useWidgets();
  const { enabledWidgets: classWidgets, toggleWidget: classToggleWidget } = useClassWidgets();
  
  const enabledWidgets = classMode ? classWidgets : globalWidgets;
  const toggleWidget = classMode ? classToggleWidget : globalToggleWidget;

  // Track selection state for adding/removing multiple widgets at once
  const [selectedWidgets, setSelectedWidgets] = useState<WidgetType[]>([]);
  
  // Available widget options (Calendar is removed)
  const widgetOptions: WidgetOption[] = [
    {
      id: "flashcards",
      title: "Flashcards",
      description: "Create and review flashcards for effective learning and retention",
      icon: <BookOpen className="h-8 w-8 text-primary" />
    },
    {
      id: "quizzes",
      title: "Quizzes",
      description: "Generate and take quizzes to test your knowledge",
      icon: <SquareCheck className="h-8 w-8 text-primary" />
    },
    {
      id: "practice",
      title: "Practice",
      description: "Create custom practice worksheets for various subjects",
      icon: <FileInput className="h-8 w-8 text-primary" />
    },
    {
      id: "supertutor",
      title: "Super Tutor",
      description: "Get personalized tutoring from our AI tutor",
      icon: <Search className="h-8 w-8 text-primary" />
    },
    {
      id: "database",
      title: "Database",
      description: "Access and manage your knowledge database",
      icon: <Database className="h-8 w-8 text-primary" />
    }
  ];

  // Toggle selection state
  const toggleSelection = (widget: WidgetType) => {
    setSelectedWidgets(prev => 
      prev.includes(widget) 
        ? prev.filter(w => w !== widget) 
        : [...prev, widget]
    );
  };

  // Apply selected changes
  const applyChanges = () => {
    // For each selected widget, toggle it if needed
    selectedWidgets.forEach(widget => {
      const isCurrentlyEnabled = enabledWidgets.includes(widget);
      const isWantedEnabled = true;
      
      if (isCurrentlyEnabled !== isWantedEnabled) {
        toggleWidget(widget);
      }
    });
    
    // For each non-selected widget, toggle off if currently enabled
    widgetOptions
      .map(option => option.id)
      .filter(widget => !selectedWidgets.includes(widget))
      .forEach(widget => {
        if (enabledWidgets.includes(widget)) {
          toggleWidget(widget);
        }
      });
    
    // Close dialog
    onOpenChange(false);
  };

  // Initialize selection state when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedWidgets(enabledWidgets);
    }
  }, [open, enabledWidgets]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {classMode 
              ? `Configure Widgets for ${currentClassName || 'Class'}` 
              : 'Configure Available Widgets'}
          </DialogTitle>
          <DialogDescription>
            {classMode
              ? 'Select which learning tools should be available in this class.'
              : 'Choose which tools you want to use across all your classes.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {widgetOptions.map((widget) => (
            <WidgetCard
              key={widget.id}
              title={widget.title}
              description={widget.description}
              icon={widget.icon}
              selected={selectedWidgets.includes(widget.id)}
              onClick={() => toggleSelection(widget.id)}
            />
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={applyChanges}>
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
