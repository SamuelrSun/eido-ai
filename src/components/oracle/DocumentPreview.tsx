// src/components/oracle/DocumentPreview.tsx
import React, { useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import { Loader2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { ActiveSource } from '@/services/chatMessageService';
import { FileType } from '@/features/files/types';

// Set up the worker source for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentPreviewProps {
  source: ActiveSource;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ source }) => {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(source.pageNumber || 1);
    const [scale, setScale] = useState(1.0);
    const pdfContainerRef = useRef<HTMLDivElement>(null);
  
    const onDocumentLoadSuccess = (pdf: any) => {
      setNumPages(pdf.numPages);
      setCurrentPage(source.pageNumber || 1);
  
      // Set initial scale to fit the container width after a brief delay
      // to ensure the container has been rendered and has a width.
      setTimeout(async () => {
        if (pdfContainerRef.current) {
          try {
            const page = await pdf.getPage(1);
            const containerWidth = pdfContainerRef.current.clientWidth;
            const pageWidth = page.view[2]; // page.view is [x1, y1, x2, y2]
            if (containerWidth > 0 && pageWidth > 0) {
              setScale(containerWidth / pageWidth);
            }
          } catch (e) {
            console.error("Failed to calculate initial PDF scale:", e);
            setScale(1.0); // Fallback to default scale on error
          }
        }
      }, 0);
    };

  const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, numPages || 1));

  const handleDownload = () => {
    if (!source.file.url) return;
    const link = document.createElement('a');
    link.href = source.file.url;
    link.download = source.file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!source || !source.file) {
    return <div className="p-4 text-sm text-muted-foreground">Select a source to view its preview.</div>;
  }
  
  const isPdf = source.file.type === 'application/pdf';
  const isImage = source.file.type.startsWith('image/');

  return (
    <div className="flex flex-col max-h-[600px] border rounded-lg overflow-hidden bg-white shadow-sm">
    <header className="flex items-center justify-between p-2 border-b bg-white flex-shrink-0">
        {/* Left side with two-line title */}
        <div className="flex flex-col overflow-hidden pr-2">
            <span className="text-xs font-mono uppercase text-muted-foreground">
                SOURCE {source.number}
            </span>
            <a
                href={source.file.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-stone-800 truncate hover:underline"
                title={source.file.name}
                // Prevent click action if there's no valid URL
                onClick={(e) => !source.file.url && e.preventDefault()}
            >
                {source.file.name}
            </a>
        </div>

        {/* Right side with zoom controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
            {isPdf && (
                <>
                    <Button variant="ghost" size="icon" onClick={() => setScale(s => s * 1.2)}>
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setScale(s => s / 1.2)}>
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                </>
            )}
        </div>
    </header>
      
      <div ref={pdfContainerRef} className="flex-grow overflow-auto flex justify-center">
        {isPdf && source.file.url ? (
          <Document
            file={source.file.url}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}
          >
            <Page pageNumber={currentPage} scale={scale} />
          </Document>
        ) : isImage && source.file.url ? (
          <img src={source.file.url} alt={source.file.name} className="max-w-full object-contain p-4"/>
        ) : (
          <div className="p-4 text-muted-foreground">Preview not available for this file type.</div>
        )}
      </div>

      {isPdf && numPages && (
        <footer className="flex items-center justify-center py-.5 px-2 border-t bg-white flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={goToPrevPage} disabled={currentPage <= 1}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm mx-4">Page {currentPage} of {numPages}</span>
          <Button variant="ghost" size="icon" onClick={goToNextPage} disabled={currentPage >= numPages}><ChevronRight className="h-4 w-4" /></Button>
        </footer>
      )}
    </div>
  );
};