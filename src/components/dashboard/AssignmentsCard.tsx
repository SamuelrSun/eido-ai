// src/components/dashboard/AssignmentsCard.tsx
import React from 'react';

interface AssignmentsCardProps {
  onClick: () => void;
}

export const AssignmentsCard: React.FC<AssignmentsCardProps> = ({ onClick }) => {
  return (
    <section 
      // MODIFICATION: Corrected border and background colors
      className="relative flex flex-col rounded-lg p-4 md:p-8 xl:flex-row overflow-hidden border assignments-background-image border-blue-200"
    >
      <div className="flex flex-col gap-y-3 w-full xl:w/2 z-10">
        <h2 className="text-h5-m lg:text-h5 font-variable font-[420]">Assignments</h2>
        
        <p className="text-p font-body md:max-w-xs">Generate practice problems, get step-by-step solutions, and master your course material.</p>

        <div onClick={onClick} className="w-fit pb-3 pt-4 focus:outline-none disabled:cursor-not-allowed inline-block cursor-pointer">
          <div className="relative flex grow">
            <div className="z-10 flex grow gap-x-2.5">
              <div className="h-full min-h-cell-md max-h-cell-md flex grow group/cell transition-all">
                {/* MODIFICATION: Corrected button color */}
                <span className="bg-blue-500 h-full min-h-cell-md max-h-cell-md transition-all bg-clip-padding origin-top-right -mr-0.5 w-3 rounded-l-[6px] border-transparent"></span>
                 <div className="bg-blue-500 text-white h-full min-h-cell-md max-h-cell-md truncate flex grow justify-between items-center transition-colors bg-clip-padding">
                  <div className="z-10 w-full"><span className="px-2 justify-center flex w-full items-center transition-all"><span className="text-p font-body">Go to Assignments</span></span></div>
                </div>
                 <span className="bg-blue-500 h-full min-h-cell-md max-h-cell-md transition-all bg-clip-padding origin-top-right w-6 -skew-x-[21deg] rounded-tr-[10px] rounded-br-[4px] border-transparent"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};