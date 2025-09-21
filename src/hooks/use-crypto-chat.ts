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
import { getMessages, sendMessage, subscribeToMessages } from "@/app/actions";
import type { Message, CryptoLog, UserKeys } from "@/lib/types";

const initialUsers: Record<string, UserKeys> = {
  Alice: { name: "Alice", keys: null, sessionKey: null },
  Bob: { name: "Bob", keys: null, sessionKey: null },
};

export function useCryptoChat() {
  const [users, setUsers] = useState(initialUsers);
  const [messages, setMessages] = useState<Message[]>([]);
  const [cryptoLogs, setCryptoLogs] = useState<CryptoLog[]>([]);
  const [activeUser, setActiveUser] = useState<"Alice" | "Bob">("Alice");
  const { toast } = useToast();

  const addLog = useCallback((entry: string) => {
    setCryptoLogs((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), entry },
    ]);
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
    const exportedSessionKeyBuffer = exportedSessionKeyRaw;

    addLog("2. Alice imports Bob's public RSA key.");
    const bobPublicKey = await importRsaPublicKey(users.Bob.keys.publicKeyJwk);

    addLog("3. Alice encrypts the session key with Bob's public key using RSA-OAEP.");
    const encryptedSessionKey = await encryptWithRsa(exportedSessionKeyBuffer, bobPublicKey);

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

    if (!sender.sessionKey) {
      toast({
        title: "Cannot Send Message",
        description: "A secure session has not been established. Perform key exchange first.",
        variant: "destructive",
      });
      return;
    }

    addLog(`${sender.name} is encrypting a message with the session key...`);
    const { ciphertext, iv } = await encryptWithAes(plainText, sender.sessionKey);
    addLog(`Message encrypted. Ciphertext: ${ciphertext.substring(0, 20)}...`);

    await sendMessage({
        sender: sender.name,
        recipient: recipientName,
        plainText, // Included for tooltip demonstration, NOT for server storage in production
        cipherText: ciphertext,
        iv: iv,
    });
    
    addLog(`Encrypted message sent to server.`);

  }, [activeUser, users, addLog, toast]);
  
  const switchUser = useCallback(() => {
    setActiveUser(prev => prev === 'Alice' ? 'Bob' : 'Alice');
  }, []);

  // Effect to load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      const serverMessages = await getMessages();
      const user = users[activeUser];

      if (user.sessionKey) {
          const decryptedMessages = await Promise.all(serverMessages.map(async msg => {
            // Only decrypt messages intended for the active user
            if(msg.recipient === activeUser) {
              try {
                const decryptedText = await decryptWithAes(msg.cipherText, msg.iv, user.sessionKey!);
                return { ...msg, decryptedText };
              } catch (e) {
                 console.error("Failed to decrypt message:", msg.id, e);
                 return { ...msg, decryptedText: "🔒 [Decryption Failed]" };
              }
            }
            // If the user is the sender, show their original plaintext
            if (msg.sender === activeUser) {
                 return { ...msg, decryptedText: msg.plainText };
            }
            // Otherwise, it's an encrypted message for the other user
            return { ...msg, decryptedText: `🔒 [Encrypted for ${msg.recipient}]` };
          }));
          setMessages(decryptedMessages as Message[]);
      } else {
        // If no session key, just show placeholder text
        const placeholderMessages = serverMessages.map(msg => ({
          ...msg,
          decryptedText: `🔒 [Encrypted for ${msg.recipient}]`
        }));
        setMessages(placeholderMessages as Message[]);
      }
    };
    loadMessages();
  }, [activeUser, users]); // Rerun when user switches or keys change


  // Effect to listen for incoming messages
  useEffect(() => {
    let isSubscribed = true;

    const listenForMessages = async () => {
        // Don't start polling if we are not in a state to decrypt messages
        if (!users[activeUser]?.sessionKey) {
          if (isSubscribed) setTimeout(listenForMessages, 1000); // Check again in a second
          return;
        }

        while (isSubscribed) {
            try {
                const incomingMessage = await subscribeToMessages(activeUser) as Message | null;
                
                if (isSubscribed && incomingMessage) {
                    addLog(`[${activeUser}] Received an event for message ID: ${incomingMessage.id}.`);
                    
                    setMessages((prev) => {
                        // Avoid adding duplicate messages
                        if (prev.find(m => m.id === incomingMessage.id)) {
                            return prev;
                        }
                        // Add new message in a temporary 'decrypting' state
                        return [...prev, { ...incomingMessage, isDecrypting: true, decryptedText: "Decrypting..." }];
                    });
                }
            } catch (error) {
                console.error("Long polling error:", error);
                // Wait a moment before retrying on error
                if (isSubscribed) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
    };

    listenForMessages();

    // Cleanup function
    return () => {
        isSubscribed = false;
    };
  }, [activeUser, users, addLog]);

  // Effect to process decryption for messages marked `isDecrypting`
  useEffect(() => {
      const decryptMessages = async () => {
          const messagesToDecrypt = messages.filter(m => (m as any).isDecrypting);
          if (messagesToDecrypt.length === 0) return;

          const currentUser = users[activeUser];
          if (!currentUser.sessionKey) return;

          for (const msg of messagesToDecrypt) {
              let decryptedText: string;
              if (msg.sender === activeUser) {
                  decryptedText = msg.plainText; // Sender uses their own plaintext
              } else if (msg.recipient === activeUser) {
                  try {
                      decryptedText = await decryptWithAes(msg.cipherText, msg.iv, currentUser.sessionKey);
                      addLog(`[${activeUser}] Message decrypted: "${decryptedText}"`);
                  } catch (e) {
                      console.error("Decryption failed for message:", msg.id, e);
                      decryptedText = "🔒 [Decryption Failed]";
                      addLog(`[${activeUser}] Failed to decrypt message ID: ${msg.id}`);
                  }
              } else {
                decryptedText = `🔒 [Encrypted for ${msg.recipient}]`
              }

              setMessages(prev =>
                  prev.map(m =>
                      m.id === msg.id ? { ...msg, decryptedText, isDecrypting: false } : m
                  )
              );
          }
      };

      decryptMessages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, activeUser, users, addLog]);


  return {
    users,
    messages,
    cryptoLogs,
    activeUser,
    handleGenerateKeys,
    handleKeyExchange,
    handleSendMessage,
    switchUser,
  };
}
