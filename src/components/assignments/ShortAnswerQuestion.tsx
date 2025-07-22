// src/components/assignments/ShortAnswerQuestion.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '../ui/button';
import { Bot } from 'lucide-react';

interface ShortAnswer {
  type: 'short-answer';
  id: string;
  text: string;
}

interface ShortAnswerQuestionProps {
  question: ShortAnswer;
  index: number;
}

export const ShortAnswerQuestion: React.FC<ShortAnswerQuestionProps> = ({ question, index }) => {
  return (
    <Card className="overflow-hidden">
       <CardHeader className="flex flex-row items-start bg-stone-50 p-4">
        <div className="flex items-center gap-4 flex-grow">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-700 text-sm font-bold text-white flex-shrink-0">{index}</div>
            <CardTitle className="text-base font-medium">{question.text}</CardTitle>
        </div>
        <Button variant="outline" size="sm" className="ml-4 flex-shrink-0">
            <Bot className="h-4 w-4 mr-2" /> Ask Oracle
        </Button>
      </CardHeader>
      <CardContent className="p-4">
        <Textarea placeholder="Type your answer here..." className="min-h-[120px]" />
      </CardContent>
    </Card>
  );
};