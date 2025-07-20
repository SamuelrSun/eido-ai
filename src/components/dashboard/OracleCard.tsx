// src/components/dashboard/OracleCard.tsx
import React from 'react';

interface OracleCardProps {
  onClick: () => void;
}

export const OracleCard: React.FC<OracleCardProps> = ({ onClick }) => {
  return (
    <section 
      className="relative flex flex-col rounded-lg p-4 md:p-8 xl:flex-row overflow-hidden border oracle-background-image border-blue-200" 
      style={{ flexBasis: '70%' }}
    >
      {/* Left side: Text Content. z-10 ensures it sits above the image element. */}
      <div className="flex flex-col gap-y-3 w-full xl:w/2 z-10">
        <div className="text-label uppercase font-code">
          <span className="text-blue-700 bg-white border border-blue-200 flex w-fit items-center rounded px-2 py-1">New</span>
        </div>
        <h2 className="text-h5-m lg:text-h5 font-variable font-[420]">Oracle</h2>
        
        <p className="text-p font-body md:max-w-xs">Get instant, cited answers from your course content. Plus, install the Chrome extension to access Oracle from anywhere.</p>

        {/* MODIFICATION: Reduced top padding from pt-7 to pt-4 */}
        <div onClick={onClick} className="w-fit pb-3 pt-4 focus:outline-none disabled:cursor-not-allowed inline-block cursor-pointer">
          <div className="relative flex grow">
            <div className="z-10 flex grow gap-x-2.5">
              <div className="h-full min-h-cell-md max-h-cell-md flex grow group/cell transition-all">
                <span className="bg-blue-500 h-full min-h-cell-md max-h-cell-md transition-all bg-clip-padding origin-top-right -mr-0.5 w-3 rounded-l-[6px] border-transparent"></span>
                <div className="bg-blue-500 text-white h-full min-h-cell-md max-h-cell-md truncate flex grow justify-between items-center transition-colors bg-clip-padding">
                  <div className="z-10 w-full"><span className="px-2 justify-center flex w-full items-center transition-all"><span className="text-p font-body">Go to Oracle</span></span></div>
                </div>
                 <span className="bg-blue-500 h-full min-h-cell-md max-h-cell-md transition-all bg-clip-padding origin-top-right w-6 -skew-x-[21deg] rounded-tr-[10px] rounded-br-[4px] border-transparent"></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Image. Positioned absolutely to float on top of the background. */}
      <div className="hidden xl:block absolute top-0 right-0 h-full w-2/3 lg:w-1/2">
        <img
          src="/oracle_screenshot.png"
          alt="Eido AI Oracle Interface Screenshot"
          // This positioning creates the bleed effect.
          className="absolute top-10 left-6 -right-20 -bottom-4 w-auto h-auto object-contain rounded-lg shadow-xl"
        />
      </div>
    </section>
  );
};