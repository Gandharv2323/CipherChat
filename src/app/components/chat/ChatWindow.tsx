"use client";
import type { Message } from "@/lib/types";
import { MessageInput } from "@/app/components/chat/MessageInput";
import { MessageBubble } from "@/app/components/chat/MessageBubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserAvatar } from "@/app/components/chat/UserAvatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (plainText: string) => void;
  activeUser: 'Alice' | 'Bob';
  onSwitchUser: () => void;
}

export function ChatWindow({ messages, onSendMessage, activeUser, onSwitchUser }: ChatWindowProps) {
  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-semibold tracking-tight">Encrypted Conversation</h2>
        <div className="flex items-center space-x-2">
            <UserAvatar name="Alice" isActive={activeUser === 'Alice'} />
            <Switch id="user-switch" checked={activeUser === 'Bob'} onCheckedChange={onSwitchUser} aria-label="Switch User" />
            <UserAvatar name="Bob" isActive={activeUser === 'Bob'} />
        </div>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-muted-foreground pt-16">
                <p>No messages yet.</p>
                <p className="text-sm">Complete key exchange and send your first encrypted message.</p>
             </div>
          ) : messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} currentUser={activeUser} />
          ))}
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <MessageInput onSendMessage={onSendMessage} activeUser={activeUser} />
      </div>
    </div>
  );
}
