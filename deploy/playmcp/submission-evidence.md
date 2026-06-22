# Submission Evidence Log

Canonical generated evidence is written to
`deploy/playmcp/evidence/submission-evidence.generated.md`.

Last reviewed state: PlayMCP temporary registration Online, Tools 2, review not
requested. Final review request and one-time preliminary submission remain
blocked until Jessie explicitly approves them.

## Local Verification

- `npm run check` result: PASS
- `npm run smoke:http` result: PASS
- `npm run smoke:dist` result: PASS
- `npm run smoke:docker` result: PASS
- `npm run preflight:release` result: PASS
- Local release summary JSON: `deploy/playmcp/evidence/local-release-summary.json`
- Docker runtime smoke evidence JSON: `deploy/playmcp/evidence/docker-runtime-smoke.json`
- `npm run package:deploy` result: PASS
- Deploy bundle: see generated evidence
- `npm run verify:bundle` result: PASS
- Bundle verification JSON: `deploy/playmcp/evidence/bundle-verify.json`

## Remote Verification

- Endpoint: `https://dongnesos-mcp.playmcp-endpoint.kakaocloud.io/mcp`
- Deployment id / revision: `playmcp-in-kc-363`
- `GET /healthz`: PASS
- MCP `tools/list`: `classify_civic_issue`, `draft_civic_report`
- MCP schema check: PASS
- MCP normal classify call: PASS
- MCP normal draft call: PASS
- MCP emergency classify call: PASS
- MCP emergency PII masking: requires fresh remote smoke after rebuild
- MCP emergency draft block: PASS
- Remote smoke evidence JSON: `deploy/playmcp/evidence/remote-smoke.json`

## PlayMCP UI

- Temporary registration status: PASS, Online, Tools 2
- Screenshot path: `deploy/playmcp/evidence/playmcp-temp-registration.png`
- Review request status: NOT_REQUESTED
- Preliminary submission timestamp: PENDING

## Owner Review

- Jessie reviewed: PENDING
- Required changes: PENDING
- Final submit approved: false
