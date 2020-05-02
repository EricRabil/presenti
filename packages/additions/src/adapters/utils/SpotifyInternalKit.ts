import crypto from "crypto";

export namespace SpotifyInternalKit {
  export interface SpotifyInternalConfig {
    key: string | null;
  }

  async function ensureKey(config: SpotifyInternalConfig) {
    if (!config.key) {
      config.key = crypto.randomBytes(16).toString('hex');
    }
  }

  const IV_LENGTH = 16;

  function key(config: SpotifyInternalConfig) {
    return crypto.createHash("sha256")
                 .update(config.key!)
                 .digest();
  }

  export async function encryptCookies(cookies: string, config: SpotifyInternalConfig) {
    await ensureKey(config);
    const iv = crypto.randomBytes(IV_LENGTH);
    console.log({ newIV: iv });
    const cipher = crypto.createCipheriv('aes-256-gcm', key(config), iv);
    let encrypted = cipher.update(cookies);

    encrypted = Buffer.concat([ encrypted, cipher.final() ]);
    const authTag = cipher.getAuthTag();
    const bufferLength = Buffer.alloc(1);
    bufferLength.writeUInt8(iv.length, 0);

    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted.toString('hex');
  }

  export async function decryptCookies(cookies: string, config: SpotifyInternalConfig) {
    await ensureKey(config);
    const parts = cookies.split(':');
    const iv = Buffer.from(parts.shift()!, 'hex');
    const authTag = Buffer.from(parts.shift()!, 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(config), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText);

    decrypted = Buffer.concat([ decrypted, decipher.final() ]);

    return decrypted.toString();
  }
}