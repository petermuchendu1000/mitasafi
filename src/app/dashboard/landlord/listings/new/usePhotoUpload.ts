/**
 * usePhotoUpload Hook
 * 
 * Handles photo upload to Supabase Storage with progress tracking,
 * error handling, and cleanup.
 */

"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface UploadError {
  fileName: string;
  message: string;
}

interface UploadResult {
  url: string;
  path: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function usePhotoUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<UploadError[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Invalid file type. Please upload JPEG, PNG, or WebP images.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File too large. Maximum size is 5MB.";
    }
    return null;
  };

  const uploadPhoto = useCallback(async (
    file: File, 
    category: string
  ): Promise<UploadResult | null> => {
    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setErrors(prev => [...prev, { fileName: file.name, message: validationError }]);
      return null;
    }

    setIsUploading(true);
    setUploadProgress(prev => ({ ...prev, [category]: 0 }));

    try {
      const supabase = createClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in to upload photos");
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const fileName = `${category}-${timestamp}-${randomId}.${fileExt}`;
      const filePath = `listings/${user.id}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('property-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('property-photos')
        .getPublicUrl(filePath);

      setUploadProgress(prev => ({ ...prev, [category]: 100 }));

      return {
        url: publicUrl,
        path: filePath,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      setErrors(prev => [...prev, { fileName: file.name, message }]);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const deletePhoto = useCallback(async (path: string): Promise<boolean> => {
    try {
      const supabase = createClient();
      
      const { error } = await supabase.storage
        .from('property-photos')
        .remove([path]);

      if (error) {
        console.error("Failed to delete photo:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Failed to delete photo:", error);
      return false;
    }
  }, []);

  return {
    uploadPhoto,
    deletePhoto,
    isUploading,
    errors,
    clearErrors,
    uploadProgress,
  };
}
