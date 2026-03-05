import "server-only";
import type { InstallationRecord, TokenStore } from "@/lib/token-store/types";

export class InMemoryTokenStore implements TokenStore {
  private readonly installations = new Map<string, InstallationRecord>();

  async saveInstallation(installation: InstallationRecord): Promise<void> {
    const now = new Date().toISOString();
    const existing = this.installations.get(installation.key);

    this.installations.set(installation.key, {
      ...installation,
      created_at: existing?.created_at ?? installation.created_at ?? now,
      updated_at: now,
    });
  }

  async getInstallation(key: string): Promise<InstallationRecord | null> {
    const installation = this.installations.get(key);
    return installation ? { ...installation } : null;
  }

  async revokeInstallation(key: string): Promise<void> {
    this.installations.delete(key);
  }
}
