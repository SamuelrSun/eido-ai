// src/components/classes/FilePreview.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Trash2, X, Loader2 } from 'lucide-react';
import { FileType } from '@/features/files/types';
import { cn } from '@/lib/utils';

interface FilePreviewProps {
  previewedFile: FileType | null;
  onDeleteClick: (files: FileType[]) => void;
  onClosePreview: () => void;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  previewedFile,
  onDeleteClick,
  onClosePreview,
}) => {
  const renderPreviewContent = () => {
    if (!previewedFile) {
      return (
        <div className="w-full h-full flex items-center justify-center p-4">
          <div className="p-4 rounded-lg text-center">
            <p className="font-medium text-neutral-400">Select a file to preview</p>
          </div>
        </div>
      );
    }

    if (previewedFile.status === 'processing' || (!previewedFile.url && previewedFile.status !== 'error')) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-neutral-200">
          <Loader2 className="h-12 w-12 animate-spin text-neutral-500 mb-4" />
          <p className="font-medium">File is processing...</p>
          <p className="text-sm text-neutral-400">A preview will be available shortly.</p>
        </div>
      );
    }

    if (previewedFile.status === 'error') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
          <X className="h-12 w-12 text-destructive mb-4" />
          <p className="font-medium text-destructive">Processing Failed</p>
          <p className="text-sm text-neutral-400">Please try uploading this file again.</p>
        </div>
      );
    }

    const fileType = previewedFile.type || '';
    const fileUrl = previewedFile.url || '';

    if (fileType.startsWith('image/')) {
      return <img src={fileUrl} alt={previewedFile.name} className="w-full h-full object-contain" />;
    }
    if (fileType === 'application/pdf') {
      // PDF.js viewer might not adapt well to dark theme, so we keep its background light
      return <div className="bg-white h-full w-full"><iframe src={`${fileUrl}#toolbar=0`} className="w-full h-full" title={previewedFile.name}></iframe></div>;
    }
    return <pre className="w-full h-full text-sm whitespace-pre-wrap p-4 text-neutral-300">{`Preview for this file type is not supported.`}</pre>;
  };

  return (
    <div className="w-4/12 flex flex-col rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden">
      <header className="flex items-center justify-between p-4 border-b border-neutral-800 flex-shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          {previewedFile ? (
            <a
              href={`/api/serve-file?id=${previewedFile.file_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sm text-neutral-400 truncate hover:text-white hover:underline"
              title={`Open ${previewedFile.name} in a new tab`}
            >
              {previewedFile.name}
            </a>
          ) : (
            <span className="font-semibold text-sm text-neutral-400 truncate">
              Select a file to preview
            </span>
          )}
        </div>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="text-neutral-400 hover:bg-neutral-800 hover:text-white" onClick={() => previewedFile?.url && window.open(`/api/serve-file?id=${previewedFile.file_id}`, '_blank')} disabled={!previewedFile?.url} title="Open in new tab"><ExternalLink className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="text-neutral-400 hover:bg-neutral-800 hover:text-white" onClick={() => previewedFile && onDeleteClick([previewedFile])} disabled={!previewedFile}><Trash2 className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="text-neutral-400 hover:bg-neutral-800 hover:text-white" onClick={onClosePreview} disabled={!previewedFile}><X className="h-4 w-4" /></Button>
        </div>
      </header>
      <div className={cn("flex-grow m-4 rounded-md border border-neutral-800 flex items-center justify-center overflow-hidden transition-all bg-neutral-900")}>
        {renderPreviewContent()}
      </div>
    </div>
  );
};