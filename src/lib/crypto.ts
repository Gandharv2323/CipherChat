// A helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

// A helper function to convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

// Generate an RSA-OAEP key pair for key encryption
export async function generateRsaKeyPair(): Promise<CryptoKeyPair> {
    return await crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );
}

// Export a CryptoKey to a JSON Web Key (JWK) format
export async function exportKey(key: CryptoKey): Promise<JsonWebKey> {
    return await crypto.subtle.exportKey("jwk", key);
}

// Import an RSA public key from JWK format
export async function importRsaPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
    return await crypto.subtle.importKey(
        "jwk",
        jwk,
        {
            name: "RSA-OAEP",
            hash: "SHA-256",
        },
        true,
        ["encrypt"]
    );
}

// Generate an AES-GCM key for message encryption
export async function generateAesKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256,
        },
        true,
        ["encrypt", "decrypt"]
    );
}

// Import an AES key from raw ArrayBuffer
export async function importAesKey(keyData: BufferSource): Promise<CryptoKey> {
    return await crypto.subtle.importKey(
        "raw",
        keyData,
        {
            name: "AES-GCM",
        },
        true,
        ["encrypt", "decrypt"]
    );
}

// Encrypt data with an RSA public key
export async function encryptWithRsa(data: ArrayBuffer, publicKey: CryptoKey): Promise<ArrayBuffer> {
    return await crypto.subtle.encrypt(
        {
            name: "RSA-OAEP",
        },
        publicKey,
        data
    );
}

// Decrypt data with an RSA private key
export async function decryptWithRsa(data: ArrayBuffer, privateKey: CryptoKey): Promise<ArrayBuffer> {
    return await crypto.subtle.decrypt(
        {
            name: "RSA-OAEP",
        },
        privateKey,
        data
    );
}

// Encrypt a message with an AES-GCM key
export async function encryptWithAes(plainText: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedText = new TextEncoder().encode(plainText);

    const ciphertext = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        key,
        encodedText
    );

    return {
        ciphertext: arrayBufferToBase64(ciphertext),
        iv: arrayBufferToBase64(iv),
    };
}

// Decrypt a message with an AES-GCM key
export async function decryptWithAes(ciphertext: string, iv: string, key: CryptoKey): Promise<string> {
    const ivArrayBuffer = base64ToArrayBuffer(iv);
    const ciphertextArrayBuffer = base64ToArrayBuffer(ciphertext);

    const decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: ivArrayBuffer,
        },
        key,
        ciphertextArrayBuffer
    );

    return new TextDecoder().decode(decrypted);
}
