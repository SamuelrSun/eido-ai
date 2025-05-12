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
export interface ClassConfig {
  class_id: string;
  title: string;
  professor?: string | null;
  classTime?: string | null;
  classroom?: string | null;
  emoji?: string | null;
  enabledWidgets?: string[] | null;
  openAIConfig: OpenAIConfig;
  user_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

type ClassesDBInsertPayload = NonNullable<CustomDatabase['public']['Tables']['classes']['Insert']>;
type ClassesDBRow = NonNullable<CustomDatabase['public']['Tables']['classes']['Row']>;
type ClassesDBUpdatePayload = {
  class_title?: string;
  professor?: string | null;
  class_time?: string | null;
  classroom?: string | null;
  emoji?: string | null;
  enabled_widgets?: string[] | null;
  vector_store_id?: string | null;
  assistant_id?: string | null;
  updated_at: string;
};

export const classOpenAIConfigService = {
  getConfigForClass: async (class_id: string): Promise<OpenAIConfig | undefined> => {
    // ... (previous implementation for getConfigForClass - no changes needed here for this step)
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
        .eq('user_id', user.id)
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
      return undefined;
    } catch (error) {
      console.error('Exception in getConfigForClass:', error);
      throw error;
    }
  },

  saveConfigForClass: async (
    // ... (previous implementation for saveConfigForClass - no changes needed here for this step)
    classTitle: string,
    openAIConfigManual: Partial<OpenAIConfig>,
    emoji?: string | null,
    professor?: string | null,
    classTime?: string | null,
    classroom?: string | null,
    enabledWidgets?: string[] | null
  ): Promise<ClassesDBRow> => {
    if (!classTitle || typeof classTitle !== 'string' || classTitle.trim() === "") {
        throw new Error("Class title is required and cannot be empty.");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error('Authentication required to save class configuration.');
    }

    const safeEnabledWidgets = Array.isArray(enabledWidgets) ? enabledWidgets : ["supertutor", "database"];

    const { data: existingClass, error: fetchError } = await supabase
      .from('classes')
      .select('class_id')
      .eq('class_title', classTitle)
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
        console.error('Error checking if class exists:', fetchError);
        throw fetchError;
    }

    let savedClassRecord: ClassesDBRow;

