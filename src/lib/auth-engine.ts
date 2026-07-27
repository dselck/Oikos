import crypto from "crypto";

export interface OikosUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
}

export interface AuthEngineConfig {
  enableAuth?: boolean;
}

export class AuthEngine {
  private enableAuth: boolean;

  constructor(config?: AuthEngineConfig) {
    this.enableAuth = config?.enableAuth ?? (process.env.ENABLE_AUTH === "true");
  }

  isAuthEnabled(): boolean {
    return this.enableAuth;
  }

  async validateSession(token?: string): Promise<OikosUser | null> {
    if (!this.enableAuth) {
      return {
        id: "default_user",
        name: "Default Admin",
        email: "admin@local.oikos",
        role: "admin",
      };
    }

    if (!token) return null;
    // Database lookup for active session token will be wired in future task
    return null;
  }

  async hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString("hex");
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) reject(err);
        resolve(`${salt}:${derivedKey.toString("hex")}`);
      });
    });
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return new Promise((resolve) => {
      const [salt, key] = hash.split(":");
      if (!salt || !key) return resolve(false);
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) return resolve(false);
        resolve(crypto.timingSafeEqual(Buffer.from(key, "hex"), derivedKey));
      });
    });
  }
}
