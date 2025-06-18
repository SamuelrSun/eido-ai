// src/components/datasets/FileCard.tsx
import React from 'react';
import { FileText } from 'lucide-react';

interface FileCardProps {
  name: string;
  date: string;
  size: string;
}

export const FileCard: React.FC<FileCardProps> = ({ name, date, size }) => {
  return (
    <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 hover:border-stone-300 cursor-pointer transition-colors">
        <div className="flex items-start mb-2">
            <div className="p-2 bg-white rounded-md border border-stone-200 mr-3">
                 <FileText className="h-5 w-5 text-stone-600" />
            </div>
            <h3 className="font-semibold text-sm text-stone-700 truncate" title={name}>{name}</h3>
        </div>
        <div className="text-xs text-muted-foreground">
            <span>{date}</span>
            <span className="mx-2">•</span>
            <span>{size}</span>
        </div>
    </div>
  );
};