// src/pages/ClassesPage.tsx
import React from 'react';
import { useClassesPage } from '@/hooks/useClassesPage';
import { MainAppLayout } from '@/components/layout/MainAppLayout';
import { FilePreview } from '@/components/classes/FilePreview';
import { ClassesHeader } from '@/components/classes/ClassesHeader';
import { ClassesView } from '@/components/classes/ClassesView';
import { FilesView } from '@/components/classes/FilesView';
import { ClassesPageDialogs } from '@/components/classes/ClassesPageDialogs';
import { ClassesPageToasts } from '@/components/classes/ClassesPageToasts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClassMembersView } from '@/components/classes/ClassMembersView';

const ClassesPage = () => {
    const hook = useClassesPage();

    return (
        <MainAppLayout pageTitle="Classes | Eido AI">
            <div className="flex flex-row gap-3 h-full">
                <FilePreview
                    previewedFile={hook.previewedFile}
                    onDeleteClick={hook.setFilesToDelete}
                    onClosePreview={() => hook.setPreviewedFile(null)}
                />
                <div className="w-8/12 flex flex-col rounded-lg border border-marble-400 bg-white overflow-hidden">
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
                            <Tabs defaultValue="files" className="w-full">
                                <TabsList>
                                    <TabsTrigger value="files">Files</TabsTrigger>
                                    <TabsTrigger value="members">Members</TabsTrigger>
                                </TabsList>
                                <TabsContent value="files" className="mt-6">
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
                                </TabsContent>
                                <TabsContent value="members" className="mt-6">
                                    {/* --- STAGE 4: PASS NEW HANDLERS TO MEMBERS VIEW --- */}
                                    <ClassMembersView
                                        selectedClass={hook.selectedClass}
                                        isOwner={hook.classesWithStats.find(c => c.class_id === hook.selectedClass?.class_id)?.is_owner ?? false}
                                        classMembers={hook.classMembers}
                                        onRemoveMember={hook.handleRemoveMember}
                                        onLeaveClass={hook.handleLeaveClass}
                                        onApproveMember={hook.handleApproveMember}
                                    />
                                </TabsContent>
                            </Tabs>
                        ) : (
                            <>
                                <ClassesView
                                    isLoading={hook.isLoading}
                                    classesWithStats={hook.classesWithStats}
                                    onClassClick={hook.handleClassClick}
                                    onDeleteClassClick={hook.handleDeleteClassClick}
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