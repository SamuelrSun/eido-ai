// src/components/classes/ClassesHeader.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { FolderPlus, Users } from 'lucide-react'; // --- STAGE 3: IMPORT Users ICON ---
import { ClassConfig } from '@/services/classOpenAIConfig';

interface ClassesHeaderProps {
  breadcrumbs: { name: string; id: string | null }[];
  selectedClass: ClassConfig | null;
  onBreadcrumbClick: (index: number) => void;
  onNewFolderClick: () => void;
  onHeaderButtonClick: () => void;
  // --- STAGE 3: ADD NEW PROP FOR JOIN CLASS ---
  onJoinClassClick: () => void;
}

export const ClassesHeader: React.FC<ClassesHeaderProps> = ({
  breadcrumbs,
  selectedClass,
  onBreadcrumbClick,
  onNewFolderClick,
  onHeaderButtonClick,
  // --- STAGE 3: DESTRUCTURE NEW PROP ---
  onJoinClassClick,
}) => {
  return (
    <div className="flex justify-between items-center">
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.id || 'home'} className="flex items-center">
              <BreadcrumbItem>
                {index < breadcrumbs.length - 1 ? (
                  <BreadcrumbLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onBreadcrumbClick(index);
                    }}
                    className="text-muted-foreground hover:text-stone-800"
                  >
                    {crumb.name}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="font-semibold text-stone-800">
                    {crumb.name}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
            </div>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex gap-2">
        {selectedClass && (
          <Button variant="outline" onClick={onNewFolderClick}>
            <FolderPlus className="mr-2 h-4 w-4" />
            New Folder
          </Button>
        )}
        {/* --- STAGE 3: ADD JOIN CLASS BUTTON (only shows in home view) --- */}
        {!selectedClass && (
            <Button variant="outline" onClick={onJoinClassClick}>
                <Users className="mr-2 h-4 w-4" />
                Join Class
            </Button>
        )}
        <Button onClick={onHeaderButtonClick}>
          {selectedClass ? "Upload Files" : "New Class"}
        </Button>
      </div>
    </div>
  );
};