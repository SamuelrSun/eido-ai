// src/pages/DatabasePage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, FolderPlus, Upload, File as FileIcon, Folder as FolderIcon,
  MoreHorizontal, Trash, ArrowUp, Loader2, ChevronRight, CloudLightning, Check
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
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Dialog, DialogContent, DialogDescription as DialogDescriptionComponent,
  DialogFooter, DialogHeader as DialogHeaderComponent, DialogTitle as DialogTitleComponent,
} from "@/components/ui/dialog";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, BreadcrumbPage
} from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import {
  FileType, FolderType, SelectedItem, UserStorage as UserStorageType, VectorStoreFileType
} from "@/features/files/types";
import { StorageUsage } from "@/features/files/components/StorageUsage";
import { UploadDialog } from "@/features/files/components/UploadDialog";
import type { User } from "@supabase/supabase-js";
import { formatFileSize } from "@/lib/utils";
import type { OpenAIConfig } from "@/services/classOpenAIConfig";

interface ActiveClassData {
  class_id: string;
  title: string;
  openAIConfig?: OpenAIConfig;
}

// Temporary type for UI state if you want to show progress
interface FileWithProgress extends FileType {
  progress?: number;
}

const DatabasePage = () => {
  // Use FileWithProgress for the local state if you intend to show progress bars
  const [files, setFiles] = useState<FileWithProgress[]>([]); 
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userStorage, setUserStorage] = useState<UserStorageType>({
    user_id: '', storage_used: 0, storage_limit: 1024 * 1024 * 1024
  });
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

  useEffect(() => {
    console.log("DatabasePage: Initializing page...");
    const initializePage = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user || null;
      console.log("DatabasePage: Current user session:", currentUser?.id);
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
          console.log("DatabasePage: Active class loaded from session:", parsedClass);
          setActiveClass(parsedClass);
        }
        catch (e) {
          console.error("DatabasePage: Error parsing activeClass from sessionStorage:", e);
          toast({ title: "Error", description: "Could not load class data. Please re-select from Home.", variant: "destructive" });
          navigate("/");
        }
      } else {
        console.log("DatabasePage: No active class in session. Redirecting.");
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
        if (data) setUserStorage(data as UserStorageType);
        else if (!data && user) {
            const { data: newStorage, error: insertError } = await supabase.from('user_storage').insert({ user_id: user.id, storage_used: 0, storage_limit: 1024 * 1024 * 1024 }).select().single();
            if(insertError) throw insertError;
            if(newStorage) setUserStorage(newStorage as UserStorageType);
        }
      } catch (err) { 
        let message = "Could not load storage info.";
        if (err instanceof Error) {
            message = err.message;
        }
        toast({ title: "Storage Error", description: message, variant: "destructive" });
      }
    };
    if (user) fetchUserStorage();
  }, [user, toast]);

  const fetchCurrentFolderContents = useCallback(async () => {
    console.log("fetchCurrentFolderContents: Called. User:", user?.id, "ActiveClass:", activeClass?.class_id, "CurrentFolderId:", currentFolderId);
    if (!user || !activeClass?.class_id) {
      console.log("fetchCurrentFolderContents: Aborting - no user or activeClass.class_id.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let folderQuery = supabase.from('file_folders').select('*').eq('user_id', user.id).eq('class_id', activeClass.class_id);
      folderQuery = currentFolderId === null ? folderQuery.is('parent_id', null) : folderQuery.eq('parent_id', currentFolderId);
      const { data: folderData, error: folderError } = await folderQuery;
      if (folderError) throw folderError;
      setFolders((folderData || []) as FolderType[]);

      let fileQuery = supabase.from('files').select('*').eq('user_id', user.id).eq('class_id', activeClass.class_id);
      fileQuery = currentFolderId === null ? fileQuery.is('folder_id', null) : fileQuery.eq('folder_id', currentFolderId);
      const { data: fileData, error: fileError } = await fileQuery;
      if (fileError) throw fileError;
      setFiles((fileData || []).map(f => ({ ...f, status: f.status || 'complete', progress: (f.status === 'complete' ? 100 : 0) })) as FileWithProgress[]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error loading files.";
      console.error("Error fetching folder contents:", error);
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
  }, [fetchCurrentFolderContents, activeClass?.class_id]);

  const fetchVectorStoreFiles = useCallback(async () => { /* ... */ }, [user, activeClass?.openAIConfig?.vectorStoreId, activeClass?.class_id, toast, activeTab]);
  useEffect(() => { if (activeTab === "vectorStore") { fetchVectorStoreFiles(); } }, [activeTab, fetchVectorStoreFiles]);
  const toggleSelectItem = (item: SelectedItem) => { /* ... */ };
  const navigateToFolder = (folderId: string | null, folderName: string) => { /* ... */ };

  const handleFileUpload = async (uploadedFiles: FileList) => {
    if (!user || !activeClass?.class_id) {
      toast({ title: "Upload Failed", description: "Missing user or class information.", variant: "destructive" });
      return;
    }

    const now = new Date().toISOString();
    // Create an array of temporary file objects for UI display during upload
    const tempFileEntries: FileWithProgress[] = Array.from(uploadedFiles).map((file, index) => ({
      file_id: `temp-${Date.now()}-${index}`, // Temporary ID
      name: file.name,
      size: file.size,
      type: file.type,
      folder_id: currentFolderId,
      user_id: user.id,
      class_id: activeClass.class_id,
      last_modified: now,
      created_at: now,
      status: 'uploading',
      progress: 0, // Initial progress
      // Nullable fields from FileType
      url: null,
      category: null,
      tags: null,
      database_id: null,
      openai_file_id: null,
      document_title: null,
    }));

    // Add temporary entries to the UI
    setFiles(prev => [...prev, ...tempFileEntries]);

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const tempFileId = tempFileEntries[i].file_id;

      try {
        // Update progress for UI
        setFiles(prev => prev.map(f => f.file_id === tempFileId ? { ...f, progress: 10 } : f));

        const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_'); // Sanitize for safety
        const filePath = `public/${user.id}/${activeClass.class_id}/${currentFolderId || 'root'}/${Date.now()}_${sanitizedName}`;

        const { data: storageData, error: uploadError } = await supabase.storage
          .from('file_storage') // Make sure 'file_storage' is your bucket name
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false 
          });

        if (uploadError) throw uploadError;
        setFiles(prev => prev.map(f => f.file_id === tempFileId ? { ...f, progress: 50 } : f));

        const { data: urlData } = supabase.storage
          .from('file_storage')
          .getPublicUrl(storageData.path); // Use path from storageData

        if (!urlData.publicUrl) {
          throw new Error("Failed to get public URL for uploaded file.");
        }
        setFiles(prev => prev.map(f => f.file_id === tempFileId ? { ...f, progress: 75, url: urlData.publicUrl } : f));
        
        const fileToInsert: Omit<FileType, 'file_id' | 'created_at' | 'last_modified'> & { created_at?: string, last_modified?: string } = {
          name: file.name,
          size: file.size,
          type: file.type,
          url: urlData.publicUrl,
          folder_id: currentFolderId,
          user_id: user.id,
          class_id: activeClass.class_id,
          status: 'complete',
          category: null, // Or determine based on file.type
          tags: null,
          database_id: null, // If you have a separate DB concept
          openai_file_id: null,
          document_title: file.name, // Default to file name
        };

        const { data: dbFile, error: insertError } = await supabase
          .from('files')
          .insert(fileToInsert)
          .select()
          .single();

        if (insertError) throw insertError;

        // Replace temporary file with the actual data from DB
        setFiles(prev => prev.map(f => f.file_id === tempFileId ? { ...(dbFile as FileType), progress: 100 } : f));
        
        // Update user storage
        if (userStorage) {
          const newStorageUsed = userStorage.storage_used + file.size;
          setUserStorage(prev => ({...prev!, storage_used: newStorageUsed})); // Optimistic UI update
          await supabase
            .from('user_storage')
            .update({ storage_used: newStorageUsed })
            .eq('user_id', user.id);
        }
         toast({ title: "File Uploaded", description: `${file.name} uploaded successfully.` });

      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        setFiles(prev => prev.map(f => f.file_id === tempFileId ? { ...f, status: 'error', progress: 0 } : f));
        toast({
          title: `Failed to upload ${file.name}`,
          description: error instanceof Error ? error.message : "Unknown error.",
          variant: "destructive",
        });
      }
    }
    // Fetch contents again to ensure consistency, especially if some uploads failed
    fetchCurrentFolderContents(); 
  };
  
  const createNewFolder = async () => { /* ... */ };
  const deleteItem = async (itemId: string, itemType: 'file' | 'folder') => { /* ... */ };
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => { /* ... */ };
  const confirmVectorUpload = async () => { /* ... */ };

  const filteredFolders = folders.filter(folder =>
    folder.name && folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredFiles = files.filter(file =>
    file.name && file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user || !activeClass) { 
    return ( <div className="flex flex-col items-center justify-center min-h-screen p-4"> <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /> <p className="text-muted-foreground">Loading class information or redirecting...</p> </div> );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`Database: ${activeClass?.title || 'Loading...'}`} description="Store, organize, and sync files with your AI knowledge base." />
      <div className="bg-card p-4 sm:p-6 rounded-xl shadow-sm border">
        {/* ... (Search and StorageUsage JSX - no changes) ... */}
        <div className="mb-6 space-y-4">
          <div className="relative"> <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" /> <Input type="search" placeholder="Search files and folders..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /> </div>
          {userStorage && <StorageUsage storage={userStorage} />}
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2"> <TabsTrigger value="myFiles">My Files</TabsTrigger> <TabsTrigger value="vectorStore">Vector Store <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-700">AI</Badge></TabsTrigger> </TabsList>
          <TabsContent value="myFiles" className="mt-6">
            {/* ... (Buttons and Breadcrumb JSX - no changes) ... */}
            <div className="flex flex-wrap gap-2 mb-6 mt-4 items-center">
              {!selectionMode ? ( <> <Button onClick={() => setIsUploadDialogOpen(true)}> <Upload className="h-4 w-4 mr-2" /> Upload Files </Button> <Button variant="outline" onClick={() => setIsNewFolderDialogOpen(true)}> <FolderPlus className="h-4 w-4 mr-2" /> New Folder </Button> <Button variant="outline" onClick={() => setSelectionMode(true)} className="ml-auto"> <Check className="h-4 w-4 mr-2" /> Select Items </Button> </>
              ) : ( <> <Button onClick={() => setIsVectorUploadDialogOpen(true)} disabled={selectedItems.filter(item => item.type === 'file').length === 0}> <ArrowUp className="h-4 w-4 mr-2" /> Push to Vector Store ({selectedItems.filter(item => item.type === 'file').length}) </Button> <Button variant="outline" onClick={() => { setSelectionMode(false); setSelectedItems([]); }}> Cancel Selection </Button> </> )}
            </div>
            <Breadcrumb className="mb-4">
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.id || 'root-crumb'}>
                    <BreadcrumbItem>
                      {index === breadcrumbs.length - 1 ? (
                        <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            navigateToFolder(crumb.id, crumb.name);
                          }}
                          className="cursor-pointer hover:text-primary"
                        >
                          {crumb.name}
                        </BreadcrumbLink>
                      )}
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
              {loading ? ( <div className="flex flex-col items-center justify-center h-full py-10"><Loader2 className="h-10 w-10 text-primary animate-spin mb-4" /><p className="text-muted-foreground">Loading...</p></div> )
               : (filteredFolders.length === 0 && filteredFiles.length === 0) ? ( <div className="flex flex-col items-center justify-center h-full text-center py-10"><FolderPlus className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" /><h3 className="text-lg font-medium">This folder is empty</h3><p className="text-muted-foreground mb-4"> Drag and drop files here or use the upload button. </p></div> )
               : ( <ScrollArea className="h-[400px] sm:h-[500px]">
                    {filteredFolders.length > 0 && ( <div className="mb-6"> <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">Folders</h3> <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {filteredFolders.map(folder => ( <Card key={folder.folder_id} className={`p-3 transition-all hover:shadow-md cursor-pointer ${selectedItems.some(item => item.id === folder.folder_id && item.type === 'folder') ? 'ring-2 ring-primary border-primary' : 'border-border'}`} onClick={() => navigateToFolder(folder.folder_id, folder.name)}> <div className="flex items-center justify-between"> <div className="flex items-center gap-2 truncate"> {selectionMode && (<Checkbox id={`select-folder-${folder.folder_id}`} checked={selectedItems.some(item => item.id === folder.folder_id && item.type === 'folder')} onCheckedChange={() => toggleSelectItem({ id: folder.folder_id, name: folder.name, type: 'folder' })} onClick={(e) => e.stopPropagation()} aria-label={`Select folder ${folder.name}`} />)} <FolderIcon className="h-6 w-6 text-yellow-500 flex-shrink-0" /> <span className="text-sm font-medium truncate" title={folder.name}>{folder.name}</span> </div> <DropdownMenu><DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0"> <MoreHorizontal className="h-4 w-4" /> </Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteItem(folder.folder_id, 'folder'); }} className="text-destructive"><Trash className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu> </div> </Card> ))}
                    </div> </div> )}
                    {filteredFiles.length > 0 && ( <div> <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">Files</h3> <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {filteredFiles.map(file => ( <Card key={file.file_id} className={`p-3 transition-all hover:shadow-md cursor-pointer ${selectedItems.some(item => item.id === file.file_id && item.type === 'file') ? 'ring-2 ring-primary border-primary' : 'border-border'}`} onClick={() => { if (selectionMode) { toggleSelectItem({ id: file.file_id, name: file.name, type: 'file', url: file.url, size: file.size }); } else if (file.url) { window.open(file.url, '_blank'); } }}> <div className="flex items-center justify-between"> <div className="flex items-center gap-2 truncate"> {selectionMode && (<Checkbox id={`select-file-${file.file_id}`} checked={selectedItems.some(item => item.id === file.file_id && item.type === 'file')} onCheckedChange={() => toggleSelectItem({ id: file.file_id, name: file.name, type: 'file', url: file.url, size: file.size })} onClick={(e) => e.stopPropagation()} aria-label={`Select file ${file.name}`} />)} <FileIcon className="h-6 w-6 text-blue-500 flex-shrink-0" /> <span className="text-sm font-medium truncate" title={file.name}>{file.name}</span> </div> <DropdownMenu><DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0"> <MoreHorizontal className="h-4 w-4" /> </Button></DropdownMenuTrigger><DropdownMenuContent align="end">{file.url && <DropdownMenuItem onClick={(e) => {e.stopPropagation(); window.open(file.url!, '_blank');}}>Open</DropdownMenuItem>}<DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteItem(file.file_id, 'file'); }} className="text-destructive"><Trash className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu> </div> 
                        {file.status === 'uploading' && file.progress !== undefined ? (<div className="mt-2"><Progress value={file.progress || 0} className="h-1 w-full" /><p className="text-xs text-muted-foreground mt-1">{file.progress || 0}%</p></div>) 
                        : file.status === 'error' ? (<p className="text-xs text-destructive mt-1">Upload failed</p>) 
                        : (<p className="text-xs text-muted-foreground mt-1 truncate">{formatFileSize(file.size)}</p>)} </Card> ))}
                    </div> </div> )}
                  </ScrollArea>
              )}
            </div>
          </TabsContent>
          <TabsContent value="vectorStore" className="mt-6">
            {/* ... (Vector Store Tab Content) ... */}
          </TabsContent>
        </Tabs>
      </div>
      <UploadDialog
        isOpen={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
        onFileSelect={handleFileUpload}
      />
      {/* ... (Other Dialogs: NewFolderDialog, VectorStoreUploadDialog) ... */}
      <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}> <DialogContent><DialogHeaderComponent><DialogTitleComponent>Create New Folder</DialogTitleComponent><DialogDescriptionComponent>Enter a name for your new folder.</DialogDescriptionComponent></DialogHeaderComponent><Input placeholder="Folder Name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} autoFocus className="my-4"/><DialogFooter><Button variant="outline" onClick={() => setIsNewFolderDialogOpen(false)}>Cancel</Button><Button onClick={createNewFolder}>Create Folder</Button></DialogFooter></DialogContent> </Dialog>
      <Dialog open={isVectorUploadDialogOpen} onOpenChange={setIsVectorUploadDialogOpen}> <DialogContent><DialogHeaderComponent><DialogTitleComponent>Push to Vector Store</DialogTitleComponent><DialogDescriptionComponent>Confirm uploading {selectedItems.filter(item => item.type === 'file').length} selected file(s) to the AI knowledge base.</DialogDescriptionComponent></DialogHeaderComponent> {isUploadingToVectorStore ? (<div className="py-6 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" /><p>Uploading... {vectorStoreUploadProgress}%</p></div> ) : (<ScrollArea className="max-h-60 my-4"><ul className="space-y-1">{selectedItems.filter(item => item.type === 'file').map(file => (<li key={file.id} className="text-sm p-1 border-b truncate">{file.name}</li>))}</ul></ScrollArea>)} <DialogFooter><Button variant="outline" onClick={() => setIsVectorUploadDialogOpen(false)} disabled={isUploadingToVectorStore}>Cancel</Button><Button onClick={confirmVectorUpload} disabled={isUploadingToVectorStore}>{isUploadingToVectorStore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowUp className="h-4 w-4 mr-2" />}Confirm Upload</Button></DialogFooter> </DialogContent> </Dialog>
    </div>
  );
};

export default DatabasePage;
