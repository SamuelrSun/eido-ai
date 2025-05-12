import * as React from "react"
import { File, Folder, Trash2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { FileType, FolderType, SelectedItem } from "../types"

interface FileGridProps {
  files: FileType[]
  folders: FolderType[]
  loading: boolean
  selectionMode: boolean
  selectedItems: SelectedItem[]
  onFileSelect: (file: FileType) => void
  onFolderSelect: (folder: FolderType) => void
  onDelete: (id: string, isFolder: boolean) => void
  onFileOpen: (url: string) => void
}

export function FileGrid({
  files,
  folders,
  loading,
  selectionMode,
  selectedItems,
  onFileSelect,
  onFolderSelect,
  onDelete,
  onFileOpen,
}: FileGridProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
        <p className="text-gray-500 mt-4">Loading your files...</p>
      </div>
    )
  }

  if (files.length === 0 && folders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-10">
        <div className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-700">No files found</h3>
        <p className="text-gray-500 mb-4 max-w-md">
          Upload files or create folders to get started. You can also drag and drop
          files here.
        </p>
      </div>
    )
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <ScrollArea className="h-[calc(100vh-300px)]">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {folders.map((folder) => (
          <div
            key={folder.id}
            className={`border rounded-lg p-3 hover:shadow-md transition-all cursor-pointer ${
              selectedItems.some((item) => item.id === folder.id)
                ? "ring-2 ring-primary"
                : ""
            }`}
            onClick={() => onFolderSelect(folder)}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center">
                <Folder className="h-8 w-8 text-blue-500" />
                <h4 className="font-medium truncate ml-2" title={folder.name}>
                  {folder.name}
                </h4>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(folder.id, true)
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {files.map((file) => (
          <div
            key={file.id}
            className={`border rounded-lg p-3 hover:shadow-md transition-all cursor-pointer ${
              selectedItems.some((item) => item.id === file.id)
                ? "ring-2 ring-primary"
                : ""
            }`}
            onClick={() => onFileSelect(file)}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center">
                <File className="h-8 w-8 text-gray-500" />
                <h4 className="font-medium truncate ml-2" title={file.name}>
                  {file.name}
                </h4>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(file.id, false)
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-xs text-gray-500 mt-2 flex flex-col gap-1">
              <div>Size: {formatFileSize(file.size)}</div>
              <div>
                Modified: {new Date(file.last_modified).toLocaleDateString()}
              </div>
              {file.status === "uploading" && (
                <div className="mt-2">
                  <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Uploading... {file.progress}%
                  </p>
                </div>
              )}
              {file.status === "error" && (
                <p className="text-xs text-red-500 mt-1">Upload failed</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
} 