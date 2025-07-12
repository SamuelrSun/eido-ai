// src/pages/ClassesPage.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FolderPlus, FileText, MoreHorizontal, ExternalLink, Download, Trash2, X, Loader2, List, LayoutGrid } from 'lucide-react';
import { FolderCard } from '@/components/datasets/FolderCard';
import { ClassCard } from '@/components/datasets/ClassCard';
import { FileGridCard } from '@/components/datasets/FileGridCard';
import { CreateClassDialog } from '@/components/datasets/CreateClassDialog';
import { NewFolderDialog } from '@/components/datasets/NewFolderDialog';
import { UploadDialog } from '@/components/datasets/UploadDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { ClassConfig, classOpenAIConfigService } from '@/services/classOpenAIConfig';
import { fileService } from '@/services/fileService';
import { FolderType, FileType } from '@/features/files/types';
import { cn, formatFileSize } from '@/lib/utils';
import { Helmet } from 'react-helmet-async';
import { usePageLoader } from '@/context/LoaderContext';
import { MainAppLayout } from '@/components/layout/MainAppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { UploadProgressToast, UploadingFile } from '@/features/files/components/UploadProgressToast';
import { RealtimeChannel } from '@supabase/supabase-js';

const ClassesPage = () => {
    const { loader } = usePageLoader();
    const [user, setUser] = useState<User | null>(null);
    const [classes, setClasses] = useState<ClassConfig[]>([]);
    const [folders, setFolders] = useState<FolderType[]>([]);
    const [allUserFolders, setAllUserFolders] = useState<FolderType[]>([]);
    const [files, setFiles] = useState<FileType[]>([]);
    const [allClassFiles, setAllClassFiles] = useState<FileType[]>([]);
    const [allFiles, setAllFiles] = useState<(FileType & { class: string; })[]>([]);
    const [recentFiles, setRecentFiles] = useState<FileType[]>(() => {
        try {
            const item = window.localStorage.getItem('eidoRecentFiles');
            return item ? JSON.parse(item) as FileType[] : [];
        } catch (error: unknown) {
            console.error("Error parsing recent files from localStorage", error);
            return [];
        }
    });
    const [selectedClass, setSelectedClass] = useState<ClassConfig | null>(null);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<{ name: string; id: string | null }[]>([{ name: 'Home', id: null }]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const [filesToDelete, setFilesToDelete] = useState<FileType[]>([]);
    const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
    const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [previewedFile, setPreviewedFile] = useState<FileType | null>(null);
    const [isDeleteClassConfirmationOpen, setIsDeleteClassConfirmationOpen] = useState(false);
    const [classToDelete, setClassToDelete] = useState<ClassConfig | null>(null);
    const [isDeletingClass, setIsDeletingClass] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
    const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
    const fileSubscription = useRef<RealtimeChannel | null>(null);


    useEffect(() => {
        if (loader) loader.continuousStart();

        const fetchUserAndInitialData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                const allFolders = await fileService.getAllFoldersForUser();
                setAllUserFolders(allFolders);
            }
        };
        fetchUserAndInitialData();

        return () => {
            if (fileSubscription.current) {
                supabase.removeChannel(fileSubscription.current);
            }
        };
    }, [loader]);

    // FIX: This useEffect was added to ensure that any changes to the
    // `recentFiles` state are persisted to localStorage.
    useEffect(() => {
        try {
            window.localStorage.setItem('eidoRecentFiles', JSON.stringify(recentFiles));
        } catch (error) {
            console.error("Failed to save recent files to localStorage", error);
        }
    }, [recentFiles]);


    const fetchData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            if (selectedClass) {
                 const [fetchedFolders, fetchedFiles, fetchedAllClassFiles] = await Promise.all([
                    fileService.getFolders(selectedClass.class_id, currentFolderId),
                    fileService.getFiles(selectedClass.class_id, currentFolderId),
                    fileService.getAllFilesForClass(selectedClass.class_id),
                ]);
                setFolders(fetchedFolders);
                setFiles(fetchedFiles);
                setAllClassFiles(fetchedAllClassFiles);
            } else {
                 const [fetchedClasses, fetchedAllFilesResult] = await Promise.all([
                    classOpenAIConfigService.getAllClasses(),
                    fileService.getAllFilesWithClass()
                ]);
            
                setClasses(fetchedClasses);
                setAllFiles(fetchedAllFilesResult as (FileType & { class: string })[]);
                setFolders([]);
                setFiles([]);
            }
        } catch (error: unknown) {
            toast({ title: 'Error fetching data', description: (error instanceof Error) ? error.message : "An unknown error occurred.", variant: 'destructive' });
        } finally {
            setIsLoading(false);
            if (loader) loader.complete();
        }
    }, [user, selectedClass, currentFolderId, toast, loader]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (!user || !selectedClass) {
            if (fileSubscription.current) {
                supabase.removeChannel(fileSubscription.current);
                fileSubscription.current = null;
            }
            return;
        }
    
        const channelId = `files-class-${selectedClass.class_id}`;
        if (fileSubscription.current && fileSubscription.current.topic.includes(selectedClass.class_id)) {
            return; // Already subscribed to the correct channel
        }
    
        if (fileSubscription.current) {
            supabase.removeChannel(fileSubscription.current);
        }
    
        console.log(`Subscribing to file updates for class: ${selectedClass.class_id}`);
        const channel = supabase
            .channel(channelId)
            .on<FileType>(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'files',
                    filter: `class_id=eq.${selectedClass.class_id}`,
                },
                (payload) => {
                    console.log('Realtime file update received:', payload);
    
                    if (payload.eventType === 'INSERT') {
                        const newFile = payload.new as FileType;
                        
                        // Add to the list used for statistics
                        setAllClassFiles(prev => {
                            // Check if file already exists to avoid duplicates
                            const exists = prev.some(f => f.file_id === newFile.file_id);
                            if (exists) return prev;
                            return [...prev, newFile];
                        });
                        
                        // Add to the visible file grid if it's in the current folder
                        if (newFile.folder_id === currentFolderId || (currentFolderId === null && newFile.folder_id === null)) {
                            setFiles(prev => {
                                // Remove temporary placeholder files that match this file's name
                                // and don't have a real file_id (they start with 'temp-upload-')
                                const filtered = prev.filter(f => 
                                    !(f.name === newFile.name && f.file_id.startsWith('temp-upload-'))
                                );
                                
                                // Check if the real file already exists
                                const realFileExists = filtered.some(f => f.file_id === newFile.file_id);
                                if (realFileExists) return filtered;
                                
                                return [...filtered, newFile];
                            });
                        }
                    }
    
                    if (payload.eventType === 'UPDATE') {
                        const updatedFile = payload.new as FileType;
                        // Update the file in both state arrays with its final, complete data
                        setAllClassFiles(prev => prev.map(f => f.file_id === updatedFile.file_id ? updatedFile : f));
                        setFiles(prev => prev.map(f => f.file_id === updatedFile.file_id ? updatedFile : f));
                    }
    
                    if (payload.eventType === 'DELETE') {
                        const deletedFileId = (payload.old as { file_id: string }).file_id;
                        setAllClassFiles(prev => prev.filter(f => f.file_id !== deletedFileId));
                        setFiles(prev => prev.filter(f => f.file_id !== deletedFileId));
                    }
    
                    // This logic updates the UploadProgressToast
                    const recordForToast = (payload.new || payload.old) as FileType;
                    if (recordForToast) {
                        setUploadingFiles(prev => prev.map(uf => {
                            if (uf.name === recordForToast.name) {
                                const newStatus = 
                                    (recordForToast.status === 'complete' || recordForToast.status === 'processed_text') ? 'complete' :
                                    recordForToast.status === 'error' ? 'error' :
                                    'processing';
                                return { ...uf, status: newStatus };
                            }
                            return uf;
                        }));
                    }
                }
            )
            .subscribe((status, err) => {
                if (err) {
                    console.error(`Realtime subscription error for class ${selectedClass.class_id}:`, err);
                }
            });
    
        fileSubscription.current = channel;
    
        return () => {
            if (fileSubscription.current) {
                supabase.removeChannel(fileSubscription.current);
                fileSubscription.current = null;
            }
        };
    }, [user, selectedClass, currentFolderId]);

    const handleUploadFiles = async (filesToUpload: File[]) => {
        if (!user || !selectedClass) {
            toast({ title: "Upload Failed", description: "A user and class must be selected.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        setIsUploadOpen(false);

        const newUploads: UploadingFile[] = filesToUpload.map((file, index) => ({
            id: `temp-upload-${Date.now()}-${index}`,
            name: file.name,
            status: 'pending',
        }));
        setUploadingFiles(prev => [...prev, ...newUploads]);

        // Add temporary placeholders to the main file grid
        const tempFileEntries: FileType[] = newUploads.map(upload => {
            const file = filesToUpload.find(f => f.name === upload.name)!;
            return {
                file_id: upload.id,
                name: file.name, size: file.size, type: file.type,
                status: 'processing',
                folder_id: currentFolderId,
                user_id: user.id,
                class_id: selectedClass.class_id,
                last_modified: new Date().toISOString(),
                created_at: new Date().toISOString(),
                category: null, tags: null
            }
        });
        setFiles(prev => [...prev, ...tempFileEntries]);

        for (const file of filesToUpload) {
            setUploadingFiles(prev => prev.map(uf => uf.name === file.name ? { ...uf, status: 'uploading' } : uf));
            try {
                const storagePath = `${user.id}/${selectedClass.class_id}/${currentFolderId || 'root'}/${Date.now()}-${file.name}`;
                const { data: storageData, error: uploadError } = await supabase.storage.from('file_storage').upload(storagePath, file);
                if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`);

                const processingPayload = {
                    storage_path: storageData.path,
                    original_name: file.name,
                    mime_type: file.type,
                    size: file.size,
                    class_id: selectedClass.class_id,
                    folder_id: currentFolderId,
                };
                
                const { error: functionError } = await supabase.functions.invoke('upload-file', {
                    body: processingPayload,
                });
                if (functionError) throw new Error(`Function Error: ${functionError.message}`);
                
                setUploadingFiles(prev => prev.map(uf => uf.name === file.name ? { ...uf, status: 'processing' } : uf));
            } catch (error) {
                setUploadingFiles(prev => prev.map(uf => uf.name === file.name ? { ...uf, status: 'error', errorMessage: (error as Error).message } : uf));
                toast({ title: `Error starting upload for ${file.name}`, description: (error instanceof Error) ? error.message : "An unknown error occurred.", variant: "destructive" });
            }
        }
        setIsSubmitting(false);
    };

    const handleClassClick = (classData: ClassConfig) => {
        setSelectedClass(classData);
        setViewMode('grid');
        setBreadcrumbs([{ name: 'Home', id: null }, { name: classData.class_name, id: classData.class_id }]);
        sessionStorage.setItem('activeClass', JSON.stringify({ class_id: classData.class_id, class_name: classData.class_name }));
    };

    const handleFolderClick = (folderData: FolderType) => {
        setCurrentFolderId(folderData.folder_id);
        setBreadcrumbs([...breadcrumbs, { name: folderData.name, id: folderData.folder_id }]);
    };
    
    const handleBreadcrumbClick = (index: number) => {
        if (index === 0) {
            setSelectedClass(null);
            setCurrentFolderId(null);
            sessionStorage.removeItem('activeClass');
        } else {
            const clickedCrumb = breadcrumbs[index];
            if (clickedCrumb.id === selectedClass?.class_id) {
                setCurrentFolderId(null);
            } else {
                setCurrentFolderId(clickedCrumb.id);
            }
            if (index === 1 && classes.find(c => c.class_id === clickedCrumb.id)) {
                const classData = classes.find(c => c.class_id === clickedCrumb.id);
                if (classData) {
                    sessionStorage.setItem('activeClass', JSON.stringify({ class_id: classData.class_id, class_name: classData.class_name }));
                }
            } else if (index < 1) {
                sessionStorage.removeItem('activeClass');
            }
        }
        setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    };

    const getFolderPath = useCallback((file: FileType): string => {
        if (!file.folder_id) return '/';
        let path = '';
        let currentId: string | null = file.folder_id;
        while (currentId) {
            const folder = allUserFolders.find(f => f.folder_id === currentId && f.class_id === file.class_id);
            if (folder) { path = `/${folder.name}${path}`; currentId = folder.parent_id; }
            else { break; }
        }
        return path || '/';
    }, [allUserFolders]);

    const handleFileRowClick = (file: FileType) => {
        setPreviewedFile(file);
        setRecentFiles(prev => {
            const newRecent = [file, ...prev.filter(f => f.file_id !== file.file_id)];
            return newRecent.slice(0, 10);
        });
    };

    const handleDownload = () => {
        if (!previewedFile || !previewedFile.url) return;
        const link = document.createElement('a');
        link.href = previewedFile.url;
        link.download = previewedFile.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDeleteClick = (files: FileType[]) => { setFilesToDelete(files); };

    const confirmDelete = async () => {
        if (filesToDelete.length === 0) return;
        setIsDeleting(true);
        try {
            await Promise.all(filesToDelete.map(file => fileService.deleteFile(file)));
            toast({ title: "Files Deleted", description: `${filesToDelete.length} file(s) deleted.` });

            // FIX: Clear deleted files from the recent files list in localStorage
            const deletedFileIds = new Set(filesToDelete.map(f => f.file_id));
            setRecentFiles(prev => prev.filter(file => !deletedFileIds.has(file.file_id)));

            if (filesToDelete.some(f => f.file_id === previewedFile?.file_id)) { setPreviewedFile(null); }
            fetchData();
            if (selectionMode) { toggleSelectionMode(); }
        } catch (error: unknown) {
            toast({ title: "Deletion Failed", description: (error instanceof Error) ? error.message : "An unknown error occurred.", variant: "destructive" });
        } finally {
            setFilesToDelete([]);
            setIsDeleting(false);
        }
    };

    const toggleSelectionMode = () => { setSelectionMode(!selectionMode); setSelectedFileIds([]); };
    const handleFileSelect = (fileId: string) => { setSelectedFileIds(prev => prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]); };
    const handleCreateClass = async (className: string) => {
        setIsSubmitting(true);
        try {
            await classOpenAIConfigService.saveConfigForClass(className);
            toast({ title: "Class Created", description: `"${className}" created.` });
            fetchData();
        } catch (error: unknown) {
            toast({ title: "Error", description: (error instanceof Error) ? error.message : "An unknown error occurred.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
            setIsCreateClassOpen(false);
        }
    };

    const handleDeleteClassClick = (classData: ClassConfig) => {
        setClassToDelete(classData);
        setIsDeleteClassConfirmationOpen(true);
    };

    const confirmDeleteClass = async () => {
        if (!classToDelete) return;
        setIsDeletingClass(true);
        try {
            await classOpenAIConfigService.deleteClass(classToDelete.class_id);
            toast({
                title: "Class Deleted",
                description: `"${classToDelete.class_name}" and all its associated data have been permanently removed.`,
            });
            
            // FIX: Clear all files from the deleted class from the recent files list
            setRecentFiles(prev => prev.filter(file => file.class_id !== classToDelete.class_id));

            fetchData();
            setSelectedClass(null);
            setCurrentFolderId(null);
            setBreadcrumbs([{ name: 'Home', id: null }]);
            sessionStorage.removeItem('activeClass');
        } catch (error: unknown) {
            toast({
                title: "Deletion Failed",
                description: (error instanceof Error) ? error.message : "An unknown error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsDeletingClass(false);
            setIsDeleteClassConfirmationOpen(false);
            setClassToDelete(null);
        }
    };

    const handleCreateFolder = async (folderName: string) => {
        if (!selectedClass) return;
        setIsSubmitting(true);
        try {
            await fileService.createFolder(folderName, selectedClass.class_id, currentFolderId);
            toast({ title: "Folder Created", description: `"${folderName}" created.` });
            fetchData();
        } catch (error: unknown) {
            toast({ title: "Error", description: (error instanceof Error) ? error.message : "An unknown error occurred.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
            setIsNewFolderOpen(false);
        }
    };

    const handleHeaderButtonClick = () => {
        if (selectedClass) { setIsUploadOpen(true);
        }
        else { setIsCreateClassOpen(true); }
    };

    const classesWithStats = useMemo(() => {
        if (!classes || !allFiles) return [];
        return classes.map(cls => {
            const filesForClass = allFiles.filter(file => file.class_id === cls.class_id);
            const totalSize = filesForClass.reduce((acc, file) => acc + (file.size || 0), 0);
            return { ...cls, files: filesForClass.length, size: formatFileSize(totalSize) };
        });
    }, [classes, allFiles]);

    const foldersWithStats = useMemo(() => {
        if (!folders.length) return [];
        const folderMap = new Map<string, FolderType>(allUserFolders.map(f => [f.folder_id, f]));
        const fileMapByFolder = new Map<string, FileType[]>();
        
        allClassFiles.forEach(file => {
            const folderId = file.folder_id || 'root';
            if (!fileMapByFolder.has(folderId)) {
                fileMapByFolder.set(folderId, []);
            }
            fileMapByFolder.get(folderId)?.push(file);
        });

        const statsCache = new Map<string, { count: number; size: number }>();
        const getFolderStats = (folderId: string): { count: number; size: number } => {
            if (statsCache.has(folderId))
                return statsCache.get(folderId)!;
            let count = fileMapByFolder.get(folderId)?.length || 0;
            let size = (fileMapByFolder.get(folderId) || []).reduce((acc, file) => acc + (file.size || 0), 0);
            const subFolders = allUserFolders.filter(f => f.parent_id === folderId);
            for (const subFolder of subFolders) {
                const subStats = getFolderStats(subFolder.folder_id);
                count += subStats.count;
                size += subStats.size;
            }
            statsCache.set(folderId, { count, size });
            return { count, size };
        };

        return folders.map(folder => {
            const stats = getFolderStats(folder.folder_id);
            return {...folder, files: stats.count, size: formatFileSize(stats.size), folderName: folder.name}
        });
    }, [folders, allClassFiles, allUserFolders]);

    const renderFilePreview = () => {
        if (!previewedFile) {
            return (
                 <div className="w-full h-full flex items-center justify-center p-4 bg-cover bg-center" style={{backgroundImage: "url('/background6.png')"}}>
                    <div className="p-4 bg-black/10 backdrop-blur-sm rounded-lg">
                        <p className="font-medium text-white drop-shadow-md">Select a file to preview</p>
                    </div>
                </div>
            );
        }

        if (previewedFile.status === 'processing' || (!previewedFile.url && previewedFile.status !== 'error')) {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
                    <p className="font-medium text-foreground">File is processing...</p>
                    <p className="text-sm text-muted-foreground">A preview will be available shortly.</p>
                </div>
            );
        }

        if (previewedFile.status === 'error') {
             return (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                    <X className="h-12 w-12 text-destructive mb-4" />
                    <p className="font-medium text-destructive-foreground">Processing Failed</p>
                    <p className="text-sm text-muted-foreground">Please try uploading this file again.</p>
                </div>
            );
        }

        const fileType = previewedFile.type || '';
        const fileUrl = previewedFile.url || '';

        if (fileType.startsWith('image/')) { 
            return <img src={fileUrl} alt={previewedFile.name} className="w-full h-full object-cover" />;
        }
        if (fileType === 'application/pdf') { 
            return <iframe src={`${fileUrl}#toolbar=0`} className="w-full h-full scale-105" title={previewedFile.name}></iframe>;
        }
        return <pre className="w-full h-full text-sm whitespace-pre-wrap p-4">{`Preview for this file type is not supported.`}</pre>;
    };

    const renderContent = () => {
        const filesForTable = selectedClass ? files : recentFiles;

        const renderSkeletonGrid = () => (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                ))}
            </div>
        );
        return (
            <div className="p-6 md:p-8 space-y-8 overflow-y-auto">
                <div className="flex justify-between items-center">
                    <Breadcrumb>
                        <BreadcrumbList>
                            {breadcrumbs.map((crumb, index) => (
                                <div key={crumb.id || 'home'} className="flex items-center">
                                    <BreadcrumbItem>
                                        {index < breadcrumbs.length - 1 ? (
                                            <BreadcrumbLink href="#" onClick={(e) => { e.preventDefault(); handleBreadcrumbClick(index); }} className="text-muted-foreground hover:text-stone-800">{crumb.name}</BreadcrumbLink>
                                        ) : (
                                            <BreadcrumbPage className="font-semibold text-stone-800">{crumb.name}</BreadcrumbPage>
                                        )}
                                    </BreadcrumbItem>
                                    {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                                </div>
                            ))}
                        </BreadcrumbList>
                    </Breadcrumb>
                    <div className="flex gap-2">
                        {selectedClass && (<Button variant="outline" onClick={() => setIsNewFolderOpen(true)}><FolderPlus className="mr-2 h-4 w-4" />New Folder</Button>)}
                        <Button onClick={handleHeaderButtonClick}>{selectedClass ? "Upload Files" : "New Class"}</Button>
                    </div>
                </div>

                {selectedClass ?
                (
                    <div className="space-y-4">
                        <h2 className="text-sm uppercase font-semibold text-muted-foreground">Folders</h2>
                        <Separator className="my-4" />
                        {isLoading ? renderSkeletonGrid() : foldersWithStats.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {foldersWithStats.map((folder) => (
                                    <FolderCard key={folder.folder_id} {...folder} folderName={folder.name} isSelected={false} onClick={() => handleFolderClick(folder)} />
                                ))}
                            </div>
                        ) : (<p className="text-sm text-muted-foreground">No folders in this directory.</p>)}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <h2 className="text-sm uppercase font-semibold text-muted-foreground">Classes</h2>
                        <Separator className="my-4" />
                        {isLoading ? renderSkeletonGrid() : classesWithStats.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {classesWithStats.map((classItem) => (
                                    <ClassCard
                                        key={classItem.class_id}
                                        id={classItem.class_id}
                                        className={classItem.class_name}
                                        files={classItem.files}
                                        size={classItem.size}
                                        isSelected={false}
                                        onClick={() => handleClassClick(classItem)}
                                        onDelete={() => handleDeleteClassClick(classItem)}
                                    />
                                ))}
                            </div>
                        ) : (<p className="text-sm text-muted-foreground">No classes found. Click "New Class" to get started.</p>)}
                    </div>
                 )}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-sm uppercase font-semibold text-muted-foreground">{selectedClass ? "Files" : "Recent Files"}</h2>
                        
                        <ToggleGroup type="single" variant="outline" size="sm" value={viewMode} onValueChange={(value) => { if (value) setViewMode(value as 'list' | 'grid'); }} disabled={isLoading}>
                            <ToggleGroupItem value="list" aria-label="List view">
                                <List className="h-4 w-4" />
                            </ToggleGroupItem>
                            <ToggleGroupItem value="grid" aria-label="Grid view">
                                <LayoutGrid className="h-4 w-4" />
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    {isLoading ? ( <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div> ) :
                    filesForTable.length === 0 ? (<div className="text-center p-8 text-muted-foreground">No files to display.</div>) :
                    viewMode === 'list' ? (
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader><TableRow className="bg-stone-50 hover:bg-stone-50">
                                    <TableHead>Name</TableHead>
                                    <TableHead>Class</TableHead>
                                    <TableHead>Folder Path</TableHead>
                                    <TableHead className="text-right w-28">Date Added</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                    {filesForTable.map((file) => (
                                        <TableRow key={file.file_id} onClick={() => handleFileRowClick(file)} className={cn("text-stone-800 h-[60px] cursor-pointer", previewedFile?.file_id === file.file_id && "ring-2 ring-inset ring-stone-400 bg-stone-100")}>
                                            <TableCell className="font-medium"><div className="flex items-center">{file.name}</div></TableCell>
                                            <TableCell className="text-muted-foreground"><div className="[display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden leading-tight">{classes.find(c => c.class_id === file.class_id)?.class_name || '...'}</div></TableCell>
                                            <TableCell className="text-muted-foreground"><div className="[display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden leading-tight">{getFolderPath(file)}</div></TableCell>
                                            <TableCell className="text-right text-muted-foreground text-sm">{new Date(file.created_at).toLocaleDateString()}</TableCell>
                                        </TableRow>
                                    ))}
                                 </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {filesForTable.map((file) => (
                                <FileGridCard 
                                    key={file.file_id} 
                                    file={file} 
                                    onClick={() => handleFileRowClick(file)} 
                                    isSelected={previewedFile?.file_id === file.file_id}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )
    };

    return (
        <>
            <Helmet>
                <title>Classes | Eido AI</title>
                <style>{`
                    html, body, #root { font-family: "Trebuchet MS", sans-serif;}
                    .bg-mushroom-100 { background-color: #75909C; } .bg-marble-100 { background-color: #F8F7F4; }
                    .border-marble-400 { border-color:rgb(176, 197, 206); } .text-green-700 { color: #39594D; }
                    .font-variable { font-family: "Trebuchet MS", sans-serif; } .text-volcanic-800 { color: #6B7280; }
                    .hover\\:text-volcanic-900:hover { color: #212121; }
                    .text-overline { font-size: 0.875rem; line-height: 1.25rem; letter-spacing: 0.05em; text-transform: uppercase; }
                    .text-logo { font-size: 1.125rem; line-height: 1.75rem; } .rounded-lg { border-radius: 0.5rem; }
                `}</style>
            </Helmet>
            <MainAppLayout pageTitle="Classes | Eido AI">
                <div className="flex-1 w-full bg-mushroom-100 flex flex-col relative">
                    <main className="absolute inset-0 flex flex-row gap-3 px-3 pb-3">
                        <div className="w-4/12 flex flex-col rounded-lg border border-marble-400 bg-white overflow-hidden">
                            <header className="flex items-center justify-between p-4 border-b border-marble-400 flex-shrink-0">
                                <div className="flex items-center gap-2 overflow-hidden">
                                {previewedFile ? (
                                        <a 
                                            href={`/api/serve-file?id=${previewedFile.file_id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-semibold text-sm text-muted-foreground truncate hover:text-stone-800 hover:underline"
                                            title={`Open ${previewedFile.name} in a new tab`}
                                        >
                                            {previewedFile.name}
                                        </a>
                                    ) : (
                                        <span className="font-semibold text-sm text-muted-foreground truncate">
                                            Select a file to preview
                                        </span>
                                    )}
                                </div>                            
                                <div className="flex items-center">
                                <a href={`/api/serve-file?id=${previewedFile?.file_id}`} target="_blank" rel="noopener noreferrer" className={!previewedFile ? 'pointer-events-none' : ''}title="Open in new tab">
                                    <Button variant="ghost" size="icon" className="text-stone-400 hover:bg-transparent hover:text-stone-900 focus-visible:ring-0 focus-visible:ring-offset-0" onClick={() => previewedFile?.url && window.open(previewedFile.url, '_blank')} disabled={!previewedFile?.url}title="Open in new tab"><ExternalLink className="h-4 w-4" /></Button></a>
                                    <Button variant="ghost" size="icon" className="text-stone-400 hover:bg-transparent hover:text-stone-900 focus-visible:ring-0 focus-visible:ring-offset-0" onClick={() => previewedFile && handleDeleteClick([previewedFile])} disabled={!previewedFile}><Trash2 className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="text-stone-400 hover:bg-transparent hover:text-stone-900 focus-visible:ring-0 focus-visible:ring-offset-0" onClick={() => setPreviewedFile(null)} disabled={!previewedFile}><X className="h-4 w-4" /></Button>
                                </div>
                            </header>
                            <div className={cn(
                                "flex-grow m-4 rounded-md border border-marble-400 flex items-center justify-center overflow-hidden transition-all bg-white"
                            )}>
                                {renderFilePreview()}
                            </div>
                        </div>
                        <div className="w-8/12 flex flex-col rounded-lg border border-marble-400 bg-white overflow-hidden">{renderContent()}</div>
                    </main>
                    <UploadProgressToast files={uploadingFiles} onClear={() => setUploadingFiles([])} />
                </div>
            </MainAppLayout>
            <CreateClassDialog
                isOpen={isCreateClassOpen}
                onClose={() => setIsCreateClassOpen(false)}
                onSubmit={handleCreateClass}
                isLoading={isSubmitting}
            />
            <NewFolderDialog
                isOpen={isNewFolderOpen}
                onClose={() => setIsNewFolderOpen(false)}
                onSubmit={handleCreateFolder}
                isLoading={isSubmitting}
            />
            <UploadDialog
                isOpen={isUploadOpen}
                onClose={() => setIsUploadOpen(false)}
                onUpload={(fileList) => handleUploadFiles(Array.from(fileList))}
                isUploading={isSubmitting}
            />
            <AlertDialog open={filesToDelete.length > 0} onOpenChange={(open) => !open && setFilesToDelete([])}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {filesToDelete.length} selected file(s)? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={isDeleteClassConfirmationOpen} onOpenChange={setIsDeleteClassConfirmationOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Class "{classToDelete?.class_name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the class "{classToDelete?.class_name}"? This will permanently remove the class and all associated files, folders, chats, flashcards, and quizzes. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingClass}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteClass} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isDeletingClass}>
                            {isDeletingClass ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Delete Class
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
export default ClassesPage;