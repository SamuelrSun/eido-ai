// src/components/classes/ClassMembersView.tsx
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ClassConfig } from '@/services/classOpenAIConfig';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Trash2, LogOut, Check, X, Save } from 'lucide-react';
import { Badge } from '../ui/badge';

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
}

export const ClassMembersView: React.FC<ClassMembersViewProps> = ({
    selectedClass, isOwner, classMembers,
    onRemoveMember, onLeaveClass, onApproveMember,
    onRenameClass, onDeleteClass
}) => {
    const { toast } = useToast();
    const [newClassName, setNewClassName] = useState(selectedClass.class_name);
    const [isSavingName, setIsSavingName] = useState(false);

    const handleCopyInviteCode = () => {
        if (selectedClass.invite_code) {
            navigator.clipboard.writeText(selectedClass.invite_code);
            toast({ title: "Copied!", description: "Invite code copied to clipboard." });
        }
    };

    const handleRenameSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClassName.trim() || newClassName.trim() === selectedClass.class_name) return;
        setIsSavingName(true);
        try {
            await onRenameClass(selectedClass.class_id, newClassName.trim());
            toast({ title: "Success", description: "Class name has been updated." });
        } catch (error) {
            toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
            setNewClassName(selectedClass.class_name); // Revert on error
        } finally {
            setIsSavingName(false);
        }
    };
    
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Members & Sharing</CardTitle>
                    <CardDescription>
                        Manage who has access to this class. There are currently {classMembers.length} member(s).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {isOwner && (
                        <div className="space-y-2">
                           <Label htmlFor="invite-code">Invite Code</Label>
                           <div className="flex items-center gap-2">
                                <Input id="invite-code" value={selectedClass.invite_code || 'Generating...'} readOnly className="font-mono"/>
                                <Button variant="outline" size="icon" onClick={handleCopyInviteCode}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                           </div>
                           <p className="text-xs text-muted-foreground">Share this code to allow others to request access.</p>
                        </div>
                    )}
                    <div className="space-y-4">
                        {classMembers.map(member => {
                            const profile = member.profiles;
                            const userInitials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || profile?.email?.charAt(0).toUpperCase() || 'U';
                            const isPending = member.role === 'pending';

                            return (
                                <div key={member.user_id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={profile?.avatar_url || undefined} />
                                            <AvatarFallback>{userInitials}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium text-sm">{profile?.full_name || profile?.email}</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                                                {isPending && <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">Approval Required</Badge>}
                                            </div>
                                        </div>
                                    </div>
                                    {isOwner && member.role !== 'owner' ? (
                                        isPending ? (
                                            <div className="flex items-center gap-2">
                                                <Button variant="outline" size="sm" onClick={() => onApproveMember(selectedClass.class_id, member.user_id)}>
                                                    <Check className="h-4 w-4 mr-2" /> Approve
                                                </Button>
                                                <Button variant="destructive" size="sm" onClick={() => onRemoveMember(selectedClass.class_id, member.user_id)}>
                                                    <X className="h-4 w-4 mr-2" /> Deny
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onRemoveMember(selectedClass.class_id, member.user_id)}>
                                                <Trash2 className="h-4 w-4 mr-2" /> Remove
                                            </Button>
                                        )
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
                {!isOwner && (
                    <CardContent className="border-t pt-4">
                         <Button variant="outline" className="w-full" onClick={() => onLeaveClass(selectedClass.class_id)}>
                            <LogOut className="h-4 w-4 mr-2" />
                            Leave Class
                        </Button>
                    </CardContent>
                )}
            </Card>

            {isOwner && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Class Management</CardTitle>
                        <CardDescription>Rename or permanently delete this class.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <form onSubmit={handleRenameSubmit} className="space-y-2">
                            <Label htmlFor="class-name">Class Name</Label>
                            <div className="flex items-center gap-2">
                                <Input id="class-name" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} />
                                <Button type="submit" disabled={isSavingName || newClassName === selectedClass.class_name}>
                                    <Save className="h-4 w-4 mr-2" />
                                    {isSavingName ? 'Saving...' : 'Save'}
                                </Button>
                            </div>
                        </form>
                        <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/10 flex items-center justify-between">
                            <div>
                                <h4 className="font-semibold text-destructive">Delete this Class</h4>
                                <p className="text-xs text-destructive/80">This action is irreversible.</p>
                            </div>
                             <Button variant="destructive" size="sm" onClick={onDeleteClass}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Class
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};