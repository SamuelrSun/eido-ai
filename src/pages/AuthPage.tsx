// src/pages/AuthPage.tsx
import { Auth } from "@/components/auth/Auth";
// PageHeader is not used here, so its import can be removed if it was present in previous versions.

const AuthPage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/50">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        {/* Logo remains at the top */}
        <div className="flex items-center justify-center mb-8"> {/* Increased bottom margin for spacing */}
          <img 
            src="/eido-icon.png" 
            alt="Eido Logo" 
            className="h-20 w-20 object-contain"
          />
        </div>

        {/* The Auth component (the card) is now directly below the logo */}
        <Auth />
        
        {/* Footer text remains */}
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
