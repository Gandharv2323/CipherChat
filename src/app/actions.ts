'use server';

import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import type { Message } from "@/lib/types";

// The server action now directly interacts with Firestore
export async function sendMessage(message: Omit<Message, 'id' | 'decryptedText' | 'timestamp'>) {
  console.log('Received encrypted message for Firestore:', message);

  try {
    const docRef = await addDoc(collection(db, "messages"), {
      ...message,
      timestamp: serverTimestamp() 
    });
    console.log("Message written with ID: ", docRef.id);
    
    // We return the original payload plus a confirmation.
    // The 'id' will be assigned by Firestore on the client-side snapshot.
    return { success: true, sent: message };
  } catch (e) {
    console.error("Error adding document: ", e);
    return { success: false, error: "Failed to send message" };
  }
}
