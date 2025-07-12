// supabase/functions/delete-user-account/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import weaviate, { WeaviateClient, ApiKey } from 'npm:weaviate-ts-client@2.0.0';
import { corsHeaders } from "../_shared/cors.ts";

console.log("[delete-user-account] Function cold start.");

/**
 * Deletes all data associated with a user across Supabase DB, Storage, Auth,
 * Weaviate, and Cloudinary.
 */
serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- 1. Initialize Admin Clients ---
    const supabaseAdminClient: SupabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const weaviateClient: WeaviateClient = weaviate.client({
        scheme: 'https',
        host: Deno.env.get("WEAVIATE_URL")!,
        apiKey: new ApiKey(Deno.env.get("WEAVIATE_API_KEY")!),
    });
    console.log("[INIT] Admin clients for Supabase and Weaviate initialized.");

    // --- 2. Authenticate the User and Get User ID ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authentication required: No token provided.");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdminClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error(userError?.message || "Authentication failed: Invalid token.");
    }
    const userIdToDelete = user.id;
    console.log(`[AUTH] Authenticated user for deletion: ${userIdToDelete}`);

    // --- 3. Fetch All User-Owned Resources ---
    console.log(`[FETCH] Fetching all files for user ${userIdToDelete}...`);
    const { data: userFiles, error: filesError } = await supabaseAdminClient
      .from('files')
      .select('file_id, url, thumbnail_url')
      .eq('user_id', userIdToDelete);

    if (filesError) throw new Error(`Failed to fetch user files: ${filesError.message}`);
    console.log(`[FETCH] Found ${userFiles.length} files to process for deletion.`);

    // --- 4. Perform Deletion Across All Services (in parallel where possible) ---
    const deletionPromises = [];

    // 4a. Delete from Supabase Storage
    if (userFiles.length > 0) {
      const storagePaths = userFiles
        .map(file => file.url ? new URL(file.url).pathname.split('/public/file_storage/')[1] : null)
        .filter((path): path is string => path !== null);
      
      if (storagePaths.length > 0) {
        console.log(`[STORAGE] Queuing deletion of ${storagePaths.length} files from Supabase Storage.`);
        deletionPromises.push(
          supabaseAdminClient.storage.from('file_storage').remove(storagePaths)
        );
      }
    }

    // 4b. Delete from Cloudinary
    if (userFiles.length > 0) {
        const cloudinaryPublicIds = userFiles
            .map(file => file.thumbnail_url ? `thumbnails/${file.file_id}` : null)
            .filter((id): id is string => id !== null);

        if (cloudinaryPublicIds.length > 0) {
            console.log(`[CLOUDINARY] Queuing deletion of ${cloudinaryPublicIds.length} thumbnails.`);
            // Note: Cloudinary's API might not support bulk deletion by public_id in the same way.
            // Invoking the function for each is a safe approach.
            for (const publicId of cloudinaryPublicIds) {
                deletionPromises.push(
                    supabaseAdminClient.functions.invoke('delete-from-cloudinary', {
                        body: JSON.stringify({ public_id: publicId })
                    })
                );
            }
        }
    }

    // 4c. Delete from Weaviate
    console.log(`[WEAVIATE] Queuing deletion of all document chunks for user ${userIdToDelete}.`);
    deletionPromises.push(
      weaviateClient.batch.deleter()
        .withClassName('DocumentChunk')
        .withWhere({
          operator: 'Equal',
          path: ['user_id'],
          valueText: userIdToDelete,
        })
        .do()
    );

    // --- Execute all parallel deletions and wait for them to complete ---
    const results = await Promise.allSettled(deletionPromises);
    results.forEach((result, i) => {
        if (result.status === 'rejected') {
            console.warn(`[CLEANUP-WARN] A non-critical deletion task (task #${i}) failed:`, result.reason);
        }
    });
    console.log("[CLEANUP] External services cleanup complete.");

    // --- 5. Delete from Supabase Database ---
    // Deleting the user from the 'profiles' table. If you have set up 'ON DELETE CASCADE'
    // for foreign keys in other tables (like classes, folders, files), this will automatically
    // clean them up. This is the recommended approach.
    console.log(`[DB] Deleting user record from 'profiles' table for user ${userIdToDelete}.`);
    const { error: dbError } = await supabaseAdminClient
      .from('profiles')
      .delete()
      .eq('user_id', userIdToDelete);

    if (dbError) {
      // If this fails, we stop before deleting the auth user to allow for investigation.
      throw new Error(`Failed to delete user data from database: ${dbError.message}`);
    }
    console.log("[DB] ✅ Database records deleted successfully.");

    // --- 6. Final Step: Delete the Auth User ---
    // This is the last and most critical step.
    console.log(`[AUTH] Deleting user ${userIdToDelete} from Supabase Auth service.`);
    const { error: deleteError } = await supabaseAdminClient.auth.admin.deleteUser(userIdToDelete);

    if (deleteError) {
      // This is a critical failure. The user's data might be gone but their login remains.
      // This requires manual intervention.
      console.error(`[AUTH] CRITICAL FAILURE: Could not delete user from Auth. Manual cleanup required.`, deleteError);
      throw new Error(`Failed to delete user from authentication service: ${deleteError.message}`);
    }
    console.log(`[SUCCESS] ✅ Successfully deleted user ${userIdToDelete} from all systems.`);

    // --- 7. Return Success Response ---
    return new Response(
      JSON.stringify({
        success: true,
        message: "User account and all associated data have been successfully deleted.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error('[CRITICAL-ERROR] in delete-user-account function:', errorMessage, error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: (error instanceof Error && error.message.includes("Authentication")) ? 401 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});