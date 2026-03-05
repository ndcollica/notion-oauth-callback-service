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

export function deriveInstallationKey(
  tokenResponse: OAuthTokenResponse,
  generateId: () => string = () => crypto.randomUUID()
): InstallationKeyResult {
  const installationId = readNonEmptyString(tokenResponse.installation_id);
  if (installationId) {
    return {
      key: `installation:${installationId}`,
      source: "installation_id",
    };
  }

  const workspaceId = readNonEmptyString(tokenResponse.workspace_id);
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
