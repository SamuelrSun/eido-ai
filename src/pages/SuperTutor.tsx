
import { useState, useEffect } from "react";
import { ChatBot } from "@/components/chat/ChatBot";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { classOpenAIConfigService, OpenAIConfig } from "@/services/classOpenAIConfig";

const SuperTutor = () => {
  const navigate = useNavigate();
  const [openAIConfig, setOpenAIConfig] = useState<OpenAIConfig | undefined>(undefined);
  const [activeClass, setActiveClass] = useState<string | null>(null);
  
  const suggestions = [
    "Explain the OSI model layers and their functions",
    "What are the best practices for network segmentation?",
    "How do VPNs work and what security features should I look for?",
    "Explain the concept of zero trust security architecture"
  ];

  // Load the active class and its OpenAI configuration
  useEffect(() => {
    try {
      const activeClassData = sessionStorage.getItem('activeClass');
      if (activeClassData) {
        const parsedClass = JSON.parse(activeClassData);
        setActiveClass(parsedClass.title || null);
        
        // Get the OpenAI configuration for the active class
        const config = classOpenAIConfigService.getActiveClassConfig();
        setOpenAIConfig(config);
        
        if (config) {
          console.log(`Loaded OpenAI config for class: ${parsedClass.title}`);
        }
      }
    } catch (error) {
      console.error("Error loading active class:", error);
    }
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

      {openAIConfig && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-800">
          <p className="font-medium">Using custom AI configuration for this class</p>
          <p className="text-xs text-green-600 mt-1">
            This class has a dedicated AI assistant and knowledge base
          </p>
        </div>
      )}

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
