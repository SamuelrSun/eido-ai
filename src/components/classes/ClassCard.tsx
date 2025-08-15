// src/components/classes/ClassCard.tsx
import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, Users } from 'lucide-react'; // --- STAGE 3: IMPORT Users ICON ---
import { Badge } from '@/components/ui/badge'; // --- STAGE 3: IMPORT Badge ---

interface ClassCardProps {
  id: string;
  className: string;
  files: number;
  size: string;
  isSelected: boolean;
  // --- STAGE 3: ADD isOwner PROP ---
  isOwner: boolean;
  onClick: () => void;
  onDelete: (id: string, className: string) => void;
}

export const ClassCard: React.FC<ClassCardProps> = ({ id, className, files, size, isSelected, isOwner, onClick, onDelete }) => {
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(id, className);
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "group p-3 rounded-lg cursor-pointer transition-all border relative flex flex-col justify-between h-36", // Added flex classes
        isSelected
          ? 'bg-stone-200 border-stone-400'
          : 'bg-stone-100 border-stone-200 hover:bg-stone-200 hover:border-stone-300'
    )}>
      {/* --- STAGE 3: ONLY SHOW OPTIONS FOR OWNER --- */}
      {isOwner && (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
            >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Class Options</span>
            </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
            <DropdownMenuItem
                onClick={handleDeleteClick}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Class
            </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div>
        <h3 className="font-semibold text-sm text-stone-700 truncate pr-8" title={className}>{className}</h3>
      </div>

      <div className="mt-auto">
        <div className="text-xs text-muted-foreground">
            <span>{files} Files</span>
            <span className="mx-2">•</span>
            <span>{size}</span>
        </div>
        {/* --- STAGE 3: SHOW 'SHARED' BADGE IF NOT OWNER --- */}
        {!isOwner && (
            <Badge variant="secondary" className="mt-2 text-xs flex items-center w-fit">
                <Users className="mr-1.5 h-3 w-3" />
                Shared
            </Badge>
        )}
      </div>
    </div>
  );
};