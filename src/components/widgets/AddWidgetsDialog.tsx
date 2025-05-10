import { useState, useEffect } from "react";
import { 
  BookOpen, 
  Calendar, 
  Check, 
  SquareCheck, 
  X,
  Search,
  Database,
  Info,
  Loader2,
  FileInput
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useWidgets } from "@/hooks/use-widgets";
import { useClassWidgets } from "@/hooks/use-class-widgets";
import { WidgetType } from "@/hooks/use-widget-base";

interface AddWidgetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classMode?: boolean;
  currentClassName?: string;
}

export function AddWidgetsDialog({ 
  open, 
  onOpenChange,
  classMode = false,
  currentClassName = "Current Class"
}: AddWidgetsDialogProps) {
  const globalWidgets = useWidgets();
  const classWidgets = useClassWidgets();
  
  // Use either class widgets or global widgets depending on mode
  const { 
    enabledWidgets, 
    toggleWidget, 
    isLoading 
  } = classMode ? classWidgets : globalWidgets;
  
  const [localEnabledWidgets, setLocalEnabledWidgets] = useState<WidgetType[]>(enabledWidgets);

  // Reset local state when dialog opens or enabledWidgets change
  useEffect(() => {
    if (open) {
      setLocalEnabledWidgets(enabledWidgets);
    }
  }, [open, enabledWidgets]);

  const toggleLocalWidget = (widget: WidgetType) => {
    setLocalEnabledWidgets(current => {
      if (current.includes(widget)) {
        return current.filter(w => w !== widget);
      } else {
        return [...current, widget];
      }
    });
  };

  const applyChanges = () => {
    // Find widgets to enable and disable
    const toEnable = localEnabledWidgets.filter(w => !enabledWidgets.includes(w));
    const toDisable = enabledWidgets.filter(w => !localEnabledWidgets.includes(w));
    
    // Apply changes
    toEnable.forEach(w => toggleWidget(w));
    toDisable.forEach(w => toggleWidget(w));
    
    onOpenChange(false);
  };

  const cancelChanges = () => {
    setLocalEnabledWidgets(enabledWidgets);
    onOpenChange(false);
  };

  const allWidgets = [
    {
      id: "flashcards" as WidgetType,
      name: "Flashcards",
      description: "Study with digital flashcards",
      icon: BookOpen,
    },
    {
      id: "quizzes" as WidgetType,
      name: "Quizzes",
      description: "Test your knowledge with quizzes",
      icon: SquareCheck,
    },
    {
      id: "calendar" as WidgetType,
      name: "Calendar",
      description: "Schedule and manage your classes",
      icon: Calendar,
    },
    {
      id: "supertutor" as WidgetType,
      name: "Super Tutor",
      description: "AI-powered learning assistant",
      icon: Search,
    },
    {
      id: "database" as WidgetType,
      name: "Database",
      description: "Store and manage your files",
      icon: Database,
    },
    {
      id: "practice" as WidgetType,
      name: "Practice",
      description: "Generate worksheets & get feedback",
      icon: FileInput,
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {classMode 
              ? `Manage Widgets for ${currentClassName}` 
              : "Manage Widgets"
            }
          </DialogTitle>
          <DialogDescription>
            {classMode
              ? "Enable or disable widgets for this class."
              : "Enable or disable widgets for your dashboard."
            }
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading your widgets...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-4">
            {allWidgets.map(widget => (
              <div
                key={widget.id}
                className={cn(
                  "flex items-center p-3 rounded-lg border cursor-pointer transition-colors",
                  localEnabledWidgets.includes(widget.id)
                    ? "bg-primary/10 border-primary"
                    : "bg-background hover:bg-accent/50"
                )}
                onClick={() => toggleLocalWidget(widget.id)}
              >
                <div className={cn(
                  "flex items-center justify-center rounded-md w-10 h-10 mr-3 text-white",
                  localEnabledWidgets.includes(widget.id)
                    ? "bg-primary"
                    : "bg-muted-foreground/30"
                )}>
                  <widget.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{widget.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {widget.description}
                  </p>
                </div>
                <div className="ml-2">
                  {localEnabledWidgets.includes(widget.id) ? (
                    <Check className="h-5 w-5 text-primary" />
                  ) : (
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Click to enable
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={cancelChanges}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button type="button" onClick={applyChanges} disabled={isLoading}>
            <Check className="mr-2 h-4 w-4" />
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
