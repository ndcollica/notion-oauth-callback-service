const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

async function main() {
  await checkProviderErrorPath();
  await checkStateMismatchPath();
  console.log("Callback smoke checks passed.");
}

async function checkProviderErrorPath() {
  const response = await fetch(
    new URL(
      "/api/oauth/callback?error=access_denied&error_description=denied",
      baseUrl
    ),
    { redirect: "manual" }
  );

  if (response.status !== 400) {
    throw new Error(
      `/api/oauth/callback error path returned ${response.status} (expected 400).`
    );
  }

  const body = await response.text();
  if (!body.includes("OAuth authorization failed.")) {
    throw new Error("Callback error path returned unexpected response body.");
  }
}

async function checkStateMismatchPath() {
  const response = await fetch(
    new URL("/api/oauth/callback?code=test_code&state=incorrect_state", baseUrl),
    { redirect: "manual" }
  );

  if (response.status !== 400) {
    throw new Error(
      `/api/oauth/callback state mismatch returned ${response.status} (expected 400).`
    );
  }

  const body = await response.text();
  if (!body.includes("Invalid OAuth state.")) {
    throw new Error("Callback state mismatch returned unexpected response body.");
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error.";
  console.error(`Callback smoke checks failed: ${message}`);
  process.exit(1);
});
