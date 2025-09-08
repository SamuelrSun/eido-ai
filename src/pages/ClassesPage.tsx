// src/pages/ClassesPage.tsx
import React, { useState } from 'react';
import { useClassesPage } from '@/hooks/useClassesPage';
import { MainAppLayout } from '@/components/layout/MainAppLayout';
import { FilePreview } from '@/components/classes/FilePreview';
import { ClassesHeader } from '@/components/classes/ClassesHeader';
import { ClassesView } from '@/components/classes/ClassesView';
import { FilesView } from '@/components/classes/FilesView';
import { ClassesPageDialogs } from '@/components/classes/ClassesPageDialogs';
import { ClassesPageToasts } from '@/components/classes/ClassesPageToasts';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ClassMembersView } from '@/components/classes/ClassMembersView';
import { cn } from '@/lib/utils';

const ClassesPage = () => {
    const hook = useClassesPage();
    const [activeTab, setActiveTab] = useState('files');

    React.useEffect(() => {
        setActiveTab('files');
    }, [hook.selectedClass]);

    return (
        <MainAppLayout pageTitle="Classes | Eido AI">
            <div className="flex flex-row gap-3 h-full">
                <FilePreview
                    previewedFile={hook.previewedFile}
                    onDeleteClick={hook.setFilesToDelete}
                    onClosePreview={() => hook.setPreviewedFile(null)}
                />
                <div className="w-8/12 flex flex-col rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden">
                    <div className="p-6 md:p-8 space-y-8 overflow-y-auto">
                        <ClassesHeader
                            breadcrumbs={hook.breadcrumbs}
                            selectedClass={hook.selectedClass}
                            onBreadcrumbClick={hook.handleBreadcrumbClick}
                            onNewFolderClick={() => hook.setIsNewFolderOpen(true)}
                            onHeaderButtonClick={() => hook.selectedClass ? hook.setIsUploadOpen(true) : hook.setIsCreateClassOpen(true)}
                            onJoinClassClick={() => hook.setIsJoinClassOpen(true)}
                        />
                        
                        {hook.selectedClass ? (
                            <div>
                                <ToggleGroup 
                                    type="single" 
                                    value={activeTab} 
                                    onValueChange={(value) => { if (value) setActiveTab(value); }}
                                    className="border border-neutral-800 rounded-md p-0 w-min"
                                >
                                    <ToggleGroupItem value="files" className={cn("text-neutral-400 h-8 px-4 text-sm hover:bg-neutral-800 rounded-none rounded-l-md border-none data-[state=on]:bg-neutral-800 data-[state=on]:text-white")}>Files</ToggleGroupItem>
                                    <ToggleGroupItem value="settings" className={cn("text-neutral-400 h-8 px-4 text-sm hover:bg-neutral-800 rounded-none border-l border-neutral-800 data-[state=on]:bg-neutral-800 data-[state=on]:text-white")}>Settings</ToggleGroupItem>
                                </ToggleGroup>
                                
                                <div className="mt-6">
                                    {activeTab === 'files' && (
                                        <FilesView
                                            isLoading={hook.isLoading}
                                            foldersWithStats={hook.foldersWithStats}
                                            filesForTable={hook.files}
                                            viewMode={hook.viewMode}
                                            setViewMode={hook.setViewMode}
                                            onFolderClick={hook.handleFolderClick}
                                            onFileRowClick={hook.handleFileRowClick}
                                            previewedFile={hook.previewedFile}
                                            classes={hook.classes}
                                            getFolderPath={hook.getFolderPath}
                                            selectedClass={hook.selectedClass}
                                            recentFiles={hook.recentFiles}
                                        />
                                    )}
                                    {activeTab === 'settings' && (
                                        // --- 6. PASS the new props down ---
                                        <ClassMembersView
                                            selectedClass={hook.selectedClass}
                                            isOwner={hook.classesWithStats.find(c => c.class_id === hook.selectedClass?.class_id)?.is_owner ?? false}
                                            classMembers={hook.classMembers}
                                            onRemoveMember={hook.handleRemoveMember}
                                            onLeaveClass={hook.handleLeaveClass}
                                            onApproveMember={hook.handleApproveMember}
                                            onRenameClass={hook.handleRenameClass}
                                            onDeleteClass={() => hook.handleDeleteClassClick(hook.selectedClass!)}
                                            activityLog={hook.activityLog}
                                            isLoadingActivity={hook.isLoadingActivity}
                                        />
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                <ClassesView
                                    isLoading={hook.isLoading}
                                    classesWithStats={hook.classesWithStats}
                                    onClassClick={hook.handleClassClick}
                                    onDeleteClassClick={() => { /* This is now handled in the settings tab */ }}
                                />
                                <FilesView
                                    isLoading={hook.isLoading}
                                    foldersWithStats={[]}
                                    filesForTable={hook.recentFiles}
                                    viewMode={hook.viewMode}
                                    setViewMode={hook.setViewMode}
                                    onFolderClick={() => {}}
                                    onFileRowClick={hook.handleFileRowClick}
                                    previewedFile={hook.previewedFile}
                                    classes={hook.classes}
                                    getFolderPath={hook.getFolderPath}
                                    selectedClass={null}
                                    recentFiles={hook.recentFiles}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>
            <ClassesPageToasts
                uploadingFiles={hook.uploadingFiles}
                deletingFiles={hook.deletingFiles}
                setUploadingFiles={hook.setUploadingFiles}
                setDeletingFiles={hook.setDeletingFiles}
            />
            <ClassesPageDialogs
                isCreateClassOpen={hook.isCreateClassOpen}
                setIsCreateClassOpen={hook.setIsCreateClassOpen}
                handleCreateClass={hook.handleCreateClass}
                isSubmitting={hook.isSubmitting}
                isJoinClassOpen={hook.isJoinClassOpen}
                setIsJoinClassOpen={hook.setIsJoinClassOpen}
                handleJoinClass={hook.handleJoinClass}
                isNewFolderOpen={hook.isNewFolderOpen}
                setIsNewFolderOpen={hook.setIsNewFolderOpen}
                handleCreateFolder={hook.handleCreateFolder}
                isUploadOpen={hook.isUploadOpen}
                setIsUploadOpen={hook.setIsUploadOpen}
                handleUploadFiles={hook.handleUploadFiles}
                filesToDelete={hook.filesToDelete}
                setFilesToDelete={hook.setFilesToDelete}
                isDeleting={hook.isDeleting}
                confirmDelete={hook.confirmDelete}
                isDeleteClassConfirmationOpen={hook.isDeleteClassConfirmationOpen}
                setIsDeleteClassConfirmationOpen={hook.setIsDeleteClassConfirmationOpen}
                classToDelete={hook.classToDelete}
                isDeletingClass={hook.isDeletingClass}
                confirmDeleteClass={hook.confirmDeleteClass}
            />
        </MainAppLayout>
    );
};
export default ClassesPage;