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
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Generate generic suggestions based on active class or default ones if no class
  const [suggestions, setSuggestions] = useState<string[]>([
    "Explain the main concepts we've covered so far",
    "Help me understand this topic better",
    "What are the key points to remember?",
    "Can you provide some practice examples?"
  ]);

  // When component mounts, make sure we're at the top of the page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
            if (config.assistantId) {
              console.log(`Using Assistant ID: ${config.assistantId}`);
            }
            
            // Validate API key format
            if (config.apiKey && !config.apiKey.startsWith('sk-')) {
              toast({
                title: "Invalid API Key Format",
                description: "Your OpenAI API key appears to be invalid. API keys should start with 'sk-'. Please update it in your class settings.",
                variant: "destructive"
              });
            }
            
            // Test assistant connectivity if available
            if (config.assistantId && config.apiKey) {
              try {
                const assistantResponse = await fetch(`https://api.openai.com/v1/assistants/${config.assistantId}`, {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v2'  // Using the updated beta header
                  }
                });
                
                if (!assistantResponse.ok) {
                  const assistantError = await assistantResponse.json();
                  setConnectError(`Assistant connectivity issue: ${assistantError.error?.message || "Unknown error"}`);
                  console.error("Assistant test failed:", assistantError);
                } else {
                  console.log("Successfully connected to OpenAI Assistant API");
                  const assistantData = await assistantResponse.json();
                  console.log(`Assistant name: ${assistantData.name || "Unnamed"}`);
                }
              } catch (error) {
                console.error("Assistant connectivity test error:", error);
                setConnectError(`Failed to connect to assistant: ${error instanceof Error ? error.message : "Unknown error"}`);
              }
            }
            // Test vector store connectivity only if no assistant but vector store is available
            else if (config.vectorStoreId && config.apiKey && !config.assistantId) {
              try {
                // Test with the files endpoint instead
                const testResponse = await fetch(`https://api.openai.com/v1/files?purpose=assistants`, {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                if (!testResponse.ok) {
                  const errorData = await testResponse.json();
                  setConnectError(`API connectivity issue: ${errorData.error?.message || "Unknown error"}`);
                  console.error("API test failed:", errorData);
                } else {
                  console.log("Successfully connected to OpenAI API");
                }
              } catch (error) {
                console.error("API connectivity test error:", error);
                setConnectError(`Failed to connect to OpenAI API: ${error instanceof Error ? error.message : "Unknown error"}`);
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

  // Function to be passed to ChatBot for tracking response generation state
  const handleResponseGenerationState = (isGenerating: boolean) => {
    setIsGeneratingResponse(isGenerating);
  };

  const handleGoToFlashcards = () => {
    navigate("/flashcards");
  };

  const handleSetupAPIKey = () => {
    navigate("/settings");
  };

  const openOpenAIDocs = () => {
    window.open("https://platform.openai.com/docs/api-reference/assistants", "_blank");
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
          {openAIConfig?.assistantId ? (
            <div className={`${connectError ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'} border rounded-md p-4 text-sm`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className={`h-4 w-4 ${connectError ? 'text-amber-600' : 'text-blue-600'}`} />
                  <p className="font-medium">{connectError ? 'Assistant connectivity issue' : `Using custom assistant for ${activeClass}`}</p>
                </div>
                <Badge variant={connectError ? "outline" : "default"} className={connectError ? "" : "bg-blue-500"}>
                  {openAIConfig.assistantId.substring(0, 8)}...
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
                    View OpenAI Assistant docs <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-blue-600 mt-1">
                  Responses will be based on your class materials using a specialized assistant
                </p>
              )}
            </div>
          ) : openAIConfig?.vectorStoreId ? (
            <div className={`${connectError ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'} border rounded-md p-4 text-sm`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className={`h-4 w-4 ${connectError ? 'text-amber-600' : 'text-blue-600'}`} />
                  <p className="font-medium">{connectError ? 'Vector store connectivity issue' : `Using custom knowledge base for ${activeClass}`}</p>
                </div>
                <Badge variant={connectError ? "outline" : "default"} className={connectError ? "" : "bg-blue-500"}>
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
                    View OpenAI Assistant docs <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-blue-600 mt-1">
                  Responses will be based on your class materials
                </p>
              )}
            </div>
          ) : activeClass ? (
            <Alert variant="default" className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No custom knowledge base</AlertTitle>
              <AlertDescription>
                This class isn't connected to an assistant. Responses will use OpenAI's general knowledge, not your class materials.
              </AlertDescription>
            </Alert>
          ) : null}
        </>
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
          disableToasts={true}
          suggestions={suggestions}
          title={activeClass ? `${activeClass} Assistant` : "Class Assistant"}
          knowledgeBase={activeClass || "General Knowledge"}
          openAIConfig={openAIConfig}
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

export default SuperTutor;
