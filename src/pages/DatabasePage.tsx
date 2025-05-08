
import { useState, useEffect } from "react";
import { 
  Search, 
  FolderPlus,
  Upload,
  File,
  Folder,
  MoreHorizontal,
  Trash,
  Edit,
  Plus,
  ArrowUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FileCategory = 'lecture_notes' | 'readings' | 'slides' | 'assignments' | 'other';
type ViewMode = 'grid' | 'list';

interface FolderType {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
}

interface FileType {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  category: FileCategory;
  tags: string[];
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  preview?: string;
  parentId: string | null;
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (fileType: string) => {
  return <File className="h-8 w-8 text-blue-500" />;
};

const DatabasePage = () => {
  const [files, setFiles] = useState<FileType[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [storageUsed, setStorageUsed] = useState(0);
  const storageLimit = 1024 * 1024 * 1024; // 1GB for demo
  const [breadcrumbs, setBreadcrumbs] = useState<{id: string | null, name: string}[]>([
    { id: null, name: 'Root' }
  ]);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Filter files/folders based on current folder and search query
  const currentFolderItems = {
    files: files.filter(file => 
      file.parentId === currentFolderId && 
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    folders: folders.filter(folder => 
      folder.parentId === currentFolderId && 
      folder.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  };

  // Navigate to a folder
  const navigateToFolder = (folderId: string | null, folderName: string) => {
    if (folderId === null) {
      // Navigate to root
      setCurrentFolderId(null);
      setBreadcrumbs([{ id: null, name: 'Root' }]);
      return;
    }
    
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    
    setCurrentFolderId(folderId);
    
    // Update breadcrumbs
    const newBreadcrumbs = [...breadcrumbs];
    const existingIndex = newBreadcrumbs.findIndex(b => b.id === folderId);
    
    if (existingIndex !== -1) {
      // If folder exists in breadcrumb, truncate to that point
      setBreadcrumbs(newBreadcrumbs.slice(0, existingIndex + 1));
    } else {
      // Add new folder to breadcrumbs
      setBreadcrumbs([...newBreadcrumbs, { id: folderId, name: folderName }]);
    }
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      const newFiles = selectedFiles.map(file => ({
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        category: 'other' as FileCategory,
        tags: [],
        progress: 0,
        status: 'uploading' as const,
        parentId: currentFolderId,
        preview: file.type.includes('image') ? URL.createObjectURL(file) : undefined
      }));
      
      setFiles(prevFiles => [...prevFiles, ...newFiles]);
      simulateUpload(newFiles);
      
      toast({
        title: `${newFiles.length} ${newFiles.length === 1 ? 'file' : 'files'} uploading`,
        description: "Your files will be processed shortly.",
      });
      
      const newStorageUsed = newFiles.reduce((acc, file) => acc + file.size, storageUsed);
      setStorageUsed(newStorageUsed);
      setIsUploadDialogOpen(false);
    }
  };
  
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const newFiles = droppedFiles.map(file => ({
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        category: 'other' as FileCategory,
        tags: [],
        progress: 0,
        status: 'uploading' as const,
        parentId: currentFolderId,
        preview: file.type.includes('image') ? URL.createObjectURL(file) : undefined
      }));
      
      setFiles(prevFiles => [...prevFiles, ...newFiles]);
      simulateUpload(newFiles);
      
      toast({
        title: `${newFiles.length} ${newFiles.length === 1 ? 'file' : 'files'} uploading`,
        description: "Your files will be processed shortly.",
      });
      
      const newStorageUsed = newFiles.reduce((acc, file) => acc + file.size, storageUsed);
      setStorageUsed(newStorageUsed);
    }
  };
  
  const createNewFolder = () => {
    if (!newFolderName.trim()) {
      toast({
        title: "Folder name required",
        description: "Please enter a name for your folder.",
        variant: "destructive"
      });
      return;
    }
    
    const newFolder: FolderType = {
      id: Math.random().toString(36).substring(2, 9),
      name: newFolderName.trim(),
      parentId: currentFolderId,
      createdAt: Date.now()
    };
    
    setFolders(prev => [...prev, newFolder]);
    setIsNewFolderDialogOpen(false);
    setNewFolderName('');
    
    toast({
      title: "Folder created",
      description: `"${newFolderName}" has been created successfully.`
    });
  };
  
  const deleteItem = (id: string, isFolder: boolean) => {
    if (isFolder) {
      // Delete folder and all its contents recursively
      const deleteFolder = (folderId: string) => {
        // Delete all files in this folder
        setFiles(prevFiles => prevFiles.filter(file => file.parentId !== folderId));
        
        // Find all subfolders
        const subFolders = folders.filter(folder => folder.parentId === folderId);
        
        // Delete all subfolders recursively
        subFolders.forEach(folder => {
          deleteFolder(folder.id);
        });
        
        // Delete the folder itself
        setFolders(prevFolders => prevFolders.filter(folder => folder.id !== folderId));
      };
      
      deleteFolder(id);
      
      toast({
        title: "Folder deleted",
        description: "The folder and all its contents have been removed."
      });
    } else {
      // Delete single file
      const fileToDelete = files.find(file => file.id === id);
      if (fileToDelete) {
        setFiles(prevFiles => prevFiles.filter(file => file.id !== id));
        setStorageUsed(prevStorageUsed => prevStorageUsed - (fileToDelete?.size || 0));
        
        toast({
          title: "File deleted",
          description: `"${fileToDelete.name}" has been removed.`
        });
      }
    }
  };
  
  const simulateUpload = (newFiles: FileType[]) => {
    const intervals = newFiles.map((file) => {
      let progress = 0;
      
      const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 10) + 5;
        
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          // Update file status to processing
          setFiles(prevFiles => 
            prevFiles.map(f => 
              f.id === file.id ? { ...f, progress: 100, status: 'processing' } : f
            )
          );
          
          // Simulate processing time
          setTimeout(() => {
            setFiles(prevFiles => 
              prevFiles.map(f => 
                f.id === file.id ? { ...f, status: 'complete' } : f
              )
            );
          }, 1500);
        } else {
          setFiles(prevFiles => 
            prevFiles.map(f => 
              f.id === file.id ? { ...f, progress } : f
            )
          );
        }
      }, 200);
      
      return interval;
    });
    
    // Clean up intervals
    return () => {
      intervals.forEach(clearInterval);
    };
  };
  
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Database"
        description="Store, organize, and access your files and learning materials."
      />
      
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        {/* Top Section: Search and Storage */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search files and folders..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="mt-2">
            <div className="flex justify-between items-center text-sm mb-1">
              <span>Storage usage</span>
              <span>{((storageUsed / storageLimit) * 100).toFixed(1)}% used</span>
            </div>
            <Progress value={(storageUsed / storageLimit) * 100} className="h-2" />
            <div className="flex justify-end mt-1">
              <span className="text-xs text-gray-500">
                {formatFileSize(storageUsed)} of {formatFileSize(storageLimit)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          <Button variant="outline" onClick={() => setIsUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
          <Button variant="outline" onClick={() => setIsNewFolderDialogOpen(true)}>
            <FolderPlus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
        </div>
        
        {/* Breadcrumbs Navigation */}
        <div className="flex items-center text-sm mb-4 overflow-x-auto">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center">
              {index > 0 && <span className="mx-2 text-gray-400">/</span>}
              <button
                onClick={() => navigateToFolder(crumb.id, crumb.name)}
                className={`hover:text-purple-600 ${
                  index === breadcrumbs.length - 1 
                    ? 'font-semibold text-purple-700' 
                    : 'text-gray-600'
                }`}
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>
        
        {/* File/Folder Drop Area */}
        <div 
          className={`min-h-[400px] border-2 border-dashed rounded-lg p-4 ${
            dragging ? "border-purple-500 bg-purple-50" : "border-gray-200"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleFileDrop}
        >
          {/* If current folder is empty */}
          {currentFolderItems.folders.length === 0 && currentFolderItems.files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <FolderPlus className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700">This folder is empty</h3>
              <p className="text-gray-500 mb-4">
                Upload files or create folders to get started
              </p>
              <div className="flex gap-3">
                <Button onClick={() => setIsUploadDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
                <Button variant="outline" onClick={() => setIsNewFolderDialogOpen(true)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  New Folder
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              {/* Folders Section */}
              {currentFolderItems.folders.length > 0 && (
                <div className="mb-8">
                  <h3 className="font-medium text-gray-700 mb-2">Folders</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {currentFolderItems.folders.map(folder => (
                      <div 
                        key={folder.id}
                        className="border rounded-lg p-3 flex flex-col hover:shadow-md transition-all cursor-pointer"
                        onClick={() => navigateToFolder(folder.id, folder.name)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center">
                            <Folder className="h-8 w-8 text-yellow-500 mr-2" />
                            <h4 className="font-medium truncate" title={folder.name}>
                              {folder.name}
                            </h4>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                className="text-red-600 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteItem(folder.id, true);
                                }}
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(folder.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Files Section */}
              {currentFolderItems.files.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Files</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {currentFolderItems.files.map(file => (
                      <div 
                        key={file.id}
                        className="border rounded-lg p-3 hover:shadow-md transition-all"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center">
                            {getFileIcon(file.type)}
                            <h4 className="font-medium truncate ml-2" title={file.name}>
                              {file.name}
                            </h4>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                className="text-red-600 cursor-pointer"
                                onClick={() => deleteItem(file.id, false)}
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        {file.status !== 'complete' ? (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span>
                                {file.status === 'uploading' 
                                  ? `Uploading (${file.progress}%)` 
                                  : 'Processing...'}
                              </span>
                            </div>
                            <Progress value={file.progress} className="h-1" />
                          </div>
                        ) : (
                          <>
                            <div className="text-xs text-gray-500 mt-1">
                              {formatFileSize(file.size)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(file.lastModified).toLocaleDateString()}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      </div>
      
      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
              Upload files to your current folder. Supported formats include PDF, DOCX, PPTX, TXT, JPG, and PNG.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-2" />
              <p className="mb-2 text-gray-600">
                <span className="font-semibold">Drop files here</span> or click to upload
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Maximum 50MB per file
              </p>
              <input
                type="file"
                className="hidden"
                id="file-upload"
                onChange={handleFileUpload}
                multiple
              />
              <label htmlFor="file-upload">
                <Button variant="outline" className="mt-2" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Select Files
                  </span>
                </Button>
              </label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* New Folder Dialog */}
      <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for your new folder.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <Input
              placeholder="Folder Name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createNewFolder}>Create Folder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DatabasePage;
