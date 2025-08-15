// src/components/classes/ClassMembersView.tsx
import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { ClassConfig } from '@/services/classOpenAIConfig';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Copy, Trash2, LogOut, Check, X } from 'lucide-react';
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
    // --- STAGE 4: ADD APPROVAL HANDLER ---
    onApproveMember: (classId: string, memberId: string) => void;
}

export const ClassMembersView: React.FC<ClassMembersViewProps> = ({ selectedClass, isOwner, classMembers, onRemoveMember, onLeaveClass, onApproveMember }) => {
    const { toast } = useToast();

    const handleCopyInviteCode = () => {
        if (selectedClass.invite_code) {
            navigator.clipboard.writeText(selectedClass.invite_code);
            toast({
                title: "Copied!",
                description: "Invite code copied to clipboard.",
            });
        }
    };
    
    return (
        <div className="space-y-8">
            {isOwner && (
                <Card>
                    <CardHeader>
                        <CardTitle>Invite Code</CardTitle>
                        <CardDescription>Share this code with others to allow them to request access to this class.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center gap-2">
                        <Input value={selectedClass.invite_code || 'Generating...'} readOnly className="font-mono"/>
                        <Button variant="outline" size="icon" onClick={handleCopyInviteCode}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Members</CardTitle>
                    <CardDescription>
                        {classMembers.length} member(s) in this class.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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

                                {/* --- STAGE 4: CONDITIONAL BUTTONS FOR PENDING/APPROVED MEMBERS --- */}
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
        </div>
    );
};