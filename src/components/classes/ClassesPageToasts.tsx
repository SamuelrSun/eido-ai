// src/components/classes/ClassesPageToasts.tsx
import React from 'react';
import { UploadProgressToast, UploadingFile } from '@/components/classes/UploadProgressToast';
import { DeletionProgressToast, DeletingFile } from '@/components/classes/DeletionProgressToast';

interface ClassesPageToastsProps {
    uploadingFiles: UploadingFile[];
    deletingFiles: DeletingFile[];
    setUploadingFiles: (files: UploadingFile[]) => void;
    setDeletingFiles: (files: DeletingFile[]) => void;
}

export const ClassesPageToasts: React.FC<ClassesPageToastsProps> = ({
    uploadingFiles,
    deletingFiles,
    setUploadingFiles,
    setDeletingFiles,
}) => {
    return (
        <>
            <UploadProgressToast files={uploadingFiles} onClear={() => setUploadingFiles([])} />
            <DeletionProgressToast files={deletingFiles} onClear={() => setDeletingFiles([])} />
        </>
    );
};