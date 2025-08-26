// src/pages/AuthPage.tsx
import { Auth } from "@/components/auth/Auth";

const AuthPage = () => {
  return (
    // MODIFICATION: Changed background to dark theme and removed background image style.
    <div className="min-h-screen w-full bg-neutral-950 flex items-center justify-center p-4">
      {/* MODIFICATION: Updated card to use dark theme colors and border. */}
      <div className="w-full max-w-xl bg-neutral-900 rounded-2xl border border-neutral-800 p-8 sm:p-12">
        <Auth />
      </div>
    </div>
  );
};

export default AuthPage;
