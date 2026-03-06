import "server-only";

type AuditFields = Record<string, string | number | boolean | null | undefined>;

export function emitAuditEvent(event: string, fields: AuditFields = {}): void {
  const payload: Record<string, string | number | boolean | null> = {
    ts: new Date().toISOString(),
    event,
  };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      payload[key] = value;
    }
  }

  // Intentionally structured and minimal. Never include tokens or secrets.
  console.info(JSON.stringify(payload));
}
