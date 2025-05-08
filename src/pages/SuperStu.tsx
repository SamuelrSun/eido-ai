
import { useState } from "react";
import { ChatBot } from "@/components/chat/ChatBot";
import { FileUpload } from "@/components/chat/FileUpload";
import { Book, GraduationCap } from "lucide-react";

const SuperStu = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    console.log("File uploaded:", file.name);
  };

  const suggestions = [
    "Explain the OSI model layers and their functions",
    "What are the best practices for network segmentation?",
    "How do VPNs work and what security features should I look for?",
    "Explain the concept of zero trust security architecture"
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2 text-purple-700">
          <GraduationCap className="h-7 w-7" />
          Search
        </h1>
        <p className="text-gray-600 mb-6">
          Upload your class materials and use AI-powered tools to help you understand complex concepts and answer your questions.
        </p>
        
        <div className="my-6">
          <h2 className="text-lg font-medium mb-2 text-purple-600 flex items-center gap-2">
            <Book className="h-5 w-5" />
            Upload Class Materials
          </h2>
          <p className="text-sm text-gray-500 mb-2">
            Upload your lecture notes, readings, or assignments to personalize the AI responses to your specific course content.
          </p>
          <FileUpload onFileUpload={handleFileUpload} />
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <ChatBot 
          suggestions={suggestions}
          title="Class Assistant" 
          knowledgeBase="Network Security Concepts"
        />
      </div>
    </div>
  );
};

export default SuperStu;
