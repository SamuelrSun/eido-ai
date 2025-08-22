// src/components/dashboard/SharedClassesDemo.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FileText, Folder, Users } from 'lucide-react';

const ItemPill = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="flex items-center gap-2 p-2 rounded-md bg-neutral-800/80 border border-neutral-700/60 shadow-sm">
    {icon}
    <span className="text-xs text-neutral-300">{label}</span>
  </div>
);

export const SharedClassesDemo = () => {
  return (
    <Card className="h-full border border-white/10 bg-white/5 backdrop-blur-xl shadow-inner relative overflow-hidden">
      <CardContent className="p-4 flex flex-col items-center justify-center h-full gap-4">
        {/* Avatars floating around */}
        <Avatar className="h-10 w-10 absolute top-4 left-4 border-2 border-neutral-600">
            <AvatarFallback className="bg-neutral-700 text-neutral-300">SA</AvatarFallback>
        </Avatar>
        <Avatar className="h-10 w-10 absolute top-12 right-6 border-2 border-neutral-600">
            <AvatarFallback className="bg-neutral-700 text-neutral-300">MJ</AvatarFallback>
        </Avatar>
        <Avatar className="h-10 w-10 absolute bottom-4 left-12 border-2 border-neutral-600">
            <AvatarFallback className="bg-neutral-700 text-neutral-300">TY</AvatarFallback>
        </Avatar>

        {/* Central Card */}
        <div className="relative text-center p-4 border border-neutral-700 bg-neutral-800/50 rounded-lg">
            <Users className="h-8 w-8 mx-auto text-blue-400 mb-2" />
            <h3 className="font-semibold text-sm text-neutral-100">BISC 110L</h3>
            <p className="text-xs text-neutral-400">Shared Class</p>
        </div>

        {/* Floating Pills */}
        <div className="absolute bottom-6 right-4">
            <ItemPill icon={<FileText size={14} className="text-neutral-400" />} label="Lecture_03.pdf" />
        </div>
         <div className="absolute top-24 left-10">
             <ItemPill icon={<Folder size={14} className="text-neutral-400" />} label="Study Guides" />
        </div>
      </CardContent>
    </Card>
  );
};