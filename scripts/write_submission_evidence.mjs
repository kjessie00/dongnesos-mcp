import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const outPath = process.env.SUBMISSION_EVIDENCE_OUT ?? "deploy/playmcp/evidence/submission-evidence.generated.md";
const localSummaryPath = process.env.LOCAL_RELEASE_SUMMARY ?? "deploy/playmcp/evidence/local-release-summary.json";
const dockerSmokePath = process.env.DOCKER_SMOKE_EVIDENCE ?? "deploy/playmcp/evidence/docker-runtime-smoke.json";
const remoteSmokePath = process.env.REMOTE_SMOKE_EVIDENCE ?? "deploy/playmcp/evidence/remote-smoke.json";
const imagePushPath = process.env.IMAGE_PUSH_EVIDENCE ?? "deploy/playmcp/evidence/image-push.json";

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function statusLabel(status) {
  if (status === 0) return "PASS";
  if (status === undefined || status === null) return "PENDING";
  return `FAIL (${status})`;
}

function boolLabel(value) {
  if (value === true) return "PASS";
  if (value === false) return "FAIL";
  return "PENDING";
}

function envOrPending(name) {
  return process.env[name]?.trim() || "PENDING";
}

function commandStatus(summary, name) {
  return summary?.commands?.find((command) => command.command === name)?.status;
}

function toolNames(smoke) {
  return smoke?.tools?.map((tool) => tool.name).sort().join(", ") || "PENDING";
}

function schemasStatus(smoke) {
  if (!smoke?.tools?.length) return "PENDING";
  return smoke.tools.every((tool) => tool.has_input_schema && tool.has_output_schema) ? "PASS" : "FAIL";
}

function remoteEndpointStatus(smoke) {
  if (!smoke) return "PENDING";
  const corePass =
    smoke.health?.status === 200 &&
    smoke.health?.body?.ok === true &&
    schemasStatus(smoke) === "PASS" &&
    smoke.classify?.result_type === "classification" &&
    smoke.draft?.result_type === "draft" &&
    smoke.emergency_classify?.result_type === "emergency_redirect" &&
    smoke.emergency_draft?.result_type === "blocked_emergency" &&
    smoke.emergency_draft?.has_draft === false;
  if (!corePass) return "FAIL";
  return smoke.emergency_classify?.pii_masked === true ? "PASS" : "PENDING";
}

function packageEvidence() {
  const latest = latestBundle();
  return {
    tarball: process.env.DEPLOY_BUNDLE_TARBALL?.trim() || latest.tarball || "PENDING",
    manifest: process.env.DEPLOY_BUNDLE_MANIFEST?.trim() || latest.manifest || "PENDING",
    sha256: process.env.DEPLOY_BUNDLE_SHA256?.trim() || latest.sha256 || "PENDING"
  };
}

function latestBundle() {
  const packageDir = "deploy/playmcp/package";
  if (!existsSync(packageDir)) return {};
  const manifests = readdirSync(packageDir)
    .filter((name) => name.endsWith(".manifest.json"))
    .sort();
  const manifestName = manifests.at(-1);
  if (!manifestName) return {};

  const manifest = readJson(join(packageDir, manifestName));
  const tarball = manifest?.bundle ?? join(packageDir, manifestName.replace(/\.manifest\.json$/, ".tar.gz"));
  const shaPath = `${tarball}.sha256`;
  let sha256 = manifest?.bundle_sha256;
  if (existsSync(shaPath)) {
    sha256 = readFileSync(shaPath, "utf8").trim().split(/\s+/)[0];
  }

  return {
    tarball,
    manifest: join(packageDir, basename(manifestName)),
    sha256
  };
}

const localSummary = readJson(localSummaryPath);
const dockerSmoke = readJson(dockerSmokePath);
const remoteSmoke = readJson(remoteSmokePath);
const imagePush = readJson(imagePushPath);
const bundle = packageEvidence();

