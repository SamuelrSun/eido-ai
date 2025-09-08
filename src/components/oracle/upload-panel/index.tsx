// src/components/oracle/upload-panel/index.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FolderPlus, Upload, Loader2, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClassConfig } from '@/services/classOpenAIConfig';
import { FileType, FolderType } from '@/features/files/types';
import { fileService } from '@/services/fileService';
import { classOpenAIConfigService } from '@/services/classOpenAIConfig';
import { formatFileSize } from '@/lib/utils';
import { User } from '@supabase/supabase-js';
import { MiniClassCard } from './MiniClassCard';
import { MiniFolderCard } from './MiniFolderCard';
import { MiniFileCard } from './MiniFileCard';
import { cn } from '@/lib/utils';

interface SourcesUploadPanelProps {
  user: User | null;
}

export const SourcesUploadPanel: React.FC<SourcesUploadPanelProps> = ({ user }) => {
  const [allClasses, setAllClasses] = useState<ClassConfig[]>([]);
  const [allFiles, setAllFiles] = useState<(FileType & { class: string; })[]>([]);
  
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [files, setFiles] = useState<FileType[]>([]);
  
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([{ name: 'Home', id: null }]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      if (selectedClassId) {
        const [folderData, fileData] = await Promise.all([
          fileService.getFolders(selectedClassId, currentFolderId),
          fileService.getFiles(selectedClassId, currentFolderId)
        ]);
        setFolders(folderData);
        setFiles(fileData);
      } else {
        const [fetchedClasses, fetchedAllFiles] = await Promise.all([
            classOpenAIConfigService.getAllClasses(),
            fileService.getAllFilesWithClass()
        ]);
        setAllClasses(fetchedClasses);
        setAllFiles(fetchedAllFiles as (FileType & { class: string; })[]);
        setFolders([]);
        setFiles([]);
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not load data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedClassId, currentFolderId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClassClick = (classItem: ClassConfig) => {
    setSelectedClassId(classItem.class_id);
    setCurrentFolderId(null);
    setBreadcrumbs([{ name: 'Home', id: null }, { name: classItem.class_name, id: classItem.class_id }]);
  };

  const handleFolderClick = (folder: FolderType) => {
    setCurrentFolderId(folder.folder_id);
    setBreadcrumbs(prev => [...prev, { name: folder.name, id: folder.folder_id }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    const clickedCrumb = breadcrumbs[index];
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    if (index === 0) {
      setSelectedClassId(null);
      setCurrentFolderId(null);
    } else {
      const classCrumb = breadcrumbs[1];
      setSelectedClassId(classCrumb.id);
      setCurrentFolderId(clickedCrumb.id === classCrumb.id ? null : clickedCrumb.id);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !user || !newFolderName.trim()) return;
    try {
      await fileService.createFolder(newFolderName.trim(), selectedClassId, currentFolderId);
      toast({ title: "Folder created" });
      setIsNewFolderOpen(false);
      setNewFolderName('');
      fetchData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to create folder.", variant: "destructive" });
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFilesToUpload(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleUpload = async () => {
    if (filesToUpload.length === 0 || !user || !selectedClassId) {
      toast({ title: "Cannot Upload", description: "You must be inside a class to upload files.", variant: "destructive"});
      return;
    }
    setIsUploading(true);
    toast({ title: `Uploading ${filesToUpload.length} file(s)...` });
    try {
      await fileService.uploadFiles(filesToUpload, selectedClassId, currentFolderId);
      
      toast({ title: "Upload complete", description: `${filesToUpload.length} file(s) queued for processing.` });
      setFilesToUpload([]);
      fetchData();
    } catch (error) {
        toast({ title: "Upload failed", description: (error as Error).message, variant: "destructive" });
    } finally {
        setIsUploading(false);
    }
  };
  
  const classesWithStats = useMemo(() => {
    return allClasses.map(cls => {
        const filesForClass = allFiles.filter(file => file.class_id === cls.class_id);
        const totalSize = filesForClass.reduce((acc, file) => acc + (file.size || 0), 0);
        return { 
            ...cls, 
            files: filesForClass.length, 
            size: formatFileSize(totalSize),
            is_owner: cls.owner_id === user?.id,
            is_shared: (cls.member_count || 0) > 1,
        };
    });
  }, [allClasses, allFiles, user]);

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
    }

    if (!selectedClassId) {
      return (
        <>
          <h3 className="text-xs font-semibold text-neutral-400 px-2 mb-2 uppercase">Classes</h3>
          <div className="grid grid-cols-2 gap-3">
            {classesWithStats.length > 0 ? (
              classesWithStats.map(c => <MiniClassCard key={c.class_id} classItem={c} onClick={() => handleClassClick(c)} />)
            ) : (
              <p className="text-xs text-neutral-500 col-span-2 text-center p-4">No classes found.</p>
            )}
          </div>
        </>
      );
    }

    return (
      <>
        {folders.length > 0 && (
          <>
            <h3 className="text-xs font-semibold text-neutral-400 px-2 mb-2 uppercase">Folders</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {folders.map(folder => <MiniFolderCard key={folder.folder_id} folder={folder} onClick={() => handleFolderClick(folder)} />)}
            </div>
          </>
        )}
        <h3 className="text-xs font-semibold text-neutral-400 px-2 mb-2 uppercase">Files</h3>
        <div className="grid grid-cols-2 gap-3">
          {files.length > 0 ? (
            files.map(file => <MiniFileCard key={file.file_id} file={file} />)
          ) : (
            <p className="text-xs text-neutral-500 col-span-2 text-center p-4">No files in this location.</p>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="flex flex-col h-full p-2">
      <header className="flex items-center justify-between p-2">
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.id || 'home'}>
                <BreadcrumbItem>
                  {index < breadcrumbs.length - 1 ? (
                    <BreadcrumbLink 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); handleBreadcrumbClick(index); }}
                      className="text-sm font-normal text-neutral-400 hover:text-white"
                    >
                      {crumb.name}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className="text-sm font-semibold text-white">
                      {crumb.name}
                    </BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        {selectedClassId && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-neutral-400 hover:text-white" onClick={() => setIsNewFolderOpen(true)}>
            <FolderPlus className="h-4 w-4" />
          </Button>
        )}
      </header>
      <ScrollArea className="flex-1 px-2 py-2">
        {renderContent()}
      </ScrollArea>

      {/* MODIFICATION: Conditional rendering for the upload section */}
      {selectedClassId && (
        <div className="p-2 border-t border-neutral-800 mt-auto">
          <div 
            className="border-2 border-dashed border-neutral-700 rounded-md p-3 text-center cursor-pointer hover:border-blue-500 hover:bg-neutral-900"
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileChange} />
            <p className="text-xs text-neutral-500">
              {filesToUpload.length > 0 ? `${filesToUpload.length} file(s) selected` : "Attach, drag & drop, or paste files"}
            </p>
          </div>
          {filesToUpload.length > 0 && (
            <Button className="w-full mt-2" size="sm" onClick={handleUpload} disabled={isUploading || !selectedClassId}>
              {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload to {breadcrumbs[breadcrumbs.length - 1].name}
            </Button>
          )}
        </div>
      )}

      <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Folder</DialogTitle>
            <DialogDescription className="text-neutral-400">Enter a name for your new folder in {breadcrumbs[breadcrumbs.length - 1].name}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateFolder}>
            <Input autoFocus value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="e.g., Lecture Notes" className="bg-neutral-800 border-neutral-700 text-white" />
            <DialogFooter className="mt-4">
              <Button type="button" variant="ghost" onClick={() => setIsNewFolderOpen(false)}>Cancel</Button>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};