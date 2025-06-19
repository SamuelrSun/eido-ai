// src/services/classOpenAIConfig.ts
import { supabase } from "@/integrations/supabase/client";
import type { CustomDatabase } from "@/integrations/supabase/client";

// Interface for OpenAI specific configurations for a class
// IMPORTANT: vectorStoreId and assistantId are NO LONGER stored on the 'classes' table.
// If class-specific OpenAI configs are still desired, a new DB table or
// a different management strategy (e.g., purely in Edge Functions) is needed.
export interface OpenAIConfig {
  // These fields are removed from the 'classes' table.
  // Keeping this interface for now as it might be used by other parts of the app
  // for payload structure, but getConfigForClass will return undefined for them.
  vectorStoreId?: string | null;
  assistantId?: string | null;
}

export interface ClassConfig {
  class_id: string;
  class_name: string; // Renamed from 'title'
  user_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  // Deleted fields: professor, classTime, classroom, emoji, enabledWidgets, openAIConfig
  // If openAIConfig is still needed as part of ClassConfig, it will have to be
  // derived or fetched from a different source. For now, it's removed.
}

type ClassesDBInsertPayload = CustomDatabase['public']['Tables']['classes']['Insert'];
type ClassesDBRow = CustomDatabase['public']['Tables']['classes']['Row'];
type ClassesDBUpdatePayload = Partial<ClassesDBRow>;

/**
 * Service to manage class configurations.
 * Note: Direct storage of OpenAI resource IDs (vectorStoreId, assistantId)
 * and detailed class metadata (professor, etc.) directly on the 'classes' table
 * is no longer supported by this client-side service as per the new schema.
 * Re-implement if needed via new tables or backend logic.
 */
