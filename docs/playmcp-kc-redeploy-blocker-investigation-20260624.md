# PlayMCP in KC Redeploy Blocker Investigation

Date: 2026-06-24 16:57 KST

## Executive Brief

Current status: `BLOCKED BY PLATFORM/AUTH`, not blocked by DongneSOS code.

The correct flow remains:

1. Build the MCP runtime through `PlayMCP in KC` / KakaoCloud Git source build.
2. Let PlayMCP in KC produce a fresh managed endpoint.
3. Open the PlayMCP developer console and run `정보 불러오기`.
4. Run remote smoke, actual-use smoke, and output-review smoke against that
   endpoint.

That flow cannot continue right now because PlayMCP in KC still redirects
`/my-mcp` to `/dex/auth` and renders:

```text
Internal Server Error

Failed to retrieve connector list.
```

## Verified State

| Layer | Result | Evidence |
|---|---|---|
| Local source/tests | Pass | `npm run check` passed: data validation, policy scan, 68 tests, TypeScript build |
| Latest source metadata | Pass | `src/server.ts` has `annotations` for both MCP tools |
| Live v3 endpoint | Partially alive | `/healthz` returns `ok: true` with both tool names |
| Live v3 freshness | Fail | strict remote smoke fails: `classify_civic_issue annotations missing` |
| v4 Git source build | Platform fail | tests/build/image push passed, then KServe `InferenceService` webhook timed out |
| Current PlayMCP in KC console | Auth fail | `/my-mcp` redirects to `/dex/auth`; visible text says connector list retrieval failed |

## Root Cause Classification

### 1. v3 endpoint is alive but stale

The current endpoint is:

```text
https://dongnesos-mcp-v3.playmcp-endpoint.kakaocloud.io/mcp
```

Health check:

```json
{"ok":true,"service":"dongnesos-neighborhood-sos","version":"0.1.0","tools":["classify_civic_issue","draft_civic_report"]}
```

However, strict remote smoke on 2026-06-24 16:57 KST failed with:

```text
AssertionError [ERR_ASSERTION]: classify_civic_issue annotations missing
```

Interpretation: v3 is useful as a live availability proof, but it is not the
review-ready runtime because it was built before the tool annotation/output
hardening landed in Git.

Evidence:

- `deploy/playmcp/evidence/remote-smoke-v3-retry-20260624T1657KST.failure.json`
- `deploy/playmcp/evidence/remote-actual-use-p1-v3-20260623T140729Z.json`

### 2. v4 build reached KakaoCloud deploy infrastructure, then failed

New Git source build:

```text
name: dongnesos-mcp-v4
detail id: 567
build job: mcp-build-apply-567
git_url: https://github.com/kjessie00/dongnesos-mcp.git
git_ref: main
dockerfile: Dockerfile
```

The build log shows:

- Git clone succeeded.
- Repo tests passed: `# tests 68`, `# pass 68`, `# fail 0`.
- `npm run build` completed.
- `npm ci --omit=dev` completed with 0 vulnerabilities.
- Image push succeeded:

```text
ai-service.kr-central-2.kcr.dev/kc-playmcp-cr/user-img-dongnesos-mcp-v4@sha256:756fd6835575b34441462af8cc8ee7acbe62fd789d04b868a7b2ee189d02ab98
```

Then KakaoCloud failed while creating the serving resource:

```text
InferenceService 생성: Internal error occurred:
failed calling webhook "inferenceservice.kserve-webhook-server.defaulter":
failed to call webhook:
Post "https://kserve-webhook-server-service.kubeflow.svc:443/mutate-serving-kserve-io-v1beta1-inferenceservice?timeout=10s":
context deadline exceeded
```

Interpretation: this is after source build and image push. It points at the
KakaoCloud/Kubeflow/KServe admission/deploy control plane, not at application
logic in DongneSOS.

Evidence:

- `deploy/playmcp/evidence/playmcp-in-kc-v4-poll-20260624.json`
- `deploy/playmcp/evidence/playmcp-in-kc-v4-start-retry-20260624.json`

### 3. v4 cannot be restarted from `Failed`

The retry call for v4 start returned:

```text
시작할 수 없는 상태입니다.
```

Interpretation: this is expected product behavior for a failed deployment with
no endpoint URL. A fresh build is cleaner than trying to start this record.

### 4. Fresh v5 build is currently blocked by PlayMCP in KC auth

Fresh browser recheck at 2026-06-24 16:57 KST:

```text
requested: https://playmcp.kakaocloud.io/my-mcp
observed:  https://playmcp.kakaocloud.io/dex/auth?...
visible:   Internal Server Error / Failed to retrieve connector list.
```

Earlier API evidence also showed:

```text
401 인증되지 않았습니다. 로그인이 필요합니다.
503 Authentication service unavailable
```

Interpretation: the current blocker is the PlayMCP in KC authentication layer.
Because the console cannot reach the authenticated server list, we cannot safely
delete failed v4, create v5, or refresh PlayMCP registration metadata.

Evidence:

- `deploy/playmcp/evidence/playmcp-auth-outage-recheck-20260624.json`
- `deploy/playmcp/evidence/playmcp-auth-outage-recheck-20260624T1657KST.json`
- `deploy/playmcp/evidence/playmcp-in-kc-auth-profiles-recheck-20260624.json`
- `deploy/playmcp/evidence/playmcp-in-kc-v5-quick-retry-20260624.json`

## Official/Primary Source Interpretation

- PlayMCP's official agent-readable index describes PlayMCP as Kakao's MCP tool
  integration platform and playground. Developers register MCP servers through
  the developer console, and users can test/use MCP tools through Toolbox,
  AI Chat, and the MCP gateway.
  Source: https://playmcp.kakao.com/llms.txt
