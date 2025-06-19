// src/services/fileService.ts
import { supabase } from "@/integrations/supabase/client";
import { FolderType, FileType } from "@/features/files/types";
import { getEmojiForClass } from "@/utils/emojiUtils"; // Still exists, but its usage for class creation is removed

export const fileService = {
  // --- Create Operations ---
  createClass: async (className: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    const { data, error } = await supabase
      .from('classes')
      .insert({ class_name: className, user_id: user.id }) // Renamed class_title to class_name, removed emoji
      .select()
      .single();
    if (error) { console.error("Error creating class:", error); throw error; }
    return data;
  },

  createFolder: async (folderName: string, classId: string, parentFolderId: string | null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    const { data, error } = await supabase
      .from('folders') // Changed from file_folders
      .insert({ folder_name: folderName, user_id: user.id, class_id: classId, parent_id: parentFolderId }) // Renamed 'name' to 'folder_name', removed 'database_id'
      .select()
      .single();
    if (error) { console.error("Error creating folder:", error); throw error; }
    return data;
  },

  // NOTE: This function's interaction with 'upload-to-vector-store' will need
  // careful review, as openai_file_id and database_id are removed from 'files' table
  // and vector_store_id is removed from 'classes' table. The Edge Function
  // 'upload-to-vector-store' might need to be re-designed to manage Weaviate
  // interaction without these direct client-side properties.
  uploadFiles: async (files: File[], classId: string, folderId: string | null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    const uploadPromises = files.map(async (file) => {
        const filePath = `${user.id}/${classId}/${folderId || 'root'}/${Date.now()}-${file.name}`;
        const { data: storageData, error: uploadError } = await supabase.storage.from('file_storage').upload(filePath, file);
        if (uploadError) throw new Error(`Storage upload failed for ${file.name}: ${uploadError.message}`);
        const { data: urlData } = supabase.storage.from('file_storage').getPublicUrl(storageData.path);
        const { data: dbFile, error: dbError } = await supabase.from('files').insert({
                name: file.name, size: file.size, type: file.type, url: urlData.publicUrl,
                user_id: user.id, class_id: classId, folder_id: folderId,
                // Removed: openai_file_id, database_id
            }).select().single();
        if (dbError) throw new Error(`Database insert failed for ${file.name}: ${dbError.message}`);
        if (dbFile) {
            // The `upload-to-vector-store` Edge Function needs to be aware of the schema changes
            // and how it will get the vector_store_id if it's not on the class anymore.
            // For now, passing class_id for context, assuming the Edge Function handles the rest.
            await supabase.functions.invoke('upload-to-vector-store', {
                body: { files: [{...dbFile, file_id: dbFile.file_id}], class_id: classId },
            });
        }
    });
    await Promise.all(uploadPromises);
  },

  // --- Read Operations ---
  getFolders: async (classId: string, parentFolderId: string | null): Promise<FolderType[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    let query = supabase.from('folders').select('*').eq('user_id', user.id).eq('class_id', classId); // Changed from file_folders
    if (parentFolderId) { query = query.eq('parent_id', parentFolderId); }
    else { query = query.is('parent_id', null); }
    const { data, error } = await query.order('folder_name', { ascending: true }); // Ordered by folder_name
    if (error) { console.error("Error fetching folders:", error); throw error; }
    return data as FolderType[];
  },

  getFiles: async (classId: string, parentFolderId: string | null): Promise<FileType[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    let query = supabase.from('files').select('*').eq('user_id', user.id).eq('class_id', classId);
    if (parentFolderId) { query = query.eq('folder_id', parentFolderId); }
    else { query = query.is('folder_id', null); }
    const { data, error } = await query.order('name', { ascending: true });
    if (error) { console.error("Error fetching files:", error); throw error; }
    return data as FileType[];
  },
  
  getAllFoldersForUser: async (): Promise<FolderType[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('folders') // Changed from file_folders
      .select('*')
      .eq('user_id', user.id);
    if (error) { console.error("Error fetching all folders for user:", error); throw error; }
    return data as FolderType[];
  },
  
  getAllFilesForClass: async (classId: string): Promise<FileType[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', user.id)
      .eq('class_id', classId);
    if (error) { console.error("Error fetching all files for class:", error); throw error; }
    return data as FileType[];
  },

  getAllFilesWithClass: async (): Promise<unknown[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    const { data, error } = await supabase.from('files').select(`*, classes (class_name)`).eq('user_id', user.id); // Changed class_title to class_name
    if (error) { console.error("Error fetching all files with class names:", error); throw error; }
    return (data || []).map(file => ({ ...file, class: file.classes?.class_name || 'Unknown Class' })); // Changed class_title to class_name
  },

  deleteFile: async (file: FileType): Promise<void> => {
    if (!file || !file.file_id || !file.url) {
      throw new Error("Invalid file object provided for deletion.");
    }
    const filePathInStorage = new URL(file.url).pathname.split('/public/file_storage/')[1];
    // This removes the actual file from Supabase storage bucket
    await supabase.storage.from('file_storage').remove([filePathInStorage]);

    // The 'delete-weaviate-chunks-by-file' Edge Function should be updated to
    // handle the removal of vector_store_id from the classes table if it relied on it.
    // Assuming it can still find chunks by file_id.
    await supabase.functions.invoke('delete-weaviate-chunks-by-file', {
        body: { file_id: file.file_id }
    });
    
    // This removes the file record from your Supabase 'files' table
    const { error: dbError } = await supabase.from('files').delete().eq('file_id', file.file_id);
    if (dbError) { console.error("Error deleting file from database:", dbError); throw dbError; }
  }
};