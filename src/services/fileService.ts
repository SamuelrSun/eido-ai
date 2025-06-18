// src/services/fileService.ts
import { supabase } from "@/integrations/supabase/client";
import { FolderType, FileType } from "@/features/files/types";
import { getEmojiForClass } from "@/utils/emojiUtils";

export const fileService = {
  // --- Create Operations ---
  createClass: async (className: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    const { data, error } = await supabase
      .from('classes')
      .insert({ class_title: className, user_id: user.id, emoji: getEmojiForClass(className) })
      .select()
      .single();
    if (error) { console.error("Error creating class:", error); throw error; }
    return data;
  },

  createFolder: async (folderName: string, classId: string, parentFolderId: string | null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    const { data, error } = await supabase
      .from('file_folders')
      .insert({ name: folderName, user_id: user.id, class_id: classId, parent_id: parentFolderId })
      .select()
      .single();
    if (error) { console.error("Error creating folder:", error); throw error; }
    return data;
  },

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
            }).select().single();
        if (dbError) throw new Error(`Database insert failed for ${file.name}: ${dbError.message}`);
        if (dbFile) {
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
    let query = supabase.from('file_folders').select('*').eq('user_id', user.id).eq('class_id', classId);
    if (parentFolderId) { query = query.eq('parent_id', parentFolderId); } 
    else { query = query.is('parent_id', null); }
    const { data, error } = await query.order('name', { ascending: true });
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
      .from('file_folders')
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

  getAllFilesWithClass: async (): Promise<any[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    const { data, error } = await supabase.from('files').select(`*, classes (class_title)`).eq('user_id', user.id);
    if (error) { console.error("Error fetching all files with class names:", error); throw error; }
    return (data || []).map(file => ({ ...file, class: file.classes?.class_title || 'Unknown Class' }));
  },

  deleteFile: async (file: FileType): Promise<void> => {
    if (!file || !file.file_id || !file.url) {
      throw new Error("Invalid file object provided for deletion.");
    }
    const filePathInStorage = new URL(file.url).pathname.split('/public/file_storage/')[1];
    await supabase.storage.from('file_storage').remove([filePathInStorage]);
    await supabase.functions.invoke('delete-weaviate-chunks-by-file', {
        body: { file_id: file.file_id }
    });
    const { error: dbError } = await supabase.from('files').delete().eq('file_id', file.file_id);
    if (dbError) { console.error("Error deleting file from database:", dbError); throw dbError; }
  }
};