
"use client";

import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  generateRsaKeyPair,
  exportKey,
  generateAesKey,
  encryptWithRsa,
  decryptWithRsa,
  importRsaPublicKey,
  importAesKey,
  encryptWithAes,
  decryptWithAes,
} from "@/lib/crypto";
import { sendMessage } from "@/app/actions";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import type { Message, CryptoLog, UserKeys, MessageStatus } from "@/lib/types";

const initialUsers: Record<string, UserKeys> = {
  Alice: { name: "Alice", keys: null, sessionKey: null },
  Bob: { name: "Bob", keys: null, sessionKey: null },
};

export function useCryptoChat() {
  const [users, setUsers] = useState(initialUsers);
  const [messages, setMessages] = useState<Message[]>([]);
  const [cryptoLogs, setCryptoLogs] = useState<CryptoLog[]>([]);
  const [activeUser, setActiveUser] = useState<"Alice" | "Bob">("Alice");
  const [messageStatus, setMessageStatus] = useState<MessageStatus | null>(null);
  const { toast } = useToast();

  const addLog = useCallback((entry: string) => {
    setCryptoLogs((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), entry },
    ]);
  }, []);

  const resetMessageStatus = useCallback(() => {
    setTimeout(() => {
        setMessageStatus(null)
    }, 2000)
  }, []);

  const handleGenerateKeys = useCallback(async (userName: "Alice" | "Bob") => {
    addLog(`Generating RSA key pair for ${userName}...`);
    const keyPair = await generateRsaKeyPair();
    const publicKeyJwk = await exportKey(keyPair.publicKey);

    setUsers((prev) => ({
      ...prev,
      [userName]: { ...prev[userName], keys: { privateKey: keyPair.privateKey, publicKeyJwk } },
    }));
    addLog(`${userName}'s RSA key pair generated and stored.`);
  }, [addLog]);

  const handleKeyExchange = useCallback(async () => {
    if (!users.Alice.keys || !users.Bob.keys) {
      toast({
        title: "Key Exchange Failed",
        description: "Both users must generate keys first.",
        variant: "destructive",
      });
      return;
    }

    addLog("--- Starting Key Exchange (Alice -> Bob) ---");

    addLog("1. Alice generates a new AES-256 session key.");
    const sessionKey = await generateAesKey();
    const exportedSessionKeyRaw = await crypto.subtle.exportKey('raw', sessionKey);

    addLog("2. Alice imports Bob's public RSA key.");
    const bobPublicKey = await importRsaPublicKey(users.Bob.keys.publicKeyJwk);

    addLog("3. Alice encrypts the session key with Bob's public key using RSA-OAEP.");
    const encryptedSessionKey = await encryptWithRsa(exportedSessionKeyRaw, bobPublicKey);

    addLog("4. Alice 'sends' the encrypted session key to Bob.");
    
    addLog("5. Bob decrypts the session key with his private RSA key.");
    const bobPrivateKey = users.Bob.keys.privateKey;
    const decryptedSessionKeyRaw = await decryptWithRsa(encryptedSessionKey, bobPrivateKey);

    addLog("6. Both users now have the shared session key.");
    const aliceSessionKey = await importAesKey(exportedSessionKeyRaw);
    const bobSessionKey = await importAesKey(decryptedSessionKeyRaw);

    setUsers((prev) => ({
      Alice: { ...prev.Alice, sessionKey: aliceSessionKey },
      Bob: { ...prev.Bob, sessionKey: bobSessionKey },
    }));

    addLog("--- Key Exchange Complete ---");
    toast({
      title: "Key Exchange Successful",
      description: "A shared session key has been established.",
    });
  }, [users, addLog, toast]);

  const handleSendMessage = useCallback(async (plainText: string) => {
    const sender = users[activeUser];
    const recipientName = activeUser === "Alice" ? "Bob" : "Alice";
    const tempId = Date.now();
    setMessageStatus({ step: 'idle', messageId: tempId });

    if (!sender.sessionKey) {
      toast({
        title: "Cannot Send Message",
        description: "A secure session has not been established. Perform key exchange first.",
        variant: "destructive",
      });
      return;
    }
    
    setMessageStatus({ step: 'encrypting', messageId: tempId });
    addLog(`${sender.name} is encrypting a message with the session key...`);
    const { ciphertext, iv } = await encryptWithAes(plainText, sender.sessionKey);
    addLog(`Message encrypted. Ciphertext: ${ciphertext.substring(0, 20)}...`);
    
    // Optimistically add to UI
    const optimisticMessage: Message = {
      id: tempId,
      sender: sender.name,
      recipient: recipientName,
      plainText,
      cipherText: ciphertext,
      iv: iv,
      decryptedText: plainText,
      timestamp: Timestamp.now(),
    };
    setMessages(prev => [...prev, optimisticMessage]);
    
    setMessageStatus({ step: 'sending', messageId: tempId });
    
    const result = await sendMessage({
        sender: sender.name,
        recipient: recipientName,
        plainText,
        cipherText: ciphertext,
        iv: iv,
    });
    
    if (result.success) {
      addLog(`Encrypted message sent to server.`);
      setMessageStatus({ step: 'sent', messageId: tempId });
    } else {
      console.error("Failed to send message:", result.error);
      toast({ title: "Send Error", description: result.error, variant: 'destructive'});
      // Optionally remove the optimistic message
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setMessageStatus(null);
    }
  }, [activeUser, users, addLog, toast]);
  
  const switchUser = useCallback(() => {
    setActiveUser(prev => prev === 'Alice' ? 'Bob' : 'Alice');
  }, []);

  // Effect for real-time messages from Firestore
  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const serverMessages: Omit<Message, 'decryptedText'>[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        serverMessages.push({ id: doc.id, ...data } as any);
      });
      
      const aliceSessionKey = users.Alice.sessionKey;
      const bobSessionKey = users.Bob.sessionKey;

      const newMessages = await Promise.all(
        serverMessages.map(async (msg) => {
          let decryptedText = `🔒 [Encrypted for ${msg.recipient}]`;
          const isDecrypting = false;
          const sessionKey = msg.recipient === 'Alice' ? aliceSessionKey : bobSessionKey;
          
          if (msg.sender === activeUser) {
            decryptedText = msg.plainText;
            const existingMsg = messages.find(m => m.id === msg.id || (m.cipherText === msg.cipherText && m.sender === msg.sender));
            if (existingMsg && messageStatus?.messageId === existingMsg.id) {
                 setMessageStatus(prev => prev ? ({...prev, step: 'delivered'}) : null);
            }
          } else if (msg.recipient === activeUser && sessionKey) {
            try {
              if (messageStatus?.messageId === msg.id) {
                setMessageStatus(prev => prev ? ({ ...prev, step: 'decrypting' }) : null);
              }
              decryptedText = await decryptWithAes(msg.cipherText, msg.iv, sessionKey);
              if (messageStatus?.messageId === msg.id) {
                setMessageStatus(prev => prev ? ({ ...prev, step: 'complete' }) : null);
                resetMessageStatus();
              }
              addLog(`[${activeUser}] Decrypted message: ${msg.id}`);
            } catch (e) {
              console.error("Decryption failed for message:", msg.id, e);
              decryptedText = "🔒 [Decryption Failed]";
            }
          }
          
          return { ...msg, decryptedText, isDecrypting };
        })
      );
      
      setMessages(newMessages as Message[]);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUser, users.Alice.sessionKey, users.Bob.sessionKey, addLog]);


  return {
    users,
    messages,
    cryptoLogs,
    activeUser,
    messageStatus,
    handleGenerateKeys,
    handleKeyExchange,
    handleSendMessage,
    switchUser,
  };
}
