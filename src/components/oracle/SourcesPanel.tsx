// src/components/oracle/SourcesPanel.tsx

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { X, BookCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActiveSource } from '@/services/chatMessageService';
import { FileType } from '@/features/files/types';
import { DocumentViewer } from './DocumentViewer';
import { PagePreview } from './PagePreview';

interface SourcesPanelProps {
  sourcesToDisplay: ActiveSource[];
  selectedSourceNumber: number | null;
  handleSourceSelect: (sourceNumber: number) => void;
  handleClearSourceSelection: () => void;
  selectedFile: FileType | null;
}

export const SourcesPanel: React.FC<SourcesPanelProps> = ({
  sourcesToDisplay, selectedSourceNumber, handleSourceSelect, handleClearSourceSelection, selectedFile
}) => {
  const sourceTextRefs = React.useRef(new Map<number, HTMLDivElement | null>());
  const sourceThumbnailRefs = React.useRef(new Map());

  const selectedSource = sourcesToDisplay.find(s => s.number === selectedSourceNumber);

  useEffect(() => {
    if (selectedSourceNumber !== null) {
      const sourceElement = sourceTextRefs.current.get(selectedSourceNumber);
      if (sourceElement) {
        sourceElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedSourceNumber]);

  return (
    <div className="w-[40%] flex flex-col h-full rounded-lg border border-marble-400 bg-white overflow-hidden">
      <header className="flex items-center justify-between gap-x-2 border-b border-marble-400 px-4 h-14 flex-shrink-0">
        <h2 className="font-semibold text-foreground">Sources</h2>
      </header>
      <div className="flex-1 flex flex-col min-h-0">
        {/* Source Snippets View */}
        <div className={cn("transition-all duration-300 ease-in-out", selectedSourceNumber === null ? 'flex-1 min-h-0' : 'h-40 flex-shrink-0')}>
          <div className="h-full p-4">
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
                      {/* CORRECTED: Changed max-h-24 to max-h-20 to fit ~4 lines */}
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
        {/* Thumbnails / Document Viewer */}
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
    </div>
  );
};