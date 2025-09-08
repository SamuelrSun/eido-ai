// src/services/classOpenAIConfig.ts
import { supabase } from "@/integrations/supabase/client";
import type { CustomDatabase } from "@/integrations/supabase/client";
import { ClassMember } from '@/components/classes/ClassMembersView';
import { COLOR_PALETTE } from "@/components/calendar/colorUtils";

const COLOR_SWATCHES = COLOR_PALETTE.map(p => p.border);

export interface OpenAIConfig {
  vectorStoreId?: string | null;
  assistantId?: string | null;
}

export interface ClassConfig {
  class_id: string;
  class_name: string;
  owner_id: string | null;
  invite_code?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  color?: string | null;
  user_role?: 'owner' | 'member' | 'pending' | null;
  member_count?: number;
  file_count?: number;
  total_size?: number;
}


type ClassesDBInsertPayload = CustomDatabase['public']['Tables']['classes']['Insert'];
type ClassesDBRow = CustomDatabase['public']['Tables']['classes']['Row'];
type ClassesDBUpdatePayload = Partial<ClassesDBRow>;

// --- 1. ADD this helper function ---
/**
 * Generates a short, random, and easy-to-read invite code.
 * @param {number} length - The desired length of the code.
 * @returns {string} The generated invite code.
 */
const generateShortInviteCode = (length: number): string => {
  // Excludes ambiguous characters like O, 0, I, 1, l
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};


export const classOpenAIConfigService = {
  getConfigForClass: async (class_id: string): Promise<OpenAIConfig | undefined> => {
    console.warn("getConfigForClass: OpenAI config IDs are no longer stored on the 'classes' table. This function will return undefined.");
    return undefined;
  },

  // MODIFICATION: This function now handles both creating and renaming.
  saveConfigForClass: async (
    className: string,
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
      const updatePayload: ClassesDBUpdatePayload = {
        class_name: className,
        updated_at: new Date().toISOString(),
      };
      const { data: updateData, error: updateError } = await supabase
        .from('classes')
        .update(updatePayload)
        .eq('class_id', class_id_to_update)
        .eq('owner_id', user.id) // Security check: ensure user is the owner
        .select()
        .single();
      if (updateError) {
        console.error('Error updating class in Supabase:', updateError);
        if (updateError.code === 'PGRST116') {
             throw new Error(`Class with ID ${class_id_to_update} not found for update, or you do not have permission.`);
        }
        throw updateError;
      }
      if (!updateData) throw new Error("Failed to update class, no data returned from Supabase.");
      savedClassRecord = updateData;
    } else {
      const { data: existingClassByName, error: fetchError } = await supabase
        .from('classes')
        .select('class_id, class_name')
        .eq('class_name', className)
        .eq('owner_id', user.id) // Check for classes owned by this user
        .maybeSingle();
      if (fetchError) {
        console.error('Error checking if class exists by name:', fetchError);
        throw fetchError;
      }

      if (existingClassByName) {
        throw new Error(`A class named '${className}' already exists. Please use a different name.`);
      }

      const { data: userClasses } = await supabase.from('classes').select('class_id').eq('owner_id', user.id);
      const nextColorIndex = (userClasses?.length || 0) % COLOR_SWATCHES.length;

      const insertPayload: ClassesDBInsertPayload = {
        class_name: className,
        owner_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        color: COLOR_SWATCHES[nextColorIndex],
        // --- 2. ADD the generated invite_code to the insert payload ---
        invite_code: generateShortInviteCode(6),
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
    }
    return savedClassRecord;
  },
  
  getClassMembers: async (class_id: string): Promise<ClassMember[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('class_members')
      .select(`
        user_id,
        role,
        profiles (
          full_name,
          avatar_url,
          email
        )
      `)
      .eq('class_id', class_id);
    
    if (error) {
      console.error('Error fetching class members:', error);
      throw error;
    }
    
    return (data as ClassMember[]).sort((a, b) => {
        if (a.role === 'owner') return -1;
        if (b.role === 'owner') return 1;
        return 0;
    });
  },

  getAllClasses: async (): Promise<ClassConfig[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }
    try {
      const { data, error } = await supabase.rpc('get_classes_with_stats');
      if (error) {
        console.error('Error fetching classes with stats:', error);
        throw error;
      }
      return (data as ClassConfig[]) || [];
    } catch (error) {
      console.error('Error calling RPC get_classes_with_stats:', error);
      throw error;
    }
  },


  updateClassColor: async (class_id: string, color: string): Promise<ClassesDBRow> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data, error } = await supabase
        .from('classes')
        .update({ color: color, updated_at: new Date().toISOString() })
        .eq('class_id', class_id)
        .eq('owner_id', user.id) // Only owner can change color
        .select()
        .single();
    if (error) {
        console.error("Error updating class color:", error);
        throw error;
    }
    return data;
  },

  deleteClass: async (class_id: string): Promise<void> => {
    const { error } = await supabase.functions.invoke('delete-class', {
      body: { class_id },
    });

    if (error) {
      console.error("Error invoking delete-class function:", error);
      throw new Error(`Failed to delete class: ${error.message}`);
    }
  },
};