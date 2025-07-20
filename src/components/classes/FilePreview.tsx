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
        <div className="w-full h-full flex items-center justify-center p-4 bg-cover bg-center" style={{ backgroundImage: "url('/background6.png')" }}>
          <div className="p-4 bg-black/10 backdrop-blur-sm rounded-lg">
            <p className="font-medium text-white drop-shadow-md">Select a file to preview</p>
          </div>
        </div>
      );
    }

    if (previewedFile.status === 'processing' || (!previewedFile.url && previewedFile.status !== 'error')) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
          <p className="font-medium text-foreground">File is processing...</p>
          <p className="text-sm text-muted-foreground">A preview will be available shortly.</p>
        </div>
      );
    }

    if (previewedFile.status === 'error') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
          <X className="h-12 w-12 text-destructive mb-4" />
          <p className="font-medium text-destructive-foreground">Processing Failed</p>
          <p className="text-sm text-muted-foreground">Please try uploading this file again.</p>
        </div>
      );
    }

    const fileType = previewedFile.type || '';
    const fileUrl = previewedFile.url || '';

    if (fileType.startsWith('image/')) {
      return <img src={fileUrl} alt={previewedFile.name} className="w-full h-full object-cover" />;
    }
    if (fileType === 'application/pdf') {
      return <iframe src={`${fileUrl}#toolbar=0`} className="w-full h-full scale-105" title={previewedFile.name}></iframe>;
    }
    return <pre className="w-full h-full text-sm whitespace-pre-wrap p-4">{`Preview for this file type is not supported.`}</pre>;
  };

  return (
    <div className="w-4/12 flex flex-col rounded-lg border border-marble-400 bg-white overflow-hidden">
      <header className="flex items-center justify-between p-4 border-b border-marble-400 flex-shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          {previewedFile ? (
            <a
              href={`/api/serve-file?id=${previewedFile.file_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sm text-muted-foreground truncate hover:text-stone-800 hover:underline"
              title={`Open ${previewedFile.name} in a new tab`}
            >
              {previewedFile.name}
            </a>
          ) : (
            <span className="font-semibold text-sm text-muted-foreground truncate">
              Select a file to preview
            </span>
          )}
        </div>
        <div className="flex items-center">
          <a href={`/api/serve-file?id=${previewedFile?.file_id}`} target="_blank" rel="noopener noreferrer" className={!previewedFile ? 'pointer-events-none' : ''} title="Open in new tab">
            <Button variant="ghost" size="icon" className="text-stone-400 hover:bg-transparent hover:text-stone-900 focus-visible:ring-0 focus-visible:ring-offset-0" onClick={() => previewedFile?.url && window.open(previewedFile.url, '_blank')} disabled={!previewedFile?.url} title="Open in new tab"><ExternalLink className="h-4 w-4" /></Button>
          </a>
          <Button variant="ghost" size="icon" className="text-stone-400 hover:bg-transparent hover:text-stone-900 focus-visible:ring-0 focus-visible:ring-offset-0" onClick={() => previewedFile && onDeleteClick([previewedFile])} disabled={!previewedFile}><Trash2 className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="text-stone-400 hover:bg-transparent hover:text-stone-900 focus-visible:ring-0 focus-visible:ring-offset-0" onClick={onClosePreview} disabled={!previewedFile}><X className="h-4 w-4" /></Button>
        </div>
      </header>
      <div className={cn("flex-grow m-4 rounded-md border border-marble-400 flex items-center justify-center overflow-hidden transition-all bg-white")}>
        {renderPreviewContent()}
      </div>
    </div>
  );
};
