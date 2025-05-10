
import React from "react";
import { Label } from "@/components/ui/label";

interface ColorOption {
  value: string;
  label: string;
  className: string;
}

interface ColorSelectionSectionProps {
  color: string;
  colorOptions: ColorOption[];
  onColorChange: (value: string) => void;
}

export function ColorSelectionSection({
  color,
  colorOptions,
  onColorChange
}: ColorSelectionSectionProps) {
  return (
    <div>
      <Label>Class Color</Label>
      <div className="flex flex-wrap gap-3 mt-2">
        {colorOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`w-8 h-8 rounded-full ${option.className} flex items-center justify-center ${color === option.value ? 'ring-2 ring-offset-2 ring-black' : ''}`}
            onClick={() => onColorChange(option.value)}
            aria-label={`Select ${option.label} color`}
          />
        ))}
      </div>
    </div>
  );
}
