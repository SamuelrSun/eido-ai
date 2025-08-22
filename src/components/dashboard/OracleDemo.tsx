// src/components/dashboard/OracleDemo.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

export const OracleDemo = () => {
  return (
    // Card with exact glassmorphism effect from landing page
    <Card className="h-full border border-white/10 bg-white/5 backdrop-blur-xl">
      <CardContent className="p-4">
        {/* Content is taller than the container to create the clipped/scrolling illusion */}
        <div className="space-y-3 flex flex-col">
          <div className="rounded-2xl bg-neutral-800 border border-neutral-700 p-3 text-sm shadow-sm text-neutral-200 self-end max-w-[85%]">
            "Explain the difference between aerobic and anaerobic respiration."
          </div>

          <div className="rounded-2xl bg-blue-600 text-white p-3 text-sm shadow-sm self-start max-w-[85%]">
            Based on Lecture 03 and Chapter 2 notes, oxidative phosphorylation increases ATP yield during aerobic respiration.
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[11px]">
                <ShieldCheck size={14} /> Lecture 03
                <span className="opacity-60">Slide 14</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[11px]">
                <ShieldCheck size={14} /> Ch. 2 Notes
                <span className="opacity-60">p. 45</span>
              </span>
            </div>
          </div>
          
          <div className="rounded-2xl bg-neutral-800 border border-neutral-700 p-3 text-sm shadow-sm text-neutral-200 self-end max-w-[70%]">
            "Can you give me a study guide for the upcoming midterm?"
          </div>

          <div className="rounded-2xl bg-blue-600 text-white p-3 text-sm shadow-sm self-start max-w-[85%]">
            Of course. I've generated a study guide focusing on key concepts from your lectures and readings.
             <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[11px]">
                  <ShieldCheck size={14} /> Midterm_Study_Guide.pdf
                </span>
             </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};