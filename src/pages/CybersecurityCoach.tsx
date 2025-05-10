
import { useState } from "react";
import { ChatBot } from "@/components/chat/ChatBot";
import { FileUpload } from "@/components/chat/FileUpload";
import { PageHeader } from "@/components/layout/PageHeader";

const CybersecurityCoach = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    console.log("File uploaded:", file.name);
  };

  // Function to be passed to ChatBot for tracking response generation state
  const handleResponseGenerationState = (isGenerating: boolean) => {
    setIsGeneratingResponse(isGenerating);
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
        <ChatBot 
          disableToasts={true}
          onResponseGenerationStateChange={handleResponseGenerationState}
          loadingIndicator={
            isGeneratingResponse && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-pulse flex items-center space-x-2">
                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-500 ml-2">AI is thinking...</span>
                </div>
              </div>
            )
          }
        />
      </div>
    </div>
  );
};

export default CybersecurityCoach;
