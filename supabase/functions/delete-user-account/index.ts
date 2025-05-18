// supabase/functions/delete-user-account/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts"; // Ensure this path is correct relative to your function

console.log("[delete-user-account] Function cold start or new instance.");

serve(async (req: Request) => {
  console.log("[delete-user-account] Received request:", req.method);
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Get Supabase URL and Service Role Key from environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl) {
      console.error("[delete-user-account] FATAL: SUPABASE_URL environment variable not set.");
      throw new Error("Server configuration error: Supabase URL missing.");
    }
    if (!supabaseServiceRoleKey) {
      console.error("[delete-user-account] FATAL: SUPABASE_SERVICE_ROLE_KEY environment variable not set.");
      throw new Error("Server configuration error: Supabase Service Role Key missing.");
    }
    console.log("[delete-user-account] Environment variables loaded.");

    // 2. Create a Supabase client with the Service Role Key for admin operations
    // This client can perform privileged actions.
    const supabaseAdminClient: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        // For server-to-server, session persistence and auto-refresh are not needed.
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    console.log("[delete-user-account] Supabase admin client initialized.");

    // 3. Get the user ID from the JWT of the authenticated user making the request.
    // This is crucial to ensure a user can only request their own account deletion.
    // The function must be invoked with the user's access token (Authorization: Bearer <token>).
    // Ensure 'verify_jwt' is true for this function in your supabase/config.toml.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[delete-user-account] No Authorization header provided.");
      return new Response(
        JSON.stringify({ success: false, error: "Authentication required: No token provided." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.replace("Bearer ", "");
    console.log("[delete-user-account] Token extracted from Authorization header.");

    const { data: { user }, error: userError } = await supabaseAdminClient.auth.getUser(token);

    if (userError || !user) {
      console.error("[delete-user-account] Invalid token or error fetching user:", userError?.message);
      return new Response(
        JSON.stringify({ success: false, error: userError?.message || "Authentication failed: Invalid token." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userIdToDelete = user.id;
    console.log(`[delete-user-account] Authenticated user ID to delete: ${userIdToDelete} (Email: ${user.email})`);

    // 4. Delete the user using the Admin API
    // This will trigger cascading deletes in your database if foreign keys are set up correctly
    // (e.g., public.profiles.user_id -> auth.users.id ON DELETE CASCADE).
    console.log(`[delete-user-account] Attempting supabaseAdminClient.auth.admin.deleteUser(${userIdToDelete})`);
    const { data: deleteData, error: deleteError } = await supabaseAdminClient.auth.admin.deleteUser(userIdToDelete);

    if (deleteError) {
      console.error(`[delete-user-account] Error deleting user ${userIdToDelete} from Supabase Auth:`, deleteError);
      throw new Error(`Failed to delete user account: ${deleteError.message}`);
    }

    console.log(`[delete-user-account] Successfully initiated deletion for user ${userIdToDelete} from Supabase Auth. Response:`, deleteData);

    // Note: The actual deletion from auth.users might take a moment to reflect everywhere.
    // The client will need to handle signing out and redirecting.

    return new Response(
      JSON.stringify({
        success: true,
        message: "User account deletion process initiated successfully. You will be signed out.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during account deletion.";
    console.error('[delete-user-account] Critical error in function:', errorMessage, error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: (error instanceof Error && (error.message.includes("required") || error.message.includes("Authentication failed"))) ? 400 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
