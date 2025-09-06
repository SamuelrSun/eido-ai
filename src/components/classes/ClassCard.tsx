// src/components/classes/ClassCard.tsx
import React from 'react';
import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getHslColorValue, normalizeColorClasses } from '@/components/calendar/colorUtils';

interface ClassCardProps {
  id: string;
  className: string;
  files: number;
  size: string;
  isSelected: boolean;
  isOwner: boolean;
  isShared: boolean;
  color?: string | null;
  onClick: () => void;
  // The onDelete prop is no longer needed here
}

export const ClassCard: React.FC<ClassCardProps> = ({ id, className, files, size, isSelected, isOwner, isShared, color, onClick }) => {
  const { borderColor, bgColor } = normalizeColorClasses(color);
  const shimmerColor = getHslColorValue(color);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { currentTarget: target } = e;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    target.style.setProperty("--x", `${x}px`);
    target.style.setProperty("--shimmer-color", shimmerColor);
  };

  return (
    <div
      onClick={onClick}
      onMouseMove={handleMouseMove}
      className={cn(
        "group p-3 rounded-lg cursor-pointer transition-all border relative flex flex-col h-36",
        "shimmer-button transition-transform ease-in-out duration-200 hover:-translate-y-1",
        isSelected
          ? 'ring-2 ring-offset-2 ring-offset-neutral-900 ring-blue-500'
          : '',
        borderColor,
        bgColor
      )}
    >
      <div className="flex justify-between items-start gap-2 w-full">
        <h3 className="font-semibold text-sm text-white truncate pr-1 min-w-0" title={className}>
          {className}
        </h3>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          {isShared && (
            <Badge variant="secondary" className="text-xs flex items-center bg-black/20 text-white/90 border-transparent pointer-events-none">
              <Users className="mr-1.5 h-3 w-3" />
              Shared
            </Badge>
          )}
          {/* The DropdownMenu for deletion has been removed from this component */}
        </div>
      </div>

      <div className="flex-grow" /> 

      <div className="mt-auto">
        <div className="text-xs text-white/80">
            <span>{files} Files</span>
            <span className="mx-2">•</span>
            <span>{size}</span>
        </div>
      </div>
    </div>
  );
};