// src/services/classOpenAIConfig.ts
import { supabase } from "@/integrations/supabase/client";
import type { User } from '@supabase/supabase-js';
import type { CustomDatabase } from "@/integrations/supabase/client"; // Ensure this path is correct for your project

// Interface for OpenAI specific configurations for a class
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
   * @param class_id_to_update Optional ID of the class to update (for explicit updates).
   * @returns The created or updated Class database row object.
   */
  saveConfigForClass: async (
    classTitle: string,
    openAIConfigManual: Partial<OpenAIConfig>,
    emoji?: string | null,
    professor?: string | null,
    classTime?: string | null,
    classroom?: string | null,
    enabledWidgets?: string[] | null, // Consider WidgetType[]
    class_id_to_update?: string | null // New optional parameter for explicit updates
  ): Promise<ClassesDBRow> => {
    if (!classTitle || typeof classTitle !== 'string' || classTitle.trim() === "") {
        throw new Error("Class title is required and cannot be empty.");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error('Authentication required to save class configuration.');
    }

    const safeEnabledWidgets = Array.isArray(enabledWidgets) ? enabledWidgets : ["supertutor", "database"];
    let savedClassRecord: ClassesDBRow;

    if (class_id_to_update) {
      // Explicit UPDATE path
      console.log(`Attempting to update existing class with class_id: ${class_id_to_update}`);
      const updatePayload: ClassesDBUpdatePayload = {
        class_title: classTitle,
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
      console.log(`Successfully updated class '${classTitle}' (ID: ${class_id_to_update}) in Supabase.`);

    } else {
      // INSERT path (for new classes)
      const { data: existingClassByTitle, error: fetchError } = await supabase
        .from('classes')
        .select('class_id, class_title')
        .eq('class_title', classTitle)
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error checking if class exists by title:', fetchError);
        throw fetchError;
      }

      if (existingClassByTitle) {
        console.warn(`A class with the title '${classTitle}' already exists for this user.`);
        throw new Error(`A class named '${classTitle}' already exists. Please use a different title.`);
      }

      console.log('Inserting new class record for title:', classTitle);
      const insertPayload: ClassesDBInsertPayload = {
        class_title: classTitle,
        professor: professor || null,
        class_time: classTime || null,
        classroom: classroom || null,
        emoji: emoji || null,
        enabled_widgets: safeEnabledWidgets,
        vector_store_id: null, 
        assistant_id: null,   
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // class_id will be auto-generated by Supabase if it's a UUID with default gen_random_uuid()
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

      try {
        console.log(`Invoking 'provision-class-resources' for new class_id: ${savedClassRecord.class_id}`);
        const { data: provisionData, error: provisionError } = await supabase.functions.invoke(
          'provision-class-resources',
          { body: { class_id: savedClassRecord.class_id, class_title: savedClassRecord.class_title } }
        );
        if (provisionError) {
          console.error('Error invoking provision-class-resources Edge Function:', provisionError);
        } else {
          console.log('Successfully invoked provision-class-resources. Response:', provisionData);
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

  getActiveClassConfig: async (): Promise<OpenAIConfig | undefined> => {
    try {
      const activeClassJSON = sessionStorage.getItem('activeClass');
      if (!activeClassJSON) {
        return undefined;
      }
      const parsedActiveClass = JSON.parse(activeClassJSON) as Partial<ClassConfig & {class_id: string; title: string; openAIConfig?: OpenAIConfig}>;
      if (parsedActiveClass.openAIConfig && (parsedActiveClass.openAIConfig.assistantId || parsedActiveClass.openAIConfig.vectorStoreId)) {
        return parsedActiveClass.openAIConfig;
      }
      if (parsedActiveClass.class_id) {
        return await classOpenAIConfigService.getConfigForClass(parsedActiveClass.class_id);
      }
      if (parsedActiveClass.title) { // Fallback for older session data
         const { data: { user } } = await supabase.auth.getUser();
         if(user) {
            const { data: classFromDb, error } = await supabase
                .from('classes')
                .select('class_id, vector_store_id, assistant_id')
                .eq('class_title', parsedActiveClass.title)
                .eq('user_id', user.id)
                .maybeSingle();
            if (error) { console.error("Error fetching class by title for active config:", error); throw error; }
            if(classFromDb) {
                return {
                    vectorStoreId: classFromDb.vector_store_id,
                    assistantId: classFromDb.assistant_id
                };
            }
         }
      }
      return undefined;
    } catch (error) {
      console.error('Error retrieving active class OpenAI configuration:', error);
      return undefined; 
    }
  },

  getAllClasses: async (): Promise<ClassConfig[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*') 
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }); 

      if (error) {
        console.error('Error fetching classes from Supabase:', error);
        throw error;
      }
      if (data) {
        return data.map((item: ClassesDBRow) => ({
          class_id: item.class_id,
          title: item.class_title,
          professor: item.professor,
          classTime: item.class_time,
          classroom: item.classroom,
          emoji: item.emoji,
          enabledWidgets: (item.enabled_widgets || []) as string[],
          openAIConfig: {
            vectorStoreId: item.vector_store_id,
            assistantId: item.assistant_id,
          },
          user_id: item.user_id,
          created_at: item.created_at,
          updated_at: item.updated_at,
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
      console.error('Invalid class_id provided for deletion.');
      throw new Error('Valid class_id is required for deletion');
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found when deleting class.');
      throw new Error('Authentication required to delete class configuration');
    }

    let assistantIdToDelete: string | null = null;
    let vectorStoreIdToDelete: string | null = null;
    let classTitleForSessionClear: string | undefined;

    try {
      console.log(`Preparing to delete class with class_id: ${class_id} for user: ${user.id}`);
      const { data: classDetails, error: fetchDetailsError } = await supabase
        .from('classes')
        .select('assistant_id, vector_store_id, class_title')
        .eq('class_id', class_id)
        .eq('user_id', user.id)
        .single();

      if (fetchDetailsError) {
        console.error(`Error fetching class details for class_id ${class_id} before deletion:`, fetchDetailsError);
        throw new Error(`Failed to find class to delete (ID: ${class_id}): ${fetchDetailsError.message}`);
      }

      assistantIdToDelete = classDetails.assistant_id;
      vectorStoreIdToDelete = classDetails.vector_store_id;
      classTitleForSessionClear = classDetails.class_title;
      console.log(`Found OpenAI resource IDs for class ${classDetails.class_title}: Assistant ID - ${assistantIdToDelete}, Vector Store ID - ${vectorStoreIdToDelete}`);

      if (assistantIdToDelete || vectorStoreIdToDelete) {
        console.log(`Invoking 'delete-openai-resources' Edge Function.`);
        try {
          const { data: deleteResourcesData, error: deleteResourcesError } = await supabase.functions.invoke(
            'delete-openai-resources',
            { body: { assistantId: assistantIdToDelete, vectorStoreId: vectorStoreIdToDelete } }
          );
          if (deleteResourcesError) console.error('Error invoking delete-openai-resources Edge Function:', deleteResourcesError);
          else {
            console.log('delete-openai-resources Edge Function invoked. Response:', deleteResourcesData);
            if (deleteResourcesData && !deleteResourcesData.success) {
                console.warn('OpenAI resource deletion reported partial or full failure:', deleteResourcesData.details);
            }
          }
        } catch (invokeError) { console.error('Exception calling delete-openai-resources Edge Function:', invokeError); }
      } else {
        console.log(`No OpenAI resource IDs found for class_id ${class_id}, skipping OpenAI resource deletion.`);
      }

      const { error: deleteDbError, count } = await supabase
        .from('classes')
        .delete({ count: 'exact' })
        .eq('class_id', class_id)
        .eq('user_id', user.id);

      if (deleteDbError) {
        console.error('Error deleting class from Supabase DB:', deleteDbError);
        throw new Error(`Failed to delete class from database: ${deleteDbError.message}`);
      }
      if (count === 0) { // Should not happen if .single() above succeeded
        console.warn(`Class with class_id '${class_id}' was not deleted from DB (count: 0).`);
        throw new Error(`Failed to delete class '${classTitleForSessionClear}' from database.`);
      } else {
        console.log(`Successfully deleted ${count} class record(s) with class_id '${class_id}'.`);
      }

      const activeClassJSON = sessionStorage.getItem('activeClass');
      if (activeClassJSON) {
        const parsedClass = JSON.parse(activeClassJSON) as Partial<ClassConfig & { class_id: string; title?: string }>;
        if (parsedClass.class_id === class_id || (classTitleForSessionClear && parsedClass.title === classTitleForSessionClear)) {
          sessionStorage.removeItem('activeClass');
        }
      }
    } catch (error) {
      console.error('Error during deleteClass process:', error);
      if (error instanceof Error) throw error;
      throw new Error(String(error) || 'Unknown error occurred while deleting class');
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
