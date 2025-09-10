"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import { toast } from "~/components/ui/use-toast";
import { AvatarUpload } from "~/components/AvatarUpload";
import { Separator } from "~/components/ui/separator";

interface ProfileManagementProps {
  userId: string;
}

export default function ProfileManagement({ userId }: ProfileManagementProps) {
  const { data: profile, isLoading, refetch } = api.user.getProfile.useQuery({ userId });
  const updateProfile = api.user.updateProfile.useMutation({
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
  });

  const handleEdit = () => {
    if (profile) {
      setFormData({
        name: profile.name ?? "",
        username: profile.username ?? "",
        email: profile.email ?? "",
      });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    updateProfile.mutate({
      userId,
      name: formData.name || undefined,
      username: formData.username || undefined,
      email: formData.email || undefined,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Profile not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Management</CardTitle>
        <CardDescription>
          Manage your account settings and personal information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <AvatarUpload 
            currentAvatarUrl={profile.image}
            onUploadComplete={() => void refetch()}
          />
          
          <Separator />
          
          <div>
            <h3 className="text-xl font-semibold">{profile.name ?? profile.username}</h3>
            <p className="text-sm text-muted-foreground">
              Member since {new Date(profile.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            {isEditing ? (
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your display name"
              />
            ) : (
              <p className="text-sm">{profile.name ?? "Not set"}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            {isEditing ? (
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Enter your username"
              />
            ) : (
              <p className="text-sm">{profile.username}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            {isEditing ? (
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter your email"
              />
            ) : (
              <p className="text-sm">{profile.email ?? "Not set"}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Account Status</Label>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex h-2 w-2 rounded-full ${profile.emailVerified ? "bg-green-500" : "bg-yellow-500"}`} />
              <span className="text-sm">
                {profile.emailVerified ? "Email verified" : "Email not verified"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={updateProfile.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button onClick={handleEdit}>Edit Profile</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}