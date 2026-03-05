const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

async function main() {
  await checkHealth();
  await checkOAuthStart();
  console.log("Smoke checks passed.");
}

async function checkHealth() {
  const response = await fetch(new URL("/health", baseUrl), {
    redirect: "manual",
  });
  if (response.status !== 200) {
    throw new Error(`/health returned ${response.status} (expected 200).`);
  }

  const json = await response.json();
  if (json.status !== "ok") {
    throw new Error('/health JSON "status" is not "ok".');
  }
}

async function checkOAuthStart() {
  const response = await fetch(new URL("/oauth/start", baseUrl), {
    redirect: "manual",
  });

  if (response.status < 300 || response.status >= 400) {
    throw new Error(
      `/oauth/start returned ${response.status} (expected redirect status).`
    );
  }

  const location = response.headers.get("location");
  if (!location) {
    throw new Error("/oauth/start response missing Location header.");
  }

  const redirectUrl = new URL(location);
  if (!redirectUrl.searchParams.get("client_id")) {
    throw new Error("/oauth/start redirect missing client_id query param.");
  }
  if (!redirectUrl.searchParams.get("redirect_uri")) {
    throw new Error("/oauth/start redirect missing redirect_uri query param.");
  }
  if (!redirectUrl.searchParams.get("state")) {
    throw new Error("/oauth/start redirect missing state query param.");
  }

  const setCookie = response.headers.get("set-cookie");
  if (!setCookie || !setCookie.includes("oauth_state=")) {
    throw new Error("/oauth/start response missing oauth_state cookie.");
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error.";
  console.error(`Smoke checks failed: ${message}`);
  process.exit(1);
});
