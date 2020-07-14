import crypto from "crypto";
import SpotifyModule from "../entity";

export namespace SpotifyInternalKit {
  var encryptionKey: string;

  async function ensureKey() {
    if (!encryptionKey) {
      let moduleConfig = await SpotifyModule.findOne();
      if (!moduleConfig) moduleConfig = SpotifyModule.create();
      if (!moduleConfig.key) {
        moduleConfig.key = crypto.randomBytes(16).toString('hex');
        await moduleConfig.save();
      }

      encryptionKey = moduleConfig.key;
    }
  }

  const IV_LENGTH = 16;

  function key() {
    return crypto.createHash("sha256")
                 .update(encryptionKey)
                 .digest();
  }

  export async function encryptCookies(cookies: string) {
    await ensureKey();

    const iv = crypto.randomBytes(IV_LENGTH);
    console.log({ newIV: iv });
    const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
    let encrypted = cipher.update(cookies);

    encrypted = Buffer.concat([ encrypted, cipher.final() ]);
    const authTag = cipher.getAuthTag();
    const bufferLength = Buffer.alloc(1);
    bufferLength.writeUInt8(iv.length, 0);

    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted.toString('hex');
  }

  export async function decryptCookies(cookies: string) {
    await ensureKey();

    const parts = cookies.split(':');
    const iv = Buffer.from(parts.shift()!, 'hex');
    const authTag = Buffer.from(parts.shift()!, 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText);

    decrypted = Buffer.concat([ decrypted, decipher.final() ]);

    return decrypted.toString();
  }
}