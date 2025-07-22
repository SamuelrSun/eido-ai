// src/components/assignments/MultipleChoiceQuestion.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '../ui/button';
import { Bot } from 'lucide-react';

interface MCQ {
  type: 'mcq';
  id: string;
  text: string;
  options: string[];
}

interface MultipleChoiceQuestionProps {
  question: MCQ;
  index: number;
}

export const MultipleChoiceQuestion: React.FC<MultipleChoiceQuestionProps> = ({ question, index }) => {
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
        <RadioGroup className="space-y-2">
          {question.options.map((option, i) => (
            <div key={i} className="flex items-center space-x-2 p-2 rounded-md hover:bg-stone-50">
              <RadioGroupItem value={option} id={`${question.id}-${i}`} />
              <Label htmlFor={`${question.id}-${i}`} className="font-normal cursor-pointer">
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
};