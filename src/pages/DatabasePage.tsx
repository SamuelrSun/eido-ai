// src/pages/DatabasePage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  FolderPlus,
  Upload,
  File as FileIcon,
  Folder as FolderIcon,
  MoreHorizontal,
  Trash,
  ArrowUp,
  Loader2,
  ChevronRight,
  CloudLightning,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; // Added Card and its parts
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
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
  DialogDescription as DialogDescriptionComponent, // Renamed to avoid conflict if DialogDescription is used as a variable
  DialogFooter,
  DialogHeader as DialogHeaderComponent, // Renamed
  DialogTitle as DialogTitleComponent, // Renamed
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
import { supabase } from "@/integrations/supabase/client";
import {
  FileType,
  FolderType,
  SelectedItem,
  UserStorage as UserStorageType,
  VectorStoreFileType
} from "@/features/files/types";
import { StorageUsage } from "@/features/files/components/StorageUsage"; // Added import for StorageUsage
import type { User } from "@supabase/supabase-js";
import { formatFileSize } from "@/lib/utils";
import type { OpenAIConfig } from "@/services/classOpenAIConfig";

interface ActiveClassData {
  class_id: string;
  title: string;
  openAIConfig?: OpenAIConfig;
}

const DatabasePage = () => {
  const [files, setFiles] = useState<FileType[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userStorage, setUserStorage] = useState<UserStorageType>({
    user_id: '',
    storage_used: 0,
    storage_limit: 1024 * 1024 * 1024
  });
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "Main" }
  ]);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [vectorStoreFiles, setVectorStoreFiles] = useState<VectorStoreFileType[]>([]);
  const [isLoadingVectorFiles, setIsLoadingVectorFiles] = useState(false);
  const [activeTab, setActiveTab] = useState("myFiles");

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [isUploadingToVectorStore, setIsUploadingToVectorStore] = useState(false);
  const [vectorStoreUploadProgress, setVectorStoreUploadProgress] = useState(0);
  const [isVectorUploadDialogOpen, setIsVectorUploadDialogOpen] = useState(false);

  const [activeClass, setActiveClass] = useState<ActiveClassData | null>(null);

  useEffect(() => {
    const initializePage = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user || null;
      setUser(currentUser);

      if (!currentUser) {
        toast({ title: "Authentication Required", description: "Please sign in to access the database.", variant: "destructive" });
        navigate("/auth");
        return;
      }

      const activeClassDataString = sessionStorage.getItem('activeClass');
      if (activeClassDataString) {
        try {
          const parsedClass: ActiveClassData = JSON.parse(activeClassDataString);
          setActiveClass(parsedClass);
        } catch (e) {
          console.error("DatabasePage: Error parsing activeClass from sessionStorage:", e);
          toast({ title: "Error", description: "Could not load class data. Please re-select from Home.", variant: "destructive" });
          navigate("/");
        }
      } else {
        toast({ title: "No Class Selected", description: "Please select a class from the homepage.", variant: "default" });
        navigate("/");
      }
    };
    initializePage();
  }, [navigate, toast]);

  useEffect(() => {
    const fetchUserStorage = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('user_storage')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        if (data) {
          setUserStorage(data as UserStorageType);
        } else if (!data && user) {
            const { data: newStorage, error: insertError } = await supabase
                .from('user_storage')
                .insert({ user_id: user.id, storage_used: 0, storage_limit: 1024 * 1024 * 1024 })
                .select()
                .single();
            if(insertError) throw insertError;
            if(newStorage) setUserStorage(newStorage as UserStorageType);
        }
      } catch (err) {
        console.error("Error fetching/creating storage info:", err);
        const message = err instanceof Error ? err.message : "Could not load your storage information.";
        toast({ title: "Storage Error", description: message, variant: "destructive" });
      }
    };
    if (user) fetchUserStorage();
  }, [user, toast]);

  const fetchCurrentFolderContents = useCallback(async () => {
    if (!user || !activeClass?.class_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let folderQuery = supabase
        .from('file_folders')
        .select('*')
        .eq('user_id', user.id)
        .eq('class_id', activeClass.class_id);
      folderQuery = currentFolderId === null ? folderQuery.is('parent_id', null) : folderQuery.eq('parent_id', currentFolderId);
      const { data: folderData, error: folderError } = await folderQuery;
      if (folderError) throw folderError;
      setFolders((folderData || []) as FolderType[]);

      let fileQuery = supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .eq('class_id', activeClass.class_id);
      fileQuery = currentFolderId === null ? fileQuery.is('folder_id', null) : fileQuery.eq('folder_id', currentFolderId);
      const { data: fileData, error: fileError } = await fileQuery;
      if (fileError) throw fileError;
      setFiles((fileData || []).map(f => ({ ...f, progress: f.status === 'complete' ? 100 : 0 })) as FileType[]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error loading files.";
      console.error("Error fetching folder contents:", error);
      toast({ title: "Error Loading Files", description: message, variant: "destructive" });
      setFiles([]);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, [user, activeClass?.class_id, currentFolderId, toast]);

  useEffect(() => {
    if(activeClass?.class_id) {
        fetchCurrentFolderContents();
    }
  }, [fetchCurrentFolderContents, activeClass?.class_id]);

  const fetchVectorStoreFiles = useCallback(async () => {
    if (!user || !activeClass?.openAIConfig?.vectorStoreId) {
      if (activeTab === "vectorStore") {
        toast({title: "Configuration Missing", description: "Vector Store ID not found for this class.", variant: "default"});
      }
      setVectorStoreFiles([]);
      setIsLoadingVectorFiles(false);
      return;
    }
    setIsLoadingVectorFiles(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Authentication required");

      const { data, error } = await supabase.functions.invoke('list-vector-store-files', {
        body: { vectorStoreId: activeClass.openAIConfig.vectorStoreId }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setVectorStoreFiles((data.files || []) as VectorStoreFileType[]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error.";
      console.error("Error fetching vector store files:", error);
      toast({ title: "Vector Store Error", description: `Failed to fetch vector store files: ${message}`, variant: "destructive" });
      setVectorStoreFiles([]);
    } finally {
      setIsLoadingVectorFiles(false);
    }
  }, [user, activeClass?.openAIConfig?.vectorStoreId, toast, activeTab]);

  useEffect(() => {
    if (activeTab === "vectorStore") {
      fetchVectorStoreFiles();
    }
  }, [activeTab, fetchVectorStoreFiles]);

  const filteredFolders = folders.filter(folder => folder.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredFiles = files.filter(file => file.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const navigateToFolder = (folderId: string | null, folderName: string) => {
    if (selectionMode && folderId !== null) {
      const folderToToggle = folders.find(f => f.folder_id === folderId);
      if (folderToToggle) {
        toggleSelectItem({ id: folderToToggle.folder_id, name: folderToToggle.name, type: 'folder' });
      }
      return;
    }
    setCurrentFolderId(folderId);
    if (folderId === null) {
      setBreadcrumbs([{ id: null, name: "Main" }]);
    } else {
      const newBreadcrumbs = [...breadcrumbs];
      const existingIndex = newBreadcrumbs.findIndex(b => b.id === folderId);
      if (existingIndex !== -1) {
        setBreadcrumbs(newBreadcrumbs.slice(0, existingIndex + 1));
      } else {
        setBreadcrumbs([...newBreadcrumbs, { id: folderId, name: folderName }]);
      }
    }
    setSelectionMode(false);
    setSelectedItems([]);
  };

  const handleFileUpload = async (uploadedFiles: FileList) => {
    if (!user || !activeClass?.class_id) {
      toast({ title: "Error", description: "User or class not properly set for upload.", variant: "destructive" });
      return;
    }
    const filesToProcess = Array.from(uploadedFiles);
    if (filesToProcess.length === 0) return;
    setIsUploadDialogOpen(false);

    const tempFileEntries: FileType[] = filesToProcess.map(file => ({
      file_id: `temp_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name: file.name, size: file.size, type: file.type, folder_id: currentFolderId, user_id: user.id,
      class_id: activeClass.class_id, database_id: null, url: '', last_modified: new Date().toISOString(),
      created_at: new Date().toISOString(), category: 'other', tags: [], status: 'uploading', progress: 0,
    }));
    setFiles(prev => [...prev, ...tempFileEntries]);

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      const tempFileId = tempFileEntries[i].file_id;
      const updateFileState = (updates: Partial<FileType>) => {
        setFiles(prev => prev.map(f => f.file_id === tempFileId ? { ...f, ...updates } : f));
      };
      try {
        updateFileState({ progress: 10 });
        const filePath = `${user.id}/${activeClass.class_id}/${currentFolderId || 'root'}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
        updateFileState({ progress: 30 });
        const { error: uploadError } = await supabase.storage.from('file_storage').upload(filePath, file, { cacheControl: '3600', upsert: false });
        if (uploadError) throw uploadError;
        updateFileState({ progress: 60 });
        const { data: publicUrlData } = supabase.storage.from('file_storage').getPublicUrl(filePath);
        if (!publicUrlData?.publicUrl) throw new Error("Could not get public URL.");
        updateFileState({ progress: 80, url: publicUrlData.publicUrl });
        const { data: newFileRecord, error: insertError } = await supabase.from('files')
          .insert({ name: file.name, size: file.size, type: file.type, folder_id: currentFolderId, user_id: user.id,
                    class_id: activeClass.class_id, url: publicUrlData.publicUrl, last_modified: new Date().toISOString(), status: 'complete' })
          .select().single();
        if (insertError) throw insertError;
        if (!newFileRecord) throw new Error("Failed to save file record.");
        updateFileState({ ...newFileRecord, progress: 100, status: 'complete' } as FileType);
        toast({ title: "File Uploaded", description: `${file.name} uploaded.` });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown upload error.";
        console.error(`Error uploading ${file.name}:`, error);
        updateFileState({ status: 'error', progress: 0 });
        toast({ title: `Upload Failed: ${file.name}`, description: message, variant: "destructive" });
      }
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files);
  };

  const createNewFolder = async () => {
    if (!user || !activeClass?.class_id) {
      toast({ title: "Error", description: "User or class not set.", variant: "destructive" }); return;
    }
    if (!newFolderName.trim()) {
      toast({ title: "Folder Name Required", description: "Please enter a name.", variant: "default" }); return;
    }
    try {
      const { data, error } = await supabase.from('file_folders')
        .insert({ name: newFolderName.trim(), parent_id: currentFolderId, user_id: user.id, class_id: activeClass.class_id })
        .select().single();
      if (error) throw error;
      if (!data) throw new Error("Failed to create folder.");
      setFolders(prev => [...prev, data as FolderType]);
      setIsNewFolderDialogOpen(false); setNewFolderName('');
      toast({ title: "Folder Created", description: `"${data.name}" created.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error.";
      console.error("Error creating folder:", error);
      toast({ title: "Folder Creation Failed", description: message, variant: "destructive" });
    }
  };

  const deleteItem = async (itemId: string, itemType: 'file' | 'folder') => {
    if (!user || !activeClass?.class_id) return;
    const confirmDelete = window.confirm(`Are you sure you want to delete this ${itemType}? This action cannot be undone.`);
    if (!confirmDelete) return;
    try {
      if (itemType === 'folder') {
        const { error } = await supabase.from('file_folders').delete().eq('folder_id', itemId).eq('user_id', user.id).eq('class_id', activeClass.class_id);
        if (error) throw error;
        setFolders(prev => prev.filter(f => f.folder_id !== itemId));
        toast({ title: "Folder Deleted" });
      } else {
        const fileToDelete = files.find(f => f.file_id === itemId);
        if (fileToDelete?.url) {
          try {
            const fullPath = new URL(fileToDelete.url).pathname;
            const bucketName = 'file_storage';
            const storagePathStartIndex = fullPath.indexOf(`/${bucketName}/`);
            if (storagePathStartIndex !== -1) {
                const storagePath = fullPath.substring(storagePathStartIndex + `/${bucketName}/`.length);
                if (storagePath) await supabase.storage.from(bucketName).remove([storagePath]);
            } else {
                console.warn("Could not determine storage path from URL:", fileToDelete.url);
            }
          } catch (storageError) {
            console.warn("Could not parse or remove file from storage:", storageError);
          }
        }
        const { error } = await supabase.from('files').delete().eq('file_id', itemId).eq('user_id', user.id).eq('class_id', activeClass.class_id);
        if (error) throw error;
        setFiles(prev => prev.filter(f => f.file_id !== itemId));
        toast({ title: "File Deleted" });
      }
      fetchCurrentFolderContents();
    } catch (error) {
      const message = error instanceof Error ? error.message : `Unknown error deleting ${itemType}.`;
      console.error(`Error deleting ${itemType}:`, error);
      toast({ title: `Error Deleting ${itemType}`, description: message, variant: "destructive" });
    }
  };

  const toggleSelectItem = (item: SelectedItem) => {
    setSelectedItems(prevItems =>
      prevItems.some(i => i.id === item.id && i.type === item.type)
        ? prevItems.filter(i => !(i.id === item.id && i.type === item.type))
        : [...prevItems, item]
    );
  };

  const confirmVectorUpload = async () => {
    if (!user || !activeClass?.openAIConfig?.vectorStoreId) {
      toast({ title: "Configuration Error", description: "Active class or Vector Store ID is missing.", variant: "destructive" }); return;
    }
    const filesToUploadToVS = selectedItems.filter(item => item.type === 'file' && item.url);
    if (filesToUploadToVS.length === 0) {
      toast({ title: "No Files Selected", description: "Please select valid files with URLs to upload.", variant: "default" }); return;
    }
    setIsUploadingToVectorStore(true); setVectorStoreUploadProgress(0);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Authentication required");
      const filesPayload = filesToUploadToVS.map(f => {
          const originalFile = files.find(file => file.file_id === f.id);
          return { name: f.name, type: originalFile?.type || 'application/octet-stream', url: f.url!, size: f.size };
      });
      const { data, error } = await supabase.functions.invoke('upload-to-vector-store', {
        body: { files: filesPayload, vectorStoreId: activeClass.openAIConfig.vectorStoreId }
      });
      setVectorStoreUploadProgress(50);
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setVectorStoreUploadProgress(100);
      toast({ title: "Upload Successful", description: `${filesToUploadToVS.length} files sent to Vector Store.` });
      fetchVectorStoreFiles();
      setSelectionMode(false); setSelectedItems([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown upload error.";
      console.error("Error uploading to vector store:", error);
      toast({ title: "Vector Store Upload Failed", description: message, variant: "destructive" });
    } finally {
      setIsUploadingToVectorStore(false); setIsVectorUploadDialogOpen(false);
    }
  };

  if (!user || !activeClass) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading class information or redirecting...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Database: ${activeClass?.title || 'Loading...'}`}
        description="Store, organize, and sync files with your AI knowledge base."
      />
      <div className="bg-card p-4 sm:p-6 rounded-xl shadow-sm border">
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search files and folders..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          {userStorage && <StorageUsage storage={userStorage} />}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="myFiles">My Files</TabsTrigger>
            <TabsTrigger value="vectorStore">Vector Store <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-700">AI</Badge></TabsTrigger>
          </TabsList>

          <TabsContent value="myFiles" className="mt-6">
            <div className="flex flex-wrap gap-2 mb-6 mt-4 items-center">
              {!selectionMode ? (
                <>
                  <Button onClick={() => setIsUploadDialogOpen(true)}> <Upload className="h-4 w-4 mr-2" /> Upload Files </Button>
                  <Button variant="outline" onClick={() => setIsNewFolderDialogOpen(true)}> <FolderPlus className="h-4 w-4 mr-2" /> New Folder </Button>
                  <Button variant="outline" onClick={() => setSelectionMode(true)} className="ml-auto"> <Check className="h-4 w-4 mr-2" /> Select Items </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => setIsVectorUploadDialogOpen(true)} disabled={selectedItems.filter(item => item.type === 'file').length === 0}>
                    <ArrowUp className="h-4 w-4 mr-2" /> Push to Vector Store ({selectedItems.filter(item => item.type === 'file').length})
                  </Button>
                  <Button variant="outline" onClick={() => { setSelectionMode(false); setSelectedItems([]); }}> Cancel Selection </Button>
                </>
              )}
            </div>
            <Breadcrumb className="mb-4">
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.id || 'root-crumb'}>
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        asChild={index !== breadcrumbs.length -1}
                        className={index === breadcrumbs.length - 1 ? "font-medium text-foreground" : "cursor-pointer hover:text-primary"}
                        onClick={(e) => {
                            if (index !== breadcrumbs.length -1) {
                                e.preventDefault();
                                navigateToFolder(crumb.id, crumb.name);
                            }
                        }}
                        href={index === breadcrumbs.length -1 ? undefined : '#'}
                      >
                        <span>{crumb.name}</span>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
            <div className={`min-h-[300px] border-2 border-dashed rounded-lg p-4 ${dragging ? "border-primary bg-primary/10" : "border-input"}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleFileDrop}
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full py-10"><Loader2 className="h-10 w-10 text-primary animate-spin mb-4" /><p className="text-muted-foreground">Loading...</p></div>
              ) : (filteredFolders.length === 0 && filteredFiles.length === 0) ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-10"><FolderPlus className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" /><h3 className="text-lg font-medium">This folder is empty</h3><p className="text-muted-foreground mb-4"> Drag and drop files here or use the upload button. </p></div>
              ) : (
                <ScrollArea className="h-[400px] sm:h-[500px]">
                  {filteredFolders.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">Folders</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {filteredFolders.map(folder => (
                          <Card key={folder.folder_id} className={`p-3 transition-all hover:shadow-md cursor-pointer ${selectedItems.some(item => item.id === folder.folder_id && item.type === 'folder') ? 'ring-2 ring-primary border-primary' : 'border-border'}`}
                            onClick={() => navigateToFolder(folder.folder_id, folder.name)}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 truncate">
                                {selectionMode && (<Checkbox id={`select-folder-${folder.folder_id}`} checked={selectedItems.some(item => item.id === folder.folder_id && item.type === 'folder')} onCheckedChange={() => toggleSelectItem({ id: folder.folder_id, name: folder.name, type: 'folder' })} onClick={(e) => e.stopPropagation()} aria-label={`Select folder ${folder.name}`} />)}
                                <FolderIcon className="h-6 w-6 text-yellow-500 flex-shrink-0" /> <span className="text-sm font-medium truncate" title={folder.name}>{folder.name}</span>
                              </div>
                              <DropdownMenu><DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0"> <MoreHorizontal className="h-4 w-4" /> </Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteItem(folder.folder_id, 'folder'); }} className="text-destructive"><Trash className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                  {filteredFiles.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">Files</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {filteredFiles.map(file => (
                          <Card key={file.file_id} className={`p-3 transition-all hover:shadow-md cursor-pointer ${selectedItems.some(item => item.id === file.file_id && item.type === 'file') ? 'ring-2 ring-primary border-primary' : 'border-border'}`}
                            onClick={() => { if (selectionMode) { toggleSelectItem({ id: file.file_id, name: file.name, type: 'file', url: file.url, size: file.size }); } else if (file.url) { window.open(file.url, '_blank'); } }}>
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-2 truncate">
                                {selectionMode && (<Checkbox id={`select-file-${file.file_id}`} checked={selectedItems.some(item => item.id === file.file_id && item.type === 'file')} onCheckedChange={() => toggleSelectItem({ id: file.file_id, name: file.name, type: 'file', url: file.url, size: file.size })} onClick={(e) => e.stopPropagation()} aria-label={`Select file ${file.name}`} />)}
                                <FileIcon className="h-6 w-6 text-blue-500 flex-shrink-0" /> <span className="text-sm font-medium truncate" title={file.name}>{file.name}</span>
                              </div>
                              <DropdownMenu><DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0"> <MoreHorizontal className="h-4 w-4" /> </Button></DropdownMenuTrigger><DropdownMenuContent align="end">{file.url && <DropdownMenuItem onClick={(e) => {e.stopPropagation(); window.open(file.url!, '_blank');}}>Open</DropdownMenuItem>}<DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteItem(file.file_id, 'file'); }} className="text-destructive"><Trash className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                            </div>
                            {file.status === 'uploading' ? (<div className="mt-2"><Progress value={file.progress || 0} className="h-1 w-full" /><p className="text-xs text-muted-foreground mt-1">{file.progress}%</p></div>)
                             : file.status === 'error' ? (<p className="text-xs text-destructive mt-1">Upload failed</p>)
                             : (<p className="text-xs text-muted-foreground mt-1 truncate">{formatFileSize(file.size)}</p>)}
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </ScrollArea>
              )}
            </div>
          </TabsContent>

          <TabsContent value="vectorStore" className="mt-6">
             <div className="mb-6">
              <div className="flex justify-between items-center"><h3 className="text-lg font-medium">Vector Store Files</h3><Button variant="outline" size="sm" onClick={fetchVectorStoreFiles} disabled={isLoadingVectorFiles}>{isLoadingVectorFiles ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}Refresh List</Button></div>
              <p className="text-muted-foreground text-sm mt-1">Files synced with your class AI knowledge base.</p>
            </div>
            {isLoadingVectorFiles ? (<div className="flex flex-col items-center justify-center h-full py-10"><Loader2 className="h-10 w-10 text-primary animate-spin mb-4" /><p className="text-muted-foreground">Loading Vector Store files...</p></div>
            ) : vectorStoreFiles.length === 0 ? (<div className="flex flex-col items-center justify-center h-full text-center py-10"><CloudLightning className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" /><h3 className="text-lg font-medium">Vector Store is Empty</h3><p className="text-muted-foreground mb-4">Upload files from "My Files" to populate the Vector Store for this class.</p><Button onClick={() => setActiveTab("myFiles")}>Go to My Files</Button></div>
            ) : (
              <ScrollArea className="h-[400px] sm:h-[500px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {vectorStoreFiles.map((file) => (
                    <Card key={file.id} className="p-3">
                      <div className="flex items-center gap-2 mb-2"><FileIcon className="h-6 w-6 text-indigo-500 flex-shrink-0" /> <span className="text-sm font-medium truncate" title={file.filename || file.id}>{file.filename || file.id}</span></div>
                      <p className="text-xs text-muted-foreground">Size: {formatFileSize(file.usage_bytes || file.size || 0)}</p>
                      <p className="text-xs text-muted-foreground">Status: <Badge variant={file.status === 'completed' ? 'default' : 'secondary'} className={file.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>{file.status}</Badge></p>
                      <p className="text-xs text-muted-foreground">Added: {new Date(file.created_at * 1000).toLocaleDateString()}</p>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent><DialogHeaderComponent><DialogTitleComponent>Upload Files</DialogTitleComponent><DialogDescriptionComponent>Select files to upload to the current folder.</DialogDescriptionComponent></DialogHeaderComponent><input type="file" id="file_upload_input" multiple onChange={(e) => e.target.files && handleFileUpload(e.target.files)} className="my-4 p-2 border rounded-md w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/><DialogFooter><Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>Close</Button></DialogFooter></DialogContent>
      </Dialog>
      <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
        <DialogContent><DialogHeaderComponent><DialogTitleComponent>Create New Folder</DialogTitleComponent><DialogDescriptionComponent>Enter a name for your new folder.</DialogDescriptionComponent></DialogHeaderComponent><Input placeholder="Folder Name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} autoFocus className="my-4"/><DialogFooter><Button variant="outline" onClick={() => setIsNewFolderDialogOpen(false)}>Cancel</Button><Button onClick={createNewFolder}>Create Folder</Button></DialogFooter></DialogContent>
      </Dialog>
      <Dialog open={isVectorUploadDialogOpen} onOpenChange={setIsVectorUploadDialogOpen}>
        <DialogContent><DialogHeaderComponent><DialogTitleComponent>Push to Vector Store</DialogTitleComponent><DialogDescriptionComponent>Confirm uploading {selectedItems.filter(item => item.type === 'file').length} selected file(s) to the AI knowledge base.</DialogDescriptionComponent></DialogHeaderComponent>
          {isUploadingToVectorStore ? (<div className="py-6 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" /><p>Uploading... {vectorStoreUploadProgress}%</p></div>
          ) : (<ScrollArea className="max-h-60 my-4"><ul className="space-y-1">{selectedItems.filter(item => item.type === 'file').map(file => (<li key={file.id} className="text-sm p-1 border-b truncate">{file.name}</li>))}</ul></ScrollArea>)}
          <DialogFooter><Button variant="outline" onClick={() => setIsVectorUploadDialogOpen(false)} disabled={isUploadingToVectorStore}>Cancel</Button><Button onClick={confirmVectorUpload} disabled={isUploadingToVectorStore}>{isUploadingToVectorStore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowUp className="h-4 w-4 mr-2" />}Confirm Upload</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DatabasePage;