- KakaoCloud's own ML serving documentation describes KServe as a
  Kubernetes-based serverless inference project and says deployment creates an
  `InferenceService` resource in the cluster.
  Source: https://docs.kakaocloud.com/en/tutorial/machine-learning-ai/traffic-prediction-model-serving
- KServe's official documentation uses `InferenceService` as the deployed model
  serving object and checks readiness/URL from that resource.
  Source: https://kserve.github.io/website/docs/getting-started/predictive-first-isvc
- A KServe upstream issue documents the same failure class:
  `failed calling webhook "inferenceservice.kserve-webhook-server.defaulter" ...
  context deadline exceeded`, with controller/cache/certificate/service
  readiness symptoms.
  Source: https://github.com/kserve/kserve/issues/2312
- Dex is an identity broker that uses configured connectors for upstream OIDC
  authentication. A `/dex/auth` failure while retrieving connector list is
  therefore consistent with an auth/connector-service failure before user
  console access, not with DongneSOS MCP code.
  Source: https://dexidp.io/docs/connectors/oidc/

## Correct Retry Procedure After Recovery

Proceed only when `https://playmcp.kakaocloud.io/my-mcp` reaches the authenticated
server list instead of `/dex/auth`.

1. Confirm PlayMCP in KC server list is visible.
2. If the failed `dongnesos-mcp-v4` / id `567` still blocks a server slot,
   delete only that failed server.
3. Create a new Git source build:

```text
name: dongnesos-mcp-v5
git_url: https://github.com/kjessie00/dongnesos-mcp.git
git_ref: main
dockerfile: Dockerfile
category: work
description: 동네 생활 불편을 안전하게 분류하고 민원 신고 준비문을 작성하는 MCP 서버입니다.
```

4. Poll until the new server status is `Active` and capture endpoint URL plus
   image digest.
5. Run health:

```bash
curl -sS https://dongnesos-mcp-v5.playmcp-endpoint.kakaocloud.io/healthz
```

6. Run strict smoke:

```bash
MCP_URL=https://dongnesos-mcp-v5.playmcp-endpoint.kakaocloud.io/mcp \
EVIDENCE_OUT=deploy/playmcp/evidence/remote-smoke-v5-final-20260624.json \
npm run smoke:endpoint
```

7. Run actual-use smoke:

```bash
MCP_URL=https://dongnesos-mcp-v5.playmcp-endpoint.kakaocloud.io/mcp \
COMMIT_EXPECTED=$(git rev-parse --short HEAD) \
EVIDENCE_OUT=deploy/playmcp/evidence/remote-actual-use-v5-final-20260624.json \
npm run smoke:actual-use:endpoint
```

8. Run output review:

```bash
MCP_URL=https://dongnesos-mcp-v5.playmcp-endpoint.kakaocloud.io/mcp \
EVIDENCE_OUT=deploy/playmcp/evidence/remote-actual-output-review-v5-final-20260624.json \
MARKDOWN_OUT=deploy/playmcp/evidence/remote-actual-output-review-v5-final-20260624.md \
npm run review:actual-output:endpoint
```

9. In the PlayMCP developer console registration for `동네SOS` / `dongnesos`,
   update the endpoint if it changed and run `정보 불러오기`.
10. Do not request review, make the server public, or submit the contest entry
    until the three remote checks above pass.

## Support Escalation Packet

Use this if asking KakaoCloud/PlayMCP support or the Discord channel.

```text
Project: DongneSOS / dongnesos-mcp
Git repo: https://github.com/kjessie00/dongnesos-mcp
Region/registry shown in logs: ai-service.kr-central-2.kcr.dev/kc-playmcp-cr
Active old endpoint: https://dongnesos-mcp-v3.playmcp-endpoint.kakaocloud.io/mcp
Active old detail id: 487
Failed new server: dongnesos-mcp-v4
Failed detail id: 567
Build job: mcp-build-apply-567
Pushed image digest: ai-service.kr-central-2.kcr.dev/kc-playmcp-cr/user-img-dongnesos-mcp-v4@sha256:756fd6835575b34441462af8cc8ee7acbe62fd789d04b868a7b2ee189d02ab98
Failure point: after tests/build/image push, while creating KServe InferenceService
Exact error:
failed calling webhook "inferenceservice.kserve-webhook-server.defaulter":
failed to call webhook:
Post "https://kserve-webhook-server-service.kubeflow.svc:443/mutate-serving-kserve-io-v1beta1-inferenceservice?timeout=10s":
context deadline exceeded

Current console/auth error:
https://playmcp.kakaocloud.io/my-mcp redirects to /dex/auth and displays
"Internal Server Error / Failed to retrieve connector list."
API evidence also showed 401 authentication required and 503 Authentication service unavailable.

Impact:
Cannot delete failed v4, cannot create a fresh Git source build, cannot refresh
PlayMCP developer-console tool information, and cannot produce final remote smoke evidence.
```

## Stop Rules

- Do not claim review readiness from v3. It is online but stale.
- Do not patch DongneSOS code to work around a KakaoCloud KServe webhook timeout.
- Do not inspect or export cookies/tokens/localStorage to bypass the auth error.
- Do not use DockerHub as a detour unless KakaoCloud Git source builds remain
  broken after auth is restored and source-build-specific failure is proven.
- Do not request PlayMCP review/publication/final contest submission before
  fresh remote smoke, actual-use smoke, and output-review smoke pass.

## Team Review

MiniMax-M3 independently reviewed the evidence and reached the same conclusion:
`PLATFORM BLOCKED`, no repo-code patch required now. The review is saved at:

```text
.agent/review/MINIMAX_PLAYMCP_KC_BLOCKER_VERDICT_20260624.md
```
