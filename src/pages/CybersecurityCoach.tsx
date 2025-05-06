
import { useState } from "react";
import { ChatBot } from "@/components/chat/ChatBot";
import { FileUpload } from "@/components/chat/FileUpload";

const CybersecurityCoach = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    console.log("File uploaded:", file.name);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-cybercoach-blue-dark">Cybersecurity Coach</h1>
        <p className="text-gray-600 mb-6">
          Ask questions and get tailored cybersecurity guidance from our AI coach, trained on your organization's training materials.
        </p>
        
        <div className="my-6">
          <h2 className="text-lg font-medium mb-2 text-cybercoach-blue">Upload Training Materials</h2>
          <p className="text-sm text-gray-500 mb-2">
            Upload your organization's cybersecurity training materials to personalize the AI responses.
          </p>
          <FileUpload onFileUpload={handleFileUpload} />
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <ChatBot />
      </div>
    </div>
  );
};

export default CybersecurityCoach;
