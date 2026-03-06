import "server-only";
import type { OAuthTokenResponse } from "@/lib/oauth";

export type InstallationKeySource =
  | "installation_id"
  | "workspace_id"
  | "generated";

export type InstallationKeyResult = {
  key: string;
  source: InstallationKeySource;
};

export type InstallationKeyMode =
  | "either"
  | "installation_id"
  | "workspace_id";

export function deriveInstallationKey(
  tokenResponse: OAuthTokenResponse,
  options?: {
    mode?: InstallationKeyMode;
    generateId?: () => string;
  }
): InstallationKeyResult {
  const mode = options?.mode ?? "either";
  const generateId = options?.generateId ?? (() => crypto.randomUUID());
  const installationId = readNonEmptyString(tokenResponse.installation_id);
  const workspaceId = readNonEmptyString(tokenResponse.workspace_id);

  if (mode === "installation_id") {
    if (!installationId) {
      throw new Error(
        "Token response missing required installation_id for OAUTH_INSTALLATION_KEY_MODE=installation_id."
      );
    }
    return {
      key: `installation:${installationId}`,
      source: "installation_id",
    };
  }

  if (mode === "workspace_id") {
    if (!workspaceId) {
      throw new Error(
        "Token response missing required workspace_id for OAUTH_INSTALLATION_KEY_MODE=workspace_id."
      );
    }
    return {
      key: `workspace:${workspaceId}`,
      source: "workspace_id",
    };
  }

  if (installationId) {
    return {
      key: `installation:${installationId}`,
      source: "installation_id",
    };
  }

  if (workspaceId) {
    return {
      key: `workspace:${workspaceId}`,
      source: "workspace_id",
    };
  }

  return {
    key: `generated:${generateId()}`,
    source: "generated",
  };
}

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
