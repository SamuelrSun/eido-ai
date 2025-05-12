// src/services/classOpenAIConfig.ts
import { supabase } from "@/integrations/supabase/client"; // Using the consolidated client
import type { User } from '@supabase/supabase-js';
import type { CustomDatabase } from "@/integrations/supabase/client"; // <-- ADDED THIS IMPORT

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
  enabledWidgets?: string[] | null; // Consider using WidgetType[]
  openAIConfig: OpenAIConfig;
  user_id?: string | null; // Added for completeness, though usually implicit
  created_at?: string | null;
  updated_at?: string | null;
}

// These types now correctly use the imported CustomDatabase type
type ClassesDBRowInsert = NonNullable<CustomDatabase['public']['Tables']['classes']['Insert']>;
type ClassesDBRow = NonNullable<CustomDatabase['public']['Tables']['classes']['Row']>;


/**
 * Service to manage class configurations, including OpenAI resource provisioning.
 */
export const classOpenAIConfigService = {
  /**
   * Get the OpenAI configuration (assistantId, vectorStoreId) for a specific class.
   *
   * @param class_id The ID of the class (preferred for lookup)
   * @returns The OpenAI configuration for the class, or undefined if not found.
   */
  getConfigForClass: async (class_id: string): Promise<OpenAIConfig | undefined> => {
    if (!class_id) {
      console.error("Cannot get config for class with empty class_id");
      return undefined;
    }

    try {
      console.log(`Attempting to fetch OpenAI config for class_id: ${class_id}`);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found when getting class config');
        throw new Error('Authentication required to access class configuration');
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
        console.log(`Found OpenAI config for class_id '${class_id}' in Supabase:`, data);
        return {
          vectorStoreId: data.vector_store_id,
          assistantId: data.assistant_id,
        };
      }

      console.log(`No OpenAI config found for class_id '${class_id}'`);
      return undefined;
    } catch (error) {
      console.error('Error retrieving OpenAI configuration:', error);
      throw error; // Re-throw to be caught by caller
    }
  },

  /**
   * Saves a new class or updates an existing one.
   * After creating a new class, it triggers the provisioning of OpenAI resources.
   *
   * @param classTitle The title of the class.
   * @param openAIConfigManual Optional manual input for assistant/vector store IDs (usually for edit, not create).
   * @param emoji
   * @param professor
   * @param classTime
   * @param classroom
   * @param enabledWidgets
   * @returns The created or updated ClassConfig object (or just its ID for new classes before provisioning completes).
   */
  saveConfigForClass: async (
    classTitle: string,
    openAIConfigManual: Partial<OpenAIConfig>, // For manual override during edit if needed
    emoji?: string | null,
    professor?: string | null,
    classTime?: string | null,
    classroom?: string | null,
    enabledWidgets?: string[] | null // Consider WidgetType[]
  ): Promise<ClassesDBRow> => { // Returns the DB row, including the new class_id
    if (!classTitle) {
      console.error("Cannot save class with empty title");
      throw new Error("Class title is required");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found when saving class config');
      throw new Error('Authentication required to save class configuration');
    }

    const safeEnabledWidgets = Array.isArray(enabledWidgets) ? enabledWidgets : ["supertutor", "database"];

    // Data for inserting or updating the 'classes' table
    // For a new class, assistant_id and vector_store_id will be null initially.
    // They will be populated by the provision-class-resources Edge Function.
    const classDataToSave: Omit<ClassesDBRowInsert, 'class_id' | 'created_at' | 'updated_at' | 'user_id'> & { user_id: string, updated_at: string, class_id?: string, created_at?: string } = {
      class_title: classTitle,
      professor: professor || null,
      class_time: classTime || null,
      classroom: classroom || null,
      emoji: emoji || null,
      enabled_widgets: safeEnabledWidgets,
      vector_store_id: openAIConfigManual.vectorStoreId || null, // Usually null on create
      assistant_id: openAIConfigManual.assistantId || null,   // Usually null on create
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };


    // Check if a class with this title already exists for the user
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
      // Update existing class
      console.log(`Updating existing class with class_id: ${existingClass.class_id}`);
      const { data: updateData, error: updateError } = await supabase
        .from('classes')
        .update(classDataToSave)
        .eq('class_id', existingClass.class_id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating class in Supabase:', updateError);
        throw updateError;
      }
      if (!updateData) throw new Error("Failed to update class, no data returned.");
      savedClassRecord = updateData;
      console.log(`Successfully updated class '${classTitle}' in Supabase.`);

    } else {
      // Insert new class
      console.log('Inserting new class record for title:', classTitle);
      classDataToSave.created_at = new Date().toISOString(); // Set created_at for new records

      const { data: insertData, error: insertError } = await supabase
        .from('classes')
        .insert(classDataToSave)
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting new class into Supabase:', insertError);
        throw insertError;
      }
      if (!insertData) throw new Error("Failed to insert new class, no data returned.");
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
          // Log this error but don't necessarily throw, as the class record itself was created.
        } else {
          console.log('Successfully invoked provision-class-resources. Response:', provisionData);
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
        console.log('No active class found in session storage for getActiveClassConfig.');
        return undefined;
      }

      const parsedActiveClass = JSON.parse(activeClassJSON) as Partial<ClassConfig & {title: string, class_id: string}>;

      if (parsedActiveClass.openAIConfig?.assistantId || parsedActiveClass.openAIConfig?.vectorStoreId) {
        console.log(`Using OpenAI config from active class in session storage: '${parsedActiveClass.title}'`);
        return parsedActiveClass.openAIConfig;
      }
      
      if (parsedActiveClass.class_id) {
        console.log(`Fetching config from DB for active class_id: ${parsedActiveClass.class_id}`);
        return await classOpenAIConfigService.getConfigForClass(parsedActiveClass.class_id);
      }
      
      if (parsedActiveClass.title && !parsedActiveClass.class_id) {
         const { data: { user } } = await supabase.auth.getUser();
         if(user) {
            const { data: classFromDb, error } = await supabase
                .from('classes')
                .select('class_id, vector_store_id, assistant_id')
                .eq('class_title', parsedActiveClass.title)
                .eq('user_id', user.id)
                .maybeSingle();
            if (error) throw error;
            if(classFromDb) {
                return {
                    vectorStoreId: classFromDb.vector_store_id,
                    assistantId: classFromDb.assistant_id
                };
            }
         }
      }

      console.log('No OpenAI config found for active class or active class title missing.');
      return undefined;
    } catch (error) {
      console.error('Error retrieving active class OpenAI configuration:', error);
      return undefined; 
    }
  },

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
        .select('*') 
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }); 

      if (error) {
        console.error('Error fetching classes from Supabase:', error);
        throw error;
      }

      if (data && data.length > 0) {
        console.log(`Found ${data.length} classes in Supabase:`, data);
        const classConfigs: ClassConfig[] = data.map((item: ClassesDBRow) => ({
          class_id: item.class_id,
          title: item.class_title,
          professor: item.professor,
          classTime: item.class_time,
          classroom: item.classroom,
          emoji: item.emoji,
          enabledWidgets: item.enabled_widgets || [],
          openAIConfig: {
            vectorStoreId: item.vector_store_id,
            assistantId: item.assistant_id,
          },
          user_id: item.user_id,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }));
        console.log('Transformed class configs:', classConfigs);
        return classConfigs;
      }

      console.log('No classes found in Supabase for this user.');
      return [];
    } catch (error) {
      console.error('Error retrieving all classes:', error);
      throw error; 
    }
  },

  deleteClass: async (class_id: string): Promise<void> => {
    if (!class_id) {
      console.error('Invalid class_id provided for deletion:', class_id);
      throw new Error('Valid class_id is required for deletion');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found when deleting class');
      throw new Error('Authentication required to delete class configuration');
    }

    try {
      console.log(`Attempting to delete class with class_id: ${class_id} for user: ${user.id}`);
      
      const { error, count } = await supabase
        .from('classes')
        .delete({ count: 'exact' })
        .eq('class_id', class_id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting class from Supabase:', error);
        throw new Error(`Failed to delete class: ${error.message}`);
      }

      console.log(`Successfully deleted ${count} class record(s) with class_id '${class_id}' from Supabase.`);

      const activeClassJSON = sessionStorage.getItem('activeClass');
      if (activeClassJSON) {
        const parsedClass = JSON.parse(activeClassJSON);
        if (parsedClass.class_id === class_id || parsedClass.title === "DELETED_CLASS_TITLE_PLACEHOLDER") { 
          sessionStorage.removeItem('activeClass');
          console.log('Removed deleted class from active session storage.');
        }
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      if (error instanceof Error) throw error;
      throw new Error(String(error) || 'Unknown error deleting class');
    }
  },

  clearAllData: async (): Promise<void> => { 
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("No user authenticated. Clearing only session storage.");
      sessionStorage.removeItem('activeClass');
      return;
    }

    try {
      console.warn(`Attempting to delete ALL classes for user: ${user.id}. This is a destructive operation.`);
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
