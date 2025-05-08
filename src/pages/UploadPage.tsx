import { useState } from "react";
import { 
  Upload, 
  FileText, 
  List, 
  Grid2X2, 
  Search, 
  FileImage, 
  FileAudio, 
  FileVideo, 
  FolderPlus,
  Trash2, 
  Edit,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PageHeader } from "@/components/layout/PageHeader";

type FileCategory = 'lecture_notes' | 'readings' | 'slides' | 'assignments' | 'other';
type FileViewMode = 'grid' | 'list';

interface UploadedFile {
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
  selected: boolean;
}

const getFileIcon = (fileType: string) => {
  if (fileType.includes('image')) return <FileImage className="h-8 w-8 text-purple-500" />;
  if (fileType.includes('audio')) return <FileAudio className="h-8 w-8 text-blue-500" />;
  if (fileType.includes('video')) return <FileVideo className="h-8 w-8 text-red-500" />;
  return <FileText className="h-8 w-8 text-gray-500" />;
};

const getFileTypeColor = (fileType: string) => {
  if (fileType.includes('pdf')) return 'border-red-200 bg-red-50';
  if (fileType.includes('doc')) return 'border-blue-200 bg-blue-50';
  if (fileType.includes('ppt')) return 'border-orange-200 bg-orange-50';
  if (fileType.includes('image')) return 'border-green-200 bg-green-50';
  if (fileType.includes('txt')) return 'border-gray-200 bg-gray-50';
  return 'border-purple-200 bg-purple-50';
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const UploadPage = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [viewMode, setViewMode] = useState<FileViewMode>('grid');
  const [storageUsed, setStorageUsed] = useState(0);
  const storageLimit = 1024 * 1024 * 1024; // 1GB for demo
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FileCategory | 'all'>('all');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderName, setFolderName] = useState('');
  
  // Handle file drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).map(file => ({
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        category: 'other' as FileCategory,
        tags: [],
        progress: 0,
        status: 'uploading' as const,
        selected: false,
        preview: file.type.includes('image') ? URL.createObjectURL(file) : undefined
      }));
      
      // Simulate upload progress
      setFiles(prevFiles => [...prevFiles, ...newFiles]);
      simulateUpload(newFiles);
      
      // Show toast notification
      toast({
        title: `${newFiles.length} ${newFiles.length === 1 ? 'file' : 'files'} uploading`,
        description: "Your files will be processed shortly.",
      });
      
      // Update storage usage
      const newStorageUsed = newFiles.reduce((acc, file) => acc + file.size, storageUsed);
      setStorageUsed(newStorageUsed);
    }
  };

  const simulateUpload = (newFiles: UploadedFile[]) => {
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        selected: false,
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
  
  const toggleFileSelection = (id: string) => {
    setFiles(prevFiles => 
      prevFiles.map(file => 
        file.id === id ? { ...file, selected: !file.selected } : file
      )
    );
  };
  
  const toggleAllFiles = (selected: boolean) => {
    setFiles(prevFiles => prevFiles.map(file => ({ ...file, selected })));
  };
  
  const deleteSelectedFiles = () => {
    const selectedCount = files.filter(file => file.selected).length;
    
    if (selectedCount === 0) return;
    
    // Calculate storage to free up
    const storageToFree = files
      .filter(file => file.selected)
      .reduce((acc, file) => acc + file.size, 0);
    
    setFiles(prevFiles => prevFiles.filter(file => !file.selected));
    setStorageUsed(prevStorageUsed => prevStorageUsed - storageToFree);
    
    toast({
      title: `${selectedCount} ${selectedCount === 1 ? 'file' : 'files'} deleted`,
      description: "The selected files have been removed.",
    });
  };
  
  const createNewFolder = () => {
    if (!folderName.trim()) {
      toast({
        title: "Folder name is required",
        description: "Please enter a name for your folder.",
        variant: "destructive"
      });
      return;
    }
    
    // In a real app, you'd call an API to create the folder
    toast({
      title: "Folder created",
      description: `"${folderName}" has been created successfully.`,
    });
    
    setIsCreatingFolder(false);
    setFolderName('');
  };
  
  const updateFileCategory = (id: string, category: FileCategory) => {
    setFiles(prevFiles => 
      prevFiles.map(file => 
        file.id === id ? { ...file, category } : file
      )
    );
  };
  
  const addTag = (id: string, tag: string) => {
    setFiles(prevFiles => 
      prevFiles.map(file => 
        file.id === id && !file.tags.includes(tag) 
          ? { ...file, tags: [...file.tags, tag] } 
          : file
      )
    );
  };
  
  const removeTag = (id: string, tag: string) => {
    setFiles(prevFiles => 
      prevFiles.map(file => 
        file.id === id 
          ? { ...file, tags: file.tags.filter(t => t !== tag) } 
          : file
      )
    );
  };
  
  // Filter files based on search and category
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || file.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  
  const selectedFilesCount = files.filter(file => file.selected).length;
  
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Upload Materials"
        description="Upload and manage your learning materials, lecture notes, and assignments."
      />
      
      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 mr-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search files..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <select 
                className="border border-gray-300 rounded-md px-3 py-2 bg-white"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as FileCategory | 'all')}
              >
                <option value="all">All Categories</option>
                <option value="lecture_notes">Lecture Notes</option>
                <option value="readings">Readings</option>
                <option value="slides">Slides</option>
                <option value="assignments">Assignments</option>
                <option value="other">Other</option>
              </select>
              
              <Button 
                variant="outline"
                onClick={() => setIsCreatingFolder(true)}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                New Folder
              </Button>
            </div>
          </div>
          
          {isCreatingFolder && (
            <div className="flex items-center gap-2 mb-4 bg-purple-50 p-4 rounded-lg border border-purple-100">
              <Input
                placeholder="Enter folder name..."
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="flex-1"
                autoFocus
              />
              <Button onClick={createNewFolder}>Create</Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreatingFolder(false);
                  setFolderName('');
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
        
        <div 
          className={`border-2 border-dashed rounded-lg p-6 text-center ${
            dragging ? "border-purple-500 bg-purple-50" : "border-gray-300"
          } mb-6 transition-all`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-2" />
          <p className="mb-2 text-gray-600">
            <span className="font-semibold">Drop files here</span> or click to upload
          </p>
          <p className="text-xs text-gray-500 mb-4">
            PDF, DOCX, PPTX, TXT, JPG, PNG (MAX. 50MB per file)
          </p>
          <input
            type="file"
            className="hidden"
            id="file-upload"
            accept=".pdf,.docx,.pptx,.txt,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
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
        
        <div className="mt-2 mb-6">
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
        
        {files.length > 0 && (
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="select-all" 
                checked={files.length > 0 && files.every(file => file.selected)}
                onCheckedChange={(checked) => toggleAllFiles(!!checked)}
              />
              <label htmlFor="select-all" className="text-sm">Select All</label>
              
              {selectedFilesCount > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={deleteSelectedFiles} 
                  className="ml-4"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete ({selectedFilesCount})
                </Button>
              )}
            </div>
            
            <div className="text-sm text-gray-500">
              {files.length} {files.length === 1 ? 'file' : 'files'}
            </div>
          </div>
        )}
        
        {filteredFiles.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Info className="mx-auto h-12 w-12 mb-2 opacity-30" />
            <p>No files match your current filters</p>
            {files.length > 0 && searchQuery && (
              <Button variant="link" onClick={() => setSearchQuery('')}>
                Clear search
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredFiles.map((file) => (
              <Card 
                key={file.id} 
                className={`overflow-hidden transition-all hover:shadow-md ${file.selected ? 'ring-2 ring-purple-500' : ''}`}
              >
                <div className={`p-2 flex justify-between items-center ${getFileTypeColor(file.type)}`}>
                  <div className="flex items-center">
                    <Checkbox 
                      checked={file.selected} 
                      onCheckedChange={() => toggleFileSelection(file.id)}
                      className="mr-2"
                    />
                    {getFileIcon(file.type)}
                  </div>
                  <div className="text-xs font-medium uppercase">
                    {file.type.split('/')[1] || 'file'}
                  </div>
                </div>
                
                <CardContent className="pt-4">
                  {file.preview ? (
                    <div className="aspect-square mb-4 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                      <img 
                        src={file.preview} 
                        alt={file.name}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square mb-4 bg-gray-100 rounded flex items-center justify-center">
                      {getFileIcon(file.type)}
                    </div>
                  )}
                  
                  <h3 className="font-medium truncate" title={file.name}>
                    {file.name}
                  </h3>
                  
                  <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                    <span>{formatFileSize(file.size)}</span>
                    <span className="text-xs">
                      {new Date(file.lastModified).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {file.status !== 'complete' && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span>
                          {file.status === 'uploading' 
                            ? `Uploading (${file.progress}%)` 
                            : 'Processing...'}
                        </span>
                      </div>
                      <Progress value={file.progress} className="h-1" />
                    </div>
                  )}
                  
                  <div className="flex gap-1 mt-3 flex-wrap">
                    {file.tags.map(tag => (
                      <div key={tag} className="bg-purple-100 px-2 py-1 rounded-full text-xs flex items-center">
                        {tag}
                        <button 
                          onClick={() => removeTag(file.id, tag)}
                          className="ml-1 hover:text-red-500"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between mt-4">
                    <select 
                      className="text-xs border rounded px-1 py-0.5"
                      value={file.category}
                      onChange={(e) => updateFileCategory(file.id, e.target.value as FileCategory)}
                    >
                      <option value="lecture_notes">Lecture Notes</option>
                      <option value="readings">Readings</option>
                      <option value="slides">Slides</option>
                      <option value="assignments">Assignments</option>
                      <option value="other">Other</option>
                    </select>
                    
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-6 px-2">
                          <Edit className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit</span>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <Input
                          placeholder="Add a tag"
                          className="text-xs h-7"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const target = e.target as HTMLInputElement;
                              const value = target.value.trim();
                              if (value) {
                                addTag(file.id, value);
                                target.value = '';
                              }
                            }
                          }}
                        />
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={files.length > 0 && files.every(file => file.selected)}
                      onCheckedChange={(checked) => toggleAllFiles(!!checked)}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Last Modified</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFiles.map((file) => (
                  <TableRow key={file.id} className={file.selected ? 'bg-purple-50' : ''}>
                    <TableCell>
                      <Checkbox 
                        checked={file.selected} 
                        onCheckedChange={() => toggleFileSelection(file.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium flex items-center gap-2">
                      {getFileIcon(file.type)}
                      <span className="truncate max-w-[200px]" title={file.name}>
                        {file.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className={`text-xs font-medium uppercase px-2 py-1 rounded ${getFileTypeColor(file.type)}`}>
                        {file.type.split('/')[1] || 'file'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <select 
                        className="text-xs border rounded px-1 py-0.5"
                        value={file.category}
                        onChange={(e) => updateFileCategory(file.id, e.target.value as FileCategory)}
                      >
                        <option value="lecture_notes">Lecture Notes</option>
                        <option value="readings">Readings</option>
                        <option value="slides">Slides</option>
                        <option value="assignments">Assignments</option>
                        <option value="other">Other</option>
                      </select>
                    </TableCell>
                    <TableCell>{formatFileSize(file.size)}</TableCell>
                    <TableCell>{new Date(file.lastModified).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {file.status === 'complete' ? (
                        <span className="text-green-600 text-xs font-medium">Complete</span>
                      ) : (
                        <div>
                          <div className="text-xs mb-1">
                            {file.status === 'uploading' 
                              ? `Uploading (${file.progress}%)` 
                              : 'Processing...'}
                          </div>
                          <Progress value={file.progress} className="h-1 w-20" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {file.tags.map(tag => (
                          <div key={tag} className="bg-purple-100 px-2 py-1 rounded-full text-xs flex items-center">
                            {tag}
                            <button 
                              onClick={() => removeTag(file.id, tag)}
                              className="ml-1 hover:text-red-500"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                        <Collapsible>
                          <CollapsibleTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-6 px-2 rounded-full">
                              +
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="absolute bg-white p-2 shadow-md rounded-md z-10">
                            <Input
                              placeholder="Add a tag"
                              className="text-xs h-7"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const target = e.target as HTMLInputElement;
                                  const value = target.value.trim();
                                  if (value) {
                                    addTag(file.id, value);
                                    target.value = '';
                                  }
                                }
                              }}
                            />
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        onClick={() => {
                          toggleFileSelection(file.id);
                          deleteSelectedFiles();
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPage;
