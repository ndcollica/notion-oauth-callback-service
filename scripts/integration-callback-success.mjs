import { spawn } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;

const appPort = Number(
  process.env.APP_PORT ?? String(3300 + Math.floor(Math.random() * 2000))
);
const mockPort = Number(
  process.env.MOCK_OAUTH_PORT ?? String(6000 + Math.floor(Math.random() * 2000))
);
const baseUrl = `http://localhost:${appPort}`;
const tokenUrl = `http://localhost:${mockPort}/oauth/token`;
const installationKey = `itest-installation-${Date.now()}`;
const persistedKey = `installation:${installationKey}`;
const expectedToken = `itest-access-token-${Date.now()}`;
const connectionString = process.env.POSTGRES_URL;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const nextCliPath = path.resolve(__dirname, "../node_modules/next/dist/bin/next");

if (!connectionString) {
  console.error("Missing POSTGRES_URL.");
  process.exit(1);
}

let appProcess;
let mockServer;
let appOutput = "";

try {
  await ensureDatabaseReachable(connectionString);
  mockServer = await startMockTokenServer(mockPort);
  appProcess = await startAppProcess({
    appPort,
    tokenUrl,
    connectionString,
    installationKey,
    expectedToken,
  });
  await waitForHealth(`${baseUrl}/health`, appProcess);
  await runFlowAndAssertPersistence({
    baseUrl,
    connectionString,
    persistedKey,
    expectedToken,
  });
  console.log("Callback success integration check passed.");
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown error.";
  console.error(`Callback success integration check failed: ${message}`);
  process.exitCode = 1;
} finally {
  await shutdown(mockServer, appProcess);
}

async function ensureDatabaseReachable(postgresUrl) {
  const client = new Client({ connectionString: postgresUrl });
  try {
    await client.connect();
    await client.query("SELECT 1");
  } finally {
    await client.end().catch(() => undefined);
  }
}

function startMockTokenServer(port) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      if (req.method !== "POST" || req.url !== "/oauth/token") {
        res.statusCode = 404;
        res.end("not found");
        return;
      }

      const body = JSON.stringify({
        access_token: expectedToken,
        token_type: "bearer",
        scope: "read",
        installation_id: installationKey,
      });
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(body);
    });
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

async function startAppProcess({
  appPort: port,
  tokenUrl: oauthTokenUrl,
  connectionString: postgresUrl,
}) {
  const commonEnv = {
    ...process.env,
    OAUTH_CLIENT_ID: process.env.OAUTH_CLIENT_ID ?? "itest-client",
    OAUTH_CLIENT_SECRET: process.env.OAUTH_CLIENT_SECRET ?? "itest-secret",
    OAUTH_REDIRECT_URI:
      process.env.OAUTH_REDIRECT_URI ??
      `http://localhost:${port}/api/oauth/callback`,
    OAUTH_AUTHORIZATION_URL:
      process.env.OAUTH_AUTHORIZATION_URL ?? "https://example.test/oauth/authorize",
    OAUTH_TOKEN_URL: oauthTokenUrl,
    TOKEN_STORE_DRIVER: "postgres",
    POSTGRES_URL: postgresUrl,
  };

  await runCommand(
    process.execPath,
    [nextCliPath, "build"],
    commonEnv,
    "build"
  );

  const child = spawn(
    process.execPath,
    [nextCliPath, "start", "--port", String(port)],
    {
    env: commonEnv,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
    }
  );

  child.stdout.on("data", (chunk) => appendOutput(String(chunk)));
  child.stderr.on("data", (chunk) => appendOutput(String(chunk)));
  return child;
}

async function runCommand(command, args, env, label) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      output += String(chunk);
    });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }
      reject(new Error(`${label} command failed (exit ${code}). ${output}`));
    });
  });
}

async function waitForHealth(url, child) {
  const maxAttempts = 30;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(
        `App process exited early with code ${child.exitCode}. Output:\n${tailOutput()}`
      );
    }
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // retry
    }
    await sleep(500);
  }
  throw new Error(`Timed out waiting for app health endpoint. Output:\n${tailOutput()}`);
}

async function runFlowAndAssertPersistence({
  baseUrl: appBaseUrl,
  connectionString: postgresUrl,
  persistedKey: key,
  expectedToken: token,
}) {
  const startResponse = await fetch(`${appBaseUrl}/oauth/start`, {
    redirect: "manual",
  });
  if (startResponse.status < 300 || startResponse.status >= 400) {
    throw new Error("/oauth/start did not return a redirect.");
  }

  const startLocation = startResponse.headers.get("location");
  if (!startLocation) {
    throw new Error("/oauth/start missing redirect location.");
  }
  const startRedirect = new URL(startLocation);
  const state = startRedirect.searchParams.get("state");
  if (!state) {
    throw new Error("/oauth/start redirect missing state.");
  }

  const setCookie = startResponse.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("/oauth/start missing state cookie.");
  }
  const cookieHeader = setCookie.split(";")[0];

  const callbackUrl = new URL("/api/oauth/callback", appBaseUrl);
  callbackUrl.searchParams.set("code", "itest-code");
  callbackUrl.searchParams.set("state", state);

  const callbackResponse = await fetch(callbackUrl, {
    redirect: "manual",
    headers: {
      cookie: cookieHeader,
    },
  });
  if (callbackResponse.status < 300 || callbackResponse.status >= 400) {
    throw new Error(
      `/api/oauth/callback did not redirect on success (status ${callbackResponse.status}).`
    );
  }

  const client = new Client({ connectionString: postgresUrl });
  try {
    await client.connect();
    const result = await client.query(
      "SELECT key, access_token FROM oauth_installations WHERE key = $1",
      [key]
    );
    if (result.rowCount !== 1) {
      const debugRows = await client.query(
        "SELECT key FROM oauth_installations ORDER BY created_at DESC LIMIT 5"
      );
      throw new Error(
        `Expected one persisted installation record for key "${key}". ` +
          `Recent keys: ${debugRows.rows.map((r) => r.key).join(", ")}`
      );
    }
    if (result.rows[0].access_token !== token) {
      throw new Error("Persisted installation token did not match expected value.");
    }
  } finally {
    await client
      .query("DELETE FROM oauth_installations WHERE key = $1", [installationKey])
      .catch(() => undefined);
    await client
      .query("DELETE FROM oauth_installations WHERE key = $1", [key])
      .catch(() => undefined);
    await client.end().catch(() => undefined);
  }
}

async function shutdown(server, child) {
  if (child && !child.killed) {
    child.kill("SIGTERM");
  }
  if (server) {
    await new Promise((resolve) => {
      server.close(() => resolve(undefined));
    });
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function appendOutput(text) {
  appOutput += text;
  if (appOutput.length > 8000) {
    appOutput = appOutput.slice(-8000);
  }
}

function tailOutput() {
  return appOutput.trim() || "(no app output captured)";
}
