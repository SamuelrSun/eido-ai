
import { useState } from "react";
import { Check, Filter } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// Define the class colors and names
export const CLASS_COLORS = {
  "ITP457: Advanced Network Security": "#9b87f5",
  "ITP216: Applied Python Concepts": "#0EA5E9",
  "IR330: Politics of the World Economy": "#F97316",
  "ITP104: Intro to Web Development": "#10B981",
  "BAEP470: The Entrepreneurial Mindset": "#EC4899",
  "BISC110: Good Genes, Bad Genes": "#8B5CF6"
};

interface ClassFilterProps {
  onFilterChange: (selectedClasses: string[]) => void;
}

export function ClassFilter({ onFilterChange }: ClassFilterProps) {
  const [selectedClasses, setSelectedClasses] = useState<string[]>(Object.keys(CLASS_COLORS));
  
  const handleClassToggle = (className: string) => {
    setSelectedClasses(prev => {
      const newSelected = prev.includes(className) 
        ? prev.filter(c => c !== className)
        : [...prev, className];
      
      onFilterChange(newSelected);
      return newSelected;
    });
  };

  const handleSelectAll = () => {
    const allClasses = Object.keys(CLASS_COLORS);
    setSelectedClasses(allClasses);
    onFilterChange(allClasses);
  };

  const handleDeselectAll = () => {
    setSelectedClasses([]);
    onFilterChange([]);
  };

  return (
    <Card className="bg-white rounded-lg shadow h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Class Filter
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex justify-between mb-3">
          <button 
            onClick={handleSelectAll}
            className="text-xs text-blue-600 font-medium hover:underline"
          >
            Select All
          </button>
          <button 
            onClick={handleDeselectAll}
            className="text-xs text-blue-600 font-medium hover:underline"
          >
            Deselect All
          </button>
        </div>
        
        <div className="space-y-2 max-h-[calc(100%-30px)] overflow-y-auto">
          {Object.entries(CLASS_COLORS).map(([className, color]) => (
            <div key={className} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: color }}
                />
                <Label 
                  htmlFor={`filter-${className}`} 
                  className="text-sm font-medium cursor-pointer"
                >
                  {className.split(":")[0]}
                </Label>
              </div>
              <Checkbox
                id={`filter-${className}`}
                checked={selectedClasses.includes(className)}
                onCheckedChange={() => handleClassToggle(className)}
                className="data-[state=checked]:bg-[var(--color)]"
                style={{ "--color": color } as React.CSSProperties}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
