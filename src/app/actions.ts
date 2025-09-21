'use server';

import type { Message } from "@/lib/types";

// In a real application, you would use a database.
// For this demo, we'll store messages in memory.
const messages: Omit<Message, 'decryptedText'>[] = [];

// This is a simplified event emitter to notify clients of new messages.
// In a real-world scenario, you would use WebSockets (e.g., Socket.IO) or a similar service.
import { EventEmitter } from 'events';
const messageEvents = new EventEmitter();

export async function sendMessage(message: Omit<Message, 'id' | 'decryptedText'>) {
  console.log('Received encrypted message on server:', message);
  
  const newMessage = {
    ...message,
    id: Date.now(),
  }
  
  messages.push(newMessage);
  
  // Notify listeners (the other user)
  messageEvents.emit('newMessage', newMessage);

  return newMessage;
}

// This function would be used by the client to get all messages.
// For this demo, we'll just return the in-memory array.
export async function getMessages() {
  return messages;
}

// NOTE: The following is a simplified long-polling implementation for demo purposes.
// A production app should use WebSockets for real-time communication.
export async function subscribeToMessages(recipientName: string) {
    return new Promise((resolve) => {
        const onMessage = (message: Message) => {
            if (message.recipient === recipientName) {
                messageEvents.removeListener('newMessage', onMessage);
                resolve(message);
            }
        };
        messageEvents.on('newMessage', onMessage);

        // Timeout after 30 seconds to prevent hanging requests
        setTimeout(() => {
            messageEvents.removeListener('newMessage', onMessage);
            resolve(null);
        }, 30000);
    });
}
