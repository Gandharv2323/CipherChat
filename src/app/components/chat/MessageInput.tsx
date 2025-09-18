"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (plainText: string) => void;
  activeUser: 'Alice' | 'Bob';
}

export function MessageInput({ onSendMessage, activeUser }: MessageInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`Typing as ${activeUser}...`}
        className="flex-1 resize-none"
        rows={1}
      />
      <Button type="submit" size="icon" aria-label="Send Message">
        <Send className="w-4 h-4" />
      </Button>
    </form>
  );
}
