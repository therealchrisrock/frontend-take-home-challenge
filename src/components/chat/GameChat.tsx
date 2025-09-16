"use client";

import { MessageCircle, Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";

interface GameChatProps {
  gameId: string;
  opponentName?: string;
  embedded?: boolean;
}

interface GameMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
}

export function GameChat({ opponentName = "Opponent", embedded = false }: GameChatProps) {
  const { data: session } = useSession();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

    setMessages((prev) => [...prev, newMessage]);
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!session?.user) return null;

  if (embedded) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mb-3 flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto" ref={scrollAreaRef}>
            {messages.length === 0 ? (
              <div className="py-8 text-center text-sm text-primary-600">
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
                        className={`max-w-[75%] rounded-lg px-3 py-2 ${isCurrentUser ? "bg-primary text-white" : "bg-white/70 text-primary-900"
                          }`}
                      >
                        {!isCurrentUser && (
                          <p className="mb-1 text-xs font-semibold opacity-75">
                            {msg.senderName}
                          </p>
                        )}
                        <p className="text-sm break-words">{msg.content}</p>
                        <p className={`mt-1 text-xs ${isCurrentUser ? "text-primary/10" : "text-primary-600"}`}>
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
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="h-9 flex-1 border-primary/30 bg-white/70 text-sm focus:bg-white"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            size="sm"
            className="h-9 bg-primary px-3 hover:bg-primary-700"
            title="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="flex h-full flex-col border-primary/30 bg-gradient-to-br from-primary/10 to-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-primary-900">
          <MessageCircle className="h-5 w-5" />
          Game Chat
        </CardTitle>
        <p className="text-xs text-primary-700">Chat with {opponentName}</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col overflow-hidden p-4 pt-0">
        <div className="mb-3 flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto" ref={scrollAreaRef}>
            {messages.length === 0 ? (
              <div className="py-8 text-center text-sm text-primary-600">
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
                        className={`max-w-[75%] rounded-lg px-3 py-2 ${isCurrentUser ? "bg-primary text-white" : "bg-white/70 text-primary-900"
                          }`}
                      >
                        {!isCurrentUser && (
                          <p className="mb-1 text-xs font-semibold opacity-75">
                            {msg.senderName}
                          </p>
                        )}
                        <p className="text-sm break-words">{msg.content}</p>
                        <p className={`mt-1 text-xs ${isCurrentUser ? "text-primary/10" : "text-primary-600"}`}>
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
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="h-9 flex-1 border-primary/30 bg-white/70 text-sm focus:bg-white"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            size="sm"
            className="h-9 bg-primary px-3 hover:bg-primary-700"
            title="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
