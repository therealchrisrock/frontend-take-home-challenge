"use client";

import React from "react";
import { Search, UserPlus, Loader2, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { api } from "~/trpc/react";
import { toast } from "~/hooks/use-toast";

const sendFriendRequestSchema = z.object({
  recipientEmail: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  message: z
    .string()
    .max(200, "Message must be 200 characters or less")
    .optional(),
});

type SendFriendRequestForm = z.infer<typeof sendFriendRequestSchema>;

interface SendFriendRequestDialogProps {
  children: React.ReactNode;
  onSuccess?: () => void;
}

export function SendFriendRequestDialog({
  children,
  onSuccess,
}: SendFriendRequestDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedUser, setSelectedUser] = React.useState<{
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null>(null);

  const form = useForm<SendFriendRequestForm>({
    resolver: zodResolver(sendFriendRequestSchema),
    defaultValues: {
      recipientEmail: "",
      message: "",
    },
  });

  // Search for users
  const { data: searchResults, isFetching: isSearching } = api.user.search.useQuery(
    { query: searchQuery },
    {
      enabled: searchQuery.length >= 2,
      staleTime: 30000,
    }
  );

  // Check friend request status
  const { data: requestStatus } = api.friendRequest.checkStatus.useQuery(
    { recipientEmail: form.watch("recipientEmail") },
    {
      enabled: !!form.watch("recipientEmail"),
      staleTime: 10000,
    }
  );

  // Send friend request mutation
  const sendMutation = api.friendRequest.send.useMutation({
    onSuccess: () => {
      toast({
        title: "Friend request sent!",
        description: "Your friend request has been sent successfully.",
      });
      handleClose();
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Failed to send friend request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setOpen(false);
    setSearchQuery("");
    setSelectedUser(null);
    form.reset();
  };

  const handleUserSelect = (user: typeof selectedUser) => {
    setSelectedUser(user);
    form.setValue("recipientEmail", user?.email || "");
    setSearchQuery("");
  };

  const onSubmit = async (data: SendFriendRequestForm) => {
    try {
      await sendMutation.mutateAsync({
        recipientEmail: data.recipientEmail,
        message: data.message,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const getStatusBadge = () => {
    if (!requestStatus) return null;

    switch (requestStatus.status) {
      case "ALREADY_FRIENDS":
        return <Badge variant="secondary">Already friends</Badge>;
      case "REQUEST_SENT":
        return <Badge variant="outline">Request sent</Badge>;
      case "REQUEST_RECEIVED":
        return <Badge variant="outline">Request received</Badge>;
      default:
        return null;
    }
  };

  const canSendRequest = requestStatus?.canSend ?? false;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Friend Request</DialogTitle>
          <DialogDescription>
            Find a user by email and send them a friend request.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* User Search */}
            <div className="space-y-2">
              <FormLabel>Find User</FormLabel>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Search Results */}
              {searchResults && searchResults.length > 0 && (
                <div className="max-h-32 overflow-y-auto border rounded-md">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleUserSelect(user)}
                      className="w-full flex items-center gap-3 p-2 hover:bg-accent text-left transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback>
                          {(user.name || user.email || "?").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && searchResults?.length === 0 && !isSearching && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No users found
                </p>
              )}
            </div>

            <Separator />

            {/* Selected User or Manual Email */}
            {selectedUser ? (
              <div className="flex items-center gap-3 p-3 border rounded-md bg-accent/50">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedUser.image || undefined} />
                  <AvatarFallback>
                    {(selectedUser.name || selectedUser.email || "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {selectedUser.name || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedUser.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge()}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUserSelect(null)}
                    className="h-8 w-8 p-0"
                  >
                    ×
                  </Button>
                </div>
              </div>
            ) : (
              <FormField
                control={form.control}
                name="recipientEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter email address..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the email address of the user you want to add.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Status indicator */}
            {requestStatus && !canSendRequest && (
              <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  {requestStatus.status === "ALREADY_FRIENDS" && "You are already friends with this user."}
                  {requestStatus.status === "REQUEST_SENT" && "You have already sent a friend request to this user."}
                  {requestStatus.status === "REQUEST_RECEIVED" && "This user has already sent you a friend request. Check your pending requests."}
                </p>
              </div>
            )}

            {/* Optional Message */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a personal message..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Add a personal note to your friend request.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={sendMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={sendMutation.isPending || !canSendRequest}
              >
                {sendMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                <UserPlus className="h-4 w-4 mr-2" />
                Send Request
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}