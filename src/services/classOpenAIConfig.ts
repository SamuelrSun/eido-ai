// src/services/classOpenAIConfig.ts
import { supabase } from "@/integrations/supabase/client";
import type { User } from '@supabase/supabase-js';
import type { CustomDatabase } from "@/integrations/supabase/client"; // Ensure this path is correct for your project

// Interface for OpenAI specific configurations for a class
// API Key is no longer stored or handled on the client-side.
export interface OpenAIConfig {
  vectorStoreId?: string | null;
  assistantId?: string | null;
}

// Interface for the application's representation of a class
// This is what components will typically work with.
export interface ClassConfig {
  class_id: string; // Matches 'classes.class_id'
  title: string;    // Matches 'classes.class_title'
  professor?: string | null;
  classTime?: string | null;
  classroom?: string | null;
  emoji?: string | null;
  enabledWidgets?: string[] | null; // Consider using WidgetType[] if defined globally
  openAIConfig: OpenAIConfig;
  user_id?: string | null; // Added for completeness, though usually implicit from context
  created_at?: string | null;
  updated_at?: string | null;
}

// Type alias for the Insert payload for the 'classes' table from CustomDatabase
// NonNullable is used to ensure we're working with the expected object structure.
type ClassesDBInsertPayload = NonNullable<CustomDatabase['public']['Tables']['classes']['Insert']>;
// Type alias for a Row from the 'classes' table
type ClassesDBRow = NonNullable<CustomDatabase['public']['Tables']['classes']['Row']>;

// For updates, we define a specific payload to only include fields that are intended to be updatable.
type ClassesDBUpdatePayload = {
  class_title?: string; // Title might be updatable
  professor?: string | null;
  class_time?: string | null;
  classroom?: string | null;
  emoji?: string | null;
  enabled_widgets?: string[] | null; // Or WidgetType[]
  vector_store_id?: string | null; // Can be updated if manually changed or re-provisioned
  assistant_id?: string | null;   // Can be updated
  updated_at: string; // Always update this timestamp
  // user_id and created_at should not be in an update payload directly
};


/**
 * Service to manage class configurations, including OpenAI resource provisioning.
 */
