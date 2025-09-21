'use server';

import type { Message } from "@/lib/types";
import { promises as fs } from 'fs';
import path from 'path';

// In a real application, you would use a database.
// For this demo, we'll store messages in a JSON file.
const messagesFilePath = path.join(process.cwd(), 'messages.json');

async function readMessages(): Promise<Omit<Message, 'decryptedText'>[]> {
  try {
    const data = await fs.readFile(messagesFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If the file doesn't exist, start with an empty array
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeMessages(messages: Omit<Message, 'decryptedText'>[]): Promise<void> {
  await fs.writeFile(messagesFilePath, JSON.stringify(messages, null, 2));
}


// This is a simplified event emitter to notify clients of new messages.
// In a real-world scenario, you would use WebSockets (e.g., Socket.IO) or a similar service.
import { EventEmitter } from 'events';
const messageEvents = new EventEmitter();
// Node.js has a default limit of 10 listeners per event.
// For a chat app where many users could be polling, we should increase it.
messageEvents.setMaxListeners(0);


export async function sendMessage(message: Omit<Message, 'id' | 'decryptedText'>) {
  console.log('Received encrypted message on server:', message);
  
  const messages = await readMessages();
  
  const newMessage = {
    ...message,
    id: Date.now(),
  }
  
  messages.push(newMessage);
  await writeMessages(messages);
  
  // Notify listeners (the other user)
  messageEvents.emit('newMessage', newMessage);

  return newMessage;
}

// This function would be used by the client to get all messages.
export async function getMessages() {
  return await readMessages();
}

// NOTE: The following is a simplified long-polling implementation for demo purposes.
// A production app should use WebSockets for real-time communication.
export async function subscribeToMessages(recipientName: string) {
    return new Promise((resolve) => {
        const onMessage = (message: Message) => {
            // Check if the message is for the subscribing user OR if the sender is the subscriber
            // This ensures the sender also gets the message update via polling, confirming it was sent.
            if (message.recipient === recipientName || message.sender === recipientName) {
                messageEvents.removeListener('newMessage', onMessage);
                resolve(message);
            }
        };
        messageEvents.on('newMessage', onMessage);

        // Timeout after 5 seconds to prevent hanging requests
        setTimeout(() => {
            messageEvents.removeListener('newMessage', onMessage);
            resolve(null);
        }, 5000);
    });
}
