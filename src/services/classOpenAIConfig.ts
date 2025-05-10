
import { supabase } from "@/integrations/supabase/client";

export interface OpenAIConfig {
  apiKey?: string;
  vectorStoreId?: string;
  assistantId?: string;
}

export interface ClassConfig {
  id: string;
  title: string;
  openAIConfig: OpenAIConfig;
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
      // First try to get from Supabase
      const { data, error } = await supabase
        .from('class_openai_configs')
        .select('api_key, vector_store_id, assistant_id')
        .eq('class_title', classTitle)
        .single();
      
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
        console.log(`Found OpenAI config for class '${classTitle}' in Supabase`);
        return {
          apiKey: data.api_key,
          vectorStoreId: data.vector_store_id,
          assistantId: data.assistant_id
        };
      }
      
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
  saveConfigForClass: async (classTitle: string, config: OpenAIConfig): Promise<void> => {
    try {
      // Fix: Get the user data properly from the session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        throw new Error('User must be authenticated to save configurations');
      }
      
      // Save to Supabase
      const { error } = await supabase
        .from('class_openai_configs')
        .upsert({
          class_title: classTitle,
          api_key: config.apiKey,
          vector_store_id: config.vectorStoreId,
          assistant_id: config.assistantId,
          user_id: session.user.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'class_title'
        });
      
      if (error) {
        console.error('Error saving OpenAI configuration to Supabase:', error);
        throw error;
      }
      
      console.log(`Saved OpenAI config for class '${classTitle}' to Supabase`);
      
      // Also save to localStorage as a backup/fallback
      try {
        const classConfig: ClassConfig = {
          id: Date.now().toString(),
          title: classTitle,
          openAIConfig: config
        };
        
        const existingConfigs: ClassConfig[] = JSON.parse(localStorage.getItem('classOpenAIConfigs') || '[]');
        
        // Remove any existing config for this class
        const filteredConfigs = existingConfigs.filter(config => config.title !== classTitle);
        
        // Add the new config
        filteredConfigs.push(classConfig);
        
        // Save to localStorage
        localStorage.setItem('classOpenAIConfigs', JSON.stringify(filteredConfigs));
        
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
      if (activeClass) {
        const parsedClass = JSON.parse(activeClass);
        if (parsedClass.title && parsedClass.openAIConfig) {
          console.log(`Using OpenAI config from active class '${parsedClass.title}'`);
          return parsedClass.openAIConfig;
        }
        
        // If the active class doesn't have an inline config, try to find it by title
        if (parsedClass.title) {
          return await classOpenAIConfigService.getConfigForClass(parsedClass.title);
        }
      }
      
      console.log('No active class OpenAI config found');
      return undefined;
    } catch (error) {
      console.error('Error retrieving active class OpenAI configuration:', error);
      return undefined;
    }
  }
};
