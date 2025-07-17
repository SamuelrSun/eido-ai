// src/components/oracle/DocumentViewer.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { FileType } from '@/features/files/types';
import { pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentViewerProps {
  file: FileType;
  initialPage?: number;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ file, initialPage = 1 }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [scale, setScale] = useState(1.0);
  const [minScale, setMinScale] = useState(1.0);
  const [isDocLoaded, setIsDocLoaded] = useState(false);
  // MODIFICATION: Add state to track when we are programmatically scrolling.
  const [isScrolling, setIsScrolling] = useState(false);
  
  const pdfPreviewRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // MODIFICATION: The goToPage function now controls the `isScrolling` state.
  const goToPage = useCallback((pageNumber: number) => {
    const pageRef = pageRefs.current.get(pageNumber);
    if (pageRef) {
        setIsScrolling(true); // Disable observer
        pageRef.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setCurrentPage(pageNumber);
        // Re-enable the observer after the scroll animation completes.
        setTimeout(() => setIsScrolling(false), 1000); 
    }
  }, []);

  const onDocumentLoadSuccess = useCallback(async (pdf: any) => {
    setNumPages(pdf.numPages);
    if (pdfPreviewRef.current) {
        try {
            const page = await pdf.getPage(1);
            const containerWidth = pdfPreviewRef.current.clientWidth;
            const pageWidth = page.view[2];
            if (containerWidth > 0 && pageWidth > 0) {
                const calculatedMinScale = (containerWidth / pageWidth) * 0.98;
                setMinScale(calculatedMinScale);
                setScale(calculatedMinScale);
            }
        } catch(e) { console.error("Error calculating initial scale:", e); }
    }
    setIsDocLoaded(true);
  }, []);

  useEffect(() => {
    if (isDocLoaded) {
      setTimeout(() => goToPage(initialPage), 50);
    }
  }, [isDocLoaded, initialPage, goToPage]);
  
  useEffect(() => {
    setIsDocLoaded(false);
    setNumPages(null);
    setCurrentPage(initialPage);
  }, [file, initialPage]);

  useEffect(() => {
    const observer = new IntersectionObserver(
        (entries) => {
            // MODIFICATION: Ignore observer updates while we are auto-scrolling.
            if (isScrolling) return;

            const visibleEntries = entries.filter(entry => entry.isIntersecting);
            if (visibleEntries.length > 0) {
                const pageNumbers = visibleEntries.map(entry => parseInt(entry.target.getAttribute('data-page-number') || '0', 10));
                setCurrentPage(Math.min(...pageNumbers));
            }
        },
        { root: pdfPreviewRef.current, threshold: 0.1 }
    );
    const currentRefs = pageRefs.current;
    currentRefs.forEach(pageEl => { if (pageEl) observer.observe(pageEl); });
    return () => { currentRefs.forEach(pageEl => { if (pageEl) observer.unobserve(pageEl); }); };
  }, [numPages, scale, isScrolling]); // MODIFICATION: Added isScrolling to dependency array

  return (
    <div className="w-full h-full flex flex-col relative">
      <div ref={pdfPreviewRef} className="flex-1 w-full h-full rounded-md border border-stone-700 overflow-hidden flex justify-center bg-stone-100">
        <ScrollArea className="h-full w-full">
          <div className="flex flex-col items-center py-4">
            {file && file.url && (
              <Document file={file.url} onLoadSuccess={onDocumentLoadSuccess} loading={<Loader2 className="h-8 w-8 animate-spin text-stone-400 mx-auto mt-10"/>}>
                {isDocLoaded && Array.from(new Array(numPages || 0), (el, index) => (
                  <div key={`page_wrapper_${index + 1}`} ref={(el) => { if(el) pageRefs.current.set(index + 1, el); }} data-page-number={index + 1}>
                    <Page pageNumber={index + 1} scale={scale} renderTextLayer={false} className="mb-4 shadow-md"/>
                  </div>
                ))}
              </Document>
            )}
          </div>
        </ScrollArea>
      </div>
      {numPages && (
        <>
          <div className="absolute bottom-14 right-6 flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setScale(s => Math.max(s / 1.2, minScale))}><ZoomOut className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => setScale(s => Math.min(s * 1.2, 3.0))}><ZoomIn className="h-4 w-4" /></Button>
          </div>
          <div className="flex items-center justify-center p-2 flex-shrink-0">
            <Button variant="ghost" size="icon" onClick={() => goToPage(Math.max(currentPage - 1, 1))} disabled={currentPage <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium mx-4">Page {currentPage} of {numPages}</span>
            <Button variant="ghost" size="icon" onClick={() => goToPage(Math.min(currentPage + 1, numPages))} disabled={currentPage >= numPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};