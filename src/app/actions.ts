'use server';

import type { Message } from "@/lib/types";
import { promises as fs } from 'fs';
import path from 'path';

// In a real application, you would use a database.
// For this demo, we'll store messages in a JSON file.
const messagesFilePath = path.join(process.cwd(), 'messages.json');

// This is a simplified event emitter to notify clients of new messages.
// In a real-world scenario, you would use WebSockets (e.g., Socket.IO) or a similar service.
import { EventEmitter } from 'events';
const messageEvents = new EventEmitter();
// Node.js has a default limit of 10 listeners per event.
// For a chat app where many users could be polling, we should increase it.
messageEvents.setMaxListeners(0);

// In-memory cache of messages to make reads faster and sending instant.
let messagesCache: Omit<Message, 'decryptedText'>[] = [];
let isCacheInitialized = false;

async function initializeCache() {
  if (isCacheInitialized) return;
  try {
    const data = await fs.readFile(messagesFilePath, 'utf-8');
    messagesCache = data ? JSON.parse(data) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await writeMessagesToFile([]); // Create the file if it doesn't exist
    } else {
      console.error("Error reading messages file:", error);
    }
    messagesCache = [];
  }
  isCacheInitialized = true;
}


async function readMessagesFromFile(): Promise<Omit<Message, 'decryptedText'>[]> {
  try {
    const data = await fs.readFile(messagesFilePath, 'utf-8');
    // If the file is empty, JSON.parse will fail.
    if (!data) {
      return [];
    }
    return JSON.parse(data);
  } catch (error) {
    // If the file doesn't exist, start with an empty array
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await writeMessagesToFile([]); // Create the file
      return [];
    }
    console.error("Error reading messages:", error);
    // If there is a parsing error (e.g. empty file), return an empty array
    return [];
  }
}

async function writeMessagesToFile(messages: Omit<Message, 'decryptedText'>[]): Promise<void> {
  await fs.writeFile(messagesFilePath, JSON.stringify(messages, null, 2));
}


export async function sendMessage(message: Omit<Message, 'id' | 'decryptedText'>) {
  console.log('Received encrypted message on server:', message);
  
  if (!isCacheInitialized) {
      await initializeCache();
  }

  const newMessage = {
    ...message,
    id: Date.now(),
  }
  
  // Update cache immediately for instant response
  messagesCache.push(newMessage);
  
  // Notify listeners (the other user) right away
  messageEvents.emit('newMessage', newMessage);

  // Write to file in the background, don't await it
  writeMessagesToFile(messagesCache).catch(err => {
      console.error("Failed to write message to file:", err);
      // Optional: handle write error, e.g., by trying to revert the cache
  });

  return newMessage;
}

// This function would be used by the client to get all messages.
export async function getMessages() {
   if (!isCacheInitialized) {
      await initializeCache();
   }
  return messagesCache;
}

// NOTE: The following is a simplified long-polling implementation for demo purposes.
// A production app should use WebSockets for real-time communication.
export async function subscribeToMessages(recipientName: string): Promise<Message | null> {
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

        // Timeout after 30 seconds to prevent hanging requests and allow for re-subscription.
        setTimeout(() => {
            messageEvents.removeListener('newMessage', onMessage);
            resolve(null);
        }, 30000); // 30-second timeout
    });
}
