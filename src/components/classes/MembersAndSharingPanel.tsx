// src/components/classes/MembersAndSharingPanel.tsx
import React, { useState } from 'react';
import { ClassConfig } from '@/services/classOpenAIConfig';
import { ClassMember } from './ClassMembersView';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, LogOut, Check, X } from 'lucide-react';
import ShimmerButton from '../ui/ShimmerButton';

interface MembersAndSharingPanelProps {
  selectedClass: ClassConfig;
  isOwner: boolean;
  classMembers: ClassMember[];
  onLeaveClass: (classId: string) => void;
  setMemberToRemove: (member: ClassMember) => void;
}

export const MembersAndSharingPanel: React.FC<MembersAndSharingPanelProps> = ({
  selectedClass,
  isOwner,
  classMembers,
  onLeaveClass,
  setMemberToRemove,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyInviteCode = () => {
    if (selectedClass.invite_code) {
      navigator.clipboard.writeText(selectedClass.invite_code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
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
              <ShimmerButton
                size="sm"
                onClick={handleCopyInviteCode}
                disabled={isCopied}
                className="border border-blue-500 bg-blue-950/80 text-neutral-100 hover:border-blue-400 w-32"
              >
                {isCopied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {isCopied ? 'Copied!' : 'Copy Code'}
              </ShimmerButton>
            </div>
            <p className="text-xs text-muted-foreground">Share this code to allow others to join the class directly.</p>
          </div>
        )}
        <div className="space-y-4">
          {classMembers.map(member => {
            const profile = member.profiles;
            const userInitials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || profile?.email?.charAt(0).toUpperCase() || 'U';

            return (
              <div key={member.user_id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{profile?.full_name || profile?.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                  </div>
                </div>
                {isOwner && member.role !== 'owner' && (
                  <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white hover:bg-neutral-800 h-8 w-8" onClick={() => setMemberToRemove(member)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
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
  );
};