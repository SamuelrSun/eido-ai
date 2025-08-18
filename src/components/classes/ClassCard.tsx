// src/components/classes/ClassCard.tsx
import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ClassCardProps {
  id: string;
  className: string;
  files: number;
  size: string;
  isSelected: boolean;
  isOwner: boolean;
  isShared: boolean; // New prop
  onClick: () => void;
  onDelete: (id: string, className: string) => void;
}

export const ClassCard: React.FC<ClassCardProps> = ({ id, className, files, size, isSelected, isOwner, isShared, onClick, onDelete }) => {
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(id, className);
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "group p-3 rounded-lg cursor-pointer transition-all border relative flex flex-col justify-between h-36",
        isSelected
          ? 'bg-neutral-800 border-neutral-600'
          : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800 hover:border-neutral-700'
      )}>
      {isOwner && (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-white hover:bg-neutral-700"
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
        <h3 className="font-semibold text-sm text-white truncate pr-8" title={className}>{className}</h3>
      </div>

      <div className="mt-auto">
        <div className="text-xs text-neutral-300">
            <span>{files} Files</span>
            <span className="mx-2">•</span>
            <span>{size}</span>
        </div>
        {/* MODIFIED: Use isShared for the condition */}
        {isShared && (
            <Badge variant="secondary" className="mt-2 text-xs flex items-center w-fit bg-neutral-700 text-neutral-300 border-neutral-600">
                <Users className="mr-1.5 h-3 w-3" />
                Shared
            </Badge>
        )}
      </div>
    </div>
  );
};