"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { 
  Loader2, 
  Trophy, 
  Target, 
  Clock, 
  User, 
  Mail, 
  Lock, 
  CheckCircle,
  Gift,
  Star
} from "lucide-react";
import { 
  getGuestStats, 
  exportGuestData, 
  clearGuestSession,
  type GuestSession 
} from "~/lib/guest/sessionStorage";
import { api } from "~/trpc/react";

interface PostGameAccountFlowProps {
  isOpen: boolean;
  onClose: () => void;
  gameResult: "WIN" | "LOSS" | "DRAW";
  guestSession: GuestSession;
  gameStats: {
    moves: number;
    duration: number; // in seconds
    gameId: string;
  };
}

export function PostGameAccountFlow({ 
  isOpen, 
  onClose, 
  gameResult, 
  guestSession, 
  gameStats 
}: PostGameAccountFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<"summary" | "benefits" | "signup" | "success">("summary");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form data for account creation
  const [formData, setFormData] = useState({
    email: "",
    username: guestSession.displayName,
    name: "",
    password: "",
    confirmPassword: "",
  });

  const guestStats = getGuestStats();

  const handleContinueAsGuest = () => {
    onClose();
    router.push("/game");
  };

  const handleCreateAccount = () => {
    setStep("benefits");
  };

  const handleStartSignup = () => {
    setStep("signup");
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validate form
    if (!formData.email || !formData.username || !formData.password) {
      setError("Please fill in all required fields");
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      setIsLoading(false);
      return;
    }

    try {
      // Export guest data for preservation
      const guestData = exportGuestData();
      
      // For now, we'll use NextAuth's credentials provider to create the account
      // In a real app, you'd have a proper registration endpoint
      const result = await signIn("credentials", {
        email: formData.email,
        username: formData.username,
        name: formData.name || formData.username,
        password: formData.password,
        isRegistration: "true",
        guestData: JSON.stringify(guestData),
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      // Clear guest session after successful account creation
      clearGuestSession();
      setStep("success");
    } catch (err) {
      setError("Failed to create account. Please try again.");
      console.error("Account creation failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignInWithProvider = async (provider: string) => {
    setIsLoading(true);
    try {
      const guestData = exportGuestData();
      
      const result = await signIn(provider, {
        callbackUrl: `/auth/account-conversion?guestData=${encodeURIComponent(JSON.stringify(guestData))}`,
      });

      if (result?.error) {
        setError(`Failed to sign in with ${provider}`);
        setIsLoading(false);
      }
    } catch (err) {
      setError(`Failed to sign in with ${provider}`);
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case "WIN":
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case "LOSS":
        return <Target className="h-5 w-5 text-blue-500" />;
      case "DRAW":
        return <Star className="h-5 w-5 text-gray-500" />;
      default:
        return <CheckCircle className="h-5 w-5" />;
    }
  };

  const renderSummaryStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-2">
          {getResultIcon(gameResult)}
        </div>
        <h3 className="text-xl font-semibold">
          Game {gameResult === "WIN" ? "Won" : gameResult === "LOSS" ? "Complete" : "Draw"}!
        </h3>
        <p className="text-muted-foreground">
          Great game, {guestSession.displayName}!
        </p>
      </div>

      {/* Game Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-3 bg-muted rounded-lg">
          <div className="font-semibold text-lg">{gameStats.moves}</div>
          <div className="text-xs text-muted-foreground">Moves</div>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <div className="font-semibold text-lg">{formatDuration(gameStats.duration)}</div>
          <div className="text-xs text-muted-foreground">Duration</div>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <div className="font-semibold text-lg">
            {guestStats ? guestStats.gamesPlayed : 1}
          </div>
          <div className="text-xs text-muted-foreground">Total Games</div>
        </div>
      </div>

      {/* Overall Stats */}
      {guestStats && guestStats.gamesPlayed > 1 && (
        <div className="p-4 bg-muted rounded-lg">
          <div className="text-sm font-medium mb-2">Your Guest Session Stats:</div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-green-600">{guestStats.wins}</div>
              <div className="text-xs text-muted-foreground">Wins</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-red-600">{guestStats.losses}</div>
              <div className="text-xs text-muted-foreground">Losses</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-yellow-600">{guestStats.draws}</div>
              <div className="text-xs text-muted-foreground">Draws</div>
            </div>
          </div>
          <div className="mt-2 text-center">
            <Badge variant="outline">
              Win Rate: {Math.round(guestStats.winRate * 100)}%
            </Badge>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Button onClick={handleCreateAccount} className="w-full" size="lg">
          <Gift className="h-4 w-4 mr-2" />
          Create Account & Save Progress
        </Button>
        <Button onClick={handleContinueAsGuest} variant="outline" className="w-full">
          Continue as Guest
        </Button>
      </div>
    </div>
  );

  const renderBenefitsStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Save Your Progress!</h3>
        <p className="text-muted-foreground">
          Create an account to keep your game history and stats
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
          <Trophy className="h-5 w-5 text-yellow-500 mt-0.5" />
          <div>
            <div className="font-medium">Game History</div>
            <div className="text-sm text-muted-foreground">
              Keep track of all your wins, losses, and game statistics
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
          <User className="h-5 w-5 text-blue-500 mt-0.5" />
          <div>
            <div className="font-medium">Friends & Invites</div>
            <div className="text-sm text-muted-foreground">
              Send game invitations and build your friends network
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
          <Star className="h-5 w-5 text-purple-500 mt-0.5" />
          <div>
            <div className="font-medium">Rankings & Achievements</div>
            <div className="text-sm text-muted-foreground">
              Compete on leaderboards and unlock achievements
            </div>
          </div>
        </div>
      </div>

      {/* What will be preserved */}
      {guestStats && (
        <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
          <div className="font-medium text-green-800 mb-2">
            Your guest progress will be preserved:
          </div>
          <div className="text-sm text-green-700 space-y-1">
            <div>• {guestStats.gamesPlayed} games played</div>
            <div>• {guestStats.wins} wins, {guestStats.losses} losses</div>
            <div>• Your display name: {guestSession.displayName}</div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Button onClick={handleStartSignup} className="w-full" size="lg">
          Create Account Now
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={() => handleSignInWithProvider("google")} 
            variant="outline" 
            disabled={isLoading}
          >
            Continue with Google
          </Button>
          <Button 
            onClick={() => handleSignInWithProvider("github")} 
            variant="outline"
            disabled={isLoading}
          >
            Continue with GitHub
          </Button>
        </div>
        <Button onClick={() => setStep("summary")} variant="ghost" className="w-full">
          Back
        </Button>
      </div>
    </div>
  );

  const renderSignupStep = () => (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-xl font-semibold mb-2">Create Your Account</h3>
        <p className="text-muted-foreground">
          Join the checkers community!
        </p>
      </div>

      {error && (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="your@email.com"
            required
          />
        </div>

        <div>
          <Label htmlFor="username">Username *</Label>
          <Input
            id="username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="Your username"
            required
          />
        </div>

        <div>
          <Label htmlFor="name">Full Name (Optional)</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Your full name"
          />
        </div>

        <div>
          <Label htmlFor="password">Password *</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="At least 8 characters"
            required
            minLength={8}
          />
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirm Password *</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            placeholder="Confirm your password"
            required
          />
        </div>
      </div>

      <div className="space-y-3">
        <Button type="submit" disabled={isLoading} className="w-full" size="lg">
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create Account
        </Button>
        <Button 
          type="button" 
          onClick={() => setStep("benefits")} 
          variant="ghost" 
          className="w-full"
          disabled={isLoading}
        >
          Back
        </Button>
      </div>
    </form>
  );

  const renderSuccessStep = () => (
    <div className="text-center space-y-6">
      <div>
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Account Created!</h3>
        <p className="text-muted-foreground">
          Welcome to the checkers community! Your guest progress has been saved.
        </p>
      </div>

      <Button onClick={onClose} className="w-full" size="lg">
        Continue to Dashboard
      </Button>
    </div>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case "summary":
        return renderSummaryStep();
      case "benefits":
        return renderBenefitsStep();
      case "signup":
        return renderSignupStep();
      case "success":
        return renderSuccessStep();
      default:
        return renderSummaryStep();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Post-Game Account Creation</DialogTitle>
          <DialogDescription className="sr-only">
            Create an account to save your progress after playing as a guest.
          </DialogDescription>
        </DialogHeader>
        {renderCurrentStep()}
      </DialogContent>
    </Dialog>
  );
}

export default PostGameAccountFlow;