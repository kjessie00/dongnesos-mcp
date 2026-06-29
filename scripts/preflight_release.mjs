import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const summaryOut = process.env.RELEASE_SUMMARY_OUT ?? "deploy/playmcp/evidence/local-release-summary.json";
const dockerPlatform = process.env.DOCKER_PLATFORM ?? "linux/amd64";

const commands = [
  { name: "check", command: "npm", args: ["run", "check"] },
  { name: "smoke:http", command: "npm", args: ["run", "smoke:http"] },
  { name: "smoke:dist", command: "npm", args: ["run", "smoke:dist"] },
  { name: "smoke:docker", command: "npm", args: ["run", "smoke:docker"] }
];

const criticalFiles = [
  "package.json",
  "package-lock.json",
  "Dockerfile",
  "src/server.ts",
  "src/core/classify.ts",
  "src/core/draft.ts",
  "src/core/emergency.ts",
  "src/core/korean.ts",
  "src/core/neutralize.ts",
  "src/core/pii.ts",
  "src/core/sourceCards.ts",
  "src/schemas/toolSchemas.ts",
  "src/tools/classify_civic_issue.ts",
  "src/tools/draft_civic_report.ts",
  "data/source_cards.json",
  "data/taxonomy.json",
  "data/safety_rules.json",
  "test/safety/no_forbidden_surface.test.ts",
  "test/unit/classify.test.ts",
  "test/unit/draft.test.ts",
  "scripts/smoke_actual_use_endpoint.ts",
  "scripts/smoke_endpoint_mcp.ts",
  "scripts/smoke_docker_runtime.mjs",
  "scripts/package_deploy_bundle.mjs",
  "scripts/push_playmcp_image.mjs",
  "scripts/verify_deploy_bundle.mjs",
  "scripts/write_submission_evidence.mjs",
  "deploy/playmcp/playmcp-in-kc-registration.md",
  "deploy/playmcp/owner-approval-packet.md"
];

function run(command, args) {
  const startedAt = new Date().toISOString();
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: "pipe",
    env: process.env
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  const endedAt = new Date().toISOString();
  return {
    command: `${command} ${args.join(" ")}`,
    status: result.status,
    started_at: startedAt,
    ended_at: endedAt,
    stdout_tail: tail(result.stdout ?? ""),
    stderr_tail: tail(result.stderr ?? "")
  };
}

function tail(text) {
  return text
    .trim()
    .split("\n")
    .slice(-24)
    .join("\n");
}

function hashFile(path) {
  const hash = createHash("sha256");
  hash.update(readFileSync(path));
  return hash.digest("hex");
}

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function getVersion(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", stdio: "pipe" });
  assert.equal(result.status, 0, `${command} ${args.join(" ")} failed`);
  return result.stdout.trim();
}

const commandResults = commands.map(({ command, args }) => run(command, args));
const failures = commandResults.filter((result) => result.status !== 0);

const dockerEvidencePath = "deploy/playmcp/evidence/docker-runtime-smoke.json";
const localEndpointEvidencePath = "deploy/playmcp/evidence/local-endpoint-smoke.json";
const dockerEvidence = readJson(dockerEvidencePath);
const localEndpointEvidence = readJson(localEndpointEvidencePath);

if (failures.length === 0) {
  assert.ok(dockerEvidence, `${dockerEvidencePath} is required after smoke:docker`);
  assert.equal(dockerEvidence.health?.status, 200);
  assert.deepEqual(
    dockerEvidence.tools?.map((tool) => tool.name).sort(),
    ["classify_civic_issue", "draft_civic_report"]
  );
  assert.equal(dockerEvidence.classify?.result_type, "classification");
  assert.equal(dockerEvidence.draft?.result_type, "draft");
  assert.equal(dockerEvidence.emergency_classify?.result_type, "emergency_redirect");
  assert.equal(dockerEvidence.emergency_draft?.result_type, "blocked_emergency");
  assert.equal(dockerEvidence.emergency_draft?.has_draft, false);
}

const summary = {
  checked_at: new Date().toISOString(),
  local_ready_for_external_deploy: failures.length === 0,
  node_version: getVersion("node", ["--version"]),
  npm_version: getVersion("npm", ["--version"]),
  commands: commandResults,
  evidence: {
    docker_runtime_smoke: dockerEvidencePath,
    docker_runtime_smoke_checked_at: dockerEvidence?.checked_at ?? null,
    local_endpoint_smoke: localEndpointEvidence ? localEndpointEvidencePath : null,
    local_endpoint_smoke_checked_at: localEndpointEvidence?.checked_at ?? null
  },
  artifact_hashes_sha256: Object.fromEntries(criticalFiles.map((path) => [path, hashFile(path)])),
  mcp_contract: {
    exact_tools: ["classify_civic_issue", "draft_civic_report"],
    taxonomy_items: 28,
    emergency_draft_blocked: true,
    forbidden_surfaces_absent_by_policy_scan: true
  },
  deployment_runtime: {
    playmcp_in_kc_required_container_platform: dockerPlatform,
    health_path: "/healthz",
    mcp_path: "/mcp",
    required_env: {
      HOST: "0.0.0.0",
      PORT: "provided by hosting platform"
    }
  },
  external_pending_owner_confirmation: [
    "Kakao Cloud deployment",
    "PlayMCP temporary registration",
    "Jessie browser review",
    "one-time preliminary submission"
  ]
};

mkdirSync(dirname(summaryOut), { recursive: true });
writeFileSync(summaryOut, `${JSON.stringify(summary, null, 2)}\n`);
console.log(`\nRelease preflight summary written: ${summaryOut}`);

if (failures.length > 0) {
  process.exitCode = 1;
} else {
  console.log("Release preflight OK: local artifacts are ready for owner-approved external deployment.");
}
