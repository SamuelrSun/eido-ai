
import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { WidgetCard } from "@/components/widgets/WidgetCard";
import { AddWidgetsDialog } from "@/components/widgets/AddWidgetsDialog";

interface Widget {
  id: string;
  name: string;
  description: string;
  path: string;
  icon: React.ReactNode;
}

interface WidgetSelectionSectionProps {
  selectedWidgets: string[];
  availableWidgets: Widget[];
  onToggleWidget: (id: string) => void;
}

export function WidgetSelectionSection({
  selectedWidgets,
  availableWidgets,
  onToggleWidget
}: WidgetSelectionSectionProps) {
  const [isAddWidgetsOpen, setIsAddWidgetsOpen] = useState(false);
  
  // Ensure selectedWidgets is always an array
  const safeSelectedWidgets = Array.isArray(selectedWidgets) ? selectedWidgets : ["flashcards", "quizzes"];
  
  // Display only the recommended widgets (limit to 3)
  const recommendedWidgets = availableWidgets.slice(0, 3);
  
  return (
    <div>
      <Label className="mb-2 block">Select Widgets for this Class</Label>
      <div className="space-y-3">
        {recommendedWidgets.map(widget => (
          <WidgetCard
            key={widget.id}
            id={widget.id}
            name={widget.name}
            description={widget.description}
            icon={widget.icon}
            isSelected={safeSelectedWidgets.includes(widget.id)}
            onToggle={onToggleWidget}
          />
        ))}
        
        <Button
          variant="outline"
          className="w-full flex items-center justify-center py-6"
          onClick={() => setIsAddWidgetsOpen(true)}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          See More Widgets
        </Button>
      </div>
      
      <AddWidgetsDialog 
        open={isAddWidgetsOpen} 
        onOpenChange={setIsAddWidgetsOpen}
        classMode={true}
        currentClassName="Current Class"
      />
    </div>
  );
}
