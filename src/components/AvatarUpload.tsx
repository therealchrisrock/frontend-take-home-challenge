"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { Camera, Loader2, User } from "lucide-react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { useToast } from "~/hooks/use-toast";

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  onUploadComplete?: (image: string) => void;
}

export function AvatarUpload({
  currentAvatarUrl,
  onUploadComplete,
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { update } = useSession();

  const getUploadUrl = api.user.getAvatarUploadUrl.useMutation();
  const updateAvatar = api.user.updateAvatar.useMutation();
  const deleteAvatar = api.user.deleteAvatar.useMutation();

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to S3
    setUploading(true);
    try {
      // Get presigned upload URL
      const { uploadUrl, publicUrl, key } = await getUploadUrl.mutateAsync({
        filename: file.name,
        contentType: file.type,
      });

      // Upload file to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      // Update user profile with new avatar
      await updateAvatar.mutateAsync({
        image: publicUrl,
        avatarKey: key,
      });

      toast({
        title: "Avatar uploaded",
        description: "Your profile picture has been updated",
      });

      // Update the session with the new image
      await update({ image: publicUrl });

      onUploadComplete?.(publicUrl);
      setPreview(null);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
      setPreview(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async () => {
    setUploading(true);
    try {
      await deleteAvatar.mutateAsync();
      toast({
        title: "Avatar removed",
        description: "Your profile picture has been removed",
      });

      // Update the session to remove the image
      await update({ image: null });

      onUploadComplete?.("");
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Delete failed",
        description: "Failed to remove avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const displayUrl = preview ?? currentAvatarUrl;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <div className="relative">
          {/* Avatar Container */}
          <div className="bg-muted relative h-24 w-24 overflow-hidden rounded-full">
            {displayUrl ? (
              <Image
                src={displayUrl}
                alt="Avatar"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <User className="text-muted-foreground h-12 w-12" />
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>

          {/* Edit Icon Overlay */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full shadow-md transition-transform hover:scale-110 disabled:opacity-50 disabled:hover:scale-100"
            aria-label="Edit avatar"
          >
            <Camera className="h-4 w-4" />
          </button>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
        </div>

        <div className="flex-1">
          <p className="text-sm font-medium">Profile Picture</p>
          <p className="text-muted-foreground text-xs">
            Click the edit icon to upload a new photo
          </p>
          {currentAvatarUrl && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={uploading}
              className="text-destructive mt-2 text-xs hover:underline disabled:opacity-50"
            >
              Remove current photo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
