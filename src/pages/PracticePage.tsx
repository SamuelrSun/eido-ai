
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorksheetGenerator } from "@/components/practice/WorksheetGenerator";
import { WorksheetUploader } from "@/components/practice/WorksheetUploader";
import { useWidgets } from "@/hooks/use-widgets";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PracticePage = () => {
  const [activeTab, setActiveTab] = useState<"generate" | "upload">("generate");
  const { isWidgetEnabled } = useWidgets();
  const navigate = useNavigate();

  // Check if practice widget is enabled
  const isPracticeEnabled = isWidgetEnabled("practice");

  if (!isPracticeEnabled) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Practice"
          description="Generate practice worksheets and get feedback on your work."
        />
        <div className="bg-white p-6 rounded-xl shadow-sm border text-center py-12">
          <h3 className="text-lg font-medium text-gray-700 mb-4">Widget Not Enabled</h3>
          <p className="text-gray-500 mb-6">
            The Practice widget is not currently enabled. 
            Please enable it in your dashboard settings.
          </p>
          <Button onClick={() => navigate('/')}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Practice"
        description="Generate practice worksheets and get feedback on your work."
      />
      
      <div className="bg-white shadow-sm rounded-xl border">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "generate" | "upload")}
          className="w-full"
        >
          <div className="border-b px-6 pt-4">
            <TabsList className="mb-0">
              <TabsTrigger value="generate">Generate Worksheets</TabsTrigger>
              <TabsTrigger value="upload">Upload & Grade</TabsTrigger>
            </TabsList>
          </div>
          
          <div className="p-6">
            <TabsContent value="generate" className="m-0 pt-2">
              <WorksheetGenerator />
            </TabsContent>
            
            <TabsContent value="upload" className="m-0 pt-2">
              <WorksheetUploader />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default PracticePage;
