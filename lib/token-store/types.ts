export type InstallationRecord = {
  key: string;
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  created_at: string | Date;
  updated_at: string | Date;
  metadata?: Record<string, unknown>;
};

export interface TokenStore {
  saveInstallation(installation: InstallationRecord): Promise<void>;
  getInstallation(key: string): Promise<InstallationRecord | null>;
  revokeInstallation(key: string): Promise<void>;
}
