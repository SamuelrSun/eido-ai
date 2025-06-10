// src/pages/AuthPage.tsx
import { Auth } from "@/components/auth/Auth";

const AuthPage = () => {
  return (
    // This root div creates the full-screen container
    <div 
      className="min-h-screen w-full bg-gray-50 flex items-center justify-center p-4" 
      style={{ 
        backgroundImage: "url('/auth-background.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* This is the white card that contains the authentication form.
        It's centered by the flex properties on the parent div.
        It has a max-width, rounded corners, a shadow, and padding.
      */}
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl p-8 sm:p-12">
        <Auth />
      </div>
    </div>
  );
};

export default AuthPage;
