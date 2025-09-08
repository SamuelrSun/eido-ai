// src/components/classes/ClassMembersView.tsx
import React, { useState } from 'react';
import { ClassConfig } from '@/services/classOpenAIConfig';
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
import ShimmerButton from '../ui/ShimmerButton';
import { ActivityPanel } from './ActivityPanel';
import { MembersAndSharingPanel } from './MembersAndSharingPanel';
import { ClassManagementPanel } from './ClassManagementPanel';
// --- 7. IMPORT the activity type ---
import { ClassActivity } from '@/services/activityService';

export interface ClassMember {
    user_id: string;
    role: string;
    profiles: {
        full_name: string | null;
        avatar_url: string | null;
        email: string | null;
    } | null;
}

interface ClassMembersViewProps {
    selectedClass: ClassConfig;
    isOwner: boolean;
    classMembers: ClassMember[];
    onRemoveMember: (classId: string, memberId: string) => void;
    onLeaveClass: (classId: string) => void;
    onApproveMember: (classId: string, memberId: string) => void; 
    onRenameClass: (classId: string, newName: string) => Promise<void>;
    onDeleteClass: () => void;
    // --- 8. ADD the new props to the interface ---
    activityLog: ClassActivity[];
    isLoadingActivity: boolean;
}

export const ClassMembersView: React.FC<ClassMembersViewProps> = (props) => {
    const { selectedClass, isOwner, onRemoveMember, activityLog, isLoadingActivity } = props;
    
    const [memberToRemove, setMemberToRemove] = useState<ClassMember | null>(null);

    const handleConfirmRemove = () => {
        if (memberToRemove) {
            onRemoveMember(selectedClass.class_id, memberToRemove.user_id);
            setMemberToRemove(null);
        }
    };
    
    return (
        <>
            <div className="flex flex-row gap-8 items-start">
                <div className="w-1/2">
                    {/* --- 9. PASS the props to the ActivityPanel --- */}
                    <ActivityPanel isLoading={isLoadingActivity} activityLog={activityLog} />
                </div>

                <div className="w-1/2 flex flex-col gap-8">
                    <MembersAndSharingPanel
                        selectedClass={props.selectedClass}
                        isOwner={props.isOwner}
                        classMembers={props.classMembers}
                        onLeaveClass={props.onLeaveClass}
                        setMemberToRemove={setMemberToRemove}
                    />

                    {isOwner && (
                        <ClassManagementPanel
                            selectedClass={props.selectedClass}
                            onRenameClass={props.onRenameClass}
                            onDeleteClass={props.onDeleteClass}
                        />
                    )}
                </div>
            </div>
            
            <AlertDialog open={!!memberToRemove} onOpenChange={(isOpen) => !isOpen && setMemberToRemove(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader className="text-center sm:text-center">
                        <AlertDialogTitle>
                            Remove {memberToRemove?.profiles?.full_name || memberToRemove?.profiles?.email}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this member from "{selectedClass.class_name}"? They will lose access to all shared materials.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-center">
                        <AlertDialogCancel asChild>
                            <ShimmerButton variant="outline" className="bg-transparent border-neutral-400 text-neutral-200 hover:bg-neutral-800">Cancel</ShimmerButton>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                           <ShimmerButton onClick={handleConfirmRemove} className="bg-red-900/80 border-red-500 text-red-100 hover:border-red-400">Remove</ShimmerButton>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};