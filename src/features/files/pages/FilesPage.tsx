// src/features/files/pages/FilesPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, FolderPlus, Upload, File as FileIcon, Folder as FolderIcon,
  MoreHorizontal, Trash2 as TrashIcon, ArrowUp, Loader2, ChevronRight, CloudLightning, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription as DialogDescriptionComponent, 
  DialogFooter, DialogHeader as DialogHeaderComponent, DialogTitle as DialogTitleComponent,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription, 
  AlertDialogFooter,    
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, BreadcrumbPage
} from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import {
  FileType as FileTypeDb,
  FolderType as FolderTypeDb,
  SelectedItem, UserStorage as UserStorageType, VectorStoreFileType
} from "@/features/files/types";
import { StorageUsage } from "../components/StorageUsage";
import { UploadDialog } from "../components/UploadDialog";
import type { User } from "@supabase/supabase-js";
import { formatFileSize } from "@/lib/utils";
import type { OpenAIConfig } from "@/services/classOpenAIConfig";
import { FileGrid } from "../components/FileGrid"; 
import { cn } from "@/lib/utils"; 

interface ActiveClassData {
  class_id: string;
  title: string;
  openAIConfig?: OpenAIConfig;
}

interface FileWithProgress extends FileTypeDb {
  progress?: number;
}

