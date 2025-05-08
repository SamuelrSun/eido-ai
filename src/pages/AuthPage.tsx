
import { useState } from "react";
import { Auth } from "@/components/auth/Auth";
import { PageHeader } from "@/components/layout/PageHeader";

const AuthPage = () => {
  const [loading] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Account Access"
        description="Sign in to save your chat history, preferences, and access personalized security recommendations."
      />

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <Auth />
      </div>
    </div>
  );
};

export default AuthPage;
