
import { useState } from "react";
import { ChatBot } from "@/components/chat/ChatBot";
import { FileUpload } from "@/components/chat/FileUpload";
import { PageHeader } from "@/components/layout/PageHeader";

const CybersecurityCoach = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    console.log("File uploaded:", file.name);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Cybersecurity Coach"
        description="Ask questions and get tailored cybersecurity guidance from our AI coach, trained on your organization's training materials."
      />
      
      <div className="my-6">
        <h2 className="text-lg font-medium mb-2">Upload Training Materials</h2>
        <p className="text-sm text-gray-500 mb-2">
          Upload your organization's cybersecurity training materials to personalize the AI responses.
        </p>
        <FileUpload onFileUpload={handleFileUpload} />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <ChatBot />
      </div>
    </div>
  );
};

export default CybersecurityCoach;