export const classOpenAIConfigService = {
  /**
   * Get the OpenAI configuration (assistantId, vectorStoreId) for a specific class.
   * This function will now always return undefined as these columns are removed from 'classes' table.
   * Re-evaluate if these need to be stored elsewhere.
   *
   * @param class_id The ID of the class.
   * @returns Always undefined as these fields are no longer directly on the class record.
   */
  getConfigForClass: async (class_id: string): Promise<OpenAIConfig | undefined> => {
    console.warn("getConfigForClass: OpenAI config IDs are no longer stored on the 'classes' table. This function will return undefined.");
    return undefined; // Or throw an error if this is a critical dependency.
  },

  /**
   * Saves a new class or updates an existing one.
   *
   * @param className The name of the class (renamed from classTitle).
   * @param class_id_to_update Optional ID of the class to update.
   * @returns The created or updated Class database row object.
   */
  saveConfigForClass: async (
    className: string, // Renamed from classTitle
    class_id_to_update?: string | null
  ): Promise<ClassesDBRow> => {
    if (!className || typeof className !== 'string' || className.trim() === "") {
        throw new Error("Class name is required and cannot be empty.");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error('Authentication required to save class configuration.');
    }

    let savedClassRecord: ClassesDBRow;
    if (class_id_to_update) {
      // Explicit UPDATE path
      console.log(`Attempting to update existing class with class_id: ${class_id_to_update}`);
      const updatePayload: ClassesDBUpdatePayload = {
        class_name: className, // Renamed from class_title
        updated_at: new Date().toISOString(),
        // Removed: professor, class_time, classroom, emoji, enabled_widgets, vector_store_id, assistant_id
      };
      const { data: updateData, error: updateError } = await supabase
        .from('classes')
        .update(updatePayload)
        .eq('class_id', class_id_to_update)
        .eq('user_id', user.id)
        .select()
        .single();
      if (updateError) {
        console.error('Error updating class in Supabase:', updateError);
        if (updateError.code === 'PGRST116') { // Not found
            throw new Error(`Class with ID ${class_id_to_update} not found for update, or you do not have permission.`);
        }
        throw updateError;
      }
      if (!updateData) throw new Error("Failed to update class, no data returned from Supabase.");
      savedClassRecord = updateData;
      console.log(`Successfully updated class '${className}' (ID: ${class_id_to_update}) in Supabase.`);
    } else {
      // INSERT path (for new classes)
      const { data: existingClassByName, error: fetchError } = await supabase // Renamed var to match new column
        .from('classes')
        .select('class_id, class_name') // Select class_name
        .eq('class_name', className) // Query by class_name
        .eq('user_id', user.id)
        .maybeSingle();
      if (fetchError) {
        console.error('Error checking if class exists by name:', fetchError); // Renamed log
        throw fetchError;
      }

      if (existingClassByName) {
        console.warn(`A class with the name '${className}' already exists for this user.`); // Renamed log
        throw new Error(`A class named '${className}' already exists. Please use a different name.`); // Renamed log
      }

      console.log('Inserting new class record for name:', className); // Renamed log
      const insertPayload: ClassesDBInsertPayload = {
        class_name: className, // Renamed from class_title
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Removed: professor, class_time, classroom, emoji, enabled_widgets, vector_store_id, assistant_id
      };
      const { data: insertData, error: insertError } = await supabase
        .from('classes')
        .insert(insertPayload)
        .select()
        .single();
      if (insertError) {
        console.error('Error inserting new class into Supabase:', insertError);
        throw insertError;
      }
      if (!insertData) throw new Error("Failed to insert new class, no data returned from Supabase.");
      savedClassRecord = insertData;
      console.log(`Successfully inserted new class '${className}' with class_id: ${savedClassRecord.class_id}.`); // Renamed log
      // The provision-class-resources function invocation should be handled carefully
      // If assistant_id/vector_store_id are no longer on 'classes' table, this part
      // needs to be re-evaluated how those are stored/managed.
      // For now, removing the client-side attempt to update savedClassRecord with these.
      try {
        console.log(`Invoking 'provision-class-resources' for new class_id: ${savedClassRecord.class_id}`);
        // If 'provision-class-resources' still returns IDs and you want to store them,
        // you'd need a new table (e.g., 'openai_class_configs') to link them.
        const { data: provisionData, error: provisionError } = await supabase.functions.invoke(
          'provision-class-resources',
          { body: { class_id: savedClassRecord.class_id, class_name: savedClassRecord.class_name } } // Renamed class_title to class_name
        );
        if (provisionError) {
          console.error('Error invoking provision-class-resources Edge Function:', provisionError);
        } else {
          console.log('Successfully invoked provision-class-resources. Response:', provisionData);
          // Removed: savedClassRecord.assistant_id = provisionData.assistantId || null;
          // Removed: savedClassRecord.vector_store_id = provisionData.vectorStoreId || null;
        }
      } catch (invokeError) {
        console.error('Exception calling provision-class-resources Edge Function:', invokeError);
      }
    }
    return savedClassRecord;
  },

  getActiveClassConfig: async (): Promise<OpenAIConfig | undefined> => {
    console.warn("getActiveClassConfig: OpenAI config IDs are no longer stored on the 'classes' table. This function will return undefined.");
    return undefined; // Always return undefined now
    /*
    // Original logic that fetched config, now obsolete for direct DB access from 'classes'
    try {
      const activeClassJSON = sessionStorage.getItem('activeClass');
      if (!activeClassJSON) {
        return undefined;
      }
      const parsedActiveClass = JSON.parse(activeClassJSON) as Partial<ClassConfig & { class_id: string; class_name: string; openAIConfig?: OpenAIConfig }>; // Updated 'title' to 'class_name'
      
      // Removed: If (parsedActiveClass.openAIConfig ...)
      // Removed: if (parsedActiveClass.class_id) { return await classOpenAIConfigService.getConfigForClass(parsedActiveClass.class_id); }
      
      if (parsedActiveClass.class_name) { // Fallback for older session data or for initial load
         const { data: { user } } = await supabase.auth.getUser();
         if(user) {
            const { data: classFromDb, error } = await supabase
                .from('classes')
                .select('class_id') // Only select class_id or class_name, as other fields are removed
                .eq('class_name', parsedActiveClass.class_name) // Query by class_name
                .eq('user_id', user.id)
                .maybeSingle();
            if (error) { console.error("Error fetching class by name for active config:", error); throw error; } // Updated log
            if(classFromDb) {
                // If you re-introduce class-specific OpenAI configs in a new table, fetch them here
                // For now, returning undefined as they are not on 'classes' table.
                return undefined;
            }
         }
      }
      return undefined;
    } catch (error) {
      console.error('Error retrieving active class OpenAI configuration:', error);
      return undefined;
    }
    */
  },

  getAllClasses: async (): Promise<ClassConfig[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*') // Selects all remaining columns: class_id, class_name, user_id, created_at, updated_at
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching classes from Supabase:', error);
        throw error;
      }
      if (data) {
        return data.map((item: ClassesDBRow) => ({
          class_id: item.class_id,
          class_name: item.class_name, // Renamed from item.title
          user_id: item.user_id,
          created_at: item.created_at,
          updated_at: item.updated_at,
          // Removed: professor, classTime, classroom, emoji, enabledWidgets, openAIConfig
        }));
      }
      return [];
    } catch (error) {
      console.error('Error retrieving all classes:', error);
      throw error;
    }
  },

  deleteClass: async (class_id: string): Promise<void> => {
    if (!class_id) {
      throw new Error('Valid class_id is required for deletion');
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Authentication required to delete a class.');
    }

    console.log(`[deleteClass] Starting deletion process for class_id: ${class_id}`);
    try {
      // Step 1: Delete all dependent data in Supabase tables.
      // The order matters if there are dependencies between these tables.
      // We delete items that depend on others first.

      console.log(`[deleteClass] Deleting associated chat messages for class ${class_id}...`);
      const { error: msgError } = await supabase.from('chat_messages').delete().eq('class_id', class_id);
      if (msgError) console.error("Error deleting chat messages:", msgError);

      console.log(`[deleteClass] Deleting associated conversations for class ${class_id}...`);
      const { error: convoError } = await supabase.from('conversations').delete().eq('class_id', class_id);
      if (convoError) console.error("Error deleting conversations:", convoError);

      console.log(`[deleteClass] Deleting associated files for class ${class_id}...`);
      const { error: filesError } = await supabase.from('files').delete().eq('class_id', class_id);
      if (filesError) console.error("Error deleting files:", filesError);

      console.log(`[deleteClass] Deleting associated folders for class ${class_id}...`);
      const { error: foldersError } = await supabase.from('folders').delete().eq('class_id', class_id); // Changed from file_folders
      if (foldersError) console.error("Error deleting folders:", foldersError); // Changed log

      console.log(`[deleteClass] Deleting associated quiz questions for class ${class_id}...`);
      const { error: quizQError } = await supabase.from('quiz_questions').delete().eq('class_id', class_id);
      if (quizQError) console.error("Error deleting quiz questions:", quizQError);

      console.log(`[deleteClass] Deleting associated quizzes for class ${class_id}...`);
      const { error: quizError } = await supabase.from('quizzes').delete().eq('class_id', class_id);
      if (quizError) console.error("Error deleting quizzes:", quizError);

      console.log(`[deleteClass] Deleting associated flashcards for class ${class_id}...`);
      const { error: flashcardsError } = await supabase.from('flashcards').delete().eq('class_id', class_id);
      if(flashcardsError) console.error("Error deleting flashcards:", flashcardsError);

      console.log(`[deleteClass] Deleting associated flashcard decks for class ${class_id}...`);
      const { error: decksError } = await supabase.from('flashcard-decks').delete().eq('class_id', class_id);
      if(decksError) console.error("Error deleting flashcard decks:", decksError);
      
      // Step 2: Call the new Edge Function to delete data from Weaviate
      // This function's implementation might need to change if vector_store_id is no longer stored on classes table
      console.log(`[deleteClass] Invoking function to delete Weaviate data by class for class ${class_id}...`);
      const { error: weaviateDeleteError } = await supabase.functions.invoke(
        'delete-weaviate-data-by-class',
        { body: { class_id_to_delete: class_id } }
      );
      if (weaviateDeleteError) {
          console.error("Error cleaning up Weaviate data:", weaviateDeleteError);
          // We can choose to continue or throw an error. For now, we'll log it and proceed.
      }

      // Step 3: Now it's safe to delete the class record itself.
      console.log(`[deleteClass] Deleting class record for class_id: ${class_id}`);
      const { error: deleteClassError } = await supabase
        .from('classes')
        .delete()
        .eq('class_id', class_id);
      if (deleteClassError) {
        console.error("Error deleting the final class record:", deleteClassError);
        throw deleteClassError; // This is a critical failure
      }

      console.log(`[deleteClass] Successfully completed deletion for class_id: ${class_id}`);
    } catch (error) {
      console.error(`[deleteClass] A critical error occurred during the deletion process for class ${class_id}:`, error);
      throw error;
    }
  },

  clearAllData: async (): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      sessionStorage.removeItem('activeClass');
      return;
    }
    try {
      console.warn(`Attempting to delete ALL classes for user: ${user.id} from DB.`);
      await supabase.from('classes').delete().eq('user_id', user.id);
      sessionStorage.removeItem('activeClass');
      console.log(`Cleared all database class data and session storage for user: ${user.id}.`);
    } catch (error) { console.error('Error clearing all class data:', error); throw error; }
  },
};