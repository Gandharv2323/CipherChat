export interface UserKeys {
  name: string;
  keys: {
    privateKey: CryptoKey;
    publicKeyJwk: JsonWebKey;
  } | null;
  sessionKey: CryptoKey | null;
}

export interface Message {
  id: number;
  sender: string;
  recipient: string;
  plainText: string; // Not stored on server in prod
  cipherText: string;
  iv: string;
  decryptedText: string;
  isDecrypting?: boolean;
}

export interface CryptoLog {
  id: number;
  entry: string;
}

export type MessageLifeCycle =
  | 'idle'
  | 'encrypting'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'decrypting'
  | 'complete';
  
export interface MessageStatus {
  step: MessageLifeCycle;
  messageId: number | null;
}
