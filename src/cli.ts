import { CopilotClient } from "@github/copilot-sdk";

function printUsage() {
  console.error('Usage: npm run ask -- "What is 2 + 2?"');
}

function printField(label: string, value: string) {
  console.log(`${label}: ${value}`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (command !== "ask" || args.length === 0) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const question = args.join(" ").trim();
  const client = new CopilotClient();
  let requestSent = false;

  try {
    await client.start();

    const [status, authStatus] = await Promise.all([
      client.getStatus(),
      client.getAuthStatus(),
    ]);

    printField(
      "Authentication status",
      authStatus.isAuthenticated ? "authenticated" : "unauthenticated",
    );
    printField("Authentication type", authStatus.authType ?? "unknown");
    printField("GitHub host", authStatus.host ?? "unknown");
    printField("GitHub login", authStatus.login ?? "unknown");
    printField("Authentication details", authStatus.statusMessage ?? "none");
    printField("Runtime version", status.version);
    printField("Protocol version", String(status.protocolVersion));
    printField("Request", question);

    const session = await client.createSession({});
    const startedAt = Date.now();

    requestSent = true;

    const response = await session.sendAndWait({ prompt: question });
    const latencyMs = Date.now() - startedAt;

    printField("Request sent", "yes");
    printField("Response received", response?.data.content ?? "(no content)");
    printField("Latency ms", String(latencyMs));
  } catch (error) {
    printField("Request sent", requestSent ? "yes" : "no");
    printField(
      "Response received",
      error instanceof Error ? `ERROR: ${error.message}` : `ERROR: ${String(error)}`,
    );
    process.exitCode = 1;
  } finally {
    const stopErrors = await client.stop();
    if (stopErrors.length > 0) {
      printField(
        "Shutdown warnings",
        stopErrors.map((error) => error.message).join(" | "),
      );
    }
  }
}

await main();
