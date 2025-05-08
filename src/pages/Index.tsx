
import { PageHeader } from "@/components/layout/PageHeader";

const Index = () => {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Welcome"
        description="Start building your amazing project here!"
      />
      
      <div className="text-center">
        <p className="text-xl text-gray-600">Explore the features using the sidebar navigation</p>
      </div>
    </div>
  );
};

export default Index;