    if (existingClass?.class_id) {
      console.log(`Updating existing class with class_id: ${existingClass.class_id}`);
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
        .eq('class_id', existingClass.class_id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      if (!updateData) throw new Error("Failed to update class, no data returned from Supabase.");
      savedClassRecord = updateData;
    } else {
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
      };

      const { data: insertData, error: insertError } = await supabase
        .from('classes')
        .insert(insertPayload)
        .select()
        .single();

      if (insertError) throw insertError;
      if (!insertData) throw new Error("Failed to insert new class, no data returned from Supabase.");
      savedClassRecord = insertData;
      
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
    // ... (previous implementation - no changes needed here for this step)
    try {
      const activeClassJSON = sessionStorage.getItem('activeClass');
      if (!activeClassJSON) return undefined;
      const parsedActiveClass = JSON.parse(activeClassJSON) as Partial<ClassConfig & {class_id: string}>;
      if (parsedActiveClass.openAIConfig && (parsedActiveClass.openAIConfig.assistantId || parsedActiveClass.openAIConfig.vectorStoreId)) {
        return parsedActiveClass.openAIConfig;
      }
      if (parsedActiveClass.class_id) {
        return await classOpenAIConfigService.getConfigForClass(parsedActiveClass.class_id);
      }
      if (parsedActiveClass.title) {
         const { data: { user } } = await supabase.auth.getUser();
         if(user) {
            const { data: classFromDb } = await supabase
                .from('classes')
                .select('class_id, vector_store_id, assistant_id')
                .eq('class_title', parsedActiveClass.title)
                .eq('user_id', user.id)
                .maybeSingle();
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
    // ... (previous implementation - no changes needed here for this step)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
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

  /**
   * Delete a class configuration from Supabase and attempt to delete associated OpenAI resources.
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

    let assistantIdToDelete: string | null = null;
    let vectorStoreIdToDelete: string | null = null;

    try {
      console.log(`Preparing to delete class with class_id: ${class_id} for user: ${user.id}`);

      // Step 1: Fetch the assistant_id and vector_store_id for the class BEFORE deleting it
      const { data: classDetails, error: fetchDetailsError } = await supabase
        .from('classes')
        .select('assistant_id, vector_store_id, class_title')
        .eq('class_id', class_id)
        .eq('user_id', user.id)
        .single(); // Use single to ensure it's the correct unique record

      if (fetchDetailsError) {
        // If class not found, maybe it's already deleted or an issue. Log and potentially proceed or throw.
        if (fetchDetailsError.code === 'PGRST116') { // PostgREST error code for "Not Found"
            console.warn(`Class with class_id ${class_id} not found for user ${user.id}. It might have been already deleted.`);
            // Optionally, you might want to still try to remove from session storage if it matches a title
        } else {
            console.error('Error fetching class details before deletion:', fetchDetailsError);
            throw new Error(`Failed to fetch details for class ${class_id}: ${fetchDetailsError.message}`);
        }
      }

      if (classDetails) {
        assistantIdToDelete = classDetails.assistant_id;
        vectorStoreIdToDelete = classDetails.vector_store_id;
        console.log(`Found OpenAI resource IDs for class ${classDetails.class_title}: Assistant ID - ${assistantIdToDelete}, Vector Store ID - ${vectorStoreIdToDelete}`);
      }

      // Step 2: Attempt to delete OpenAI resources if IDs were found
      if (assistantIdToDelete || vectorStoreIdToDelete) {
        console.log(`Invoking 'delete-openai-resources' Edge Function.`);
        try {
          const { data: deleteResourcesData, error: deleteResourcesError } = await supabase.functions.invoke(
            'delete-openai-resources',
            {
              body: {
                assistantId: assistantIdToDelete,
                vectorStoreId: vectorStoreIdToDelete,
              },
            }
          );
          if (deleteResourcesError) {
            console.error('Error invoking delete-openai-resources Edge Function:', deleteResourcesError);
            // Log this error but proceed with deleting the DB record.
            // The user should be informed if cleanup failed.
          } else {
            console.log('delete-openai-resources Edge Function invoked successfully. Response:', deleteResourcesData);
            if (deleteResourcesData && !deleteResourcesData.success) {
                console.warn('OpenAI resource deletion reported partial or full failure:', deleteResourcesData.details);
            }
          }
        } catch (invokeError) {
            console.error('Exception calling delete-openai-resources Edge Function:', invokeError);
        }
      } else {
        console.log(`No OpenAI resource IDs found for class_id ${class_id}, skipping OpenAI resource deletion.`);
      }

      // Step 3: Delete the class record from Supabase database
      const { error: deleteDbError, count } = await supabase
        .from('classes')
        .delete({ count: 'exact' })
        .eq('class_id', class_id)
        .eq('user_id', user.id);

      if (deleteDbError) {
        console.error('Error deleting class from Supabase DB:', deleteDbError);
        throw new Error(`Failed to delete class from database: ${deleteDbError.message}`);
      }
      
      if (count === 0 && classDetails) { // If classDetails were found but delete count is 0
        console.warn(`Class with class_id '${class_id}' was found but not deleted from DB (count: 0). This might indicate an issue.`);
      } else if (count > 0) {
        console.log(`Successfully deleted ${count} class record(s) with class_id '${class_id}' from Supabase DB.`);
      }


      // Step 4: Clean up session storage if this was the active class
      const activeClassJSON = sessionStorage.getItem('activeClass');
      if (activeClassJSON) {
        const parsedClass = JSON.parse(activeClassJSON) as Partial<ClassConfig & { class_id: string; title?: string }>;
        // Check if the deleted class_id matches the one in session storage
        // Or if title matches (in case class_id wasn't in session storage for some reason)
        if (parsedClass.class_id === class_id || (classDetails && parsedClass.title === classDetails.class_title)) {
          sessionStorage.removeItem('activeClass');
          console.log('Removed deleted class from active session storage.');
        }
      }
    } catch (error) {
      console.error('Error during deleteClass process:', error);
      if (error instanceof Error) throw error;
      throw new Error(String(error) || 'Unknown error occurred while deleting class');
    }
  },

  clearAllData: async (): Promise<void> => {
    // ... (previous implementation - no changes needed here for this step)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      sessionStorage.removeItem('activeClass');
      return;
    }
    try {
      // Note: This does NOT delete associated OpenAI resources for all classes.
      // That would require iterating through all classes, getting their IDs, and calling delete-openai-resources for each.
      console.warn(`Attempting to delete ALL classes for user: ${user.id} from DB. OpenAI resources will NOT be deleted by this action.`);
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing class data from database:', error);
        throw error;
      }
      sessionStorage.removeItem('activeClass');
      console.log(`Cleared all database class data and session storage for user: ${user.id}.`);
    } catch (error) {
      console.error('Error clearing all class data:', error);
      throw error;
    }
  },
};
