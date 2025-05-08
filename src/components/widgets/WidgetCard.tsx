
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WidgetCardProps {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

export function WidgetCard({
  id,
  name,
  description,
  icon,
  isSelected,
  onToggle,
}: WidgetCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all border-2",
        isSelected
          ? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/20"
          : "hover:border-purple-300 dark:hover:border-purple-700"
      )}
      onClick={() => onToggle(id)}
    >
      <CardContent className="p-4 flex items-start gap-3">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-md text-purple-600 dark:text-purple-400">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-medium">{name}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {isSelected && (
          <div className="text-purple-600 dark:text-purple-400">
            <Check className="h-5 w-5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
