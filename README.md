# DongneSOS MCP

`동네SOS / 이거 어디에 말해?` PlayMCP candidate implementation.

This server helps a user prepare a civic inconvenience report without doing the
reporting for them. It classifies a Korean neighborhood issue, explains what
evidence to prepare, and drafts a neutral copy/paste report. It never submits a
report, logs in, reads KakaoTalk, collects precise location, uploads photos, or
calls external government APIs.

DongneSOS is not meant to replace search by summarizing web pages. Its service
value is that it turns a messy local problem into an action package: official
type, likely channel family, evidence checklist, privacy-safe official/public
text split, neutral wording, and next action. Search gives pages; DongneSOS
gives the next safe action.

## MCP Tools

- `classify_civic_issue`: classifies the issue into the fixed 28-item taxonomy,
  routes it to a channel family, and returns the canonical Pro Chat output
  fields: `result_type`, `priority`, `routing`, `draft_policy`, and `errors`.
- `draft_civic_report`: creates a neutral report preparation draft for
  non-emergency cases only.

The server intentionally exposes exactly those two tools. Both tools declare
MCP `inputSchema` and `outputSchema`; the HTTP smoke verifies those schemas are
visible in `tools/list`.

## Safety Boundaries

- Emergency or immediate-danger inputs return `emergency_redirect` or
  `blocked_emergency`; draft generation is blocked.
- PII-like text is masked before draft output.
- Defamation, punishment demands, and legal certainty phrases are neutralized.
- Channel routing is advisory. Users must verify the real local government
  channel before submitting.
- `presentation_mock` is a lightweight ChatGPT card shape, not a dependency on
  Kakao Widget APIs.

## Local Run

```bash
npm install
npm run check
npm run smoke:http
npm run smoke:dist
npm run dev -- --host 127.0.0.1 --port 3000
```

After `npm run build`, production start uses:

```bash
npm start
```

Container build:

```bash
docker build -t dongnesos-mcp .
docker run --rm -p 3000:3000 dongnesos-mcp
```

PlayMCP in KC image builds require `linux/amd64`, including on Apple Silicon:

```bash
npm run image:build:amd64
npm run image:push:playmcp
```

`npm run image:push:playmcp` is a dry-run by default. It only pushes after
external image publication is approved and the command is run with
`DRY_RUN=0 CONFIRM_EXTERNAL_IMAGE_PUSH=1`.

Container release smoke:

```bash
npm run smoke:docker
npm run preflight:release
npm run package:deploy
npm run verify:bundle
npm run evidence:submission
```

Endpoints:

- `GET /healthz`
- `POST /mcp`

## Verification

```bash
npm run validate:data
npm run scan:policy
npm test
npm run build
npm run smoke:http
npm run smoke:dist
npm run smoke:docker
npm run preflight:release
npm run package:deploy
npm run verify:bundle
npm run evidence:submission
```

After deployment, verify the public endpoint and write review evidence:

```bash
MCP_URL=https://<kakao-cloud-endpoint>/mcp \
EVIDENCE_OUT=deploy/playmcp/evidence/remote-smoke.json \
npm run smoke:endpoint
```

The current acceptance target is at least 61 passing tests plus the HTTP MCP
smoke covering `tools/list` schemas, `classify_civic_issue`, and
`draft_civic_report`.

For the review narrative and sample cases, see `DEMO_SCRIPT.md`.

For actual-use verification steps and the future `이웃 도움 교류` expansion
design, see `docs/actual-use-and-neighbor-help-design.md`.

For the product differentiation against ordinary search, see
`docs/search-vs-dongnesos-service-value-20260625.md`.

For owner approval and external deployment stop rules, see
`deploy/playmcp/owner-approval-packet.md`.

For the contest path, deploy through PlayMCP in KC first, copy its Endpoint
URL, then temporarily register that endpoint in the PlayMCP developer console.
See `deploy/playmcp/playmcp-in-kc-registration.md` for the exact field mapping.

For a clean source bundle that excludes `node_modules`, `dist`, and local
evidence files, run `npm run package:deploy` and use the tarball under
`deploy/playmcp/package/`.

To prove the latest tarball works from a clean extraction, run
`npm run verify:bundle`.

After local or remote smoke runs, `npm run evidence:submission` writes a
review-ready evidence draft to
`deploy/playmcp/evidence/submission-evidence.generated.md`.
