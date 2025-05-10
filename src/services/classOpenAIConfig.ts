
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
      
      // First try to get from Supabase
      const { data, error } = await supabase
        .from('class_openai_configs')
        .select('*') 
        .eq('class_title', classTitle)
        .maybeSingle();
      
      if (error) {
        console.error('Error retrieving OpenAI configuration from Supabase:', error);
        
        // Fallback to localStorage (for backward compatibility)
        const storedConfigs = localStorage.getItem('classOpenAIConfigs');
        if (storedConfigs) {
          const configs: ClassConfig[] = JSON.parse(storedConfigs);
          const classConfig = configs.find(config => config.title === classTitle);
          
          if (classConfig?.openAIConfig) {
            console.log(`Found OpenAI config for class '${classTitle}' in localStorage`);
            return classConfig.openAIConfig;
          }
        }
        
        return undefined;
      }
      
      if (data) {
        console.log(`Found OpenAI config for class '${classTitle}' in Supabase:`, data);
        return {
          apiKey: data.api_key,
          vectorStoreId: data.vector_store_id,
          assistantId: data.assistant_id
        };
      }
      
      // If not found in Supabase, try localStorage
      const storedConfigs = localStorage.getItem('classOpenAIConfigs');
      if (storedConfigs) {
        const configs: ClassConfig[] = JSON.parse(storedConfigs);
        const classConfig = configs.find(config => config.title === classTitle);
        
        if (classConfig?.openAIConfig) {
          console.log(`Found OpenAI config for class '${classTitle}' in localStorage`);
          return classConfig.openAIConfig;
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
      
      if (!session?.user) {
        throw new Error('User must be authenticated to save configurations');
      }
      
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
      
      // Also save to localStorage as a backup/fallback
      try {
        const classConfig: ClassConfig = {
          id: Date.now().toString(),
          title: classTitle,
          color: color,
          emoji: emoji,
          professor: professor,
          classTime: classTime,
          classroom: classroom,
          openAIConfig: config
        };
        
        const existingConfigs: ClassConfig[] = JSON.parse(localStorage.getItem('classOpenAIConfigs') || '[]');
        
        // Remove any existing config for this class
        const filteredConfigs = existingConfigs.filter(config => config.title !== classTitle);
        
        // Add the new config
        filteredConfigs.push(classConfig);
        
        // Save to localStorage
        localStorage.setItem('classOpenAIConfigs', JSON.stringify(filteredConfigs));
        console.log(`Saved backup to localStorage for class '${classTitle}'`);
        
      } catch (localError) {
        // Just log the error but continue since Supabase save was successful
        console.warn('Error saving OpenAI configuration to localStorage (backup):', localError);
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
      console.log('Fetching all classes from Supabase');
      
      // Get the user data from the session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        console.warn('User not authenticated, cannot fetch classes from Supabase');
        // Still try localStorage in this case
        const storedConfigs = localStorage.getItem('classOpenAIConfigs');
        if (storedConfigs) {
          console.log('Using localStorage for class data (user not authenticated)');
          return JSON.parse(storedConfigs);
        }
        return [];
      }
      
      console.log('User authenticated, fetching classes from Supabase for user:', session.user.id);
      
      // Fetch from Supabase with explicit type for database rows
      const { data, error } = await supabase
        .from('class_openai_configs')
        .select('*')
        .eq('user_id', session.user.id);
        
      if (error) {
        console.error('Error fetching classes from Supabase:', error);
        
        // Fallback to localStorage
        const storedConfigs = localStorage.getItem('classOpenAIConfigs');
        if (storedConfigs) {
          console.log('Falling back to localStorage for class data after Supabase error');
          return JSON.parse(storedConfigs);
        }
        
        return [];
      }
      
      if (data && data.length > 0) {
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
        
        // Also sync with localStorage for backup
        try {
          localStorage.setItem('classOpenAIConfigs', JSON.stringify(classConfigs));
        } catch (localError) {
          console.warn('Error syncing to localStorage:', localError);
        }
        
        return classConfigs;
      }
      
      // If no data in Supabase, try localStorage
      console.log('No classes found in Supabase, checking localStorage');
      const storedConfigs = localStorage.getItem('classOpenAIConfigs');
      if (storedConfigs) {
        const parsedConfigs = JSON.parse(storedConfigs);
        console.log('Found classes in localStorage:', parsedConfigs);
        return parsedConfigs;
      }
      
      console.log('No classes found anywhere');
      return [];
    } catch (error) {
      console.error('Error retrieving all classes:', error);
      
      // Last resort: try localStorage
      try {
        const storedConfigs = localStorage.getItem('classOpenAIConfigs');
        if (storedConfigs) {
          console.log('Using localStorage after error in getAllClasses');
          return JSON.parse(storedConfigs);
        }
      } catch (parseError) {
        console.error('Error parsing localStorage data:', parseError);
      }
      
      return [];
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
      
      if (!session?.user) {
        throw new Error('User must be authenticated to delete configurations');
      }
      
      // Delete from Supabase
      const { error } = await supabase
        .from('class_openai_configs')
        .delete()
        .eq('class_title', classTitle)
        .eq('user_id', session.user.id);
        
      if (error) {
        console.error('Error deleting class from Supabase:', error);
        throw error;
      }
      
      console.log(`Successfully deleted class '${classTitle}' from Supabase`);
      
      // Also remove from localStorage
      try {
        const storedConfigs: ClassConfig[] = JSON.parse(localStorage.getItem('classOpenAIConfigs') || '[]');
        const filteredConfigs = storedConfigs.filter(config => config.title !== classTitle);
        localStorage.setItem('classOpenAIConfigs', JSON.stringify(filteredConfigs));
        console.log(`Removed class '${classTitle}' from localStorage`);
      } catch (localError) {
        console.warn('Error updating localStorage after class deletion:', localError);
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
      // Clear localStorage data
      localStorage.removeItem('classOpenAIConfigs');
      
      // Clear session storage
      sessionStorage.removeItem('activeClass');
      
      console.log('Cleared all local class data');
    } catch (error) {
      console.error('Error clearing class data:', error);
    }
  }
};
