// src/components/chat/CitationPill.tsx
import React from 'react';
import { cn } from '@/lib/utils';
import { ShieldCheck } from 'lucide-react';
import { ActiveSource } from '@/services/chatMessageService';

interface CitationPillProps {
  source: ActiveSource;
  onClick: (sourceNumber: number) => void;
  isSelected: boolean;
}

export const CitationPill: React.FC<CitationPillProps> = ({ source, onClick, isSelected }) => {
  const meta = source.pageNumber ? `p. ${source.pageNumber}` : '';

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(source.number);
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium transition-colors max-w-48",
        // --- MODIFICATION START ---
        isSelected
          ? "bg-blue-950/40 border border-blue-500 text-white" // Added explicit 'border' class
          : "bg-neutral-700/50 border border-neutral-600 text-neutral-300 hover:bg-neutral-700"
        // --- MODIFICATION END ---
      )}
    >
      <ShieldCheck size={14} className="text-blue-400 flex-shrink-0" />
      <span className="truncate" title={source.file.name}>
        {source.file.name}
      </span>
      {meta && <span className={cn("flex-shrink-0", isSelected ? "text-neutral-200" : "text-neutral-400")}>{meta}</span>}
    </button>
  );
};