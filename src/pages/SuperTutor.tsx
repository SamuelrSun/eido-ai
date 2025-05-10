
import { useState, useEffect } from "react";
import { ChatBot } from "@/components/chat/ChatBot";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { classOpenAIConfigService, OpenAIConfig } from "@/services/classOpenAIConfig";
import { Database, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const SuperTutor = () => {
  const navigate = useNavigate();
  const [openAIConfig, setOpenAIConfig] = useState<OpenAIConfig | undefined>(undefined);
  const [activeClass, setActiveClass] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const suggestions = [
    "Explain the OSI model layers and their functions",
    "What are the best practices for network segmentation?",
    "How do VPNs work and what security features should I look for?",
    "Explain the concept of zero trust security architecture"
  ];

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
          
          if (config) {
            console.log(`Loaded OpenAI config for class: ${parsedClass.title}`);
            if (config.vectorStoreId) {
              console.log(`Using Vector Store ID: ${config.vectorStoreId}`);
            }
          }
        }
      } catch (error) {
        console.error("Error loading active class:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadClassConfig();
  }, []);

  const handleGoToFlashcards = () => {
    navigate("/flashcards");
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Super Tutor"
        description={activeClass 
          ? `AI-powered learning assistant for ${activeClass}` 
          : "Upload your class materials and use AI-powered tools to help you understand complex concepts and answer your questions."
        }
      />

      {isLoading ? (
        <div className="h-8 w-full bg-gray-100 animate-pulse rounded"></div>
      ) : openAIConfig?.vectorStoreId ? (
        <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-800">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <p className="font-medium">Using custom knowledge base for {activeClass}</p>
          </div>
          <p className="text-xs text-green-600 mt-1">
            Vector Store ID: {openAIConfig.vectorStoreId.substring(0, 10)}... • 
            Responses will be based on your class materials
          </p>
        </div>
      ) : activeClass ? (
        <Alert variant="default" className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No custom knowledge base</AlertTitle>
          <AlertDescription>
            This class isn't connected to a vector store. Responses will use OpenAI's general knowledge, not your class materials.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-4 mb-6">
        <Button onClick={handleGoToFlashcards} className="w-fit">
          Generate Flashcards
        </Button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <ChatBot 
          suggestions={suggestions}
          title={activeClass ? `${activeClass} Assistant` : "Class Assistant"}
          knowledgeBase={activeClass || "Network Security Concepts"}
          openAIConfig={openAIConfig}
        />
      </div>
    </div>
  );
};

export default SuperTutor;
