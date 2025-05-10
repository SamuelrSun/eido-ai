
import React from "react";
import { Code } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
            <Label htmlFor="openai-api-key">OpenAI API Key</Label>
            <Input 
              id="openai-api-key"
              type="password"
              placeholder="sk-..." 
              value={openAIApiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="vector-store-id">Vector Store ID</Label>
            <Input 
              id="vector-store-id"
              placeholder="vs-..." 
              value={vectorStoreId}
              onChange={(e) => onVectorStoreIdChange(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="assistant-id">Assistant ID</Label>
            <Input 
              id="assistant-id"
              placeholder="asst-..." 
              value={assistantId}
              onChange={(e) => onAssistantIdChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
