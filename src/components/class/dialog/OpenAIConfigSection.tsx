// src/components/class/dialog/OpenAIConfigSection.tsx
import React from "react";
import { Code, Info, Database, Bot } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider, // Ensure TooltipProvider wraps this if not already higher up
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OpenAIConfigSectionProps {
  // openAIApiKey: string; // Removed - API key is no longer managed here
  // onApiKeyChange: (value: string) => void; // Removed
  vectorStoreId: string;
  assistantId: string;
  showOpenAIConfig: boolean;
  onVectorStoreIdChange: (value: string) => void;
  onAssistantIdChange: (value: string) => void;
  onToggleConfig: () => void;
  isEditing?: boolean; // Added to conditionally disable fields if auto-provisioned
}

export function OpenAIConfigSection({
  vectorStoreId,
  assistantId,
  showOpenAIConfig,
  onVectorStoreIdChange,
  onAssistantIdChange,
  onToggleConfig,
  isEditing = false, // Default to false
}: OpenAIConfigSectionProps) {
  // Determine if fields should be read-only.
  // For new classes, these will be auto-provisioned.
  // For existing classes, they might be displayed as read-only or editable for advanced users.
  // For now, let's make them read-only if they have values, implying they were provisioned.
  const fieldsAreReadOnly = !!(assistantId || vectorStoreId) && isEditing;

  return (
    // Wrap with TooltipProvider if not already provided by a parent component
    // For shadcn UI, TooltipProvider is usually at a higher level (e.g., App.tsx or layout)
    // If you encounter issues with tooltips not showing, ensure a Provider is present.
    // <TooltipProvider> 
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
              <p>
                Class-specific OpenAI resources (Assistant and Vector Store)
                are automatically created when you create a new class.
              </p>
              <p className="mt-2">
                These IDs allow the AI to use materials specific to this class.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleConfig}
        >
          {showOpenAIConfig ? "Hide" : "Show"} Details
        </Button>
      </div>

      {showOpenAIConfig && (
        <div className="space-y-6">
          {/* API Key Input Removed */}
          {/*
          <div>
            <Label htmlFor="openai-api-key" className="flex items-center gap-1 mb-3">
              OpenAI API Key (No Longer Needed Here)
            </Label>
            <Input
              id="openai-api-key"
              type="text"
              placeholder="API Key is now globally managed"
              value={"API Key is globally managed in Edge Function secrets"}
              readOnly
              className="font-mono bg-muted/50"
            />
          </div>
          */}

          <div>
            <Label htmlFor="assistant-id" className="flex items-center gap-1 mb-3">
              <Bot className="h-4 w-4 mr-1" />
              Assistant ID
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>The ID of the OpenAI Assistant for this class.</p>
                  <p className="mt-1">This is auto-generated when a new class is created.</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              id="assistant-id"
              placeholder="asst_... (auto-generated)"
              value={assistantId}
              onChange={(e) => onAssistantIdChange(e.target.value)}
              className="font-mono"
              readOnly={fieldsAreReadOnly && !!assistantId} // Read-only if editing and ID exists
            />
             {fieldsAreReadOnly && !!assistantId && (
              <p className="text-xs text-muted-foreground mt-1">This ID is auto-provisioned and typically not changed.</p>
            )}
          </div>

          <div>
            <Label htmlFor="vector-store-id" className="flex items-center gap-1 mb-3">
              <Database className="h-4 w-4 mr-1" />
              Vector Store ID
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p>The ID of the OpenAI Vector Store for this class's materials.</p>
                  <p className="mt-1">This is auto-generated when a new class is created.</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              id="vector-store-id"
              placeholder="vs_... (auto-generated)"
              value={vectorStoreId}
              onChange={(e) => onVectorStoreIdChange(e.target.value)}
              className="font-mono"
              readOnly={fieldsAreReadOnly && !!vectorStoreId} // Read-only if editing and ID exists
            />
            {fieldsAreReadOnly && !!vectorStoreId && (
              <p className="text-xs text-muted-foreground mt-1">This ID is auto-provisioned and typically not changed.</p>
            )}
          </div>
        </div>
      )}
    </div>
    // </TooltipProvider>
  );
}