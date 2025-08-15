// src/services/classOpenAIConfig.ts
import { supabase } from "@/integrations/supabase/client";
import type { CustomDatabase } from "@/integrations/supabase/client";
import { ClassMember } from '@/components/classes/ClassMembersView';

// This is defined in CalendarSidebar, but we can keep a copy here for default assignment
const COLOR_SWATCHES = [
    'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
];

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
}

type ClassesDBInsertPayload = CustomDatabase['public']['Tables']['classes']['Insert'];
type ClassesDBRow = CustomDatabase['public']['Tables']['classes']['Row'];
type ClassesDBUpdatePayload = Partial<ClassesDBRow>;

export const classOpenAIConfigService = {
  getConfigForClass: async (class_id: string): Promise<OpenAIConfig | undefined> => {
    console.warn("getConfigForClass: OpenAI config IDs are no longer stored on the 'classes' table. This function will return undefined.");
    return undefined;
  },

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

      // --- FIX: This payload now uses 'owner_id' to match our new schema and RLS policy ---
      const insertPayload: ClassesDBInsertPayload = {
        class_name: className,
        owner_id: user.id, // This line fixes the bug
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        color: COLOR_SWATCHES[nextColorIndex],
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
    
    // Sort so owner is always first
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
      // RLS policy "Enable read access for class members" will handle security
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching classes from Supabase:', error);
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Error retrieving all classes:', error);
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
    if (!class_id) throw new Error('Valid class_id is required for deletion');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required to delete a class.');
    
    // RLS will ensure only the owner can delete. DB cascade will handle related data.
    const { error } = await supabase.from('classes').delete().eq('class_id', class_id);
    if (error) {
        console.error("Error deleting class:", error);
        throw error;
    }
    // Cleanup tasks in services without cascade (Weaviate, etc.)
    await supabase.functions.invoke('delete-weaviate-data-by-class', { body: { class_id_to_delete: class_id } });
  },
};