// src/pages/AssignmentsPage.tsx
import React, { useState } from 'react';
import { MainAppLayout } from '@/components/layout/MainAppLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, ListFilter } from 'lucide-react';
import { AssignmentCard, AssignmentStatus } from '@/components/assignments/AssignmentCard';
import { AssignmentView } from '@/components/assignments/AssignmentView';

// --- Hardcoded Data ---

export type Question = 
  | { type: 'mcq'; id: string; text: string; options: string[]; }
  | { type: 'short-answer'; id: string; text: string; };

export interface Assignment {
  id: string;
  title: string;
  className: string;
  classColor: string; // Tailwind bg color class
  dueDate: string;
  status: AssignmentStatus;
  questionCount: number;
  questions: Question[];
}

const hardcodedAssignments: Assignment[] = [
  {
    id: 'as1',
    title: 'Problem Set 2: Network Protocols',
    className: 'ITP 457: Advanced Cybersecurity',
    classColor: 'bg-blue-500',
    dueDate: 'Due: Jul 28, 2025',
    status: 'In Progress',
    questionCount: 3,
    questions: [
        { type: 'mcq', id: 'q1', text: 'Which protocol is responsible for reliable, connection-oriented data transmission?', options: ['UDP', 'TCP', 'IP', 'ICMP'] },
        { type: 'short-answer', id: 'q2', text: 'Explain the primary difference between Group Policy Objects (GPOs) and Local Group Policies.' },
        { type: 'short-answer', id: 'q3', text: 'Describe the three-way handshake process in TCP.' },
    ],
  },
  {
    id: 'as2',
    title: 'Lab 1: The Human Skeleton',
    className: 'BISC 110: Human Biology',
    classColor: 'bg-green-500',
    dueDate: 'Due: Aug 4, 2025',
    status: 'Not Started',
    questionCount: 12,
    questions: [],
  },
  {
    id: 'as3',
    title: 'Midterm Study Guide',
    className: 'ITP 457: Advanced Cybersecurity',
    classColor: 'bg-blue-500',
    dueDate: 'Due: Aug 15, 2025',
    status: 'Not Started',
    questionCount: 25,
    questions: [],
  },
  {
    id: 'as4',
    title: 'Final Project Proposal',
    className: 'CSCI 571: Web Technologies',
    classColor: 'bg-purple-500',
    dueDate: 'Due: Sep 1, 2025',
    status: 'Completed',
    questionCount: 1,
    questions: [],
  },
];

const hardcodedClasses = [
    { id: 'class1', name: 'ITP 457: Advanced Cybersecurity' },
    { id: 'class2', name: 'BISC 110: Human Biology' },
    { id: 'class3', name: 'CSCI 571: Web Technologies' },
];


// --- Page Component ---

const AssignmentsPage = () => {
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

    const handleSelectAssignment = (assignment: Assignment) => {
        setSelectedAssignment(assignment);
    };

    const handleBackToDashboard = () => {
        setSelectedAssignment(null);
    };

    // Render the Assignment IDE View if an assignment is selected
    if (selectedAssignment) {
        return (
            <MainAppLayout pageTitle={`${selectedAssignment.title} | Assignments`}>
                <AssignmentView assignment={selectedAssignment} onBack={handleBackToDashboard} />
            </MainAppLayout>
        );
    }
    
    // Render the Assignments Dashboard by default
    return (
        <MainAppLayout pageTitle="Assignments | Eido AI">
            {/* Main content container with white background and border */}
            <div className="flex flex-col h-full rounded-lg border border-marble-400 bg-white overflow-hidden">
                {/* Header section with controls */}
                <header className="p-4 md:p-6 flex items-center justify-between border-b border-marble-400 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <Select defaultValue="all">
                            <SelectTrigger className="w-[200px] h-9">
                                <SelectValue placeholder="Filter by class..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Classes</SelectItem>
                                {hardcodedClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                         <Button variant="outline" size="sm" className="h-9">
                            <ListFilter className="mr-2 h-4 w-4" /> Sort by
                        </Button>
                    </div>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> New Assignment
                    </Button>
                </header>

                {/* Scrollable grid for assignment cards */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {hardcodedAssignments.map(assignment => (
                            <AssignmentCard 
                                key={assignment.id}
                                {...assignment}
                                onClick={() => handleSelectAssignment(assignment)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </MainAppLayout>
    );
};

export default AssignmentsPage;