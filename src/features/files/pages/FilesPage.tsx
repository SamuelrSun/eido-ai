import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FolderPlus, Upload, ArrowUp, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase/client";
import { FileGrid } from "../components/FileGrid";
import { UploadDialog } from "../components/UploadDialog";
import { NewFolderDialog } from "../components/NewFolderDialog";
import { VectorStoreUploadDialog } from "../components/VectorStoreUploadDialog";
import { StorageUsage } from "../components/StorageUsage";
import {
  FileType,
  FolderType,
  SelectedItem,
  UserStorage,
  VectorStoreFileType,
} from "../types";
import { User } from "@supabase/supabase-js";
import { formatFileSize } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type FileRow = Database['public']['Tables']['files']['Row'];
type FolderRow = Database['public']['Tables']['file_folders']['Row'];
type UserStorageRow = Database['public']['Tables']['user_storage']['Row'];

export const FilesPage = () => {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userStorage, setUserStorage] = useState<UserStorageRow | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "Main" },
  ]);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const [vectorStoreFiles, setVectorStoreFiles] = useState<VectorStoreFileType[]>([]);
  const [isLoadingVectorFiles, setIsLoadingVectorFiles] = useState(false);
  const [activeTab, setActiveTab] = useState("myFiles");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingProgress, setUploadingProgress] = useState(0);
  const [vectorUploadDialogOpen, setVectorUploadDialogOpen] = useState(false);

  // Fetch current user and all required data
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setLoadError(null);

    const fetchAll = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session?.user) {
          throw new Error("Authentication required. Please sign in.");
        }
        const user = sessionData.session.user;
        if (!isMounted) return;
        setUser(user);

        const { data: storageData, error: storageError } = await supabase
          .from("user_storage")
          .select("*")
          .eq("user_id", user.id)
          .single();
        if (storageError && storageError.code !== "PGRST116") throw storageError;
        if (storageData) setUserStorage(storageData);

        let folderQuery = supabase
          .from("file_folders")
          .select("*")
          .eq("user_id", user.id);
        if (currentFolderId === null) {
          folderQuery = folderQuery.is("parent_id", null);
        } else {
          folderQuery = folderQuery.eq("parent_id", currentFolderId);
        }
        const { data: folderData, error: folderError } = await folderQuery;
        if (folderError) throw folderError;
        setFolders(folderData || []);

        let fileQuery = supabase
          .from("files")
          .select("*")
          .eq("user_id", user.id);
        if (currentFolderId === null) {
          fileQuery = fileQuery.is("folder_id", null);
        } else {
          fileQuery = fileQuery.eq("folder_id", currentFolderId);
        }
        const { data: fileData, error: fileError } = await fileQuery;
        if (fileError) throw fileError;
        setFiles(fileData || []);

        setLoading(false);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    };
    fetchAll();
    return () => { isMounted = false; };
  }, [currentFolderId]);

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

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

        const response = await fetch(
          `${supabaseUrl}/functions/v1/list-vector-store-files`,
          {
            headers: {
              Authorization: `Bearer ${sessionData.session.access_token}`,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = "Failed to fetch vector store files";

          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            errorMessage =
              errorText.length > 100
                ? `${errorText.substring(0, 100)}...`
                : errorText;
          }

          throw new Error(errorMessage);
        }

        const result = await response.json();
        setVectorStoreFiles(result.files || []);
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error("Error fetching vector store files:", errMsg);
        toast({
          title: "Error fetching vector store files",
          description: errMsg,
          variant: "destructive",
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
    files: files.filter((file) =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    folders: folders.filter((folder) =>
      folder.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  };

  const handleFileSelect = (file: FileRow) => {
    if (selectionMode) {
      toggleSelectItem({
        id: file.id,
        name: file.name,
        type: "file",
        url: file.url,
        size: file.size,
      });
    }
  };

  const handleFolderSelect = (folder: FolderRow) => {
    if (selectionMode) {
      toggleSelectItem({
        id: folder.id,
        name: folder.name,
        type: "folder",
      });
    } else {
      navigateToFolder(folder.id, folder.name);
    }
  };

  const navigateToFolder = (folderId: string | null, folderName: string) => {
    if (folderId === null) {
      setCurrentFolderId(null);
      setBreadcrumbs([{ id: null, name: "Main" }]);
      return;
    }

    setCurrentFolderId(folderId);

    if (folderId === breadcrumbs[breadcrumbs.length - 1].id) {
      return;
    }

    const existingIndex = breadcrumbs.findIndex((b) => b.id === folderId);
    if (existingIndex !== -1) {
      setBreadcrumbs(breadcrumbs.slice(0, existingIndex + 1));
    } else {
      setBreadcrumbs([...breadcrumbs, { id: folderId, name: folderName }]);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload files",
        variant: "destructive",
      });
      return;
    }

    const selectedFiles = Array.from(files);
    const now = new Date().toISOString();
    const newFiles: FileRow[] = selectedFiles.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      user_id: user.id,
      folder_id: currentFolderId,
      created_at: now,
      last_modified: now,
      category: "other",
      tags: [],
      status: "uploading",
      url: "",
    }));
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    toast({
      title: `${newFiles.length} ${newFiles.length === 1 ? "file" : "files"} uploading`,
      description: "Your files will be processed shortly.",
    });
    for (const [index, file] of selectedFiles.entries()) {
      const newFileId = newFiles[index].id;
      const updateProgress = (progress: number) => {
        setFiles((prevFiles) =>
          prevFiles.map((f) => (f.id === newFileId ? { ...f, progress } : f))
        );
      };
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          throw new Error("Authentication required");
        }
        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
        const filePath = `${fileName}`;
        const { data: storageData, error: storageError } = await supabase.storage
          .from("file_storage")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });
        updateProgress(50);
        if (storageError) throw storageError;
        updateProgress(75);
        const { data: urlData } = supabase.storage
          .from("file_storage")
          .getPublicUrl(filePath);
        const { data: fileRecord, error: insertError } = await supabase
          .from("files")
          .insert([
            {
              name: file.name,
              size: file.size,
              type: file.type,
              folder_id: currentFolderId,
              user_id: user.id,
              url: urlData.publicUrl,
              last_modified: now,
              created_at: now,
              category: "other",
              status: "complete",
              tags: [],
            },
          ])
          .select()
          .single();
        if (insertError) throw insertError;
        updateProgress(100);
        setFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.id === newFileId
              ? {
                  ...fileRecord,
                  progress: 100,
                  status: "complete",
                  tags: fileRecord.tags || [],
                }
              : f
          )
        );
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        setFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.id === newFileId ? { ...f, status: "error" } : f
          )
        );
        toast({
          title: `Failed to upload ${file.name}`,
          description: errMsg,
          variant: "destructive",
        });
      }
    }
    setIsUploadDialogOpen(false);
  };

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload files",
        variant: "destructive",
      });
      return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFileUpload(e.dataTransfer.files);
    }
  };

  const createNewFolder = async (folderName: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create folders",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("file_folders")
        .insert([
          {
            name: folderName,
            parent_id: currentFolderId,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setFolders((prev) => [...prev, data]);
      setIsNewFolderDialogOpen(false);

      toast({
        title: "Folder created",
        description: `"${folderName}" has been created successfully.`,
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error creating folder:", errMsg);
      toast({
        title: "Error creating folder",
        description: errMsg,
        variant: "destructive",
      });
    }
  };

  const deleteItem = async (id: string, isFolder: boolean) => {
    if (!user) return;

    try {
      if (isFolder) {
        const deleteFolder = async (folderId: string) => {
          const { data: folderFiles, error: filesError } = await supabase
            .from("files")
            .select("*")
            .eq("folder_id", folderId);

          if (filesError) throw filesError;

          for (const file of folderFiles || []) {
            if (file.url) {
              const urlParts = file.url.split("/");
              const fileName = urlParts[urlParts.length - 1];

              if (fileName) {
                await supabase.storage.from("file_storage").remove([fileName]);
              }
            }
          }

          if (folderFiles && folderFiles.length > 0) {
            const { error: deleteFilesError } = await supabase
              .from("files")
              .delete()
              .eq("folder_id", folderId);

            if (deleteFilesError) throw deleteFilesError;
          }

          const { data: subfolders, error: subfoldersError } = await supabase
            .from("file_folders")
            .select("*")
            .eq("parent_id", folderId);

          if (subfoldersError) throw subfoldersError;

          for (const folder of subfolders || []) {
            await deleteFolder(folder.id);
          }

          const { error: deleteFolderError } = await supabase
            .from("file_folders")
            .delete()
            .eq("id", folderId);

          if (deleteFolderError) throw deleteFolderError;

          setFolders((prevFolders) =>
            prevFolders.filter((folder) => folder.id !== folderId)
          );
        };

        await deleteFolder(id);

        toast({
          title: "Folder deleted",
          description: "The folder and all its contents have been removed.",
        });
      } else {
        const fileToDelete = files.find((file) => file.id === id);

        if (fileToDelete) {
          if (fileToDelete.url) {
            const urlParts = fileToDelete.url.split("/");
            const fileName = urlParts[urlParts.length - 1];

            if (fileName) {
              await supabase.storage.from("file_storage").remove([fileName]);
            }
          }

          const { error } = await supabase.from("files").delete().eq("id", id);

          if (error) throw error;

          setFiles((prevFiles) =>
            prevFiles.filter((file) => file.id !== id)
          );

          toast({
            title: "File deleted",
            description: `"${fileToDelete.name}" has been removed.`,
          });
        }
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error deleting item:", errMsg);
      toast({
        title: "Error deleting item",
        description: errMsg,
        variant: "destructive",
      });
    }
  };

  const toggleSelectItem = (item: SelectedItem) => {
    setSelectedItems((prevItems) => {
      const exists = prevItems.some((i) => i.id === item.id);
      if (exists) {
        return prevItems.filter((i) => i.id !== item.id);
      } else {
        return [...prevItems, item];
      }
    });
  };

  const pushToVectorStore = async () => {
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description:
          "Please select at least one file to upload to the vector store.",
        variant: "destructive",
      });
      return;
    }

    const filesToUpload = selectedItems.filter(
      (item) => item.type === "file" && item.url
    );

    if (filesToUpload.length === 0) {
      toast({
        title: "No valid files selected",
        description:
          "Please select files to upload. Folders cannot be directly uploaded to the vector store.",
        variant: "destructive",
      });
      return;
    }

    setVectorUploadDialogOpen(true);
  };

  const confirmVectorUpload = async () => {
    try {
      setIsUploading(true);
      setUploadingProgress(10);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Authentication required");
      }

      const filesToUpload = selectedItems.filter(
        (item) => item.type === "file" && item.url
      );
      setUploadingProgress(30);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/upload-to-vector-store`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            files: filesToUpload.map((file) => ({
              id: file.id,
              name: file.name,
              url: file.url,
              size: file.size,
            })),
          }),
        }
      );

      setUploadingProgress(70);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to upload to vector store";

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage =
            errorText.length > 100
              ? `${errorText.substring(0, 100)}...`
              : errorText;
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      setUploadingProgress(100);

      if (activeTab === "vectorStore") {
        setActiveTab("myFiles");
        setTimeout(() => setActiveTab("vectorStore"), 100);
      }

      setSelectionMode(false);
      setSelectedItems([]);

      toast({
        title: "Files uploaded to vector store",
        description: `Successfully uploaded ${filesToUpload.length} files to your vector store.`,
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error uploading to vector store:", errMsg);
      toast({
        title: "Upload to vector store failed",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setVectorUploadDialogOpen(false);
    }
  };

  const cancelSelectionMode = () => {
    setSelectionMode(false);
    setSelectedItems([]);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin h-10 w-10 border-b-2 border-gray-900 rounded-full" /></div>;
  }
  if (loadError) {
    return <div className="flex flex-col items-center justify-center min-h-screen text-red-600">{loadError}</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Database"
        description="Store, organize, and access your files and learning materials."
      />

      <div className="bg-white p-6 rounded-xl shadow-sm border">
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

          <StorageUsage storage={userStorage} />
        </div>

        <Tabs
          defaultValue="myFiles"
          value={activeTab}
          onValueChange={setActiveTab}
          className="mb-6"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="myFiles">Local Files</TabsTrigger>
            <TabsTrigger value="vectorStore">
              Vector Store
              <Badge variant="outline" className="ml-2 bg-blue-50">
                AI
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="myFiles" className="mt-6">
            <div className="flex gap-3 mb-6 mt-4">
              {!selectionMode ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsUploadDialogOpen(true)}
                    className="py-6 my-2"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Files
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsNewFolderDialogOpen(true)}
                    className="py-6 my-2"
                  >
                    <FolderPlus className="h-4 w-4 mr-2" />
                    New Folder
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectionMode(true)}
                    className="py-6 my-2 ml-auto"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Select Items
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="default"
                    onClick={pushToVectorStore}
                    className="py-6 my-2"
                  >
                    <ArrowUp className="h-4 w-4 mr-2" />
                    Push to Vector Store ({selectedItems.length})
                  </Button>
                  <Button
                    variant="outline"
                    onClick={cancelSelectionMode}
                    className="py-6 my-2"
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>

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
              <FileGrid
                files={currentFolderItems.files}
                folders={currentFolderItems.folders}
                loading={loading}
                selectionMode={selectionMode}
                selectedItems={selectedItems}
                onFileSelect={handleFileSelect}
                onFolderSelect={handleFolderSelect}
                onDelete={deleteItem}
                onFileOpen={(url) => window.open(url, "_blank")}
              />
            </div>
          </TabsContent>

          <TabsContent value="vectorStore" className="mt-6">
            <div className="mb-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Vector Store Files</h3>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Connected to OpenAI
                </Badge>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                These files are stored in your OpenAI vector store and are
                available for AI-powered features.
              </p>
            </div>

            <div className="min-h-[400px] border-2 rounded-lg p-4 border-gray-200">
              {isLoadingVectorFiles ? (
                <div className="flex flex-col items-center justify-center h-full py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
                  <p className="text-gray-500 mt-4">
                    Loading your vector store files...
                  </p>
                </div>
              ) : vectorStoreFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                  <div className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-700">
                    No files found in vector store
                  </h3>
                  <p className="text-gray-500 mb-4 max-w-md">
                    Files added to your OpenAI vector store will appear here. You
                    can use these files with AI features.
                  </p>
                  <Button
                    onClick={() => {
                      setActiveTab("myFiles");
                      setSelectionMode(true);
                    }}
                    className="py-6 mt-4"
                  >
                    <ArrowUp className="h-4 w-4 mr-2" />
                    Upload Files to Vector Store
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {vectorStoreFiles.map((file) => (
                    <div
                      key={file.id}
                      className="border rounded-lg p-3 hover:shadow-md transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                          <div className="h-8 w-8 text-blue-500" />
                          <h4 className="font-medium truncate ml-2" title={file.filename}>
                            {file.filename}
                          </h4>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2 flex flex-col gap-1">
                        <div>
                          Added:{" "}
                          {new Date(file.created_at * 1000).toLocaleDateString()}
                        </div>
                        <div>
                          Modified:{" "}
                          {new Date(file.modified_at * 1000).toLocaleDateString()}
                        </div>
                        {file.size && (
                          <div>Size: {formatFileSize(file.size)}</div>
                        )}
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
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <UploadDialog
        isOpen={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
        onFileSelect={handleFileUpload}
      />

      <NewFolderDialog
        isOpen={isNewFolderDialogOpen}
        onClose={() => setIsNewFolderDialogOpen(false)}
        onSubmit={createNewFolder}
      />

      <VectorStoreUploadDialog
        isOpen={vectorUploadDialogOpen}
        onClose={() => setVectorUploadDialogOpen(false)}
        onConfirm={confirmVectorUpload}
        selectedItems={selectedItems}
        isUploading={isUploading}
        uploadProgress={uploadingProgress}
      />
    </div>
  );
}; 