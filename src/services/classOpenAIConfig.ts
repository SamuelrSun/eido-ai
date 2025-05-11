
import { supabase } from "@/integrations/supabase/client";

export interface OpenAIConfig {
  apiKey?: string;
  vectorStoreId?: string;
  assistantId?: string;
}

export interface ClassConfig {
  id: string;
  title: string;
  professor?: string;
  classTime?: string;
  classroom?: string;
  color?: string;
  emoji?: string;
  openAIConfig: OpenAIConfig;
}

// Interface that explicitly matches the database schema
interface ClassConfigDBRow {
  id: string;
  class_title: string;
  professor?: string;
  class_time?: string;
  classroom?: string;
  api_key?: string;
  vector_store_id?: string;
  assistant_id?: string;
  user_id?: string;
  emoji?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Service to manage OpenAI configurations per class
 */
export const classOpenAIConfigService = {
  /**
   * Get the OpenAI configuration for a specific class
   * 
   * @param classTitle The title of the class
   * @returns The OpenAI configuration for the class, or undefined if not found
   */
  getConfigForClass: async (classTitle: string): Promise<OpenAIConfig | undefined> => {
    try {
      console.log(`Attempting to fetch OpenAI config for class: ${classTitle}`);
      
      // Always try to get from Supabase first
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('User authenticated, fetching from Supabase');
        const { data, error } = await supabase
          .from('class_openai_configs')
          .select('*') 
          .eq('class_title', classTitle)
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        if (error) {
          console.error('Error retrieving OpenAI configuration from Supabase:', error);
        } else if (data) {
          console.log(`Found OpenAI config for class '${classTitle}' in Supabase:`, data);
          return {
            apiKey: data.api_key,
            vectorStoreId: data.vector_store_id,
            assistantId: data.assistant_id
          };
        }
      }
      
      console.log(`No OpenAI config found for class '${classTitle}'`);
      return undefined;
    } catch (error) {
      console.error('Error retrieving OpenAI configuration:', error);
      return undefined;
    }
  },

  /**
   * Save OpenAI configuration for a class
   * 
   * @param classTitle The title of the class
   * @param config The OpenAI configuration
   */
  saveConfigForClass: async (classTitle: string, config: OpenAIConfig, color?: string, emoji?: string, professor?: string, classTime?: string, classroom?: string): Promise<void> => {
    try {
      console.log(`Saving OpenAI config for class: ${classTitle}`, { config, color, emoji, professor, classTime, classroom });
      
      // Get the user data properly from the session
      const { data: { session } } = await supabase.auth.getSession();
      
      // Always try to save to Supabase if user is authenticated
      if (session?.user) {
        // Ensure all the data is correctly formatted
        const classData = {
          class_title: classTitle,
          api_key: config.apiKey,
          vector_store_id: config.vectorStoreId,
          assistant_id: config.assistantId,
          emoji: emoji,
          professor: professor,
          class_time: classTime,
          classroom: classroom,
          user_id: session.user.id,
          updated_at: new Date().toISOString()
        };
        
        console.log('Saving class data to Supabase:', classData);
        
        // Save to Supabase
        const { error } = await supabase
          .from('class_openai_configs')
          .upsert(classData, {
            onConflict: 'class_title,user_id'
          });
        
        if (error) {
          console.error('Error saving OpenAI configuration to Supabase:', error);
          throw error;
        }
        
        console.log(`Successfully saved OpenAI config for class '${classTitle}' to Supabase`);
      } else {
        console.warn('User not authenticated, cannot save class data');
        throw new Error('User must be authenticated to save class data');
      }
    } catch (error) {
      console.error('Error saving OpenAI configuration:', error);
      throw error;
    }
  },

