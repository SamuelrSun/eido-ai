// src/components/classes/ClassesHeader.tsx
import React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { FolderPlus, Users } from 'lucide-react';
import { ClassConfig } from '@/services/classOpenAIConfig';
import ShimmerButton from '../ui/ShimmerButton';

interface ClassesHeaderProps {
  breadcrumbs: { name: string; id: string | null }[];
  selectedClass: ClassConfig | null;
  onBreadcrumbClick: (index: number) => void;
  onNewFolderClick: () => void;
  onHeaderButtonClick: () => void;
  onJoinClassClick: () => void;
}

export const ClassesHeader: React.FC<ClassesHeaderProps> = ({
  breadcrumbs,
  selectedClass,
  onBreadcrumbClick,
  onNewFolderClick,
  onHeaderButtonClick,
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
                    className="text-neutral-300 hover:text-white" // MODIFICATION: Font color
                  >
                    {crumb.name}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="font-semibold text-white"> {/* MODIFICATION: Font color */}
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
          <ShimmerButton 
            size="sm" // MODIFICATION: Standardized size
            variant="outline" 
            onClick={onNewFolderClick}
            className="bg-transparent border-neutral-400 text-neutral-200 hover:bg-blue-950/80 hover:border-blue-500 hover:text-neutral-100"
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            New Folder
          </ShimmerButton>
        )}
        {!selectedClass && (
            <ShimmerButton 
              size="sm" // MODIFICATION: Standardized size
              variant="outline" 
              onClick={onJoinClassClick}
              className="bg-transparent border-neutral-400 text-neutral-200 hover:bg-blue-950/80 hover:border-blue-500 hover:text-neutral-100"
            >
                {/* MODIFICATION: Icon removed */}
                Join Class
            </ShimmerButton>
        )}
        <ShimmerButton 
          size="sm" // MODIFICATION: Standardized size
          onClick={onHeaderButtonClick}
          className="border border-blue-500 bg-blue-950/80 text-neutral-100 hover:border-blue-400"
        >
          {selectedClass ? "Upload Files" : "New Class"}
        </ShimmerButton>
      </div>
    </div>
  );
};