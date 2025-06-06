// src/services/classOpenAIConfig.ts
import { supabase } from "@/integrations/supabase/client";
import type { CustomDatabase } from "@/integrations/supabase/client";

// Interface for OpenAI specific configurations for a class
export interface OpenAIConfig {
  vectorStoreId?: string | null;
  assistantId?: string | null;
}

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

type ClassesDBInsertPayload = CustomDatabase['public']['Tables']['classes']['Insert'];
type ClassesDBRow = CustomDatabase['public']['Tables']['classes']['Row'];
type ClassesDBUpdatePayload = Partial<ClassesDBRow>;

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
      const { error: foldersError } = await supabase.from('file_folders').delete().eq('class_id', class_id);
      if (foldersError) console.error("Error deleting file_folders:", foldersError);

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
      console.log(`[deleteClass] Invoking function to delete Weaviate data for class ${class_id}...`);
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
