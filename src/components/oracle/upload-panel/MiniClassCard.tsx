// src/components/oracle/upload-panel/MiniClassCard.tsx
import React from 'react';
import { cn } from '@/lib/utils';
import { getHslColorValue, normalizeColorClasses } from '@/components/calendar/colorUtils';
import { ClassConfig } from '@/services/classOpenAIConfig';

interface MiniClassCardProps {
  classItem: ClassConfig & { files: number, size: string, is_owner: boolean, is_shared: boolean };
  onClick: () => void;
}

export const MiniClassCard: React.FC<MiniClassCardProps> = ({ classItem, onClick }) => {
  const { borderColor, bgColor } = normalizeColorClasses(classItem.color);
  const shimmerColor = getHslColorValue(classItem.color);

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
        "group p-2 rounded-lg cursor-pointer transition-all border relative flex flex-col h-24",
        "shimmer-button transition-transform ease-in-out duration-200 hover:-translate-y-0.5",
        borderColor,
        bgColor
      )}
    >
      <h3 className="font-semibold text-xs text-white truncate pr-1 min-w-0" title={classItem.class_name}>
        {classItem.class_name}
      </h3>
      <div className="flex-grow" />
      <div className="text-[10px] text-white/80">
        <span>{classItem.files} Files</span>
        <span className="mx-1.5">•</span>
        <span>{classItem.size}</span>
      </div>
    </div>
  );
};