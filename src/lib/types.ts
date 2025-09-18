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
  plainText: string;
  cipherText: string;
  iv: string;
  decryptedText: string;
}

export interface CryptoLog {
  id: number;
  entry: string;
}
