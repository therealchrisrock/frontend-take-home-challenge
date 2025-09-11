"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Send, MessageCircle } from "lucide-react";

interface GameChatProps {
  gameId: string;
  opponentName?: string;
}

interface GameMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
}

export function GameChat({ opponentName = "Opponent" }: GameChatProps) {
  const { data: session } = useSession();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!message.trim() || !session?.user) return;

    const newMessage: GameMessage = {
      id: Date.now().toString(),
      content: message,
      senderId: session.user.id,
      senderName: session.user.name ?? session.user.username ?? "You",
      timestamp: new Date(),
    };

    // In a real implementation, this would send the message via tRPC or WebSocket
    setMessages((prev) => [...prev, newMessage]);
    setMessage("");

    // TODO: Send message to opponent via API
    // api.game.sendMessage.mutate({ gameId, content: message });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!session?.user) return null;

  return (
    <Card className="flex h-full flex-col border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-amber-900">
          <MessageCircle className="h-5 w-5" />
          Game Chat
        </CardTitle>
        <p className="text-xs text-amber-700">Chat with {opponentName}</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col overflow-hidden p-4 pt-0">
        {/* Messages */}
        <div className="mb-3 flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto" ref={scrollAreaRef}>
            {messages.length === 0 ? (
              <div className="py-8 text-center text-sm text-amber-600">
                <MessageCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>Start a conversation with your opponent</p>
              </div>
            ) : (
              <div className="space-y-2 pr-3">
                {messages.map((msg) => {
                  const isCurrentUser = msg.senderId === session.user.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg px-3 py-2 ${
                          isCurrentUser
                            ? "bg-amber-600 text-white"
                            : "bg-white/70 text-amber-900"
                        }`}
                      >
                        {!isCurrentUser && (
                          <p className="mb-1 text-xs font-semibold opacity-75">
                            {msg.senderName}
                          </p>
                        )}
                        <p className="text-sm break-words">{msg.content}</p>
                        <p
                          className={`mt-1 text-xs ${
                            isCurrentUser ? "text-amber-100" : "text-amber-600"
                          }`}
                        >
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="h-9 flex-1 border-amber-300 bg-white/70 text-sm focus:bg-white"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            size="sm"
            className="h-9 bg-amber-600 px-3 hover:bg-amber-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
