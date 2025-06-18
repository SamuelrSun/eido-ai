// src/pages/DatasetsPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FolderPlus, FileText, MoreHorizontal, Download, Trash2, X, Loader2 } from 'lucide-react';
import { FolderCard } from '@/components/datasets/FolderCard';
import { ClassCard } from '@/components/datasets/ClassCard'; 
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

const DatasetsPage = () => {
    // State
    const [user, setUser] = useState<User | null>(null);
    const [classes, setClasses] = useState<ClassConfig[]>([]);
    const [folders, setFolders] = useState<FolderType[]>([]);
    const [allUserFolders, setAllUserFolders] = useState<FolderType[]>([]);
    const [files, setFiles] = useState<FileType[]>([]);
    const [allClassFiles, setAllClassFiles] = useState<FileType[]>([]);
    const [allFiles, setAllFiles] = useState<any[]>([]);
    const [recentFiles, setRecentFiles] = useState<FileType[]>(() => {
        try {
            const item = window.localStorage.getItem('eidoRecentFiles');
            return item ? JSON.parse(item) : [];
        } catch (error) {
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

    useEffect(() => {
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
    }, []);

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
                 const [fetchedClasses, fetchedAllFiles] = await Promise.all([
                    classOpenAIConfigService.getAllClasses(),
                    fileService.getAllFilesWithClass()
                ]);
                setClasses(fetchedClasses);
                setAllFiles(fetchedAllFiles);
                setFolders([]);
                setFiles([]);
            }
        } catch (error) {
            toast({ title: 'Error fetching data', description: (error as Error).message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [user, selectedClass, currentFolderId, toast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        try { localStorage.setItem('eidoRecentFiles', JSON.stringify(recentFiles)); } 
        catch (error) { console.error("Error saving recent files to localStorage", error); }
    }, [recentFiles]);

    const handleClassClick = (classData: ClassConfig) => {
        setSelectedClass(classData);
        setBreadcrumbs([{ name: 'Home', id: null }, { name: classData.title, id: classData.class_id }]);
    };
    const handleFolderClick = (folderData: FolderType) => {
        setCurrentFolderId(folderData.folder_id);
        setBreadcrumbs([...breadcrumbs, { name: folderData.name, id: folderData.folder_id }]);
    };
    const handleBreadcrumbClick = (index: number) => {
        if (index === 0) { setSelectedClass(null); setCurrentFolderId(null); } 
        else {
            const clickedCrumb = breadcrumbs[index];
            if (clickedCrumb.id === selectedClass?.class_id) { setCurrentFolderId(null); } 
            else { setCurrentFolderId(clickedCrumb.id); }
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
            if (filesToDelete.some(f => f.file_id === previewedFile?.file_id)) { setPreviewedFile(null); }
            fetchData();
            if (selectionMode) { toggleSelectionMode(); }
        } catch (error) {
            toast({ title: "Deletion Failed", description: (error as Error).message, variant: "destructive" });
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
             await fileService.createClass(className);
            toast({ title: "Class Created", description: `"${className}" created.` });
            fetchData();
        } catch (error) {
            toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
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
                description: `"${classToDelete.title}" and all its associated data have been permanently removed.`,
            });
            setRecentFiles(prev => prev.filter(file => file.class_id !== classToDelete.class_id));
            fetchData(); 
        } catch (error) {
            toast({
                title: "Deletion Failed",
                description: (error as Error).message,
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
        } catch (error) {
            toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
            setIsNewFolderOpen(false);
        }
    };

    // *** FIX START: MODIFIED THIS ENTIRE FUNCTION ***
    const handleUploadFiles = async (filesToUpload: File[]) => {
        if (!user) {
             toast({ title: "Authentication Error", description: "You must be logged in to upload files.", variant: "destructive" });
             return;
        }
        // This is the critical check. We ensure a class/container is selected before proceeding.
        if (!selectedClass) {
            toast({
                title: "No Destination Selected",
                description: "Please select a Class/Container from the list before uploading files.",
                variant: "default",
            });
            return;
        }

        setIsSubmitting(true);
        setIsUploadOpen(false);

        let successCount = 0;
        let errorCount = 0;

        toast({ title: `Starting upload for ${filesToUpload.length} file(s)...`, description: "Processing files one by one for reliability." });

        for (const file of filesToUpload) {
            try {
                const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                // The selectedClass.class_id is now guaranteed to exist here
                const storagePath = `${user.id}/${selectedClass.class_id}/${currentFolderId || 'root'}/${Date.now()}-${sanitizedName}`;

                const { data: storageData, error: uploadError } = await supabase.storage.from('file_storage').upload(storagePath, file);
                if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`);

                const processingPayload = {
                    storage_path: storageData!.path,
                    original_name: file.name,
                    mime_type: file.type,
                    size: file.size,
                    class_id: selectedClass.class_id,
                    folder_id: currentFolderId,
                };

                const { data: functionResponse, error: functionError } = await supabase.functions.invoke('upload-to-vector-store', {
                    body: { files: [processingPayload] }
                });

                if (functionError) throw new Error(`Processing Error: ${functionError.message}`);
                
                const result = functionResponse.results?.[0];
                if (!result || !result.success) {
                    throw new Error(result?.error || `Server failed to process ${file.name}`);
                }
                
                successCount++;
            } catch (error) {
                errorCount++;
                toast({ title: `Error processing ${file.name}`, description: (error as Error).message, variant: "destructive" });
            }
        }
        
        toast({ title: "Upload Session Finished", description: `${successCount} successful, ${errorCount} failed.`});
        setIsSubmitting(false);
        fetchData();
    };
    // *** FIX END ***

    const handleHeaderButtonClick = () => {
        if (selectedClass) { setIsUploadOpen(true); } 
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
        const folderMap = new Map(allUserFolders.map(f => [f.folder_id, f]));
        const fileMapByFolder = new Map<string, FileType[]>();
        
        allClassFiles.forEach(file => {
            const folderId = file.folder_id || 'root';
            if (!fileMapByFolder.has(folderId)) {
                fileMapByFolder.set(folderId, []);
            }
            fileMapByFolder.get(folderId)!.push(file);
        });

        const statsCache = new Map<string, { count: number; size: number }>();
        const getFolderStats = (folderId: string): { count: number; size: number } => {
            if (statsCache.has(folderId)) return statsCache.get(folderId)!;
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
            return {...folder, files: stats.count, size: formatFileSize(stats.size)}
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
        const fileType = previewedFile.type || '';
        const fileUrl = previewedFile.url || '';
        if (fileType.startsWith('image/')) { return <img src={fileUrl} alt={previewedFile.name} className="max-w-full max-h-full object-contain" />; }
        if (fileType === 'application/pdf') { return <iframe src={`${fileUrl}#toolbar=0`} className="w-full h-full" title={previewedFile.name}></iframe>; }
        return <pre className="w-full h-full text-sm whitespace-pre-wrap p-4">{`Preview for this file type is not supported.`}</pre>;
    };

    const renderContent = () => {
        if (isLoading) { return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>; }
        const filesForTable = selectedClass ? files : recentFiles;
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
                {selectedClass ? (
                    <div className="space-y-4">
                        <h2 className="text-sm uppercase font-semibold text-muted-foreground">Folders</h2>
                        <Separator className="my-4" />
                        {foldersWithStats.length > 0 ? (
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {foldersWithStats.map((folder) => (
                                    <FolderCard key={folder.folder_id} {...folder} isSelected={false} onClick={() => handleFolderClick(folder)} />
                                ))}
                            </div>
                        ) : (<p className="text-sm text-muted-foreground">No folders in this directory.</p>)}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <h2 className="text-sm uppercase font-semibold text-muted-foreground">Classes</h2>
                        <Separator className="my-4" />
                        {classesWithStats.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {classesWithStats.map((classItem) => (
                                    <ClassCard 
                                        key={classItem.class_id} 
                                        id={classItem.class_id}
                                        name={classItem.title} 
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
                        {!selectionMode ? (
                             <Button variant="outline" size="sm" onClick={toggleSelectionMode}>Select</Button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(filesForTable.filter(f => selectedFileIds.includes(f.file_id)))} disabled={selectedFileIds.length === 0}>
                                    <Trash2 className="h-4 w-4 mr-2" />Delete ({selectedFileIds.length})</Button>
                                <Button variant="ghost" size="sm" onClick={toggleSelectionMode}>Cancel</Button>
                            </div>
                        )}
                    </div>
                    <Separator className="my-4" />
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader><TableRow className="bg-stone-50 hover:bg-stone-50">
                                {selectionMode && <TableHead className="w-12"></TableHead>}
                                <TableHead>Name</TableHead>
                                <TableHead>Class</TableHead>
                                <TableHead>Folder Path</TableHead>
                                <TableHead className="text-right w-28">Date Added</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {filesForTable.length > 0 ? filesForTable.map((file) => (
                                    <TableRow key={file.file_id} onClick={() => handleFileRowClick(file)} className={cn("text-stone-800 h-[60px] cursor-pointer", previewedFile?.file_id === file.file_id && "ring-2 ring-inset ring-stone-400 bg-stone-100", selectedFileIds.includes(file.file_id) && "bg-stone-100")}>
                                        {selectionMode && (<TableCell className="w-12" onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedFileIds.includes(file.file_id)} onCheckedChange={() => handleFileSelect(file.file_id)}/></TableCell>)}
                                        <TableCell className="font-medium"><div className="flex items-center">{file.name}</div></TableCell>
                                        <TableCell className="text-muted-foreground"><div className="[display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden leading-tight">{classes.find(c => c.class_id === file.class_id)?.title || '...'}</div></TableCell>
                                        <TableCell className="text-muted-foreground"><div className="[display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden leading-tight">{getFolderPath(file)}</div></TableCell>
                                        <TableCell className="text-right text-muted-foreground text-sm">{new Date(file.created_at).toLocaleDateString()}</TableCell>
                                    </TableRow>
                                )) : (<TableRow><TableCell colSpan={selectionMode ? 5 : 4} className="h-24 text-center text-muted-foreground">No files to display.</TableCell></TableRow>)}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        )
    };

    return (
        <>
        <Helmet>
           <title>Classes | Eido AI</title>
            <style>{`
                html, body, #root { font-family: "Trebuchet MS", sans-serif; height: 100%; }
                .bg-mushroom-100 { background-color: #75909C; } .bg-marble-100 { background-color: #F8F7F4; }
                .border-marble-400 { border-color:rgb(176, 197, 206); } .text-green-700 { color: #39594D; }
                .font-variable { font-family: "Trebuchet MS", sans-serif; } .text-volcanic-800 { color: #6B7280; }
                .hover\\:text-volcanic-900:hover { color: #212121; }
                .text-overline { font-size: 0.875rem; line-height: 1.25rem; letter-spacing: 0.05em; text-transform: uppercase; }
                .text-logo { font-size: 1.125rem; line-height: 1.75rem; } .rounded-lg { border-radius: 0.5rem; }
            `}</style>
        </Helmet>
        <div className="h-screen w-full bg-mushroom-100 flex flex-col">
            <div className="p-3 flex-shrink-0">
                <nav className="z-navigation flex w-full items-center justify-between rounded-lg border border-marble-400 bg-marble-100 px-4 py-3">
                    <a data-element="Link" href="/"><div className="mr-3 flex items-baseline"><span className="text-logo lowercase font-variable ml-1 font-light text-green-700">eido ai</span></div></a>
                    <div className="hidden md:flex flex-row items-center gap-x-4 gap-y-0 lg:gap-x-6 justify-between">
                        <Link to="/"><p className="text-overline uppercase font-code text-volcanic-800 hover:text-volcanic-900">Dashboard</p></Link>
                        <a href="/datasets"><p className="text-overline uppercase font-bold text-stone-900">Classes</p></a>
                        <a target="_blank" rel="noopener noreferrer" href="https://docs.cohere.com/"><p className="text-overline uppercase font-code text-volcanic-800 hover:text-volcanic-900">Docs</p></a>
                        <a target="_blank" rel="noopener noreferrer" href="#"><p className="text-overline uppercase font-code text-volcanic-800 hover:text-volcanic-900">Community</p></a>
                    </div>
                </nav>
            </div>
            <main className="flex-grow flex flex-row gap-3 px-3 pb-3 min-h-0">
                <div className="w-4/12 flex flex-col rounded-lg border border-marble-400 bg-marble-100 overflow-hidden">
                    <header className="flex items-center justify-between p-4 border-b border-marble-400 flex-shrink-0">
                        <div className="flex items-center gap-2 overflow-hidden"><span className="font-semibold text-sm text-muted-foreground truncate">{previewedFile ? previewedFile.name : "Select a file to preview"}</span></div>
                        <div className="flex items-center">
                            <Button variant="ghost" size="icon" className="text-stone-400 hover:bg-transparent hover:text-stone-900 focus-visible:ring-0 focus-visible:ring-offset-0" onClick={handleDownload} disabled={!previewedFile}><Download className="h-4 w-4" /></Button>
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
            <AlertDialog open={isDeleteClassConfirmationOpen} onOpenChange={setIsDeleteClassConfirmationOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the class 
                            <span className="font-bold"> "{classToDelete?.title}"</span> and all of its associated data, including files, folders, and AI memory.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingClass}>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={confirmDeleteClass} 
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                            disabled={isDeletingClass}
                        >
                            {isDeletingClass ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            {isDeletingClass ? 'Deleting...' : 'Delete Permanently'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={filesToDelete.length > 0} onOpenChange={(open) => !open && setFilesToDelete([])}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete {filesToDelete.length} file(s). This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <CreateClassDialog isOpen={isCreateClassOpen} onClose={() => setIsCreateClassOpen(false)} onSubmit={handleCreateClass} isLoading={isSubmitting} />
            <NewFolderDialog isOpen={isNewFolderOpen} onClose={() => setIsNewFolderOpen(false)} onSubmit={handleCreateFolder} isLoading={isSubmitting} />
            <UploadDialog isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} onUpload={handleUploadFiles} isUploading={isSubmitting} />
        </div>
        </>
    );
};

export default DatasetsPage;