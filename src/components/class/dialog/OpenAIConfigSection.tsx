
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
              type="text" 
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
            <Label htmlFor="assistant-id" className="flex items-center gap-1">
              <Bot className="h-4 w-4 mr-1" />
              Assistant ID
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  The ID of your OpenAI Assistant that contains your class knowledge. Recommended approach.
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
            <p className="text-xs text-blue-600 mt-1 font-medium">
              RECOMMENDED: Use an Assistant ID (starts with "asst_") for best functionality
            </p>
          </div>
          
          <div>
            <Label htmlFor="vector-store-id" className="flex items-center gap-1">
              <Database className="h-4 w-4 mr-1" />
              Vector Store ID (Legacy)
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p>Vector Store IDs are now deprecated. Please use an Assistant instead.</p>
                  <p className="mt-1">Create an Assistant in the OpenAI platform and connect files to it directly.</p>
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
            <p className="text-xs text-amber-600 mt-1 font-medium">
              NOTE: Direct vector store access is deprecated. Use Assistants with files instead.
            </p>
          </div>

          <div className="p-3 bg-blue-50 rounded-md border border-blue-100">
            <h4 className="text-sm font-medium text-blue-800">How to use your class's own knowledge base:</h4>
            <ol className="text-xs text-blue-700 mt-2 space-y-1 list-decimal list-inside">
              <li>Create an Assistant in the <a href="https://platform.openai.com/assistants" target="_blank" rel="noopener noreferrer" className="underline">OpenAI platform</a></li>
              <li>Upload your class materials directly to the Assistant</li>
              <li>Copy the Assistant ID (starts with "asst_")</li>
              <li>Paste the Assistant ID above, along with your API key</li>
              <li>Now all AI features will use your class-specific knowledge</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
