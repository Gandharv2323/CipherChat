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
import { sendMessage, subscribeToMessages } from "@/app/actions";
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
    const exportedSessionKeyBuffer = new Uint8Array(exportedSessionKeyRaw).buffer;

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

    const sentMessage = await sendMessage({
        sender: sender.name,
        recipient: recipientName,
        plainText, // Included for tooltip demonstration, NOT for server storage in production
        cipherText: ciphertext,
        iv: iv,
    });
    
    addLog(`Encrypted message sent to server.`);

    // Add sender's message to their own UI immediately
    setMessages((prev) => [...prev, { ...sentMessage, decryptedText: plainText, id: sentMessage.id || Date.now() }]);

  }, [activeUser, users, addLog, toast]);
  
  const switchUser = useCallback(() => {
    setActiveUser(prev => prev === 'Alice' ? 'Bob' : 'Alice');
  }, []);

  // Effect to listen for incoming messages
  useEffect(() => {
    const listenForMessages = async () => {
      if (!users[activeUser]?.sessionKey) {
        // If the user has no session key, don't listen.
        // We'll restart the listener when the user changes or gets a key.
        return;
      }
      
      addLog(`[${activeUser}] Listening for incoming messages...`);
      const incomingMessage = await subscribeToMessages(activeUser) as Message | null;

      if (incomingMessage && users[activeUser].sessionKey) {
          addLog(`[${activeUser}] Received an encrypted message.`);
          const decryptedText = await decryptWithAes(incomingMessage.cipherText, incomingMessage.iv, users[activeUser].sessionKey!);
          addLog(`[${activeUser}] Message decrypted successfully.`);
          
          setMessages((prev) => {
            // Avoid adding duplicate messages
            if (prev.find(m => m.id === incomingMessage.id)) return prev;
            return [...prev, { ...incomingMessage, decryptedText }];
          });
      }
      // Restart the listener
      listenForMessages();
    };

    listenForMessages();

    // Cleanup function to avoid memory leaks
    return () => {
        // In a real app with WebSockets, you'd unsubscribe here.
        // For our long-polling demo, the server-side timeout handles cleanup.
    };
  }, [activeUser, users, addLog]);


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
