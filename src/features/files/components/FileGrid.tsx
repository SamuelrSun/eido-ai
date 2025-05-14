// src/features/files/components/FileGrid.tsx
import * as React from "react"
import { File as FileIcon, Folder as FolderIcon, Trash2, MoreHorizontal } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
// MODIFIED IMPORT PATH: Using path alias
import { FileType, FolderType, SelectedItem } from "@/features/files/types";
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { formatFileSize } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"


interface FileGridProps {
  files: FileType[]
  folders: FolderType[]
  loading: boolean
  selectionMode: boolean
  selectedItems: SelectedItem[]
  onFileSelect: (file: FileType) => void
  onFolderSelect: (folder: FolderType) => void
  onDeleteItem: (id: string, isFolder: boolean, name: string) => void
  onFileOpen: (url: string) => void
  currentFolderId: string | null;
}

export function FileGrid({
  files,
  folders,
  loading,
  selectionMode,
  selectedItems,
  onFileSelect,
  onFolderSelect,
  onDeleteItem,
  onFileOpen,
  currentFolderId,
}: FileGridProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
        <p className="text-gray-500 mt-4">Loading your files...</p>
      </div>
    )
  }

  if (files.length === 0 && folders.length === 0 && currentFolderId === null) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-10">
        <FolderIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-700">No files or folders</h3>
        <p className="text-gray-500 mb-4 max-w-md">
          Upload files or create folders to get started. You can also drag and drop
          files here.
        </p>
      </div>
    )
  }

  if (files.length === 0 && folders.length === 0 && currentFolderId !== null) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-10">
        <FolderIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-700">This folder is empty</h3>
        <p className="text-gray-500 mb-4 max-w-md">
          Drag and drop files here or use the upload button.
        </p>
      </div>
    )
  }


  return (
    <ScrollArea className="h-full">
      <div className="space-y-4">
        {/* Folders Section */}
        {folders.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">Folders</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {folders.map((folder) => (
                <Card
                  key={folder.folder_id}
                  className={`p-3 transition-all hover:shadow-md ${
                    selectionMode ? 'cursor-default' : 'cursor-pointer'
                  } border-border`}
                  onClick={() => {
                    if (!selectionMode) {
                      onFolderSelect(folder);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <FolderIcon className="h-6 w-6 text-yellow-500 flex-shrink-0" />
                      <span className="text-sm font-medium truncate" title={folder.name}>{folder.name}</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteItem(folder.folder_id, true, folder.name);
                          }}
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Files Section */}
        {files.length > 0 && (
          <div className={folders.length > 0 ? "mt-6" : ""}>
            <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">Files</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {files.map((file) => (
                <Card
                  key={file.file_id}
                  className={`p-3 transition-all hover:shadow-md cursor-pointer ${
                    selectedItems.some((item) => item.id === file.file_id && item.type === 'file')
                      ? "ring-2 ring-primary border-primary"
                      : "border-border"
                  }`}
                  onClick={() => {
                    if (selectionMode) {
                      onFileSelect(file);
                    } else if (file.url) {
                      onFileOpen(file.url);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      {selectionMode && (
                        <Checkbox
                          id={`select-file-${file.file_id}`}
                          checked={selectedItems.some((item) => item.id === file.file_id && item.type === 'file')}
                          onCheckedChange={() => onFileSelect(file)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select file ${file.name}`}
                        />
                      )}
                      <FileIcon className="h-6 w-6 text-blue-500 flex-shrink-0" />
                      <span className="text-sm font-medium truncate" title={file.name}>{file.name}</span>
                    </div>
                  </div>
                  {file.status === 'uploading' && file.progress !== undefined ? (
                    <div className="mt-2">
                      <Progress value={file.progress || 0} className="h-1 w-full" />
                      <p className="text-xs text-muted-foreground mt-1 text-right">{file.progress || 0}%</p>
                    </div>
                  ) : file.status === 'error' ? (
                    <p className="text-xs text-destructive mt-1">Upload failed</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{formatFileSize(file.size)}</p>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}