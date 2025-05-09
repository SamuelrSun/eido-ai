import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  ArrowUp,
  Loader2,
  ChevronRight,
  CloudLightning
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface FolderType {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

interface FileType {
  id: string;
  name: string;
  size: number;
  type: string;
  last_modified: string;
  category: string;
  tags: string[];
  status: 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  url?: string;
  folder_id: string | null;
  user_id?: string;
}

interface UserStorage {
  storage_used: number;
  storage_limit: number;
}

interface VectorStoreFileType {
  id: string;
  created_at: number;
  modified_at: number;
  object: string;
  filename: string;
  size?: number;
  purpose?: string;
  status?: string;
  vector_store_id?: string;
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
  const [userStorage, setUserStorage] = useState<UserStorage>({ 
    storage_used: 0, 
    storage_limit: 1024 * 1024 * 1024 // Default 1GB
  });
  const [breadcrumbs, setBreadcrumbs] = useState<{id: string | null, name: string}[]>([
    { id: null, name: 'Main' } // Changed from 'Root' to 'Main'
  ]);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const [vectorStoreFiles, setVectorStoreFiles] = useState<VectorStoreFileType[]>([]);
  const [isLoadingVectorFiles, setIsLoadingVectorFiles] = useState(false);
  const [activeTab, setActiveTab] = useState("myFiles");
  
  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user || null);
    };
    
    fetchUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });
    
    return () => subscription.unsubscribe();
  }, []);
  
  // Fetch user storage info
  useEffect(() => {
    const fetchUserStorage = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('user_storage')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setUserStorage({
          storage_used: data.storage_used,
          storage_limit: data.storage_limit
        });
      } else if (error && error.code !== 'PGRST116') { // Not found error
        console.error("Error fetching storage info:", error);
        toast({
          title: "Error fetching storage info",
          description: error.message,
          variant: "destructive"
        });
      }
    };
    
    if (user) {
      fetchUserStorage();
    }
  }, [user]);
  
  // Fetch folders and files for current folder
  useEffect(() => {
    const fetchFoldersAndFiles = async () => {
      if (!user) return;
      
      setLoading(true);
      
      try {
        // Fetch folders - Use IS NULL check instead of eq with null
        let folderQuery = supabase
          .from('file_folders')
          .select('*')
          .eq('user_id', user.id);
          
        if (currentFolderId === null) {
          folderQuery = folderQuery.is('parent_id', null);
        } else {
          folderQuery = folderQuery.eq('parent_id', currentFolderId);
        }
        
        const { data: folderData, error: folderError } = await folderQuery;
        
        if (folderError) throw folderError;
        
        // Fetch files - Use IS NULL check for null folder_id
        let fileQuery = supabase
          .from('files')
          .select('*')
          .eq('user_id', user.id);
          
        if (currentFolderId === null) {
          fileQuery = fileQuery.is('folder_id', null);
        } else {
          fileQuery = fileQuery.eq('folder_id', currentFolderId);
        }
        
        const { data: fileData, error: fileError } = await fileQuery;
        
        if (fileError) throw fileError;
        
        setFolders(folderData || []);
        
        // Add progress property to files (needed for UI) and ensure status is a valid value
        const filesWithProgress = (fileData || []).map(file => ({
          ...file,
          progress: 100,
          status: (file.status as 'uploading' | 'processing' | 'complete' | 'error') || 'complete',
          tags: file.tags || []
        }));
        
        setFiles(filesWithProgress as FileType[]);
      } catch (error: any) {
        console.error("Error fetching folders and files:", error);
        toast({
          title: "Error loading data",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      fetchFoldersAndFiles();
    }
  }, [currentFolderId, user]);
  
  // Load vector store files
  useEffect(() => {
    const fetchVectorStoreFiles = async () => {
      if (!user) return;
      
      setIsLoadingVectorFiles(true);
      
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          throw new Error("Authentication required");
        }
        
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-vector-store-files`, {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch vector store files");
        }
        
        const result = await response.json();
        setVectorStoreFiles(result.files || []);
        console.log("Fetched vector store files:", result);
      } catch (error: any) {
        console.error("Error fetching vector store files:", error);
        toast({
          title: "Error fetching vector store files",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setIsLoadingVectorFiles(false);
      }
    };
    
    if (activeTab === "vectorStore" && user) {
      fetchVectorStoreFiles();
    }
  }, [activeTab, user]);
  
  // Filter files/folders based on search query
  const currentFolderItems = {
    files: files.filter(file => 
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    folders: folders.filter(folder => 
      folder.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  };

  // Navigate to a folder
  const navigateToFolder = async (folderId: string | null, folderName: string) => {
    if (folderId === null) {
      // Navigate to root
      setCurrentFolderId(null);
      setBreadcrumbs([{ id: null, name: 'Main' }]); // Changed from 'Root' to 'Main'
      return;
    }
    
    setCurrentFolderId(folderId);
    
    // Update breadcrumbs
    if (folderId === breadcrumbs[breadcrumbs.length - 1].id) {
      // Already at this folder
      return;
    }

    // Check if folder exists in current breadcrumb
    const existingIndex = breadcrumbs.findIndex(b => b.id === folderId);
    if (existingIndex !== -1) {
      // If folder exists in breadcrumb, truncate to that point
      setBreadcrumbs(breadcrumbs.slice(0, existingIndex + 1));
    } else {
      // Add new folder to breadcrumbs
      setBreadcrumbs([...breadcrumbs, { id: folderId, name: folderName }]);
    }
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload files",
        variant: "destructive"
      });
      return;
    }
    
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      
      // Create temporary file entries for UI
      const newFiles: FileType[] = selectedFiles.map(file => ({
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        last_modified: new Date(file.lastModified).toISOString(),
        category: 'other',
        tags: [],
        progress: 0,
        status: 'uploading' as const,
        folder_id: currentFolderId,
      }));
      
      setFiles(prevFiles => [...prevFiles, ...newFiles]);
      
      toast({
        title: `${newFiles.length} ${newFiles.length === 1 ? 'file' : 'files'} uploading`,
        description: "Your files will be processed shortly.",
      });
      
      // Upload each file to Supabase storage
      for (const [index, file] of selectedFiles.entries()) {
        const newFileId = newFiles[index].id;
        
        // Update progress for this file
        const updateProgress = (progress: number) => {
          setFiles(prevFiles => 
            prevFiles.map(f => 
              f.id === newFileId ? { ...f, progress } : f
            )
          );
        };
        
        try {
          // Check for authentication
          const { data: sessionData } = await supabase.auth.getSession();
          if (!sessionData.session) {
            throw new Error("Authentication required");
          }

          // Generate a unique file path
          const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
          const filePath = `${fileName}`;
          
          // 1. Upload to storage with authentication
          const { data: storageData, error: storageError } = await supabase.storage
            .from('file_storage')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false // Set to false to avoid overwriting
            });

          // Manual progress updates
          updateProgress(50);
          
          if (storageError) throw storageError;
          
          updateProgress(75);
          
          // 2. Get the URL
          const { data: urlData } = supabase.storage
            .from('file_storage')
            .getPublicUrl(filePath);
          
          // 3. Create record in files table
          const { data: fileRecord, error: insertError } = await supabase
            .from('files')
            .insert([
              {
                name: file.name,
                size: file.size,
                type: file.type,
                folder_id: currentFolderId,
                user_id: user.id,
                url: urlData.publicUrl,
                last_modified: new Date().toISOString(),
                category: 'other',
                status: 'complete'
              }
            ])
            .select()
            .single();
          
          if (insertError) throw insertError;
          
          // 4. Update the file entry in state
          updateProgress(100);
          setFiles(prevFiles => 
            prevFiles.map(f => 
              f.id === newFileId ? { 
                ...fileRecord, 
                progress: 100,
                status: 'complete' as const,
                tags: fileRecord.tags || []
              } : f
            ) as FileType[]
          );
        } catch (error: any) {
          console.error("Error uploading file:", error);
          
          // Update file status to error
          setFiles(prevFiles => 
            prevFiles.map(f => 
              f.id === newFileId ? { ...f, status: 'error' as const } : f
            )
          );
          
          toast({
            title: `Failed to upload ${file.name}`,
            description: error.message,
            variant: "destructive"
          });
        }
      }
      
      // Close the upload dialog
      setIsUploadDialogOpen(false);
    }
  };
  
  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload files",
        variant: "destructive"
      });
      return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      
      // Create temporary file entries for UI
      const newFiles: FileType[] = droppedFiles.map(file => ({
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        last_modified: new Date(file.lastModified).toISOString(),
        category: 'other',
        tags: [],
        progress: 0,
        status: 'uploading' as const,
        folder_id: currentFolderId,
      }));
      
      setFiles(prevFiles => [...prevFiles, ...newFiles]);
      
      toast({
        title: `${newFiles.length} ${newFiles.length === 1 ? 'file' : 'files'} uploading`,
        description: "Your files will be processed shortly.",
      });
      
      // Upload each file to Supabase storage
      for (const [index, file] of droppedFiles.entries()) {
        const newFileId = newFiles[index].id;
        
        // Update progress for this file
        const updateProgress = (progress: number) => {
          setFiles(prevFiles => 
            prevFiles.map(f => 
              f.id === newFileId ? { ...f, progress } : f
            )
          );
        };
        
        try {
          // Check for authentication
          const { data: sessionData } = await supabase.auth.getSession();
          if (!sessionData.session) {
            throw new Error("Authentication required");
          }

          // Generate a unique file path
          const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
          const filePath = `${fileName}`;
          
          // 1. Upload to storage with authentication
          const { data: storageData, error: storageError } = await supabase.storage
            .from('file_storage')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false // Set to false to avoid overwriting
            });

          // Manual progress updates
          updateProgress(50);
          
          if (storageError) throw storageError;
          
          updateProgress(75);
          
          // 2. Get the URL
          const { data: urlData } = supabase.storage
            .from('file_storage')
            .getPublicUrl(filePath);
          
          // 3. Create record in files table
          const { data: fileRecord, error: insertError } = await supabase
            .from('files')
            .insert([
              {
                name: file.name,
                size: file.size,
                type: file.type,
                folder_id: currentFolderId,
                user_id: user.id,
                url: urlData.publicUrl,
                last_modified: new Date().toISOString(),
                category: 'other',
                status: 'complete'
              }
            ])
            .select()
            .single();
          
          if (insertError) throw insertError;
          
          // 4. Update the file entry in state
          updateProgress(100);
          setFiles(prevFiles => 
            prevFiles.map(f => 
              f.id === newFileId ? { 
                ...fileRecord, 
                progress: 100,
                status: 'complete' as const,
                tags: fileRecord.tags || []
              } : f
            ) as FileType[]
          );
        } catch (error: any) {
          console.error("Error uploading file:", error);
          
          // Update file status to error
          setFiles(prevFiles => 
            prevFiles.map(f => 
              f.id === newFileId ? { ...f, status: 'error' as const } : f
            )
          );
          
          toast({
            title: `Failed to upload ${file.name}`,
            description: error.message,
            variant: "destructive"
          });
        }
      }
    }
  };
  
  const createNewFolder = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create folders",
        variant: "destructive"
      });
      return;
    }
    
    if (!newFolderName.trim()) {
      toast({
        title: "Folder name required",
        description: "Please enter a name for your folder.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('file_folders')
        .insert([
          {
            name: newFolderName.trim(),
            parent_id: currentFolderId,
            user_id: user.id
          }
        ])
        .select()
        .single();
      
      if (error) throw error;
      
      setFolders(prev => [...prev, data]);
      setIsNewFolderDialogOpen(false);
      setNewFolderName('');
      
      toast({
        title: "Folder created",
        description: `"${newFolderName}" has been created successfully.`
      });
    } catch (error: any) {
      console.error("Error creating folder:", error);
      toast({
        title: "Error creating folder",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  
  const deleteItem = async (id: string, isFolder: boolean) => {
    if (!user) return;
    
    try {
      if (isFolder) {
        // Delete folder and all its contents recursively
        const deleteFolder = async (folderId: string) => {
          // Get all files in the folder
          const { data: folderFiles, error: filesError } = await supabase
            .from('files')
            .select('*')
            .eq('folder_id', folderId);
          
          if (filesError) throw filesError;
          
          // Delete each file from storage
          for (const file of folderFiles || []) {
            // Extract path from URL and delete from storage
            if (file.url) {
              // Fix: Extract just the filename from the URL
              const urlParts = file.url.split('/');
              const fileName = urlParts[urlParts.length - 1];
              
              if (fileName) {
                await supabase.storage
                  .from('file_storage')
                  .remove([fileName]);
              }
            }
          }
          
          // Delete files from database
          if (folderFiles && folderFiles.length > 0) {
            const { error: deleteFilesError } = await supabase
              .from('files')
              .delete()
              .eq('folder_id', folderId);
            
            if (deleteFilesError) throw deleteFilesError;
          }
          
          // Find all subfolders
          const { data: subfolders, error: subfoldersError } = await supabase
            .from('file_folders')
            .select('*')
            .eq('parent_id', folderId);
          
          if (subfoldersError) throw subfoldersError;
          
          // Delete all subfolders recursively
          for (const folder of subfolders || []) {
            await deleteFolder(folder.id);
          }
          
          // Delete the folder itself
          const { error: deleteFolderError } = await supabase
            .from('file_folders')
            .delete()
            .eq('id', folderId);
          
          if (deleteFolderError) throw deleteFolderError;
          
          // Update UI state
          setFolders(prevFolders => prevFolders.filter(folder => folder.id !== folderId));
        };
        
        await deleteFolder(id);
        
        toast({
          title: "Folder deleted",
          description: "The folder and all its contents have been removed."
        });
      } else {
        // Get file info
        const fileToDelete = files.find(file => file.id === id);
        
        if (fileToDelete) {
          // Delete file from storage if it has a URL
          if (fileToDelete.url) {
            // Fix: Extract just the filename from the URL
            const urlParts = fileToDelete.url.split('/');
            const fileName = urlParts[urlParts.length - 1];
            
            if (fileName) {
              await supabase.storage
                .from('file_storage')
                .remove([fileName]);
            }
          }
          
          // Delete from database
          const { error } = await supabase
            .from('files')
            .delete()
            .eq('id', id);
          
          if (error) throw error;
          
          // Update UI state
          setFiles(prevFiles => prevFiles.filter(file => file.id !== id));
          
          toast({
            title: "File deleted",
            description: `"${fileToDelete.name}" has been removed.`
          });
        }
      }
    } catch (error: any) {
      console.error("Error deleting item:", error);
      toast({
        title: "Error deleting item",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };
  
  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Database"
          description="You need to sign in to access your files and folders."
        />
        <div className="bg-white p-6 rounded-xl shadow-sm border text-center py-12">
          <h3 className="text-lg font-medium text-gray-700 mb-4">Authentication Required</h3>
          <p className="text-gray-500 mb-6">Please sign in to access your database and files.</p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Database"
        description="Store, organize, and access your files and learning materials."
      />
      
      {!user ? (
        <div className="bg-white p-6 rounded-xl shadow-sm border text-center py-12">
          <h3 className="text-lg font-medium text-gray-700 mb-4">Authentication Required</h3>
          <p className="text-gray-500 mb-6">Please sign in to access your database and files.</p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      ) : (
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
                <span>{((userStorage.storage_used / userStorage.storage_limit) * 100).toFixed(1)}% used</span>
              </div>
              <Progress value={(userStorage.storage_used / userStorage.storage_limit) * 100} className="h-2" />
              <div className="flex justify-end mt-1">
                <span className="text-xs text-gray-500">
                  {formatFileSize(userStorage.storage_used)} of {formatFileSize(userStorage.storage_limit)}
                </span>
              </div>
            </div>
          </div>
          
          {/* Tabs for My Files and Vector Store Files */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="myFiles">My Files</TabsTrigger>
              <TabsTrigger value="vectorStore">
                Vector Store 
                <Badge variant="outline" className="ml-2 bg-blue-50">AI</Badge>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="myFiles" className="mt-0">
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
              <div className="flex flex-wrap items-center mb-6 text-lg">
                {breadcrumbs.map((crumb, index) => (
                  <div key={index} className="flex items-center">
                    {index > 0 && (
                      <ChevronRight className="h-5 w-5 mx-2 text-gray-400" />
                    )}
                    <button
                      onClick={() => navigateToFolder(crumb.id, crumb.name)}
                      className={`px-4 py-2 rounded-full transition-all ${
                        index === breadcrumbs.length - 1 
                          ? 'bg-blue-100 text-blue-700 font-medium' 
                          : 'text-gray-700 hover:bg-gray-100'
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
                {/* Loading state */}
                {loading && (
                  <div className="flex flex-col items-center justify-center h-full py-10">
                    <Loader2 className="h-10 w-10 text-purple-500 animate-spin mb-4" />
                    <p className="text-gray-500">Loading your files and folders...</p>
                  </div>
                )}
                
                {/* Empty state */}
                {!loading && currentFolderItems.folders.length === 0 && currentFolderItems.files.length === 0 ? (
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
                    {!loading && currentFolderItems.folders.length > 0 && (
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
                                {new Date(folder.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Files Section */}
                    {!loading && currentFolderItems.files.length > 0 && (
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
                                    {file.url && (
                                      <DropdownMenuItem
                                        onClick={() => window.open(file.url, '_blank')}
                                      >
                                        <File className="h-4 w-4 mr-2" />
                                        Open
                                      </DropdownMenuItem>
                                    )}
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
                                        : file.status === 'processing'
                                          ? 'Processing...'
                                          : 'Error uploading'}
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
                                    {new Date(file.last_modified).toLocaleDateString()}
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
            </TabsContent>
            
            <TabsContent value="vectorStore" className="mt-0">
              <div className="mb-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Vector Store Files</h3>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">Connected to OpenAI</Badge>
                </div>
                <p className="text-gray-500 text-sm mt-1">
                  These files are stored in your OpenAI vector store and are available for AI-powered features.
                </p>
              </div>
              
              {/* Vector Store Files Area */}
              <div className="min-h-[400px] border-2 rounded-lg p-4 border-gray-200">
                {/* Loading state */}
                {isLoadingVectorFiles && (
                  <div className="flex flex-col items-center justify-center h-full py-10">
                    <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
                    <p className="text-gray-500">Loading your vector store files...</p>
                  </div>
                )}
                
                {/* Empty state */}
                {!isLoadingVectorFiles && vectorStoreFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-10">
                    <CloudLightning className="h-16 w-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-700">No files found in vector store</h3>
                    <p className="text-gray-500 mb-4 max-w-md">
                      Files added to your OpenAI vector store will appear here. You can use these files with AI features.
                    </p>
                  </div>
                ) : !isLoadingVectorFiles && (
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {vectorStoreFiles.map(file => (
                        <div 
                          key={file.id}
                          className="border rounded-lg p-3 hover:shadow-md transition-all"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center">
                              <File className="h-8 w-8 text-blue-500" />
                              <h4 className="font-medium truncate ml-2" title={file.filename}>
                                {file.filename}
                              </h4>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-2 flex flex-col gap-1">
                            <div>Added: {formatTimestamp(file.created_at)}</div>
                            <div>Modified: {formatTimestamp(file.modified_at)}</div>
                            {file.size && <div>Size: {formatFileSize(file.size)}</div>}
                            {file.purpose && (
                              <div className="mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {file.purpose}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
      
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
