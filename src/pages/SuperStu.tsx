
import { useState } from "react";
import { ChatBot } from "@/components/chat/ChatBot";
import { FileUpload } from "@/components/chat/FileUpload";

const SuperStu = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    console.log("File uploaded:", file.name);
  };

  const suggestions = [
    "What are the best practices for password management?",
    "How can I protect against phishing attacks?",
    "What is ransomware and how can I prevent it?",
    "Explain the concept of zero trust security"
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-cybercoach-blue-dark">SuperStu</h1>
        <p className="text-gray-600 mb-6">
          Ask questions and get tailored cybersecurity guidance from our AI coach, trained on general cybersecurity best practices.
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
        <ChatBot 
          suggestions={suggestions}
          title="Public Cyber Coach" 
          knowledgeBase="General Cybersecurity Knowledge"
        />
      </div>
    </div>
  );
};

export default SuperStu;
