# my-copilot-sdk-app-poc

Smallest possible proof of concept for validating whether a local Node.js application can talk to GitHub Copilot through the GitHub Copilot SDK without asking the user for a separate API key in application code.

## Source code

- CLI entrypoint: `/home/runner/work/my-copilot-sdk-app-poc/my-copilot-sdk-app-poc/src/cli.ts`

## What this does

Implements a single command:

```bash
npm run ask -- "What is 2 + 2?"
```

The command prints:

- authentication status
- authentication type
- GitHub host
- GitHub login if available
- runtime version
- request sent
- response received
- latency

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the proof of concept:

   ```bash
   npm run ask -- "What is 2 + 2?"
   ```

## Authentication behavior

The Node.js SDK uses the bundled Copilot runtime by default, so a separate `copilot` binary is not required for this proof of concept.

The SDK supports these authentication paths:

1. **Signed-in user credentials**
   - Default behavior for `new CopilotClient()`
   - Reuses credentials stored by prior interactive GitHub Copilot sign-in
   - GitHub documents this as the SDK using stored credentials from the signed-in user

2. **Environment-provided token**
   - Automatically detected by the SDK
   - Supported variable names are `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, and `GITHUB_TOKEN`

3. **Explicit OAuth token**
   - Can be passed to `new CopilotClient({ gitHubToken, useLoggedInUser: false })`

### Answers to the authentication questions

- **Is the CLI authentication reused?**
  - **Supported by the SDK:** yes, by default, for a signed-in interactive user.
  - **Observed in this validation environment:** no. The runtime reported `authType: token`, not `gh-cli`.

- **Is a separate authentication step required?**
  - Not if usable credentials already exist.
  - Yes, if neither stored user credentials nor a valid token are already available.

- **Is OAuth reused?**
  - Yes. GitHub documents that the signed-in user flow uses stored GitHub OAuth credentials.

- **Where are credentials obtained from?**
  - Either previously stored signed-in user credentials or automatically detected tokens.
  - In this validation environment, authentication behaved like a pre-existing token-based context rather than CLI-stored user auth.

- **Can the SDK run without additional login?**
  - Yes, when an existing auth context is already available.
  - No, when no stored credentials or valid token are present.

## Validation report

### Validation Result

**PASS**

The proof of concept successfully started, authenticated without asking for a separate API key in application code, sent a prompt, and printed a response.

### Environment

- Operating System: Linux `6.17.0-1022-azure`
- Node version: `v22.23.2`
- NPM package version: `@github/copilot-sdk@1.0.14`
- Bundled runtime version observed at execution: `1.0.85`

### Authentication Findings

- The application used `new CopilotClient()` with no explicit token in source code.
- The SDK authenticated successfully and reported:
  - `isAuthenticated: true`
  - `authType: token`
  - `host: https://github.com`
- A separate shell check showed:
  - `copilot` was not installed on `PATH`
  - `gh auth status` reported no logged-in GitHub CLI user
- An additional probe with `useLoggedInUser: false` still authenticated successfully, which indicates this environment was not depending on CLI-stored signed-in-user credentials for the successful request.
- Therefore:
  - **CLI auth reuse is supported by the SDK according to GitHub documentation**
  - **CLI auth reuse was not the mechanism observed in this sandbox run**

### Execution Findings

- Was a request successfully executed? **Yes**
- Was a response returned? **Yes**
- Latency observation: roughly **1-2 seconds** for the sample prompt in this environment

Execution log:

```text
> my-copilot-sdk-app-poc@1.0.0 ask
> npm run build --silent && node dist/cli.js ask What is 2 + 2?

Authentication status: authenticated
Authentication type: token
GitHub host: https://github.com
GitHub login: unknown
Authentication details: https://github.com (via token)
Runtime version: 1.0.85
Protocol version: 3
Request: What is 2 + 2?
Request sent: yes
Response received: 2 + 2 = 4
Latency ms: 1437
```

Additional authentication probe:

```text
new CopilotClient({ useLoggedInUser: false }) => {"isAuthenticated":true,"authType":"token","host":"https://github.com","statusMessage":"https://github.com (via token)"}
```

### Architecture Findings

Can this SDK realistically be used as the implementation behind the provider adapter in this architecture?

```text
Workflow Engine
        |
        v
Capability Layer
        |
        v
Provider Adapter
        |
        v
GitHub Copilot SDK
```

**Yes**, for the communication boundary.

Why:

- The SDK provides a clean programmatic request/response surface.
- Authentication can remain inside the provider adapter.
- Workflow orchestration can stay outside the SDK.
- The runtime and provider details can be hidden behind a narrow adapter contract.

Constraints:

- Authentication mode is environment-dependent.
- Local interactive use is straightforward, but multi-user/server scenarios need explicit token management.
- The SDK is still coupled to the Copilot runtime lifecycle and session model.

### Assessment

**Recommendation: Viable but limited**

Rationale:

- Strong fit for a local or single-user provider adapter
- Good fit for validating transport, auth, and prompt execution
- Less ideal as a universal provider abstraction unless you explicitly own auth, session lifecycle, and deployment constraints

## Final answer

**Yes** — GitHub Copilot SDK can serve as the communication mechanism between a programmatic execution layer and an agentic execution layer while keeping workflow orchestration independent from the provider implementation.

However, the clean separation works best when:

- the workflow engine talks only to a provider adapter interface
- the adapter owns Copilot SDK client/session lifecycle
- authentication strategy is treated as a deployment concern

For local and single-user execution, this is a practical approach. For broader production use, it remains viable but requires deliberate handling of auth source, session ownership, and runtime hosting.