const lines = [
  "# Submission Evidence Log",
  "",
  `Generated at: ${new Date().toISOString()}`,
  "",
  "## Local Verification",
  "",
  `- Date/time UTC: ${localSummary?.checked_at ?? "PENDING"}`,
  `- Node version: ${localSummary?.node_version ?? "PENDING"}`,
  `- npm version: ${localSummary?.npm_version ?? "PENDING"}`,
  `- \`npm run check\` result: ${statusLabel(commandStatus(localSummary, "npm run check"))}`,
  `- \`npm run smoke:http\` result: ${statusLabel(commandStatus(localSummary, "npm run smoke:http"))}`,
  `- \`npm run smoke:dist\` result: ${statusLabel(commandStatus(localSummary, "npm run smoke:dist"))}`,
  `- \`npm run smoke:docker\` result: ${statusLabel(commandStatus(localSummary, "npm run smoke:docker"))}`,
  `- \`npm run preflight:release\` result: ${boolLabel(localSummary?.local_ready_for_external_deploy)}`,
  `- Local release summary JSON: ${existsSync(localSummaryPath) ? localSummaryPath : "PENDING"}`,
  `- Docker runtime smoke evidence JSON: ${existsSync(dockerSmokePath) ? dockerSmokePath : "PENDING"}`,
  `- Docker runtime image/platform: ${dockerSmoke?.docker_runtime?.image ?? "PENDING"} / ${dockerSmoke?.docker_runtime?.platform ?? "PENDING"}`,
  `- PlayMCP image push evidence JSON: ${existsSync(imagePushPath) ? imagePushPath : "PENDING"}`,
  `- PlayMCP image target: ${imagePush?.target_image ?? "PENDING"}`,
  `- PlayMCP image push state: ${imagePush ? (imagePush.pushed ? "PUSHED" : "DRY_RUN_ONLY") : "PENDING"}`,
  `- Docker runtime \`/healthz\`: ${dockerSmoke?.health?.status === 200 && dockerSmoke?.health?.body?.ok === true ? "PASS" : "PENDING"}`,
  `- Docker runtime tools: ${toolNames(dockerSmoke)}`,
  `- Docker runtime schemas: ${schemasStatus(dockerSmoke)}`,
  `- Docker normal classify: ${dockerSmoke?.classify?.result_type ?? "PENDING"} / ${dockerSmoke?.classify?.issue_code ?? "PENDING"}`,
  `- Docker normal draft: ${dockerSmoke?.draft?.result_type ?? "PENDING"} / copy=${dockerSmoke?.draft?.has_copy_block ?? "PENDING"}`,
  `- Docker emergency draft block: ${dockerSmoke?.emergency_draft?.result_type ?? "PENDING"} / has_draft=${dockerSmoke?.emergency_draft?.has_draft ?? "PENDING"}`,
  `- \`npm run package:deploy\` result: ${bundle.tarball === "PENDING" ? "PENDING" : "PASS"}`,
  `- Deploy bundle tarball: ${bundle.tarball}`,
  `- Deploy bundle manifest: ${bundle.manifest}`,
  `- Deploy bundle sha256: ${bundle.sha256}`,
  "",
  "## Remote Verification",
  "",
  `- Endpoint: ${process.env.DEPLOYED_ENDPOINT_URL ?? remoteSmoke?.mcp_url ?? "PENDING"}`,
  `- Deployment id / revision: ${envOrPending("DEPLOYMENT_ID")}`,
  `- \`GET /healthz\`: ${remoteSmoke?.health?.status === 200 && remoteSmoke?.health?.body?.ok === true ? "PASS" : "PENDING"}`,
  `- MCP \`tools/list\`: ${toolNames(remoteSmoke)}`,
  `- MCP schema check: ${schemasStatus(remoteSmoke)}`,
  `- MCP normal classify call: ${remoteSmoke?.classify?.result_type ?? "PENDING"} / ${remoteSmoke?.classify?.issue_code ?? "PENDING"}`,
  `- MCP normal draft call: ${remoteSmoke?.draft?.result_type ?? "PENDING"} / copy=${remoteSmoke?.draft?.has_copy_block ?? "PENDING"}`,
  `- MCP emergency classify call: ${remoteSmoke?.emergency_classify?.result_type ?? "PENDING"} / ${remoteSmoke?.emergency_classify?.issue_code ?? "PENDING"}`,
  `- MCP emergency PII masking: ${remoteSmoke?.emergency_classify?.pii_masked === true ? "PASS" : "PENDING"}`,
  `- MCP emergency draft block: ${remoteSmoke?.emergency_draft?.result_type ?? "PENDING"} / has_draft=${remoteSmoke?.emergency_draft?.has_draft ?? "PENDING"}`,
  `- Remote smoke evidence JSON: ${existsSync(remoteSmokePath) ? remoteSmokePath : "PENDING"}`,
  "",
  "## PlayMCP UI",
  "",
  `- Temporary registration status: ${envOrPending("PLAYMCP_TEMP_REGISTRATION_STATUS")}`,
  `- Screenshot path: ${envOrPending("PLAYMCP_SCREENSHOT_PATH")}`,
  `- Review request status: ${envOrPending("PLAYMCP_REVIEW_REQUEST_STATUS")}`,
  `- Preliminary submission timestamp: ${envOrPending("PLAYMCP_PRELIMINARY_SUBMISSION_TIMESTAMP")}`,
  "",
  "## Owner Review",
  "",
  `- Jessie reviewed: ${envOrPending("JESSIE_REVIEWED")}`,
  `- Required changes: ${envOrPending("JESSIE_REQUIRED_CHANGES")}`,
  `- Final submit approved: ${envOrPending("JESSIE_FINAL_SUBMIT_APPROVED")}`,
  "",
  "## Stop Rule State",
  "",
  `- Local ready for external deployment: ${boolLabel(localSummary?.local_ready_for_external_deploy)}`,
  `- Remote endpoint verified: ${remoteEndpointStatus(remoteSmoke)}`,
  `- PlayMCP registration verified: ${process.env.PLAYMCP_TEMP_REGISTRATION_STATUS ? "RECORDED" : "PENDING"}`,
  `- Final submission approved: ${process.env.JESSIE_FINAL_SUBMIT_APPROVED === "true" ? "PASS" : "PENDING"}`
];

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${lines.join("\n")}\n`);
console.log(`Submission evidence written: ${outPath}`);
