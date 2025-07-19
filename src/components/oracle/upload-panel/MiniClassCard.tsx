// src/components/oracle/upload-panel/MiniClassCard.tsx
import React from 'react';
import { Card } from '@/components/ui/card';
import { ClassConfig } from '@/services/classOpenAIConfig';

interface MiniClassCardProps {
  classItem: ClassConfig & { files: number, size: string };
  onClick: () => void;
}

export const MiniClassCard: React.FC<MiniClassCardProps> = ({ classItem, onClick }) => (
  <Card onClick={onClick} className="p-2 cursor-pointer hover:bg-stone-50 transition-colors">
    <h4 className="font-semibold text-xs text-stone-700 truncate">{classItem.class_name}</h4>
    <div className="text-[10px] text-muted-foreground mt-1">
      <span>{classItem.files} Files</span>
      <span className="mx-1">•</span>
      <span>{classItem.size}</span>
    </div>
  </Card>
);