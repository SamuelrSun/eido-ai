
import { useState, useEffect } from "react";
import { ChatBot } from "@/components/chat/ChatBot";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { classOpenAIConfigService, OpenAIConfig } from "@/services/classOpenAIConfig";
import { Database, AlertCircle, KeyRound, Settings, Bot, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const SuperTutor = () => {
  const navigate = useNavigate();
  const [openAIConfig, setOpenAIConfig] = useState<OpenAIConfig | undefined>(undefined);
  const [activeClass, setActiveClass] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectError, setConnectError] = useState<string | null>(null);
  const { toast } = useToast();
  
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
        setConnectError(null);
        
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
            
            // Validate API key format
            if (config.apiKey && !config.apiKey.startsWith('sk-')) {
              toast({
                title: "Invalid API Key Format",
                description: "Your OpenAI API key appears to be invalid. API keys should start with 'sk-'. Please update it in your class settings.",
                variant: "destructive"
              });
            }
            
            // Test vector store connectivity if available
            if (config.vectorStoreId && config.apiKey) {
              try {
                // Simple connectivity test with corrected beta header
                const testResponse = await fetch(`https://api.openai.com/v1/vector_stores/${config.vectorStoreId}`, {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'vector_stores=v1' // FIXED: Updated from 'vectorstores=v1' to 'vector_stores=v1'
                  }
                });
                
                if (!testResponse.ok) {
                  const errorData = await testResponse.json();
                  setConnectError(`Vector store connectivity issue: ${errorData.error?.message || "Unknown error"}`);
                  console.error("Vector store test failed:", errorData);
                }
              } catch (error) {
                console.error("Vector store connectivity test error:", error);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error loading active class:", error);
        toast({
          title: "Error Loading Configuration",
          description: "Failed to load your class configuration. Please refresh or check your settings.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    loadClassConfig();
  }, [toast]);

  const handleGoToFlashcards = () => {
    navigate("/flashcards");
  };

  const handleSetupAPIKey = () => {
    navigate("/settings");
  };

  const openOpenAIDocs = () => {
    window.open("https://platform.openai.com/docs/api-reference/vector-stores", "_blank");
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
      ) : (
        <>
          {openAIConfig?.vectorStoreId ? (
            <div className={`${connectError ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'} border rounded-md p-4 text-sm`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className={`h-4 w-4 ${connectError ? 'text-amber-600' : 'text-green-600'}`} />
                  <p className="font-medium">{connectError ? 'Vector store connectivity issue' : `Using custom knowledge base for ${activeClass}`}</p>
                </div>
                <Badge variant={connectError ? "outline" : "default"} className="text-xs">
                  {openAIConfig.vectorStoreId.substring(0, 8)}...
                </Badge>
              </div>
              {connectError ? (
                <div className="mt-2">
                  <p className="text-xs text-amber-700">{connectError}</p>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="px-0 h-auto text-xs flex items-center gap-1 text-amber-700" 
                    onClick={openOpenAIDocs}
                  >
                    View OpenAI Vector Store docs <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-green-600 mt-1">
                  Responses will be based on your class materials
                </p>
              )}
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
        </>
      )}
      
      {openAIConfig?.assistantId && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <p className="font-medium">Using custom assistant for {activeClass}</p>
            </div>
            <Badge variant="default" className="bg-blue-500 text-xs">
              {openAIConfig.assistantId.substring(0, 8)}...
            </Badge>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Specialized for this class subject
          </p>
        </div>
      )}

      {!openAIConfig?.apiKey && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <KeyRound className="h-4 w-4" />
          <AlertTitle>OpenAI API Key Required</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>An OpenAI API key is required to use Super Tutor. Please set up your API key in the class settings.</p>
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

      <div className="flex flex-col gap-4 mb-6">
        <Button 
          onClick={handleGoToFlashcards} 
          className="w-fit"
          disabled={!openAIConfig?.apiKey || (openAIConfig.apiKey && !openAIConfig.apiKey.startsWith('sk-'))}
        >
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
