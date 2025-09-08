// src/services/fileService.ts
import { supabase } from "@/integrations/supabase/client";
import { FolderType, FileType } from "@/features/files/types";

export const fileService = {
  // --- Create Operations ---
  createClass: async (className: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    const { data, error } = await supabase
      .from('classes')
      .insert({ class_name: className, user_id: user.id })
      .select()
      .single();
    if (error) { console.error("Error creating class:", error); throw error; }
    return data;
  },

  createFolder: async (folderName: string, classId: string, parentFolderId: string | null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    const { data, error } = await supabase
      .from('folders')
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
        
        const processingPayload = {
            storage_path: storageData.path, original_name: file.name,
            mime_type: file.type, size: file.size, class_id: classId,
            folder_id: folderId,
        };
        const { error: functionError } = await supabase.functions.invoke('upload-file', { body: processingPayload });
        if (functionError) throw new Error(`Function Error: ${functionError.message}`);
    });
    await Promise.all(uploadPromises);
  },

  // --- Read Operations ---
  getFolders: async (classId: string, parentFolderId: string | null): Promise<FolderType[]> => {
    let query = supabase.from('folders').select('*').eq('class_id', classId);
    
    if (parentFolderId) {
      query = query.eq('parent_id', parentFolderId);
    } else {
      query = query.is('parent_id', null);
    }
    const { data, error } = await query.order('name', { ascending: true });
    if (error) { console.error("Error fetching folders:", error); throw error; }
    return data as FolderType[];
  },

  getFiles: async (classId: string, parentFolderId: string | null): Promise<FileType[]> => {
    let query = supabase.from('files').select('*').eq('class_id', classId);
    
    if (parentFolderId) {
      query = query.eq('folder_id', parentFolderId);
    } else {
      query = query.is('folder_id', null);
    }
    const { data, error } = await query.order('folder_id').order('name', { ascending: true });
    if (error) { console.error("Error fetching files:", error); throw error; }
    return data as FileType[];
  },
  
  getAllFoldersForUser: async (): Promise<FolderType[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', user.id);
    if (error) { console.error("Error fetching all folders for user:", error); throw error; }
    return data as FolderType[];
  },
  
  getAllFilesForClass: async (classId: string): Promise<FileType[]> => {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('class_id', classId);
    if (error) { console.error("Error fetching all files for class:", error); throw error; }
    return data as FileType[];
  },

  getAllFilesWithClass: async (): Promise<unknown[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    const { data, error } = await supabase.from('files').select(`*, classes (class_name)`).eq('user_id', user.id);
    if (error) {
      console.error("Error fetching all files with class names:", error);
      throw error;
    }
    return (data || []).map(file => ({ ...file, class: file.classes?.class_name || 'Unknown Class' }));
  },

  deleteFile: async (file: FileType): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated for deletion.");
    if (!file || !file.file_id || !file.url) {
        throw new Error("Invalid file object provided for deletion.");
    }

    if (file.thumbnail_url) {
        try {
            await supabase.functions.invoke('delete-from-cloudinary', { body: { file_id: file.file_id } });
        } catch (cloudinaryError) { console.warn(`Could not delete Cloudinary thumbnail for file ${file.file_id}:`, cloudinaryError); }
    }

    const filePathInStorage = new URL(file.url).pathname.split('/public/file_storage/')[1];
    await supabase.storage.from('file_storage').remove([filePathInStorage]);
    
    await supabase.functions.invoke('delete-weaviate-chunks-by-file', { body: { file_id: file.file_id } });

    // --- MODIFICATION START: Explicitly log the deletion activity before deleting the record ---
    if (file.class_id) {
        const { error: logError } = await supabase.rpc('log_class_activity', {
            p_class_id: file.class_id,
            p_user_id: user.id,
            p_activity_type: 'file_deleted',
            p_details: { file_name: file.name }
        });
        if (logError) {
            console.warn("Failed to log file deletion activity:", logError.message);
            // We proceed with deletion even if logging fails.
        }
    }
    // --- MODIFICATION END ---

    const { error: dbError } = await supabase.from('files').delete().eq('file_id', file.file_id);
    if (dbError) { console.error("Error deleting file from database:", dbError); throw dbError; }
  },

  deleteFolder: async (folderId: string): Promise<void> => {
    const { data: files, error: filesError } = await supabase
        .from('files').select('*').eq('folder_id', folderId);
    if (filesError) throw filesError;
    if (files && files.length > 0) {
        await Promise.all(files.map(file => fileService.deleteFile(file as FileType)));
    }

    const { data: subfolders, error: subfoldersError } = await supabase
        .from('folders').select('folder_id').eq('parent_id', folderId);
    if (subfoldersError) throw subfoldersError;
    if (subfolders && subfolders.length > 0) {
        await Promise.all(subfolders.map(subfolder => fileService.deleteFolder(subfolder.folder_id)));
    }

    const { error: deleteFolderError } = await supabase.from('folders').delete().eq('folder_id', folderId);
    if (deleteFolderError) throw deleteFolderError;
  },
};