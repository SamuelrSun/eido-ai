// src/components/oracle/PagePreview.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import { Loader2 } from 'lucide-react';

interface PagePreviewProps {
  fileUrl: string;
  pageNumber: number;
}

export const PagePreview: React.FC<PagePreviewProps> = ({ fileUrl, pageNumber }) => {
  const [width, setWidth] = useState<number | undefined>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.clientWidth);
      }
    };
    
    handleResize(); // Set initial width
    
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full">
      <Document
        file={fileUrl}
        loading={
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
          </div>
        }
        error={
          <div className="flex items-center justify-center h-full text-xs text-red-500">
            Error loading preview
          </div>
        }
      >
        <Page
          pageNumber={pageNumber}
          width={width}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      </Document>
    </div>
  );
};