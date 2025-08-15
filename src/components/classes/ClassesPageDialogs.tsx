// src/components/classes/ClassesPageDialogs.tsx
import React from 'react';
import { CreateClassDialog } from '@/components/classes/CreateClassDialog';
import { NewFolderDialog } from '@/components/classes/NewFolderDialog';
import { UploadDialog } from '@/components/classes/UploadDialog';
// --- STAGE 3: IMPORT THE NEW DIALOG ---
import { JoinClassDialog } from '@/components/classes/JoinClassDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2 } from 'lucide-react';
import { ClassConfig } from '@/services/classOpenAIConfig';
import { FileType } from '@/features/files/types';

interface ClassesPageDialogsProps {
    isCreateClassOpen: boolean;
    setIsCreateClassOpen: (isOpen: boolean) => void;
    handleCreateClass: (className: string) => void;
    isSubmitting: boolean;

    // --- STAGE 3: ADD PROPS FOR JOIN CLASS DIALOG ---
    isJoinClassOpen: boolean;
    setIsJoinClassOpen: (isOpen: boolean) => void;
    handleJoinClass: (inviteCode: string) => void;

    isNewFolderOpen: boolean;
    setIsNewFolderOpen: (isOpen: boolean) => void;
    handleCreateFolder: (folderName: string) => void;

    isUploadOpen: boolean;
    setIsUploadOpen: (isOpen: boolean) => void;
    handleUploadFiles: (files: File[]) => void;

    filesToDelete: FileType[];
    setFilesToDelete: (files: FileType[]) => void;
    isDeleting: boolean;
    confirmDelete: () => void;

    isDeleteClassConfirmationOpen: boolean;
    setIsDeleteClassConfirmationOpen: (isOpen: boolean) => void;
    classToDelete: ClassConfig | null;
    isDeletingClass: boolean;
    confirmDeleteClass: () => void;
}

export const ClassesPageDialogs: React.FC<ClassesPageDialogsProps> = ({
    isCreateClassOpen, setIsCreateClassOpen, handleCreateClass, isSubmitting,
    isJoinClassOpen, setIsJoinClassOpen, handleJoinClass, // Destructure new props
    isNewFolderOpen, setIsNewFolderOpen, handleCreateFolder,
    isUploadOpen, setIsUploadOpen, handleUploadFiles,
    filesToDelete, setFilesToDelete, isDeleting, confirmDelete,
    isDeleteClassConfirmationOpen, setIsDeleteClassConfirmationOpen, classToDelete, isDeletingClass, confirmDeleteClass
}) => {
    return (
        <>
            <CreateClassDialog
                isOpen={isCreateClassOpen}
                onClose={() => setIsCreateClassOpen(false)}
                onSubmit={handleCreateClass}
                isLoading={isSubmitting}
            />
            {/* --- STAGE 3: RENDER THE NEW DIALOG --- */}
            <JoinClassDialog
                isOpen={isJoinClassOpen}
                onClose={() => setIsJoinClassOpen(false)}
                onSubmit={handleJoinClass}
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
                    <AlertDialogHeader><AlertDialogTitle>Confirm Deletion</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete {filesToDelete.length} selected file(s)? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isDeleting}>{isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={isDeleteClassConfirmationOpen} onOpenChange={setIsDeleteClassConfirmationOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete Class "{classToDelete?.class_name}"?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete the class "{classToDelete?.class_name}"? This will permanently remove the class and all associated files, folders, chats, flashcards, and quizzes. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingClass}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteClass} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isDeletingClass}>{isDeletingClass && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete Class</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};