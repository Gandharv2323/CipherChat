"use client";

import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";
import { UserAvatar } from "./UserAvatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Lock, Loader2 } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
  currentUser: string;
}

export function MessageBubble({ message, currentUser }: MessageBubbleProps) {
  const isSender = message.sender === currentUser;
  const alignment = isSender ? "justify-end" : "justify-start";
  const colors = isSender
    ? "bg-primary text-primary-foreground"
    : "bg-secondary";

  const renderContent = () => {
    // For recipient, show the decrypted text, or a loading state
    if (!isSender && (message as any).isDecrypting) {
        return <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Decrypting...</div>;
    }
    return message.decryptedText;
  }
  
  return (
    <div className={cn("flex items-end gap-2", alignment)}>
       {!isSender && <UserAvatar name={message.sender} />}
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={cn(
                        "flex flex-col max-w-xs md:max-w-md lg:max-w-lg rounded-lg p-3 text-sm shadow-md",
                        colors
                        )}
                    >
                        {renderContent()}
                    </div>
                </TooltipTrigger>
                <TooltipContent side={isSender ? 'left' : 'right'} className="max-w-sm">
                    <div className="p-2 space-y-2 text-xs">
                        <h4 className="font-bold">Crypto Details</h4>
                        <p>
                            <span className="font-semibold">Plaintext: </span>{message.plainText}
                        </p>
                        <p className="break-all">
                            <span className="font-semibold">Ciphertext (Base64): </span>{message.cipherText.substring(0, 50)}...
                        </p>
                        <p className="break-all">
                            <span className="font-semibold">IV (Base64): </span>{message.iv}
                        </p>
                        <p className="flex items-center gap-2 mt-2">
                            <Lock className="w-3 h-3 text-green-500" />
                            <span>Encrypted with AES-256-GCM session key.</span>
                        </p>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      {isSender && <UserAvatar name={message.sender} />}
    </div>
  );
}
