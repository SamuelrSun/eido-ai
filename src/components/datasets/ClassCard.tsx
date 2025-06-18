// src/components/datasets/ClassCard.tsx
import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2 } from 'lucide-react';

interface ClassCardProps {
  id: string;
  name: string;
  files: number;
  size: string;
  isSelected: boolean;
  onClick: () => void;
  onDelete: (id: string, name: string) => void;
}

export const ClassCard: React.FC<ClassCardProps> = ({ id, name, files, size, isSelected, onClick, onDelete }) => {
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the card's onClick from firing
    onDelete(id, name);
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group p-3 rounded-lg cursor-pointer transition-all border relative",
        isSelected 
          ? 'bg-stone-200 border-stone-400' 
          : 'bg-stone-100 border-stone-200 hover:bg-stone-200 hover:border-stone-300'
    )}>
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

      <div className="mb-2">
        <h3 className="font-semibold text-sm text-stone-700 truncate pr-8" title={name}>{name}</h3>
      </div>
      <div className="text-xs text-muted-foreground">
        <span>{files} Files</span>
        <span className="mx-2">•</span>
        <span>{size}</span>
      </div>
    </div>
  );
};