export const classOpenAIConfigService = {
  /**
   * Get the OpenAI configuration (assistantId, vectorStoreId) for a specific class.
   *
   * @param class_id The ID of the class.
   * @returns The OpenAI configuration for the class, or undefined if not found.
   */
  getConfigForClass: async (class_id: string): Promise<OpenAIConfig | undefined> => {
    if (!class_id) {
      console.error("getConfigForClass: class_id is required.");
      return undefined;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('getConfigForClass: No authenticated user found.');
        throw new Error('Authentication required to access class configuration.');
      }
      const { data, error } = await supabase
        .from('classes')
        .select('vector_store_id, assistant_id')
        .eq('class_id', class_id)
        .eq('user_id', user.id) // Ensure the user owns this class record
        .maybeSingle();

      if (error) {
        console.error('Error retrieving OpenAI configuration from Supabase:', error);
        throw error;
      }
      if (data) {
        return {
          vectorStoreId: data.vector_store_id,
          assistantId: data.assistant_id,
        };
      }
      return undefined; // Class or config not found
    } catch (error) {
      console.error('Exception in getConfigForClass:', error);
      throw error; // Re-throw to be caught by caller
    }
  },

  /**
   * Saves a new class or updates an existing one.
   * After creating a new class, it triggers the provisioning of OpenAI resources.
   *
   * @param classTitle The title of the class.
   * @param openAIConfigManual Optional manual input for assistant/vector store IDs (mainly for edit).
   * @param emoji
   * @param professor
   * @param classTime
   * @param classroom
   * @param enabledWidgets
   * @returns The created or updated Class database row object.
   */
  saveConfigForClass: async (
    classTitle: string,
    openAIConfigManual: Partial<OpenAIConfig>,
    emoji?: string | null,
    professor?: string | null,
    classTime?: string | null,
    classroom?: string | null,
    enabledWidgets?: string[] | null // Consider WidgetType[]
  ): Promise<ClassesDBRow> => {
    if (!classTitle || typeof classTitle !== 'string' || classTitle.trim() === "") {
        throw new Error("Class title is required and cannot be empty.");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error('Authentication required to save class configuration.');
    }

    const safeEnabledWidgets = Array.isArray(enabledWidgets) ? enabledWidgets : ["supertutor", "database"];

    // Check if a class with this title already exists for the user.
    // For updates, we should ideally use class_id if available to prevent issues if title changes.
    // This service method might need to be split or take class_id for updates.
    // For now, it assumes title + user_id can find an existing record for update.
    const { data: existingClass, error: fetchError } = await supabase
      .from('classes')
      .select('class_id')
      .eq('class_title', classTitle) // This lookup might be problematic if title is being changed
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
        console.error('Error checking if class exists:', fetchError);
        throw fetchError;
    }

    let savedClassRecord: ClassesDBRow;

    if (existingClass?.class_id) {
      // Update existing class
      console.log(`Updating existing class with class_id: ${existingClass.class_id}`);
      const updatePayload: ClassesDBUpdatePayload = {
        class_title: classTitle, // Assuming title can be updated
        professor: professor || null,
        class_time: classTime || null,
        classroom: classroom || null,
        emoji: emoji || null,
        enabled_widgets: safeEnabledWidgets,
        vector_store_id: openAIConfigManual.vectorStoreId || null,
        assistant_id: openAIConfigManual.assistantId || null,
        updated_at: new Date().toISOString(),
      };

      const { data: updateData, error: updateError } = await supabase
        .from('classes')
        .update(updatePayload)
        .eq('class_id', existingClass.class_id) // Update by specific class_id
        .eq('user_id', user.id) // Ensure user owns the record
        .select()
        .single();

      if (updateError) {
        console.error('Error updating class in Supabase:', updateError);
        throw updateError;
      }
      if (!updateData) throw new Error("Failed to update class, no data returned from Supabase.");
      savedClassRecord = updateData;
      console.log(`Successfully updated class '${classTitle}' in Supabase.`);

    } else {
      // Insert new class
      console.log('Inserting new class record for title:', classTitle);
      const insertPayload: ClassesDBInsertPayload = {
        // class_id is generated by DB (if UUID default) or should be provided if not.
        // Assuming class_id is auto-generated for this example.
        class_title: classTitle,
        professor: professor || null,
        class_time: classTime || null,
        classroom: classroom || null,
        emoji: emoji || null,
        enabled_widgets: safeEnabledWidgets,
        vector_store_id: null, // Will be set by Edge Function
        assistant_id: null,    // Will be set by Edge Function
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
      console.log(`Successfully inserted new class '${classTitle}' with class_id: ${savedClassRecord.class_id}.`);

      // After successful insertion of a NEW class, trigger OpenAI resource provisioning
      try {
        console.log(`Invoking 'provision-class-resources' for new class_id: ${savedClassRecord.class_id}`);
        const { data: provisionData, error: provisionError } = await supabase.functions.invoke(
          'provision-class-resources',
          { body: { class_id: savedClassRecord.class_id, class_title: savedClassRecord.class_title } }
        );

        if (provisionError) {
          console.error('Error invoking provision-class-resources Edge Function:', provisionError);
          // Consider how to handle this: maybe flag the class, or inform the user.
        } else {
          console.log('Successfully invoked provision-class-resources. Response:', provisionData);
          // The Edge Function updates the class record with assistant_id and vector_store_id.
          // To reflect this immediately, savedClassRecord would need to be updated or re-fetched.
          if (provisionData && provisionData.success) {
            savedClassRecord.assistant_id = provisionData.assistantId || null;
            savedClassRecord.vector_store_id = provisionData.vectorStoreId || null;
          }
        }
      } catch (invokeError) {
        console.error('Exception calling provision-class-resources Edge Function:', invokeError);
      }
    }
    return savedClassRecord;
  },

  /**
   * Get the OpenAI configuration (assistantId, vectorStoreId) for the currently active class
   * from session storage, falling back to a DB lookup if needed.
   *
   * @returns The OpenAIConfig for the active class, or undefined.
   */
  getActiveClassConfig: async (): Promise<OpenAIConfig | undefined> => {
    try {
      const activeClassJSON = sessionStorage.getItem('activeClass');
      if (!activeClassJSON) {
        console.log('No active class found in session storage for getActiveClassConfig.');
        return undefined;
      }

      // Assuming activeClass in session storage is of type ClassConfig (or a subset like ClassOption from HomePage)
      const parsedActiveClass = JSON.parse(activeClassJSON) as Partial<ClassConfig & { class_id: string; title: string; openAIConfig?: OpenAIConfig }>;

      // If openAIConfig with IDs is already in the session object
      if (parsedActiveClass.openAIConfig && (parsedActiveClass.openAIConfig.assistantId || parsedActiveClass.openAIConfig.vectorStoreId)) {
        console.log(`Using OpenAI config from active class in session storage: '${parsedActiveClass.title || parsedActiveClass.class_id}'`);
        return parsedActiveClass.openAIConfig;
      }
      
      // If not in session, but we have a class_id, fetch from DB
      if (parsedActiveClass.class_id) {
        console.log(`Fetching config from DB for active class_id: ${parsedActiveClass.class_id}`);
        return await classOpenAIConfigService.getConfigForClass(parsedActiveClass.class_id);
      }
      
      // Fallback for older data that might only have title (less ideal, as title might not be unique)
      if (parsedActiveClass.title && !parsedActiveClass.class_id) {
         const { data: { user } } = await supabase.auth.getUser();
         if(user) {
            const { data: classFromDb, error } = await supabase
                .from('classes')
                .select('class_id, vector_store_id, assistant_id')
                .eq('class_title', parsedActiveClass.title)
                .eq('user_id', user.id)
                .maybeSingle();
            if (error) {
                console.error("Error fetching class by title for active config:", error);
                throw error;
            }
            if(classFromDb) {
                return {
                    vectorStoreId: classFromDb.vector_store_id,
                    assistantId: classFromDb.assistant_id
                };
            }
         }
      }

      console.log('No OpenAI config found for active class or necessary identifiers missing in session.');
      return undefined;
    } catch (error) {
      console.error('Error retrieving active class OpenAI configuration:', error);
      return undefined; // Return undefined on error to prevent crashes
    }
  },

  /**
   * Get all classes for the current user.
   *
   * @returns Array of ClassConfig objects.
   */
  getAllClasses: async (): Promise<ClassConfig[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('User not authenticated, cannot fetch classes.');
      return [];
    }

    try {
      console.log('Fetching all classes from Supabase for user:', user.id);
      const { data, error } = await supabase
        .from('classes')
        .select('*') // Select all columns from the 'classes' table
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }); // Order by most recently created

      if (error) {
        console.error('Error fetching classes from Supabase:', error);
        throw error;
      }

      if (data && data.length > 0) {
        // Transform the database rows into ClassConfig objects
        const classConfigs: ClassConfig[] = data.map((item: ClassesDBRow) => ({
          class_id: item.class_id,
          title: item.class_title,
          professor: item.professor,
          classTime: item.class_time,
          classroom: item.classroom,
          emoji: item.emoji,
          enabledWidgets: (item.enabled_widgets || []) as string[], // Ensure it's an array
          openAIConfig: {
            vectorStoreId: item.vector_store_id,
            assistantId: item.assistant_id,
          },
          user_id: item.user_id,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }));
        return classConfigs;
      }
      return []; // No classes found
    } catch (error) {
      console.error('Error retrieving all classes:', error);
      throw error;
    }
  },

  /**
   * Delete a class configuration.
   *
   * @param class_id The ID of the class to delete.
   */
  deleteClass: async (class_id: string): Promise<void> => {
    if (!class_id) {
      console.error('Invalid class_id provided for deletion.');
      throw new Error('Valid class_id is required for deletion');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found when deleting class.');
      throw new Error('Authentication required to delete class configuration');
    }

    try {
      console.log(`Attempting to delete class with class_id: ${class_id} for user: ${user.id}`);
      // Note: Deleting associated OpenAI resources (Assistant, Vector Store, Files) is NOT handled here.
      // This would require additional OpenAI API calls, ideally in a separate Edge Function
      // that could be triggered by this deletion (e.g., using Supabase database webhooks or called explicitly).

      const { error, count } = await supabase
        .from('classes')
        .delete({ count: 'exact' })
        .eq('class_id', class_id)
        .eq('user_id', user.id); // Ensure user can only delete their own classes

      if (error) {
        console.error('Error deleting class from Supabase:', error);
        throw new Error(`Failed to delete class: ${error.message}`);
      }
      if (count === 0) {
        console.warn(`No class found with class_id '${class_id}' for user '${user.id}' to delete.`);
        // Optionally throw an error or handle as a "not found" scenario
      } else {
        console.log(`Successfully deleted ${count} class record(s) with class_id '${class_id}'.`);
      }

      // Clean up session storage if this was the active class
      const activeClassJSON = sessionStorage.getItem('activeClass');
      if (activeClassJSON) {
        const parsedClass = JSON.parse(activeClassJSON) as Partial<ClassConfig & { class_id: string }>;
        if (parsedClass.class_id === class_id) {
          sessionStorage.removeItem('activeClass');
          console.log('Removed deleted class from active session storage.');
        }
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      if (error instanceof Error) throw error; // Re-throw if already an Error instance
      throw new Error(String(error) || 'Unknown error occurred while deleting class');
    }
  },

  /**
   * Clear all class data for the current user from the database (for troubleshooting/reset).
   * This is a destructive operation.
   */
  clearAllData: async (): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("No user authenticated. Clearing only session storage related to active class.");
      sessionStorage.removeItem('activeClass');
      return;
    }

    try {
      console.warn(`Attempting to delete ALL classes for user: ${user.id}. This is a destructive operation.`);
      // Note: This does NOT delete associated OpenAI resources.
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing class data from database:', error);
        throw error;
      }
      sessionStorage.removeItem('activeClass'); // Also clear active class from session
      console.log(`Cleared all database class data and session storage for user: ${user.id}.`);
    } catch (error) {
      console.error('Error clearing all class data:', error);
      throw error;
    }
  },
};
