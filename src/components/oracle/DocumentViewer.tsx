// src/components/oracle/DocumentViewer.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2, ZoomIn, ZoomOut } from 'lucide-react';
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
  const [isScrolling, setIsScrolling] = useState(false);
  
  const pdfPreviewRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const goToPage = useCallback((pageNumber: number) => {
    const pageRef = pageRefs.current.get(pageNumber);
    if (pageRef) {
        setIsScrolling(true);
        pageRef.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setCurrentPage(pageNumber);
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
  }, [numPages, scale, isScrolling]);

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* --- MODIFICATION: Removed border classes from this div --- */}
      <div ref={pdfPreviewRef} className="flex-1 w-full h-full rounded-md overflow-hidden flex justify-center bg-stone-100">
        <ScrollArea className="h-full w-full">
          <div className="flex flex-col items-center py-4">
            {file && file.url && (
              <Document 
                key={`${file.file_id}-${initialPage}`}
                file={file.url} 
                onLoadSuccess={onDocumentLoadSuccess} 
                loading={<Loader2 className="h-8 w-8 animate-spin text-stone-400 mx-auto mt-10"/>}
              >
                {isDocLoaded && Array.from(new Array(numPages || 0), (el, index) => (
                  <div key={`page_wrapper_${index + 1}`} ref={(el) => { if(el) pageRefs.current.set(index + 1, el); }} data-page-number={index + 1}>
                    <Page pageNumber={index + 1} scale={scale} renderTextLayer={false} className="mb-4 shadow-md"/>
                  </div>
                ))}
              </Document>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {numPages && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
            <div className="flex items-center rounded-md border bg-white/70 py-0.5 px-1.5 shadow-md backdrop-blur-sm">
                <span className="text-[11px] font-medium text-stone-700 tabular-nums">
                    {currentPage} / {numPages}
                </span>
            </div>
        </div>
      )}
    </div>
  );
};