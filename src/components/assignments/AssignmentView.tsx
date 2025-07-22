// src/components/assignments/AssignmentView.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { MultipleChoiceQuestion } from './MultipleChoiceQuestion';
import { ShortAnswerQuestion } from './ShortAnswerQuestion';
import type { Assignment, Question } from '@/pages/AssignmentsPage';
import { Bot, Lightbulb } from 'lucide-react';

interface AssignmentViewProps {
  assignment: Assignment;
  onBack: () => void;
}

export const AssignmentView: React.FC<AssignmentViewProps> = ({ assignment, onBack }) => {

  const exampleOracleResponse = `Based on the provided lecture slides, the primary difference between Group Policy Objects (GPOs) and Local Group Policies lies in their scope and management. 

* [cite_start]**GPOs** are integrated with Active Directory and are applied to organizational units (OUs), allowing for centralized management of settings for thousands of users and computers across a domain[cite: 1]. [cite_start]They require domain controllers for storage and replication[cite: 2].
* **Local Policies**, in contrast, are stored and applied directly on individual computers. [cite_start]They do not require Active Directory and are used to configure settings for standalone machines or in non-domain environments[cite: 3].`;
  
  return (
    <div className="flex flex-row gap-3 h-full">
      <div className="w-8/12 flex flex-col rounded-lg border border-marble-400 bg-white overflow-hidden">
        <header className="p-4 border-b border-marble-400 flex-shrink-0">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#" onClick={(e) => { e.preventDefault(); onBack(); }}>
                  Assignments
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold text-stone-800">{assignment.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <ScrollArea className="flex-1">
          <div className="p-6 md:p-8 space-y-8">
            <div>
              <p className="text-sm text-muted-foreground">{assignment.className}</p>
              <h1 className="text-2xl font-bold text-gray-900 font-serif">{assignment.title}</h1>
              <p className="text-sm text-gray-600 mt-1">{assignment.dueDate}</p>
            </div>
            <Separator />
            <div className="space-y-6">
              {assignment.questions.map((question, index) => (
                <div key={question.id}>
                  {question.type === 'mcq' && (
                    <MultipleChoiceQuestion question={question} index={index + 1} />
                  )}
                  {question.type === 'short-answer' && (
                    <ShortAnswerQuestion question={question} index={index + 1} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
        <footer className="p-4 border-t border-marble-400 flex-shrink-0 flex justify-end">
            <Button>Submit Assignment</Button>
        </footer>
      </div>
      <div className="w-4/12 flex flex-col rounded-lg border border-marble-400 bg-white overflow-hidden">
         <header className="p-4 border-b border-marble-400 flex-shrink-0 flex items-center gap-2">
            <Bot className="h-5 w-5 text-stone-600" />
            <h2 className="font-semibold text-stone-800">Assignment Oracle</h2>
         </header>
         <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
                <div className="bg-stone-50 border rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-stone-700 mb-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        <span>Example Answer: Question 2</span>
                    </div>
                    <div className="text-sm text-stone-600 space-y-2 prose prose-sm max-w-none">
                        <p>{exampleOracleResponse}</p>
                    </div>
                </div>
                <p className="text-xs text-center text-muted-foreground pt-4">Click "Ask Oracle" on a question to get AI-powered help and explanations.</p>
            </div>
         </ScrollArea>
      </div>
    </div>
  );
};