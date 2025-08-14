// src/components/dashboard/WelcomePopup.tsx
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface WelcomePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WelcomePopup: React.FC<WelcomePopupProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">Welcome to Eido!</DialogTitle>
          <DialogDescription className="text-center pt-2">
            I'm excited to have you here. To get started with <strong>Oracle</strong>:
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-gray-700">
          <ol className="list-decimal list-inside space-y-2">
            <li>Go to the <strong>Classes</strong> tab and create a new class.</li>
            <li>Upload your files to that class.</li>
            <li>Head back to <strong>Oracle</strong>, where your new class will already be selected. You can now ask questions about your files and see citations pulled directly from them.</li>
          </ol>
          <p className="italic text-gray-500">
            Just a quick note: file processing is still improving, so extremely large or complicated files might not process perfectly yet.
          </p>
          <p>
            I'm actively improving Eido and will keep you updated on major changes, especially as we gear up for the start of the school year. If you run into any issues or have suggestions, please email me at <a href="mailto:srwang@usc.edu" className="text-blue-600 hover:underline">srwang@usc.edu</a> -- I'd love to hear from you. Your feedback will shape Eido into an even better experience.
          </p>
          <p className="text-right">
            - Samuel Wang, <em>Founder</em>
          </p>
        </div>
        <div className="flex justify-center pt-4">
          <Button onClick={onClose} className="w-full">
            Let's Go!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};