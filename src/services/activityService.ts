// src/services/activityService.ts
import { supabase } from "@/integrations/supabase/client";

/**
 * Defines the structure for the JSON 'details' object in an activity record.
 * The properties are optional as they vary based on the activity type.
 */
export interface ActivityDetails {
  file_name?: string;
  member_name?: string;
  original_name?: string;
}

/**
 * Represents a single class activity log entry, matching the data
 * returned by the get_class_activity RPC function.
 */
export interface ClassActivity {
  id: string;
  class_id: string;
  created_at: string;
  activity_type: 'file_uploaded' | 'file_deleted' | 'member_joined' | 'member_left' | 'member_pending';
  user_id: string; // The ID of the user who performed the action
  actor_full_name: string;
  actor_avatar_url: string;
  details: ActivityDetails | null;
}

export const activityService = {
  /**
   * Fetches the activity log for a specific class.
   * @param classId The UUID of the class to fetch activity for.
   * @returns A promise that resolves to an array of ClassActivity objects.
   */
  async getActivityForClass(classId: string): Promise<ClassActivity[]> {
    if (!classId) {
      return [];
    }

    const { data, error } = await supabase.rpc('get_class_activity', {
      p_class_id: classId,
    });

    if (error) {
      console.error("Error fetching class activity:", error);
      throw new Error(`Failed to fetch activity log: ${error.message}`);
    }

    return (data as ClassActivity[]) || [];
  },
};