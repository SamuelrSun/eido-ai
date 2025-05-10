
import React from "react";
import { Code, Info, Database, Bot } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OpenAIConfigSectionProps {
  openAIApiKey: string;
  vectorStoreId: string;
  assistantId: string;
  showOpenAIConfig: boolean;
  onApiKeyChange: (value: string) => void;
  onVectorStoreIdChange: (value: string) => void;
  onAssistantIdChange: (value: string) => void;
  onToggleConfig: () => void;
}

export function OpenAIConfigSection({
  openAIApiKey,
  vectorStoreId,
  assistantId,
  showOpenAIConfig,
  onApiKeyChange,
  onVectorStoreIdChange,
  onAssistantIdChange,
  onToggleConfig
}: OpenAIConfigSectionProps) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Code className="h-5 w-5" />
          <Label className="text-base font-medium">OpenAI Configuration</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p>Configure class-specific OpenAI settings to use dedicated resources for this class.</p>
              <p className="mt-2">Each class can have its own Vector Store for specialized knowledge and AI Assistant.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleConfig}
        >
          {showOpenAIConfig ? "Hide" : "Show"}
        </Button>
      </div>
      
      {showOpenAIConfig && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="openai-api-key" className="flex items-center gap-1">
              OpenAI API Key
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  Your OpenAI API key for this class. This will be stored securely.
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input 
              id="openai-api-key"
              type="password"
              placeholder="sk-..." 
              value={openAIApiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This will be used to authenticate API calls for AI features in this class.
            </p>
          </div>
          
          <div>
            <Label htmlFor="vector-store-id" className="flex items-center gap-1">
              <Database className="h-4 w-4 mr-1" />
              Vector Store ID
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p>The ID of your OpenAI vector store that contains specialized knowledge for this class.</p>
                  <p className="mt-1">This is <strong>essential</strong> for the AI to answer questions based on your class materials.</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input 
              id="vector-store-id"
              placeholder="vs_..." 
              value={vectorStoreId}
              onChange={(e) => onVectorStoreIdChange(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              <strong>Important:</strong> This connects the AI to your class's specific knowledge base. Without this, the AI will use general knowledge.
            </p>
          </div>
          
          <div>
            <Label htmlFor="assistant-id" className="flex items-center gap-1">
              <Bot className="h-4 w-4 mr-1" />
              Assistant ID
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  The ID of your OpenAI Assistant trained for this specific class subject.
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input 
              id="assistant-id"
              placeholder="asst_..." 
              value={assistantId}
              onChange={(e) => onAssistantIdChange(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Uses an AI assistant fine-tuned for this class's subject matter.
            </p>
          </div>

          <div className="p-3 bg-blue-50 rounded-md border border-blue-100">
            <h4 className="text-sm font-medium text-blue-800">How to use your class's own knowledge base:</h4>
            <ol className="text-xs text-blue-700 mt-2 space-y-1 list-decimal list-inside">
              <li>Create a vector store in OpenAI and upload your class materials</li>
              <li>Copy the Vector Store ID (starts with "vs_") and paste it above</li>
              <li>Optionally create an Assistant and connect it to your vector store</li>
              <li>Now all AI features will use your class-specific knowledge</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
