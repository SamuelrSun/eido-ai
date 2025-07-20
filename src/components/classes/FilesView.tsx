// src/components/classes/FilesView.tsx
import React from 'react';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { List, LayoutGrid, Loader2 } from 'lucide-react';
import { FolderCard } from '@/components/classes/FolderCard';
import { FileGridCard } from '@/components/classes/FileGridCard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FolderType, FileType } from '@/features/files/types';
import { cn } from '@/lib/utils';
import { ClassConfig } from '@/services/classOpenAIConfig';

interface FilesViewProps {
  isLoading: boolean;
  foldersWithStats: (FolderType & { files: number; size: string; folderName: string | null })[];
  filesForTable: FileType[];
  viewMode: 'list' | 'grid';
  setViewMode: (mode: 'list' | 'grid') => void;
  onFolderClick: (folderData: FolderType) => void;
  onFileRowClick: (file: FileType) => void;
  previewedFile: FileType | null;
  classes: ClassConfig[];
  getFolderPath: (file: FileType) => string;
  selectedClass: ClassConfig | null;
  recentFiles: FileType[];
}

const SkeletonGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
        ))}
    </div>
);

export const FilesView: React.FC<FilesViewProps> = ({
  isLoading,
  foldersWithStats,
  filesForTable,
  viewMode,
  setViewMode,
  onFolderClick,
  onFileRowClick,
  previewedFile,
  classes,
  getFolderPath,
  selectedClass,
  recentFiles,
}) => {
  return (
    <>
      {selectedClass && (
        <div className="space-y-4">
          <h2 className="text-sm uppercase font-semibold text-muted-foreground">Folders</h2>
          <Separator className="my-4" />
          {isLoading ? <SkeletonGrid /> : foldersWithStats.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {foldersWithStats.map((folder) => (
                <FolderCard key={folder.folder_id} {...folder} folderName={folder.name!} isSelected={false} onClick={() => onFolderClick(folder)} />
              ))}
            </div>
          ) : (<p className="text-sm text-muted-foreground">No folders in this directory.</p>)}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm uppercase font-semibold text-muted-foreground">{selectedClass ? "Files" : "Recent Files"}</h2>
          <ToggleGroup type="single" variant="outline" size="sm" value={viewMode} onValueChange={(value) => { if (value) setViewMode(value as 'list' | 'grid'); }} disabled={isLoading}>
            <ToggleGroupItem value="list" aria-label="List view"><List className="h-4 w-4" /></ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Grid view"><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
          </ToggleGroup>
        </div>
        <Separator className="my-4" />
        {isLoading ? (<div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>) :
          filesForTable.length === 0 ? (<div className="text-center p-8 text-muted-foreground">No files to display.</div>) :
          viewMode === 'list' ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader><TableRow className="bg-stone-50 hover:bg-stone-50">
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Folder Path</TableHead>
                  <TableHead className="text-right w-28">Date Added</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filesForTable.map((file) => (
                    <TableRow key={file.file_id} onClick={() => onFileRowClick(file)} className={cn("text-stone-800 h-[60px] cursor-pointer", previewedFile?.file_id === file.file_id && "ring-2 ring-inset ring-stone-400 bg-stone-100")}>
                      <TableCell className="font-medium"><div className="flex items-center">{file.name}</div></TableCell>
                      <TableCell className="text-muted-foreground"><div className="[display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden leading-tight">{classes.find(c => c.class_id === file.class_id)?.class_name || '...'}</div></TableCell>
                      <TableCell className="text-muted-foreground"><div className="[display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden leading-tight">{getFolderPath(file)}</div></TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">{new Date(file.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filesForTable.map((file) => (
                <FileGridCard
                  key={file.file_id}
                  file={file}
                  onClick={() => onFileRowClick(file)}
                  isSelected={previewedFile?.file_id === file.file_id}
                />
              ))}
            </div>
          )}
      </div>
    </>
  );
};
