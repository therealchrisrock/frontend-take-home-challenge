"use client";

import {
  Check,
  Copy,
  ExternalLink,
  Mail,
  MessageCircle,
  QrCode,
  Share2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { toast } from "~/hooks/use-toast";
import { cn } from "~/lib/utils";

interface ShareableInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inviteId: string; // token or id; component computes URL from token
}

export function ShareableInviteDialog({
  open,
  onOpenChange,
  inviteId,
}: ShareableInviteDialogProps) {
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  const inviteUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/game/invite/${inviteId}`;

  // Generate QR code URL using QR-Server API (free service)
  useEffect(() => {
    if (inviteUrl && open) {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteUrl)}&format=png&margin=10`;
      setQrCodeUrl(qrUrl);
    }
  }, [inviteUrl, open]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Invitation link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const shareOptions = [
    {
      name: "WhatsApp",
      icon: MessageCircle,
      color: "bg-green-500 hover:bg-green-600",
      action: () => {
        const message = `Join me for a game of checkers! ${inviteUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
      },
    },
    {
      name: "Email",
      icon: Mail,
      color: "bg-blue-500 hover:bg-blue-600",
      action: () => {
        const subject = "Join me for a game of checkers!";
        const body = `I've invited you to play checkers with me. Click the link below to join:\n\n${inviteUrl}\n\nLet's play!`;
        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
      },
    },
    {
      name: "SMS",
      icon: MessageCircle,
      color: "bg-purple-500 hover:bg-purple-600",
      action: () => {
        const message = `Join me for a game of checkers! ${inviteUrl}`;
        window.open(`sms:?body=${encodeURIComponent(message)}`, "_blank");
      },
    },
  ];

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me for a game of checkers!",
          text: "I've invited you to play checkers with me.",
          url: inviteUrl,
        });
      } catch (error) {
        // User cancelled or sharing failed
        console.log("Share cancelled or failed");
      }
    } else {
      toast({
        title: "Sharing not supported",
        description: "Please copy the link or use one of the sharing options above",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Invitation
          </DialogTitle>
          <DialogDescription>
            Share this link with anyone you want to play checkers with.
            The first person to join will become your opponent.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">Share Link</TabsTrigger>
            <TabsTrigger value="qr">QR Code</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4 mt-4">
            {/* Copy Link Section */}
            <div>
              <Label htmlFor="invite-link" className="text-sm font-medium">
                Invitation Link
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="invite-link"
                  value={inviteUrl}
                  readOnly
                  className="flex-1"
                  onClick={(e) => e.currentTarget.select()}
                />
                <Button
                  onClick={handleCopyLink}
                  size="sm"
                  className={cn(
                    "px-3 transition-all duration-200",
                    copied
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-primary hover:bg-primary-700"
                  )}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Native Share */}
            {typeof navigator !== "undefined" && navigator.share && (
              <Button
                onClick={handleNativeShare}
                variant="outline"
                className="w-full"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share via System
              </Button>
            )}

            {/* Share Options */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Share via
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {shareOptions.map((option) => (
                  <Button
                    key={option.name}
                    onClick={option.action}
                    className={cn(
                      "flex flex-col items-center gap-1 h-auto py-3 text-white",
                      option.color
                    )}
                  >
                    <option.icon className="h-4 w-4" />
                    <span className="text-xs">{option.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Direct Link */}
            <div className="border-t pt-4">
              <Button
                onClick={() => window.open(inviteUrl, "_blank")}
                variant="outline"
                className="w-full"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Invitation Page
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="qr" className="space-y-4 mt-4">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                {qrCodeUrl ? (
                  <div className="p-4 bg-white border rounded-lg shadow-sm">
                    <img
                      src={qrCodeUrl}
                      alt="QR Code for game invitation"
                      className="w-48 h-48"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 bg-gray-100 border rounded-lg flex items-center justify-center">
                    <QrCode className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Scan this QR code with a phone camera to join the game
                </p>

                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  className="w-full"
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Link
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Security Notice */}
        <div className="text-xs text-gray-500 bg-gray-50 rounded p-3 mt-4">
          <p className="font-medium mb-1">🔒 Privacy Notice</p>
          <p>This invitation link expires after 15 minutes or when someone joins your game. Only share with people you want to play with.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}