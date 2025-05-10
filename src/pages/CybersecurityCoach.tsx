
import { useState, useEffect } from "react";
import { ChatBot } from "@/components/chat/ChatBot";
import { FileUpload } from "@/components/chat/FileUpload";
import { PageHeader } from "@/components/layout/PageHeader";
import { classOpenAIConfigService, OpenAIConfig } from "@/services/classOpenAIConfig";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, KeyRound, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const CybersecurityCoach = () => {
  const navigate = useNavigate();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [openAIConfig, setOpenAIConfig] = useState<OpenAIConfig | undefined>(undefined);
  const [activeClass, setActiveClass] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load the active class and its OpenAI configuration
  useEffect(() => {
    async function loadClassConfig() {
      try {
        setIsLoading(true);
        
        const activeClassData = sessionStorage.getItem('activeClass');
        if (activeClassData) {
          const parsedClass = JSON.parse(activeClassData);
          setActiveClass(parsedClass.title || null);
          
          // Get the OpenAI configuration for the active class
          const config = await classOpenAIConfigService.getActiveClassConfig();
          setOpenAIConfig(config);
          
          console.log("Loaded OpenAI config for Cybersecurity Coach:", config);
        }
      } catch (error) {
        console.error("Error loading active class:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadClassConfig();
  }, []);

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    console.log("File uploaded:", file.name);
  };

  // Function to be passed to ChatBot for tracking response generation state
  const handleResponseGenerationState = (isGenerating: boolean) => {
    setIsGeneratingResponse(isGenerating);
  };
  
  const handleSetupAPIKey = () => {
    navigate("/settings");
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Cybersecurity Coach"
        description="Ask questions and get tailored cybersecurity guidance from our AI coach, trained on your organization's training materials."
      />
      
      {!openAIConfig?.apiKey && !isLoading && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <KeyRound className="h-4 w-4" />
          <AlertTitle>OpenAI API Key Required</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>An OpenAI API key is required to use the Cybersecurity Coach. Please set up your API key in the class settings.</p>
            <Button size="sm" variant="outline" className="w-fit flex items-center gap-2" onClick={handleSetupAPIKey}>
              <Settings className="h-4 w-4" />
              Set up API Key
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {openAIConfig?.apiKey && !openAIConfig.apiKey.startsWith('sk-') && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Invalid API Key Format</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>Your OpenAI API key appears to be invalid. OpenAI API keys typically start with "sk-". Please update it in settings.</p>
            <Button size="sm" variant="outline" className="w-fit flex items-center gap-2" onClick={handleSetupAPIKey}>
              <Settings className="h-4 w-4" />
              Update API Key
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
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
          knowledgeBase={activeClass || "Cybersecurity Fundamentals"}
          openAIConfig={openAIConfig}
          title={activeClass ? `${activeClass} Security Coach` : "Security Assistant"}
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
