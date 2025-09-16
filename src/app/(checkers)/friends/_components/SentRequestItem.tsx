"use client";

import { X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { toast } from "~/components/ui/use-toast";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

interface SentRequestItemProps {
  request: {
    id: string;
    message?: string | null;
    createdAt: Date;
    receiver: {
      id: string;
      username: string;
      name: string | null;
      image: string | null;
    };
  };
}

export function SentRequestItem({ request }: SentRequestItemProps) {
  const router = useRouter();
  const utils = api.useUtils();

  const cancelRequest = api.friendRequest.cancel.useMutation({
    onSuccess: () => {
      toast({
        title: "Request cancelled",
        description: "Friend request has been cancelled",
      });
      void utils.friendRequest.getSent.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={request.receiver.image ?? undefined} />
            <AvatarFallback>
              {request.receiver.name?.charAt(0) ??
                request.receiver.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">
              {request.receiver.name ?? request.receiver.username}
            </p>
            <p className="text-sm text-muted-foreground">
              @{request.receiver.username} · Request sent
            </p>
            {request.message && (
              <p className="mt-1 text-sm text-muted-foreground">
                {request.message}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              cancelRequest.mutate({ friendRequestId: request.id })
            }
            disabled={cancelRequest.isPending}
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
}