const FilesPage = () => {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [folders, setFolders] = useState<FolderTypeDb[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userStorage, setUserStorage] = useState<UserStorageType | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "Main" }]);
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
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState<{ id: string; name: string; type: 'file' | 'folder' }[]>([]);


  useEffect(() => {
    const initializePage = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (!currentUser) {
        toast({ title: "Authentication Required", description: "Please sign in.", variant: "destructive" });
        navigate("/auth");
        return;
      }

      const activeClassDataString = sessionStorage.getItem('activeClass');
      if (activeClassDataString) {
        try {
          const parsedClass: ActiveClassData = JSON.parse(activeClassDataString);
          setActiveClass(parsedClass);
        }
        catch (e) {
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
        const { data, error } = await supabase.from('user_storage').select('*').eq('user_id', user.id).single();
        if (error && error.code !== 'PGRST116') throw error;
        if (data) {
          setUserStorage(data as UserStorageType);
        } else if (user) {
          const { data: newStorage, error: insertError } = await supabase
            .from('user_storage')
            .insert({ user_id: user.id, storage_used: 0, storage_limit: 1024 * 1024 * 1024 }) 
            .select()
            .single();
          if (insertError) throw insertError;
          if (newStorage) setUserStorage(newStorage as UserStorageType);
        }
      } catch (err) {
        let message = "Could not load storage info.";
        if (err instanceof Error) message = err.message;
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
      if (currentFolderId === null) {
        folderQuery = folderQuery.is('parent_id', null);
      } else {
        folderQuery = folderQuery.eq('parent_id', currentFolderId);
      }
      const { data: folderData, error: folderError } = await folderQuery;
      if (folderError) throw folderError;
      setFolders((folderData || []) as FolderTypeDb[]);

      let fileQuery = supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .eq('class_id', activeClass.class_id);
      if (currentFolderId === null) {
        fileQuery = fileQuery.is('folder_id', null);
      } else {
        fileQuery = fileQuery.eq('folder_id', currentFolderId);
      }
      const { data: fileData, error: fileError } = await fileQuery;
      if (fileError) throw fileError;
      setFiles((fileData || []).map(f => ({ ...f, status: f.status || 'complete', progress: (f.status === 'complete' ? 100 : 0) })) as FileWithProgress[]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error loading files.";
      toast({ title: "Error Loading Files", description: message, variant: "destructive" });
      setFiles([]); setFolders([]);
    } finally {
      setLoading(false);
    }
  }, [user, activeClass?.class_id, currentFolderId, toast]);

  useEffect(() => {
    if(activeClass?.class_id) {
        fetchCurrentFolderContents();
    }
  }, [fetchCurrentFolderContents, activeClass?.class_id, currentFolderId]);

  const fetchVectorStoreFiles = useCallback(async () => {
    if (!user || !activeClass?.class_id) {
      setVectorStoreFiles([]);
      return;
    }
    setIsLoadingVectorFiles(true);
    try {
        const { data: indexedFiles, error } = await supabase
            .from('files')
            .select('*')
            .eq('user_id', user.id)
            .eq('class_id', activeClass.class_id)
            .not('document_title', 'is', null);

        if (error) throw error;
        
        const mappedFiles: VectorStoreFileType[] = (indexedFiles || []).map(file => ({
            id: file.file_id,
            filename: file.name,
            document_title: file.document_title,
            usage_bytes: file.size,
            created_at: new Date(file.created_at).getTime() / 1000,
            status: 'completed',
            object: "vector_store.file",
            vector_store_id: "weaviate_global_store",
            last_error: null,
        }));

        setVectorStoreFiles(mappedFiles);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error.";
        toast({ title: "Vector Store Error", description: `Failed to fetch files: ${message}`, variant: "destructive" });
        setVectorStoreFiles([]);
    } finally {
        setIsLoadingVectorFiles(false);
    }
  }, [user, activeClass, toast]);

  useEffect(() => { if (activeTab === "vectorStore") { fetchVectorStoreFiles(); } }, [activeTab, fetchVectorStoreFiles]);

  const toggleSelectItem = (item: SelectedItem) => {
    if (item.type === 'folder') {
      toast({
        title: "Selection Info",
        description: "Folders cannot be selected for this operation. Please select files.",
        variant: "default",
      });
      return;
    }
    setSelectedItems(prevItems =>
      prevItems.some(i => i.id === item.id && i.type === item.type)
        ? prevItems.filter(i => !(i.id === item.id && i.type === item.type))
        : [...prevItems, item]
    );
  };


  const navigateToFolder = (folderId: string | null, folderName: string) => {
    setCurrentFolderId(folderId);
    if (folderId === null) {
      setBreadcrumbs([{ id: null, name: "Main" }]);
    } else {
      const currentBreadcrumbs = [...breadcrumbs];
      const existingIndex = currentBreadcrumbs.findIndex(b => b.id === folderId);
      if (existingIndex !== -1) {
        setBreadcrumbs(currentBreadcrumbs.slice(0, existingIndex + 1));
      } else {
        setBreadcrumbs([...currentBreadcrumbs, { id: folderId, name: folderName }]);
      }
    }
    setSelectionMode(false);
    setSelectedItems([]);
  };

  const handleFileUpload = async (uploadedFiles: FileList) => {
    if (!user || !activeClass?.class_id) {
      toast({ title: "Upload Failed", description: "Missing user or class information.", variant: "destructive" });
      return;
    }
    const now = new Date().toISOString();
    const tempFileEntries: FileWithProgress[] = Array.from(uploadedFiles).map((file, index) => ({
      file_id: `temp-${Date.now()}-${index}`, name: file.name, size: file.size, type: file.type,
      folder_id: currentFolderId, user_id: user.id, class_id: activeClass.class_id,
      last_modified: now, created_at: now, status: 'uploading', progress: 0,
      url: null, category: null, tags: null, database_id: null, openai_file_id: null, document_title: null,
    }));
    setFiles(prev => [...prev, ...tempFileEntries]);

    let totalStorageNeeded = 0;
    Array.from(uploadedFiles).forEach(file => totalStorageNeeded += file.size);
    if (userStorage && (userStorage.storage_used + totalStorageNeeded > userStorage.storage_limit)) {
      toast({
        title: "Storage Limit Exceeded",
        description: "Cannot upload files, you have insufficient storage space.",
        variant: "destructive",
      });
      setFiles(prev => prev.filter(f => !tempFileEntries.find(tf => tf.file_id === f.file_id)));
      return;
    }

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const tempFileId = tempFileEntries[i].file_id;
      try {
        setFiles(prev => prev.map(f => f.file_id === tempFileId ? { ...f, progress: 10 } : f));
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `public/${user.id}/${activeClass.class_id}/${currentFolderId || 'root'}/${Date.now()}_${sanitizedName}`;
        const { data: storageData, error: uploadError } = await supabase.storage.from('file_storage').upload(filePath, file, { cacheControl: '3600', upsert: false });
        if (uploadError) throw uploadError;
        setFiles(prev => prev.map(f => f.file_id === tempFileId ? { ...f, progress: 50 } : f));

        const { data: urlData } = supabase.storage.from('file_storage').getPublicUrl(storageData.path);
        if (!urlData.publicUrl) throw new Error("Failed to get public URL for uploaded file.");
        setFiles(prev => prev.map(f => f.file_id === tempFileId ? { ...f, progress: 75, url: urlData.publicUrl } : f));

        const fileToInsert: Omit<FileTypeDb, 'file_id' | 'created_at' | 'last_modified'> & { created_at?: string, last_modified?: string } = {
          name: file.name, size: file.size, type: file.type, url: urlData.publicUrl,
          folder_id: currentFolderId, user_id: user.id, class_id: activeClass.class_id,
          status: 'complete', category: null, tags: null, database_id: null,
          openai_file_id: null, document_title: file.name,
        };
        const { data: dbFile, error: insertError } = await supabase.from('files').insert(fileToInsert).select().single();
        if (insertError) throw insertError;
        setFiles(prev => prev.map(f => f.file_id === tempFileId ? { ...(dbFile as FileTypeDb), progress: 100 } : f).filter(f => f.file_id !== tempFileId || f.progress === 100));
        if (userStorage) {
          const newStorageUsed = userStorage.storage_used + file.size;
          setUserStorage(prev => ({ ...prev!, storage_used: newStorageUsed }));
          await supabase.from('user_storage').update({ storage_used: newStorageUsed }).eq('user_id', user.id);
        }
        toast({ title: "File Uploaded", description: `${file.name} uploaded successfully.` });
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        setFiles(prev => prev.map(f => f.file_id === tempFileId ? { ...f, status: 'error', progress: 0 } : f));
        toast({ title: `Failed to upload ${file.name}`, description: error instanceof Error ? error.message : "Unknown error.", variant: "destructive" });
      }
    }
    fetchCurrentFolderContents();
  };

  const createNewFolder = async () => {
    if (!user || !activeClass?.class_id || !newFolderName.trim()) {
      toast({ title: "Error", description: "Folder name, user, or class information is missing.", variant: "destructive" });
      return;
    }
    try {
      const { data, error } = await supabase
        .from('file_folders')
        .insert({
          name: newFolderName.trim(),
          parent_id: currentFolderId,
          user_id: user.id,
          class_id: activeClass.class_id,
        })
        .select()
        .single();
      if (error) throw error;
      setFolders(prev => [...prev, data as FolderTypeDb]);
      setIsNewFolderDialogOpen(false);
      setNewFolderName('');
      toast({ title: "Folder Created", description: `"${data.name}" has been created.` });
    } catch (error) {
      console.error("Error creating folder:", error);
      toast({ title: "Failed to Create Folder", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    }
  };

  const handleDeleteItem = (itemId: string, itemType: 'file' | 'folder', itemName: string) => {
    setItemsToDelete([{ id: itemId, name: itemName, type: itemType }]);
    setShowDeleteConfirmDialog(true);
  };

  const confirmDeleteItems = async () => {
    if (!user) return;
    setShowDeleteConfirmDialog(false);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const item of itemsToDelete) {
        try {
            if (item.type === 'folder') {
                const { error } = await supabase.from('file_folders').delete().eq('folder_id', item.id).eq('user_id', user.id);
                if (error) throw error;
            } else {
                const fileToDelete = files.find(f => f.file_id === item.id) || selectedItems.find(f => f.id === item.id);
                if (fileToDelete?.url) {
                    const filePathParts = fileToDelete.url.split('/');
                    const storagePath = filePathParts.slice(filePathParts.indexOf('public')).join('/');
                    await supabase.storage.from('file_storage').remove([storagePath]);
                }
                const { error } = await supabase.from('files').delete().eq('file_id', item.id).eq('user_id', user.id);
                if (error) throw error;
                if (fileToDelete && userStorage) {
                    const newStorageUsed = Math.max(0, userStorage.storage_used - (fileToDelete.size || 0));
                    setUserStorage(prev => ({ ...prev!, storage_used: newStorageUsed }));
                    await supabase.from('user_storage').update({ storage_used: newStorageUsed }).eq('user_id', user.id);
                }
            }
            successCount++;
        } catch (error) {
            failCount++;
            console.error(`Failed to delete ${item.type} ${item.name}:`, error);
        }
    }
    
    if (successCount > 0) toast({ title: "Items Deleted", description: `${successCount} item(s) successfully deleted.` });
    if (failCount > 0) toast({ title: "Deletion Error", description: `${failCount} item(s) could not be deleted.`, variant: "destructive" });
    
    setSelectedItems([]);
    setItemsToDelete([]);
    fetchCurrentFolderContents();
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
     e.preventDefault();
     setDragging(false);
     if (!user) {
       toast({ title: "Authentication Required", description: "Please sign in to upload files.", variant: "destructive" });
       return;
     }
     if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
       handleFileUpload(e.dataTransfer.files);
     }
  };

  const pushToVectorStore = () => {
    const filesToUpload = selectedItems.filter(item => item.type === 'file' && item.url);
    if (filesToUpload.length === 0) {
      toast({ title: "No Files Selected", description: "Please select one or more files to sync with the AI.", variant: "default" });
      return;
    }
    setIsVectorUploadDialogOpen(true);
  };
  
  const confirmVectorUpload = async () => {
    if (!user || !activeClass?.class_id) {
      toast({ title: "Sync Error", description: "Missing user or class information.", variant: "destructive" });
      setIsVectorUploadDialogOpen(false);
      return;
    }

    const filesToUpload = selectedItems.filter(item => item.type === 'file' && item.url);
    if (filesToUpload.length === 0) {
      toast({ title: "No Files to Upload", description: "Please select valid files with URLs.", variant: "default" });
      setIsVectorUploadDialogOpen(false);
      return;
    }

    setIsUploadingToVectorStore(true);
    setVectorStoreUploadProgress(10); 

    try {
      const payloadFiles = filesToUpload.map(f => ({
        file_id: f.id,
        folder_id: currentFolderId,
        name: f.name,
        url: f.url!,
        size: f.size,
        type: f.fileMimeType!,
      }));

      const { data, error } = await supabase.functions.invoke('upload-to-vector-store', {
        body: {
          files: payloadFiles,
          class_id: activeClass.class_id
        },
      });

      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.message || 'One or more files failed to process during sync.');
      }
      
      setVectorStoreUploadProgress(100);
      toast({ title: "AI Sync Complete", description: data.message || `${filesToUpload.length} file(s) have been processed.` });
      
      if (activeTab === "vectorStore") {
        fetchVectorStoreFiles();
      }

    } catch (error) {
      console.error("Error syncing files with Weaviate:", error);
      toast({ title: "AI Sync Failed", description: error instanceof Error ? error.message : "An unknown error occurred.", variant: "destructive" });
    } finally {
      setIsUploadingToVectorStore(false);
      setIsVectorUploadDialogOpen(false);
      setSelectionMode(false);
      setSelectedItems([]);
      setVectorStoreUploadProgress(0);
    }
  };

  const filteredFolders = folders.filter(folder => folder.name && folder.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredFiles = files.filter(file => file.name && file.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const selectedFileCount = selectedItems.filter(item => item.type === 'file').length;

  if (!user || !activeClass) {
    return (<div className="flex flex-col items-center justify-center min-h-screen p-4"> <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /> <p className="text-muted-foreground">Loading class information...</p> </div>);
  }

  return (
    <div className="space-y-6">
        <div className="bg-card p-4 sm:p-6 rounded-xl shadow-sm border">
            <div className="mb-6 space-y-4">
                <div className="relative"> <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" /> <Input type="search" placeholder="Search files and folders..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /> </div>
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
                        <Button onClick={pushToVectorStore} disabled={selectedFileCount === 0 || isUploadingToVectorStore}>
                            {isUploadingToVectorStore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4 mr-2" />} 
                            Sync with AI ({selectedFileCount})
                        </Button>
                        <Button variant="destructive" onClick={() => handleDeleteItem(selectedItems.map(i=>i.id).join(), 'file', `${selectedItems.length} files`)} disabled={selectedFileCount === 0}>
                            <TrashIcon className="h-4 w-4 mr-2" /> Delete Selected ({selectedFileCount})
                        </Button>
                        <Button variant="outline" onClick={() => { setSelectionMode(false); setSelectedItems([]); }}> Cancel Selection </Button>
                        </>
                    )}
                    </div>
                    <Breadcrumb className="mb-4">
                        <BreadcrumbList>
                            {breadcrumbs.map((crumb, index) => (
                            <div key={crumb.id || 'root-crumb'}> 
                                <BreadcrumbItem>
                                {index === breadcrumbs.length - 1 ? (<BreadcrumbPage>{crumb.name}</BreadcrumbPage>) : (<BreadcrumbLink href="#" onClick={(e) => { e.preventDefault(); navigateToFolder(crumb.id, crumb.name); }} className="cursor-pointer hover:text-primary">{crumb.name}</BreadcrumbLink>)}
                                </BreadcrumbItem>
                                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                            </div>
                            ))}
                        </BreadcrumbList>
                    </Breadcrumb>
                    <div className={`min-h-[300px] border-2 border-dashed rounded-lg p-4 ${dragging ? "border-primary bg-primary/10" : "border-input"}`}
                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleFileDrop}>
                        <FileGrid files={filteredFiles} folders={filteredFolders} loading={loading} selectionMode={selectionMode} selectedItems={selectedItems}
                            onFileSelect={(file) => setSelectedItems(prev => prev.some(i => i.id === file.file_id) ? prev.filter(i => i.id !== file.file_id) : [...prev, { id: file.file_id, name: file.name, type: 'file', url: file.url, size: file.size, fileMimeType: file.type }])}
                            onFolderClick={(folder) => navigateToFolder(folder.folder_id, folder.name)}
                            onDeleteItem={handleDeleteItem}
                            onFileOpen={(url) => window.open(url, "_blank")} currentFolderId={currentFolderId} />
                    </div>
                </TabsContent>
                <TabsContent value="vectorStore" className="mt-6">
                    <div className="mb-6">
                    <div className="flex justify-between items-center"><h3 className="text-lg font-medium">Indexed Files</h3><Button variant="outline" size="sm" onClick={fetchVectorStoreFiles} disabled={isLoadingVectorFiles}>{isLoadingVectorFiles ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Refresh List</Button></div>
                    <div className="text-muted-foreground text-sm mt-1">Files indexed in Weaviate are available to your AI assistants.</div>
                    </div>
                    {isLoadingVectorFiles ?
                    (<div className="flex flex-col items-center justify-center h-full py-10"><Loader2 className="h-10 w-10 text-primary animate-spin mb-4" /><p className="text-muted-foreground">Loading indexed files...</p></div>) :
                    vectorStoreFiles.length === 0 ?
                        (<div className="flex flex-col items-center justify-center h-full text-center py-10"><CloudLightning className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" /><h3 className="text-lg font-medium">No Files Indexed for this Class</h3><p className="text-muted-foreground mb-4">Select files from the "My Files" tab and sync them with the AI.</p><Button onClick={() => { setActiveTab("myFiles"); setSelectionMode(true); }}>Select Files to Sync</Button></div>) :
                        (<ScrollArea className="h-[400px] sm:h-[500px]">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {vectorStoreFiles.map((file) => (
                            <Card key={file.id} className="p-3">
                                <div className="flex items-center gap-2 mb-2"><FileIcon className="h-6 w-6 text-indigo-500 flex-shrink-0" /> <span className="text-sm font-medium truncate" title={file.filename}>{file.filename}</span></div>
                                <div className="text-xs text-muted-foreground">Size: {formatFileSize(file.usage_bytes || 0)}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <span>Status:</span>
                                    <Badge variant={file.status === 'completed' ? 'default' : 'secondary'} className={file.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>{file.status}</Badge>
                                </div>
                            </Card>))}
                        </div>
                        </ScrollArea>)}
                </TabsContent>
            </Tabs>
        </div>
        <UploadDialog isOpen={isUploadDialogOpen} onClose={() => setIsUploadDialogOpen(false)} onFileSelect={handleFileUpload} />
        <Dialog open={isNewFolderDialogOpen} onOpenChange={(open) => { setIsNewFolderDialogOpen(open); if (!open) setNewFolderName(''); }}>
            <DialogContent>
                <DialogHeaderComponent><DialogTitleComponent>Create New Folder</DialogTitleComponent><DialogDescriptionComponent>Enter a name for your new folder.</DialogDescriptionComponent></DialogHeaderComponent>
                <Input placeholder="Folder Name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} autoFocus className="my-4" />
                <DialogFooter>
                    <Button variant="outline" onClick={() => { setIsNewFolderDialogOpen(false); setNewFolderName(''); }}>Cancel</Button>
                    <Button onClick={createNewFolder}>Create Folder</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        <Dialog open={isVectorUploadDialogOpen} onOpenChange={setIsVectorUploadDialogOpen}>
            <DialogContent>
                <DialogHeaderComponent><DialogTitleComponent>Sync with AI</DialogTitleComponent><DialogDescriptionComponent>Confirm syncing {selectedFileCount} file(s) with your AI knowledge base.</DialogDescriptionComponent></DialogHeaderComponent>
                {isUploadingToVectorStore ?
                    (<div className="py-6 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" /><p>Processing & Indexing... {vectorStoreUploadProgress}%</p></div>) :
                    (<ScrollArea className="max-h-60 my-4"><ul className="space-y-1">{selectedItems.map(file => (<li key={file.id} className="text-sm p-1 border-b truncate">{file.name}</li>))}</ul></ScrollArea>)}
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsVectorUploadDialogOpen(false)} disabled={isUploadingToVectorStore}>Cancel</Button>
                    <Button onClick={confirmVectorUpload} disabled={isUploadingToVectorStore || selectedFileCount === 0}>
                        {isUploadingToVectorStore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowUp className="h-4 w-4 mr-2" />}
                        Confirm & Sync
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                    <AlertDialogDescription>
                    Are you sure you want to delete {itemsToDelete.length} item(s)? This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => { setShowDeleteConfirmDialog(false); setItemsToDelete([]); }}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDeleteItems} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
};

export default FilesPage;
