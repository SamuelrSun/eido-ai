
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
  getConfigForClass: (classTitle: string): OpenAIConfig | undefined => {
    try {
      // Try to load from localStorage (temporary solution)
      // In a production app, this should be stored in a secure database
      const storedConfigs = localStorage.getItem('classOpenAIConfigs');
      if (storedConfigs) {
        const configs: ClassConfig[] = JSON.parse(storedConfigs);
        const classConfig = configs.find(config => config.title === classTitle);
        
        if (classConfig?.openAIConfig) {
          console.log(`Found OpenAI config for class '${classTitle}'`);
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
  saveConfigForClass: async (classTitle: string, config: OpenAIConfig): Promise<void> => {
    try {
      // In a production app, this should be stored in a secure database
      const classConfig: ClassConfig = {
        id: Date.now().toString(), // Simple unique ID (use UUID in production)
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
      
      console.log(`Saved OpenAI config for class '${classTitle}'`);
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
  getActiveClassConfig: (): OpenAIConfig | undefined => {
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
          return classOpenAIConfigService.getConfigForClass(parsedClass.title);
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
