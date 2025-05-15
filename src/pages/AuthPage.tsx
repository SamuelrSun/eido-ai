
import { Auth } from "@/components/auth/Auth";
import { PageHeader } from "@/components/layout/PageHeader";

const AuthPage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/50">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md mb-6 flex flex-col items-center">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="/eido-icon.png" 
              alt="Eido Logo" 
              className="h-20 w-20 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-center mb-2">Welcome to Eido</h1>
          <p className="text-center text-muted-foreground mb-8">
            Your AI Copilot for Coursework
          </p>
        </div>

        <Auth />
        
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            By using Eido, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
