// src/components/oracle/SourcesPanel.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { X, BookCheck } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { ActiveSource } from '@/services/chatMessageService';
import { FileType } from '@/features/files/types';
import { DocumentViewer } from './DocumentViewer';
import { PagePreview } from './PagePreview';
import { SourcesUploadPanel } from './upload-panel';
import { User } from '@supabase/supabase-js';

interface SourcesPanelProps {
  sourcesToDisplay: ActiveSource[];
  selectedSourceNumber: number | null;
  handleSourceSelect: (sourceNumber: number) => void;
  handleClearSourceSelection: () => void;
  selectedFile: FileType | null;
  user: User | null;
}

export const SourcesPanel: React.FC<SourcesPanelProps> = ({
  sourcesToDisplay,
  selectedSourceNumber,
  handleSourceSelect,
  handleClearSourceSelection,
  selectedFile,
  user,
}) => {
  const [activeView, setActiveView] = useState<'sources' | 'upload'>('sources');
  const sourceTextRefs = useRef(new Map<number, HTMLDivElement | null>());
  const sourceThumbnailRefs = useRef(new Map());
  // --- FIX: Add a ref to the scroll container ---
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const selectedSource = sourcesToDisplay.find(s => s.number === selectedSourceNumber);

  // Effect to scroll to a specific source when a citation is clicked
  useEffect(() => {
    if (selectedSourceNumber !== null) {
      const timer = setTimeout(() => {
        const sourceElement = sourceTextRefs.current.get(selectedSourceNumber);
        if (sourceElement) {
          sourceElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [selectedSourceNumber, sourcesToDisplay]);

  // --- FIX: Add a new effect to scroll to the top when the message changes ---
  useEffect(() => {
    // When the sources change (i.e., a new message is selected) AND no specific source is selected,
    // we reset the scroll position of the source snippets panel back to the top.
    if (selectedSourceNumber === null && scrollContainerRef.current) {
        // Radix UI's ScrollArea creates a viewport div that we need to target.
        const viewport = scrollContainerRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = 0;
        }
    }
  }, [sourcesToDisplay, selectedSourceNumber]);


  return (
    <div className="w-[40%] flex flex-col h-full rounded-lg border border-marble-400 bg-white overflow-hidden">
      <header className="flex items-center justify-between gap-x-2 border-b border-marble-400 px-4 h-14 flex-shrink-0">
        <div /> 
        <ToggleGroup
           type="single"
          value={activeView}
          onValueChange={(value) => {
            if (value) setActiveView(value as 'sources' | 'upload');
          }}
          size="sm"
        >
           <ToggleGroupItem value="sources">Sources</ToggleGroupItem>
          <ToggleGroupItem value="upload">Upload</ToggleGroupItem>
        </ToggleGroup>
      </header>
      
      {activeView === 'sources' ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div className={cn("transition-all duration-300 ease-in-out", selectedSourceNumber === null ? 'flex-1 min-h-0' : 'h-40 flex-shrink-0')}>
           {/* --- FIX: Attach the ref to the container of the ScrollArea --- */}
           <div className="h-full p-4" ref={scrollContainerRef}>
              <ScrollArea className="h-full pr-2">
                <div className="space-y-4">
                  {sourcesToDisplay.length > 0 ? (
                    sourcesToDisplay.map((source) => (
                       <div
                        key={source.file.file_id + source.number}
                        ref={(el) => sourceTextRefs.current.set(source.number, el)}
                         onClick={() => handleSourceSelect(source.number)}
                        className={cn(
                          "p-3 bg-stone-50 rounded-lg border cursor-pointer transition-all relative group",
                           selectedSourceNumber === source.number
                            ? "border-stone-700"
                            : "border-stone-200 hover:border-stone-300"
                         )}
                      >
                        {selectedSourceNumber === source.number && (
                           <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-stone-400 hover:text-stone-700" onClick={(e) => { e.stopPropagation(); handleClearSourceSelection(); }}>
                            <X className="h-4 w-4" />
                          </Button>
                         )}
                        <p className="text-xs font-semibold text-stone-700 mb-1 pr-6">Source {source.number}: {source.file.name} (Page {source.pageNumber || 'N/A'})</p>
                        <blockquote className="text-sm text-stone-600 border-l-2 pl-3 whitespace-pre-wrap max-h-20 overflow-y-auto">{source.content}</blockquote>
                       </div>
                    ))
                  ) : (
                    <div className="text-center text-sm text-muted-foreground pt-10 px-4">
                       <BookCheck className="mx-auto h-12 w-12 text-stone-300 mb-4" />
                      <p className="font-medium text-stone-600">Sources Panel</p>
                      <p>Sources for a selected AI-generated message will appear here.</p>
                     </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
           <Separator />
          <div className={cn("flex flex-col transition-all duration-300 ease-in-out", selectedSourceNumber === null ? 'flex-shrink-0' : 'flex-1 min-h-0')}>
            <div className="min-h-0 flex-1 p-4">
              {selectedSourceNumber === null ? (
                <ScrollArea className="w-full h-full">
                   <div className="flex w-max space-x-4 pb-2 h-full">
                    {sourcesToDisplay.map((source) => (
                      <div
                         key={source.file.file_id + '-' + source.number}
                        ref={(el) => sourceThumbnailRefs.current.set(source.file.file_id, el)}
                        onClick={() => handleSourceSelect(source.number)}
                         className="flex-shrink-0 w-56 flex flex-col text-center cursor-pointer"
                      >
                        <p className="text-xs font-medium text-stone-700 mb-2 truncate" title={source.file.name}>{source.file.name}</p>
                        <div className={cn("h-56 bg-stone-100 rounded-md border flex items-center justify-center overflow-hidden", selectedSourceNumber === source.number ? "border-stone-700" : "border-stone-200")}>
                          {source.file.type === 'application/pdf' && source.file.url && source.pageNumber ? (
                            <PagePreview fileUrl={source.file.url} pageNumber={source.pageNumber} />
                           ) : (
                            <img src={source.file.thumbnail_url || `https://placehold.co/224x224/e2e8f0/334155?text=IMG`} alt="File Thumbnail" className="w-full h-full object-cover"/>
                          )}
                         </div>
                      </div>
                    ))}
                  </div>
                   <ScrollBar orientation="horizontal" />
                </ScrollArea>
              ) : (
                selectedFile && <DocumentViewer file={selectedFile} initialPage={selectedSource?.pageNumber} />
              )}
             </div>
          </div>
        </div>
      ) : (
        <SourcesUploadPanel user={user} />
      )}
    </div>
  );
};