// src/hooks/useClassesPage.ts
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { usePageLoader } from '@/context/LoaderContext';
import { supabase } from '@/integrations/supabase/client';
import { User, RealtimeChannel } from '@supabase/supabase-js';
import { ClassConfig, classOpenAIConfigService } from '@/services/classOpenAIConfig';
import { fileService } from '@/services/fileService';
import { FolderType, FileType } from '@/features/files/types';
import { UploadingFile } from '@/components/classes/UploadProgressToast';
import { DeletingFile } from '@/components/classes/DeletionProgressToast';
import { formatFileSize } from '@/lib/utils';
import { ClassMember } from '@/components/classes/ClassMembersView';
import { useLocation, useNavigate } from 'react-router-dom';
// --- 1. IMPORT activity service and types ---
import { activityService, ClassActivity } from '@/services/activityService';

export const useClassesPage = () => {
    const { loader } = usePageLoader();
    const { toast } = useToast();
    const location = useLocation();
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [classes, setClasses] = useState<ClassConfig[]>([]);
    const [folders, setFolders] = useState<FolderType[]>([]);
    const [allUserFolders, setAllUserFolders] = useState<FolderType[]>([]);
    const [files, setFiles] = useState<FileType[]>([]);
    const [allClassFiles, setAllClassFiles] = useState<FileType[]>([]);
    const [allFiles, setAllFiles] = useState<(FileType & { class: string; })[]>([]);
    // --- 2. ADD state for the activity log ---
    const [activityLog, setActivityLog] = useState<ClassActivity[]>([]);
    const [isLoadingActivity, setIsLoadingActivity] = useState(false);
    const [recentFiles, setRecentFiles] = useState<FileType[]>(() => {
        try {
            const item = window.localStorage.getItem('eidoRecentFiles');
            return item ? JSON.parse(item) as FileType[] : [];
        } catch (error) {
            console.error("Error parsing recent files from localStorage", error);
            return [];
        }
    });
    const [selectedClass, setSelectedClass] = useState<ClassConfig | null>(null);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<{ name: string; id: string | null }[]>([{ name: 'Home', id: null }]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [filesToDelete, setFilesToDelete] = useState<FileType[]>([]);
    const [deletingFiles, setDeletingFiles] = useState<DeletingFile[]>([]);
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
    const [isJoinClassOpen, setIsJoinClassOpen] = useState(false);
    const [classMembers, setClassMembers] = useState<ClassMember[]>([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);

    const handleClassClick = useCallback((classData: ClassConfig) => {
        setSelectedClass(classData);
        setViewMode('grid');
        setBreadcrumbs([{ name: 'Home', id: null }, { name: classData.class_name, id: classData.class_id }]);
        sessionStorage.setItem('activeClass', JSON.stringify({ class_id: classData.class_id, class_name: classData.class_name }));
    }, []);
    
    const handleRenameClass = async (classId: string, newName: string) => {
        try {
            const updatedClass = await classOpenAIConfigService.saveConfigForClass(newName, classId);
            setClasses(prev => prev.map(c => c.class_id === classId ? { ...c, ...updatedClass } : c));
            if (selectedClass?.class_id === classId) {
                setSelectedClass(prev => prev ? { ...prev, class_name: newName } : null);
                setBreadcrumbs(prev => prev.map(b => b.id === classId ? { ...b, name: newName } : b));
                sessionStorage.setItem('activeClass', JSON.stringify({ class_id: classId, class_name: newName }));
            }
        } catch(error) {
            console.error("Failed to rename class:", error);
            throw error;
        }
    };
    
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
            setInitialLoadComplete(true);
        };
        fetchUserAndInitialData();
        return () => {
            if (fileSubscription.current) {
                supabase.removeChannel(fileSubscription.current);
            }
        };
    }, [loader]);
    
    useEffect(() => {
        if (initialLoadComplete && classes.length > 0) {
            const classFromState = location.state?.selectedClass as ClassConfig | undefined;
            if (classFromState) {
                const fullClassData = classes.find(c => c.class_id === classFromState.class_id);
                if (fullClassData) {
                    handleClassClick(fullClassData);
                    navigate(location.pathname, { replace: true, state: {} });
                }
            }
        }
    }, [initialLoadComplete, classes, location.state, handleClassClick, navigate]);

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
        if (selectedClass) {
            setIsLoadingMembers(true);
            setIsLoadingActivity(true);
        }

        try {
            if (selectedClass) {
                const [fetchedFolders, fetchedFiles, fetchedAllClassFiles, fetchedMembers, fetchedActivity] = await Promise.all([
                    fileService.getFolders(selectedClass.class_id, currentFolderId),
                    fileService.getFiles(selectedClass.class_id, currentFolderId),
                    fileService.getAllFilesForClass(selectedClass.class_id),
                    classOpenAIConfigService.getClassMembers(selectedClass.class_id),
                    // --- 3. FETCH activity log data ---
                    activityService.getActivityForClass(selectedClass.class_id),
                ]);
                setFolders(fetchedFolders);
                setFiles(fetchedFiles);
                setAllClassFiles(fetchedAllClassFiles);
                setClassMembers(fetchedMembers);
                // --- 4. SET activity log state ---
                setActivityLog(fetchedActivity);
            } else {
                const [fetchedClasses, fetchedAllFilesResult] = await Promise.all([
                    classOpenAIConfigService.getAllClasses(),
                    fileService.getAllFilesWithClass()
                ]);
                setClasses(fetchedClasses);
                setAllFiles(fetchedAllFilesResult as (FileType & { class: string })[]);
                setFolders([]);
                setFiles([]);
                setClassMembers([]);
                // --- 4. CLEAR activity log state when no class is selected ---
                setActivityLog([]);
            }
        } catch (error) {
            toast({ title: 'Error fetching data', description: (error instanceof Error) ? error.message : "An unknown error occurred.", variant: 'destructive' });
        } finally {
            setIsLoading(false);
            setIsLoadingMembers(false);
            setIsLoadingActivity(false);
            if (loader) loader.complete();
        }
    }, [user, selectedClass, currentFolderId, toast, loader]);
    
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleJoinClass = async (inviteCode: string) => {
        if (!inviteCode.trim()) {
            toast({ title: "Error", description: "Invite code cannot be empty.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        try {
            const { error, data } = await supabase.functions.invoke('join-class', {
                body: { invite_code: inviteCode.trim() },
            });
            
            if (error) throw new Error(error.message);
            if (data?.error) throw new Error(data.error);

            toast({ title: "Success!", description: data.message });
        } catch (error) {
            toast({ title: "Error Joining Class", description: (error as Error).message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
            setIsJoinClassOpen(false);
        }
    };
    
    const handleLeaveClass = async (classId: string) => {
        try {
            const { error } = await supabase.functions.invoke('leave-class', {
                body: { class_id: classId }
            });
            if (error) throw error;
            toast({ title: "You have left the class." });
            handleBreadcrumbClick(0); 
            await fetchData();
        } catch(error) {
            toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
        }
    };

    const handleRemoveMember = async (classId: string, memberId: string) => {
        try {
            const { error } = await supabase.functions.invoke('remove-class-member', {
                body: { class_id: classId, member_id: memberId }
            });
            if (error) throw error;
            toast({ title: "Member removed." });
            const members = await classOpenAIConfigService.getClassMembers(classId);
            setClassMembers(members);
        } catch(error) {
            toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
        }
    };

    const handleApproveMember = async (classId: string, memberId: string) => {
        try {
             const { error } = await supabase.functions.invoke('approve-class-member', {
                body: { class_id: classId, member_id: memberId }
            });
            if (error) throw error;
            toast({ title: "Member Approved" });
            const members = await classOpenAIConfigService.getClassMembers(classId);
            setClassMembers(members);
        } catch(error) {
             toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
        }
    };

    const classesWithStats = useMemo(() => {
        if (!classes || !user) return [];
        return classes.map(cls => {
            return { 
                ...cls, 
                files: cls.file_count || 0,
                size: formatFileSize(cls.total_size || 0),
                is_owner: cls.owner_id === user.id,
                is_shared: (cls.member_count || 0) > 1
            };
        });
    }, [classes, user]);

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

        const tempFileEntries: FileType[] = newUploads.map(upload => {
            const file = filesToUpload.find(f => f.name === upload.name)!;
            return {
                file_id: upload.id, name: file.name, size: file.size, type: file.type,
                status: 'processing', folder_id: currentFolderId, user_id: user.id,
                class_id: selectedClass.class_id, last_modified: new Date().toISOString(),
                created_at: new Date().toISOString(), category: null, tags: null
            };
        });
        setFiles(prev => [...prev, ...tempFileEntries]);

        for (const file of filesToUpload) {
            setUploadingFiles(prev => prev.map(uf => uf.name === file.name ? { ...uf, status: 'uploading' } : uf));
            try {
                const storagePath = `${user.id}/${selectedClass.class_id}/${currentFolderId || 'root'}/${Date.now()}-${file.name}`;
                const { data: storageData, error: uploadError } = await supabase.storage.from('file_storage').upload(storagePath, file);
                if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`);

                const processingPayload = {
                    storage_path: storageData.path, original_name: file.name,
                    mime_type: file.type, size: file.size, class_id: selectedClass.class_id,
                    folder_id: currentFolderId,
                };

                const { error: functionError } = await supabase.functions.invoke('upload-file', { body: processingPayload });
                if (functionError) throw new Error(`Function Error: ${functionError.message}`);

                setUploadingFiles(prev => prev.map(uf => uf.name === file.name ? { ...uf, status: 'processing' } : uf));
            } catch (error) {
                setUploadingFiles(prev => prev.map(uf => uf.name === file.name ? { ...uf, status: 'error', errorMessage: (error as Error).message } : uf));
                toast({ title: `Error starting upload for ${file.name}`, description: (error instanceof Error) ? error.message : "An unknown error occurred.", variant: "destructive" });
            }
        }
        setIsSubmitting(false);
    };

    const handleFolderClick = (folderData: FolderType) => {
        setCurrentFolderId(folderData.folder_id);
        setBreadcrumbs([...breadcrumbs, { name: folderData.name, id: folderData.folder_id }]);
    };

    useEffect(() => {
        if (!user || !selectedClass) {
            if (fileSubscription.current) {
                supabase.removeChannel(fileSubscription.current);
                fileSubscription.current = null;
            }
            return;
        }

        const channelId = `files-class-${selectedClass.class_id}`;
        if (fileSubscription.current?.topic.includes(channelId)) return;

        if (fileSubscription.current) supabase.removeChannel(fileSubscription.current);

        const channel = supabase.channel(channelId).on<FileType>(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'files', filter: `class_id=eq.${selectedClass.class_id}` },
            (payload) => {
                const newOrUpdatedFile = payload.new as FileType;
                if (!newOrUpdatedFile?.file_id) return;

                const updateOrAddFile = (prev: FileType[], file: FileType) => {
                    const withoutPlaceholder = prev.filter(f => !(f.name === file.name && f.file_id.startsWith('temp-upload-')));
                    const fileIndex = withoutPlaceholder.findIndex(f => f.file_id === file.file_id);
                    return fileIndex !== -1 ? withoutPlaceholder.map((f, i) => i === fileIndex ? file : f) : [...withoutPlaceholder, file];
                };

                setAllClassFiles(prev => updateOrAddFile(prev, newOrUpdatedFile));
                if (newOrUpdatedFile.folder_id === currentFolderId || (currentFolderId === null && newOrUpdatedFile.folder_id === null)) {
                    setFiles(prev => updateOrAddFile(prev, newOrUpdatedFile));
                }

                const recordForToast = (payload.new || payload.old) as FileType;
                if (recordForToast) {
                    setUploadingFiles(prev => prev.map(uf => {
                        if (uf.name === recordForToast.name) {
                            const newStatus = (recordForToast.status === 'complete' || recordForToast.status === 'processed_text') ? 'complete' : recordForToast.status === 'error' ? 'error' : 'processing';
                            return { ...uf, status: newStatus };
                        }
                        return uf;
                    }));
                }
            }
        ).subscribe((status, err) => {
            if (err) console.error(`Realtime subscription failed for ${channelId}:`, err);
        });

        fileSubscription.current = channel;

        return () => {
            if (fileSubscription.current) {
                supabase.removeChannel(fileSubscription.current);
                fileSubscription.current = null;
            }
        };
    }, [user, selectedClass, currentFolderId]);

    const handleBreadcrumbClick = (index: number) => {
        const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
        setBreadcrumbs(newBreadcrumbs);
        const clickedCrumb = newBreadcrumbs[index];

        if (index === 0) {
            setSelectedClass(null);
            setCurrentFolderId(null);
            sessionStorage.removeItem('activeClass');
        } else {
            const classCrumb = newBreadcrumbs[1];
            setSelectedClass(classes.find(c => c.class_id === classCrumb.id) || null);
            setCurrentFolderId(clickedCrumb.id === classCrumb.id ? null : clickedCrumb.id);
        }
    };

    const getFolderPath = useCallback((file: FileType): string => {
        if (!file.folder_id) return '/';
        let path = '';
        let currentId: string | null = file.folder_id;
        while (currentId) {
            const folder = allUserFolders.find(f => f.folder_id === currentId && f.class_id === file.class_id);
            if (folder) { path = `/${folder.name}${path}`; currentId = folder.parent_id; }
            else break;
        }
        return path || '/';
    }, [allUserFolders]);

    const handleFileRowClick = (file: FileType) => {
        setPreviewedFile(file);
        setRecentFiles(prev => [file, ...prev.filter(f => f.file_id !== file.file_id)].slice(0, 10));
    };

    const confirmDelete = async () => {
        if (filesToDelete.length === 0) return;
        setIsDeleting(true);
        const itemsToProcess: DeletingFile[] = filesToDelete.map(file => ({ id: file.file_id, name: file.name, status: 'pending' }));
        setDeletingFiles(itemsToProcess);

        for (const file of filesToDelete) {
            try {
                setDeletingFiles(prev => prev.map(f => f.id === file.file_id ? { ...f, status: 'deleting' } : f));
                await fileService.deleteFile(file);
                setDeletingFiles(prev => prev.map(f => f.id === file.file_id ? { ...f, status: 'complete' } : f));
            } catch (error) {
                setDeletingFiles(prev => prev.map(f => f.id === file.file_id ? { ...f, status: 'error', errorMessage: (error as Error).message } : f));
                toast({ title: "Deletion Failed", description: (error as Error).message, variant: "destructive" });
            }
        }

        toast({ title: "Deletion process finished" });
        const deletedFileIds = new Set(filesToDelete.map(f => f.file_id));
        setRecentFiles(prev => prev.filter(file => !deletedFileIds.has(file.file_id)));
        if (filesToDelete.some(f => f.file_id === previewedFile?.file_id)) setPreviewedFile(null);
        fetchData();
        setFilesToDelete([]);
        setIsDeleting(false);
    };

    const handleCreateClass = async (className: string) => {
        setIsSubmitting(true);
        try {
            await classOpenAIConfigService.saveConfigForClass(className);
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
    
        const classIdToDelete = classToDelete.class_id;
        const classNameToDelete = classToDelete.class_name;
    
        setIsDeletingClass(true);
        setIsDeleteClassConfirmationOpen(false);
    
        try {
            await classOpenAIConfigService.deleteClass(classIdToDelete);
    
            setClasses(prev => prev.filter(c => c.class_id !== classIdToDelete));
            setRecentFiles(prev => prev.filter(file => file.class_id !== classIdToDelete));
            
            if (selectedClass?.class_id === classIdToDelete) {
                setSelectedClass(null);
                setCurrentFolderId(null);
                setBreadcrumbs([{ name: 'Home', id: null }]);
                sessionStorage.removeItem('activeClass');
            }
    
            if (previewedFile?.class_id === classIdToDelete) {
                setPreviewedFile(null);
            }
            
            toast({
                title: "Class Deleted",
                description: `"${classNameToDelete}" and all associated data have been permanently removed.`
            });
    
        } catch (error) {
            toast({
                title: "Deletion Failed",
                description: (error as Error).message,
                variant: "destructive"
            });
            fetchData();
        } finally {
            setIsDeletingClass(false);
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

    const foldersWithStats = useMemo(() => {
        if (!folders.length) return [];
        const fileMapByFolder = new Map<string, FileType[]>();
        allClassFiles.forEach(file => {
            const folderId = file.folder_id || 'root';
            if (!fileMapByFolder.has(folderId)) fileMapByFolder.set(folderId, []);
            fileMapByFolder.get(folderId)?.push(file);
        });
        const statsCache = new Map<string, { count: number; size: number }>();
        const getFolderStats = (folderId: string): { count: number; size: number } => {
            if (statsCache.has(folderId)) return statsCache.get(folderId)!;
            let count = fileMapByFolder.get(folderId)?.length || 0;
            let size = (fileMapByFolder.get(folderId) || []).reduce((acc, file) => acc + (file.size || 0), 0);
            allUserFolders.filter(f => f.parent_id === folderId).forEach(subFolder => {
                const subStats = getFolderStats(subFolder.folder_id);
                count += subStats.count;
                size += subStats.size;
            });
            statsCache.set(folderId, { count, size });
            return { count, size };
        };
        return folders.map(folder => {
            const stats = getFolderStats(folder.folder_id);
            return { ...folder, files: stats.count, size: formatFileSize(stats.size), folderName: folder.name };
        });
    }, [folders, allClassFiles, allUserFolders]);
    
    return {
        // --- 5. EXPORT the new state ---
        user, classes, folders, files, allClassFiles, allFiles, recentFiles, activityLog, isLoadingActivity,
        selectedClass, currentFolderId, breadcrumbs, isLoading, isDeleting,
        filesToDelete, deletingFiles, isCreateClassOpen, isNewFolderOpen,
        isUploadOpen, isSubmitting, previewedFile, isDeleteClassConfirmationOpen,
        classToDelete, isDeletingClass, viewMode, uploadingFiles,
        isJoinClassOpen, setIsJoinClassOpen, handleJoinClass,
        classMembers, isLoadingMembers, handleLeaveClass, handleRemoveMember, handleApproveMember,
        setRecentFiles, setSelectedClass, setCurrentFolderId, setBreadcrumbs,
        setIsLoading, setIsDeleting, setFilesToDelete, setDeletingFiles,
        setIsCreateClassOpen, setIsNewFolderOpen, setIsUploadOpen, setIsSubmitting,
        setPreviewedFile, setIsDeleteClassConfirmationOpen, setClassToDelete,
        setIsDeletingClass, setViewMode, setUploadingFiles,
        fetchData, handleUploadFiles, handleClassClick, handleFolderClick,
        handleBreadcrumbClick, getFolderPath, handleFileRowClick, confirmDelete,
        handleCreateClass, handleDeleteClassClick, confirmDeleteClass, handleCreateFolder,
        handleRenameClass,
        classesWithStats, foldersWithStats
    };
};