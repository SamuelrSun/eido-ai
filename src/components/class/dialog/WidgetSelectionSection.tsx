
import React from "react";
import { Label } from "@/components/ui/label";
import { WidgetCard } from "@/components/widgets/WidgetCard";

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
  return (
    <div>
      <Label className="mb-2 block">Select Widgets for this Class</Label>
      <div className="space-y-3">
        {availableWidgets.map(widget => (
          <WidgetCard
            key={widget.id}
            id={widget.id}
            name={widget.name}
            description={widget.description}
            icon={widget.icon}
            isSelected={selectedWidgets.includes(widget.id)}
            onToggle={onToggleWidget}
          />
        ))}
      </div>
    </div>
  );
}
