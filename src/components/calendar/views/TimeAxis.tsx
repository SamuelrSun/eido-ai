// src/components/calendar/views/TimeAxis.tsx
import React from 'react';

export const TimeAxis = () => (
  <div className="w-16 text-right pr-2">
    {Array.from({ length: 24 }).map((_, hour) => (
      <div key={hour} className="h-12 relative">
        <span className="text-xs text-volcanic-800 absolute -top-2 right-2">
          {hour === 0 ? '' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
        </span>
      </div>
    ))}
  </div>
);