  /**
   * Get the OpenAI configuration for the active class
   * 
   * @returns The OpenAI configuration for the active class, or undefined if not found
   */
  getActiveClassConfig: async (): Promise<OpenAIConfig | undefined> => {
    try {
      const activeClass = sessionStorage.getItem('activeClass');
      if (!activeClass) {
        console.log('No active class found in session storage');
        return undefined;
      }
      
      try {
        const parsedClass = JSON.parse(activeClass);
        if (parsedClass.title && parsedClass.openAIConfig) {
          console.log(`Using OpenAI config from active class '${parsedClass.title}'`);
          return parsedClass.openAIConfig;
        }
        
        // If the active class doesn't have an inline config, try to find it by title
        if (parsedClass.title) {
          return await classOpenAIConfigService.getConfigForClass(parsedClass.title);
        }
      } catch (parseError) {
        console.error('Error parsing active class from session storage:', parseError);
        // Clear invalid session storage data
        sessionStorage.removeItem('activeClass');
        return undefined;
      }
      
      console.log('No active class OpenAI config found');
      return undefined;
    } catch (error) {
      console.error('Error retrieving active class OpenAI configuration:', error);
      return undefined;
    }
  },
  
  /**
   * Get all classes for the current user
   * 
   * @returns Array of class configurations
   */
  getAllClasses: async (): Promise<ClassConfig[]> => {
    try {
      // Get the user data from the session
      const { data: { session } } = await supabase.auth.getSession();
      
      // Always try Supabase first if user is authenticated
      if (session?.user) {
        console.log('User authenticated, fetching classes from Supabase for user:', session.user.id);
        
        // Fetch from Supabase with explicit type for database rows
        const { data, error } = await supabase
          .from('class_openai_configs')
          .select('*')
          .eq('user_id', session.user.id);
          
        if (error) {
          console.error('Error fetching classes from Supabase:', error);
          throw error;
        } else if (data && data.length > 0) {
          console.log(`Found ${data.length} classes in Supabase:`, data);
          
          // Transform the database objects into ClassConfig objects with explicit typing
          const classConfigs = data.map((item: ClassConfigDBRow) => ({
            id: item.id,
            title: item.class_title,
            professor: item.professor || undefined,
            classTime: item.class_time || undefined,
            classroom: item.classroom || undefined,
            color: 'blue-300', // Default color since it's not in database
            emoji: item.emoji || undefined,
            openAIConfig: {
              apiKey: item.api_key || undefined,
              vectorStoreId: item.vector_store_id || undefined,
              assistantId: item.assistant_id || undefined
            }
          }));
          
          console.log('Transformed class configs:', classConfigs);
          return classConfigs;
        }
        
        console.log('No classes found in Supabase');
        return [];
      }
      
      console.log('User not authenticated, cannot fetch classes');
      return [];
    } catch (error) {
      console.error('Error retrieving all classes:', error);
      throw error;
    }
  },
  
  /**
   * Delete a class configuration
   * 
   * @param classTitle The title of the class to delete
   */
  deleteClass: async (classTitle: string): Promise<void> => {
    try {
      console.log(`Deleting class: ${classTitle}`);
      
      // Get the user data from the session
      const { data: { session } } = await supabase.auth.getSession();
      
      // Always try to delete from Supabase if user is authenticated
      if (session?.user) {
        // Delete from Supabase
        const { error } = await supabase
          .from('class_openai_configs')
          .delete()
          .eq('class_title', classTitle)
          .eq('user_id', session.user.id);
          
        if (error) {
          console.error('Error deleting class from Supabase:', error);
          throw error;
        } else {
          console.log(`Successfully deleted class '${classTitle}' from Supabase`);
        }
      } else {
        console.warn('User not authenticated, cannot delete class data');
        throw new Error('User must be authenticated to delete class data');
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      throw error;
    }
  },

  /**
   * Clear all stored data about classes
   * This is useful for troubleshooting
   */
  clearAllData: async (): Promise<void> => {
    try {
      // Clear session storage
      sessionStorage.removeItem('activeClass');
      
      console.log('Cleared all local class data');
      
      // If user is authenticated, also clear database data
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Delete all classes for this user
        const { error } = await supabase
          .from('class_openai_configs')
          .delete()
          .eq('user_id', session.user.id);
          
        if (error) {
          console.error('Error clearing class data from database:', error);
          throw error;
        }
        
        console.log('Cleared all database class data for user:', session.user.id);
      }
    } catch (error) {
      console.error('Error clearing class data:', error);
      throw error;
    }
  }
};
