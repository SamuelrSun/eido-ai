// src/components/class/dialog/WidgetSelectionSection.tsx
import React from "react"; // Removed unused useState and useEffect
import { Label } from "@/components/ui/label";
import { WidgetCard } from "@/components/widgets/WidgetCard";
import { WidgetType } from "@/hooks/use-widgets"; // Ensure WidgetType is imported

interface Widget {
  id: WidgetType; // Changed from string to WidgetType for better type safety
  name: string;
  description: string;
  path: string;
  icon: React.ReactNode;
}

interface WidgetSelectionSectionProps {
  selectedWidgets: WidgetType[]; // Changed from string[]
  availableWidgets: Widget[];
  onToggleWidget: (id: WidgetType) => void; // Changed from string
}

export function WidgetSelectionSection({
  selectedWidgets,
  availableWidgets,
  onToggleWidget
}: WidgetSelectionSectionProps) {
  // const [isAddWidgetsOpen, setIsAddWidgetsOpen] = React.useState(false); // No longer needed
  // const { toast } = useToast(); // No longer needed if error handling is robust in parent or onToggleWidget

  // Ensure selectedWidgets is always an array.
  // The parent component (CreateClassDialogContent) should manage the default values.
  const safeSelectedWidgets = Array.isArray(selectedWidgets) ? selectedWidgets : [];
  
  // No longer slicing for recommendedWidgets, we will display all.
  // const recommendedWidgets = availableWidgets.slice(0, 3); 
  
  const handleToggleWidget = (id: WidgetType) => { // Changed id type to WidgetType
    // The onToggleWidget prop is expected to handle any necessary logic,
    // including potential error handling or state updates in the parent.
    onToggleWidget(id);
  };
  
  return (
    <div>
      <Label className="mb-2 block">Select Widgets for this Class</Label>
      {/* MODIFICATION: Changed layout to a 2-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2"> 
        {availableWidgets.map(widget => (
          <WidgetCard
            key={widget.id}
            id={widget.id}
            name={widget.name}
            description={widget.description}
            icon={widget.icon}
            isSelected={safeSelectedWidgets.includes(widget.id)}
            onToggle={() => handleToggleWidget(widget.id)}
          />
        ))}
      </div>
    
    </div>
  );
}
