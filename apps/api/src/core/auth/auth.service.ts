import crypto from 'node:crypto';

/**
 * Service handling secure password hashing and verification.
 * Uses Node's built-in crypto.scrypt for Windows self-hosting compatibility
 * without requiring native C++ compilation bindings.
 */
export class PasswordService {
  private static KEY_LEN = 64;
  private static SALT_LEN = 16;

  /**
   * Hashes a plain text password using scrypt.
   */
  static async hash(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(this.SALT_LEN).toString('hex');
      crypto.scrypt(password, salt, this.KEY_LEN, (err, derivedKey) => {
        if (err) reject(err);
        resolve(`${salt}:${derivedKey.toString('hex')}`);
      });
    });
  }

  /**
   * Verifies a plain text password against a stored hash.
   */
  static async verify(password: string, hashWithSalt: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const [salt, key] = hashWithSalt.split(':');
      if (!salt || !key) {
        resolve(false);
        return;
      }
      crypto.scrypt(password, salt, this.KEY_LEN, (err, derivedKey) => {
        if (err) reject(err);
        const keyBuffer = Buffer.from(key, 'hex');
        const derivedKeyBuffer = Buffer.from(derivedKey.toString('hex'), 'hex');
        resolve(crypto.timingSafeEqual(keyBuffer, derivedKeyBuffer));
      });
    });
  }
}
