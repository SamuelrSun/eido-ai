
import { useState, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, BookOpen, FileInput } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface WorksheetSettings {
  topic: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  questionCount: number;
  format: "pdf" | "docx";
}

export function WorksheetGenerator() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [settings, setSettings] = useState<WorksheetSettings>({
    topic: "",
    difficulty: "intermediate",
    questionCount: 5,
    format: "pdf"
  });
  
  const { toast } = useToast();

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, topic: e.target.value });
  };

  const handleDifficultyChange = (value: "beginner" | "intermediate" | "advanced") => {
    setSettings({ ...settings, difficulty: value });
  };

  const handleQuestionCountChange = (value: number[]) => {
    setSettings({ ...settings, questionCount: value[0] });
  };

  const handleFormatChange = (value: "pdf" | "docx") => {
    setSettings({ ...settings, format: value });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      toast({
        title: "Template uploaded",
        description: `${e.target.files[0].name} will be used as a style reference`
      });
    }
  };

  const handleGenerate = async () => {
    if (!prompt && !settings.topic) {
      toast({
        title: "Missing information",
        description: "Please provide a prompt or topic for your worksheet",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Simulate worksheet generation
      const simulatedDelay = Math.random() * 1000 + 1000;
      await new Promise(resolve => setTimeout(resolve, simulatedDelay));
      
      // Generate a simple preview
      const previewContent = generateSamplePreview(settings);
      setPreviewText(previewContent);
      
      toast({
        title: "Worksheet generated",
        description: "Preview is ready. You can now download your worksheet."
      });
    } catch (error) {
      console.error("Error generating worksheet:", error);
      toast({
        title: "Generation failed",
        description: "An error occurred while generating your worksheet",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!previewText) return;
    
    const format = settings.format;
    const filename = `worksheet-${settings.topic || "practice"}.${format}`;
    const fileContent = previewText;
    
    // Create a blob for download
    const blob = new Blob([fileContent], { type: format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link and trigger download
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast({
      title: "Download started",
      description: `Your ${format.toUpperCase()} worksheet is downloading.`
    });
  };

  // Helper function for preview generation
  const generateSamplePreview = (settings: WorksheetSettings) => {
    const { topic, difficulty, questionCount } = settings;
    
    const difficultyDescription = 
      difficulty === "beginner" ? "Basic concepts" :
      difficulty === "intermediate" ? "Moderate complexity" :
      "Advanced concepts";
    
    let preview = `PRACTICE WORKSHEET\n`;
    preview += `Topic: ${topic || "General Practice"}\n`;
    preview += `Difficulty: ${difficulty} (${difficultyDescription})\n\n`;
    
    for (let i = 1; i <= questionCount; i++) {
      preview += `Question ${i}: [${topic || "Practice"} question will appear here - ${difficulty} level]\n`;
      preview += `Answer space: ____________________\n\n`;
    }
    
    return preview;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">
              Describe the worksheet you want to generate
            </Label>
            <Textarea
              id="prompt"
              placeholder="Describe what kind of practice worksheet you want, for example: 'Create a calculus worksheet on derivatives with both algebraic and word problems'"
              className="min-h-[100px]"
              value={prompt}
              onChange={handlePromptChange}
            />
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input 
                id="topic" 
                placeholder="e.g. Calculus, Biology, Literature" 
                value={settings.topic}
                onChange={handleTopicChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select 
                value={settings.difficulty} 
                onValueChange={(value) => handleDifficultyChange(value as any)}
              >
                <SelectTrigger id="difficulty">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="question-count">Number of Questions: {settings.questionCount}</Label>
              </div>
              <Slider 
                id="question-count"
                min={1} 
                max={20} 
                step={1} 
                value={[settings.questionCount]} 
                onValueChange={handleQuestionCountChange} 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="format">Output Format</Label>
              <Select 
                value={settings.format} 
                onValueChange={(value) => handleFormatChange(value as any)}
              >
                <SelectTrigger id="format">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="docx">DOCX</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="template">Upload Template (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input 
                  id="template" 
                  type="file" 
                  accept=".pdf,.doc,.docx" 
                  onChange={handleFileChange}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-white hover:file:bg-primary/90"
                />
                {file && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setFile(null)}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload an existing worksheet to use its style as a template
              </p>
            </div>

            <Button 
              className="w-full mt-4" 
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? (
                <>Generating Worksheet...</>
              ) : (
                <>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Generate Worksheet
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Preview</h3>
          <Card className="min-h-[300px]">
            <CardContent className="p-4">
              {previewText ? (
                <div className="whitespace-pre-wrap font-mono text-sm">
                  {previewText}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground/60" />
                    <p className="mt-2">Worksheet preview will appear here</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Button 
            className="w-full" 
            variant="outline" 
            onClick={handleDownload} 
            disabled={!previewText}
          >
            <Download className="mr-2 h-4 w-4" />
            Download {settings.format.toUpperCase()}
          </Button>
        </div>
      </div>
    </div>
  );
}
