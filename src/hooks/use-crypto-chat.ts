"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  generateRsaKeyPair,
  exportKey,
  generateAesKey,
  encryptWithRsa,
  decryptWithRsa,
  importRsaPublicKey,
  importAesKey,
} from "@/lib/crypto";
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

    // 1. Alice generates a session key
    addLog("1. Alice generates a new AES-256 session key.");
    const sessionKey = await generateAesKey();
    const exportedSessionKeyRaw = await crypto.subtle.exportKey('raw', sessionKey);

    // 2. Alice imports Bob's public key
    addLog("2. Alice imports Bob's public RSA key.");
    const bobPublicKey = await importRsaPublicKey(users.Bob.keys.publicKeyJwk);

    // 3. Alice encrypts the session key with Bob's public key
    addLog("3. Alice encrypts the session key with Bob's public key using RSA-OAEP.");
    const encryptedSessionKey = await encryptWithRsa(exportedSessionKeyRaw, bobPublicKey);

    // --- Simulation of sending the key ---
    addLog("4. Alice 'sends' the encrypted session key to Bob.");
    
    // 5. Bob receives and decrypts the session key with his private key
    addLog("5. Bob decrypts the session key with his private RSA key.");
    const bobPrivateKey = users.Bob.keys.privateKey;
    const decryptedSessionKeyRaw = await decryptWithRsa(encryptedSessionKey, bobPrivateKey);

    // 6. Both import the session key for use
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
    const recipient = users[recipientName];

    if (!sender.sessionKey || !recipient.sessionKey) {
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

    // Simulate receiving and decrypting
    addLog(`${recipient.name} receives and decrypts the message...`);
    const decryptedText = await decryptWithAes(ciphertext, iv, recipient.sessionKey);
    addLog("Message decrypted successfully.");

    const newMessage: Message = {
      id: Date.now(),
      sender: sender.name,
      recipient: recipientName,
      plainText,
      cipherText: ciphertext,
      iv: iv,
      decryptedText,
    };
    setMessages((prev) => [...prev, newMessage]);
  }, [activeUser, users, addLog, toast]);
  
  const switchUser = useCallback(() => {
    setActiveUser(prev => prev === 'Alice' ? 'Bob' : 'Alice');
  }, []);

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
