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
  CloudLightning,
  Check
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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface SelectedItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  url?: string;
  size?: number;
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
    { id: null, name: 'Main' }
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
  
  // State for selection mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingProgress, setUploadingProgress] = useState(0);
  const [vectorUploadDialogOpen, setVectorUploadDialogOpen] = useState(false);
  
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
        
        // Get the correct URL from the client library
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://uzdtqomtbrccinrkhzme.supabase.co";
        
        console.log("Calling vector store files function with URL:", `${supabaseUrl}/functions/v1/list-vector-store-files`);
        
        const response = await fetch(`${supabaseUrl}/functions/v1/list-vector-store-files`, {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Vector store API error response:", errorText);
          
          let errorMessage = `Failed to fetch vector store files: ${response.status}`;
          
          try {
            // Try to parse as JSON to get a better error message
            const errorData = JSON.parse(errorText);
            if (errorData.error) {
              errorMessage = errorData.error;
            }
            console.error("Parsed error data:", errorData);
          } catch (e) {
            // Not JSON, use the raw text
            console.error("Response is not JSON:", errorText.substring(0, 100));
            errorMessage = `API error (${response.status}): ${errorText.substring(0, 100)}`;
          }
          
          throw new Error(errorMessage);
        }
        
        // Parse the response
        const responseText = await response.text();
        console.log("Vector store API response text:", responseText.substring(0, 100));
        
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (e) {
          console.error("Failed to parse response as JSON:", e);
          throw new Error("Invalid JSON response from vector store API");
        }
        
        console.log("Fetched vector store files:", result);
        
        // If we get a valid response with files, update state
        if (result && Array.isArray(result.files)) {
          setVectorStoreFiles(result.files);
        } else {
          console.warn("Unexpected response format:", result);
          setVectorStoreFiles([]);
        }
      } catch (error: any) {
        console.error("Error fetching vector store files:", error);
        toast({
          title: "Error fetching vector store files",
          description: error.message,
          variant: "destructive"
        });
        
        // Set empty array on error to prevent UI from waiting indefinitely
        setVectorStoreFiles([]);
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
    // If in selection mode, don't navigate but select/deselect the folder
    if (selectionMode && folderId !== null) {
      toggleSelectItem({
        id: folderId,
        name: folderName,
        type: 'folder'
      });
      return;
    }
    
    if (folderId === null) {
      // Navigate to root
      setCurrentFolderId(null);
      setBreadcrumbs([{ id: null, name: 'Main' }]);
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

  // Function to handle toggling selection of an item
  const toggleSelectItem = (item: SelectedItem) => {
    setSelectedItems(prevItems => {
      const exists = prevItems.some(i => i.id === item.id);
      if (exists) {
        // Remove from selected items
        return prevItems.filter(i => i.id !== item.id);
      } else {
        // Add to selected items
        return [...prevItems, item];
      }
    });
  };

  // Function to handle pushing selected items to vector store
  const pushToVectorStore = async () => {
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one file to upload to the vector store.",
        variant: "destructive"
      });
      return;
    }

    // Only files can be uploaded to the vector store
    const filesToUpload = selectedItems.filter(item => item.type === 'file' && item.url);
    
    if (filesToUpload.length === 0) {
      toast({
        title: "No valid files selected",
        description: "Please select files to upload. Folders cannot be directly uploaded to the vector store.",
        variant: "destructive"
      });
      return;
    }

    // Show the upload confirmation dialog
    setVectorUploadDialogOpen(true);
  };

  // Function to handle confirmed vector store upload
  const confirmVectorUpload = async () => {
    try {
      setIsUploading(true);
      setUploadingProgress(10);
      
      // Get auth session for the function call
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Authentication required");
      }
      
      const filesToUpload = selectedItems.filter(item => item.type === 'file' && item.url);
      setUploadingProgress(30);
      
      // Get the correct URL from the client library
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://uzdtqomtbrccinrkhzme.supabase.co";
      
      console.log("Uploading files to vector store using endpoint:", `${supabaseUrl}/functions/v1/upload-to-vector-store`);
      
      // Call the edge function with more detailed error handling
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/upload-to-vector-store`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            files: filesToUpload.map(file => ({
              id: file.id,
              name: file.name,
              url: file.url,
              size: file.size
            }))
          }),
        });
        
        setUploadingProgress(70);
        
        // Get response as text first for better debugging
        const responseText = await response.text();
        console.log("Vector store upload response text:", responseText.substring(0, 100));
        
        if (!response.ok) {
          let errorMessage = `Failed to upload to vector store: ${response.status}`;
          
          try {
            const errorData = JSON.parse(responseText);
            if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (e) {
            errorMessage = `API error (${response.status}): ${responseText.substring(0, 100)}`;
          }
          
          throw new Error(errorMessage);
        }
        
        // Parse JSON response
        let result;
        try {
          result = JSON.parse(responseText);
          console.log("Upload result:", result);
        } catch (e) {
          throw new Error("Invalid JSON response from upload API");
        }
        
        setUploadingProgress(100);
        
        // Show success message with details
        toast({
          title: "Files uploaded to vector store",
          description: result.message || `Successfully uploaded ${filesToUpload.length} files to your vector store.`,
        });
        
      } catch (fetchError: any) {
        console.error("Fetch error during upload:", fetchError);
        throw new Error(fetchError.message || "Network error during vector store upload");
      }
      
      // Refresh vector store files list
      if (activeTab === "vectorStore") {
        // This will trigger the useEffect to reload vector store files
        setActiveTab("myFiles");
        setTimeout(() => setActiveTab("vectorStore"), 100);
      }
      
      // Exit selection mode
      setSelectionMode(false);
      setSelectedItems([]);
      
    } catch (error: any) {
      console.error("Error uploading to vector store:", error);
      toast({
        title: "Upload to vector store failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setVectorUploadDialogOpen(false);
    }
  };
  
  // Exit selection mode
  const cancelSelectionMode = () => {
    setSelectionMode(false);
    setSelectedItems([]);
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
          <h3 className="text-lg font-medium text-gray-700 mb-4">
