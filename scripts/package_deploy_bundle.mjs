import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

const outDir = process.env.DEPLOY_BUNDLE_DIR ?? "deploy/playmcp/package";
const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const bundleBase = process.env.DEPLOY_BUNDLE_NAME ?? `dongnesos-mcp-source-${timestamp}`;
const tarballPath = join(outDir, `${bundleBase}.tar.gz`);
const manifestPath = join(outDir, `${bundleBase}.manifest.json`);
const shaPath = join(outDir, `${bundleBase}.tar.gz.sha256`);

const alwaysInclude = new Set([
  ".dockerignore",
  ".gitignore",
  "DEMO_SCRIPT.md",
  "Dockerfile",
  "PLAYMCP_SUBMISSION.md",
  "README.md",
  "package-lock.json",
  "package.json",
  "tsconfig.json"
]);

const includePrefixes = [
  "data/",
  "deploy/playmcp/",
  "scripts/",
  "src/",
  "test/"
];

const excludedPrefixes = [
  "dist/",
  "node_modules/",
  "deploy/playmcp/evidence/",
  "deploy/playmcp/package/"
];

const excludedNames = new Set([".DS_Store"]);

function sha256(path) {
  const hash = createHash("sha256");
  hash.update(readFileSync(path));
  return hash.digest("hex");
}

function shouldInclude(path) {
  if (excludedNames.has(basename(path))) return false;
  if (path === ".env" || path.startsWith(".env.")) return false;
  if (excludedPrefixes.some((prefix) => path.startsWith(prefix))) return false;
  if (alwaysInclude.has(path)) return true;
  return includePrefixes.some((prefix) => path.startsWith(prefix));
}

function walk(dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const rel = relative(".", path);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      if (!excludedPrefixes.some((prefix) => `${rel}/`.startsWith(prefix))) {
        entries.push(...walk(path));
      }
    } else if (stats.isFile() && shouldInclude(rel)) {
      entries.push(rel);
    }
  }
  return entries;
}

const files = walk(".").sort();

const required = [
  "Dockerfile",
  "package.json",
  "package-lock.json",
  "src/server.ts",
  "src/schemas/toolSchemas.ts",
  "data/taxonomy.json",
  "scripts/preflight_release.mjs",
  "scripts/smoke_docker_runtime.mjs",
  "scripts/push_playmcp_image.mjs",
  "scripts/verify_deploy_bundle.mjs",
  "scripts/write_submission_evidence.mjs",
  "test/unit/taxonomy_coverage.test.ts",
  "deploy/playmcp/playmcp-in-kc-registration.md",
  "deploy/playmcp/owner-approval-packet.md"
];

for (const path of required) {
  assert.ok(files.includes(path), `bundle missing required file: ${path}`);
}

for (const path of files) {
  assert.equal(path.includes("node_modules/"), false, `bundle includes node_modules: ${path}`);
  assert.equal(path.startsWith("dist/"), false, `bundle includes dist: ${path}`);
  assert.equal(path.startsWith("deploy/playmcp/evidence/"), false, `bundle includes local evidence: ${path}`);
  assert.equal(path.startsWith("deploy/playmcp/package/"), false, `bundle includes previous package: ${path}`);
}

mkdirSync(outDir, { recursive: true });

const tarResult = spawnSync("tar", ["-czf", tarballPath, ...files], {
  encoding: "utf8",
  stdio: "pipe"
});

if (tarResult.error) {
  throw tarResult.error;
}
if (tarResult.status !== 0) {
  throw new Error(`tar failed with status ${tarResult.status}\n${tarResult.stderr}`);
}

const tarballSha = sha256(tarballPath);
const fileEntries = files.map((path) => ({
  path,
  bytes: statSync(path).size,
  sha256: sha256(path)
}));

const manifest = {
  created_at: new Date().toISOString(),
  bundle: tarballPath,
  bundle_sha256: tarballSha,
  file_count: files.length,
  excluded_prefixes: excludedPrefixes,
  excluded_names: [...excludedNames],
  required_files: required,
  verification_after_extract: [
    "npm ci",
    "npm run preflight:release"
  ],
  deployment_runtime: {
    dockerfile: "Dockerfile",
    playmcp_in_kc_required_container_platform: "linux/amd64",
    health_path: "/healthz",
    mcp_path: "/mcp",
    required_env: {
      HOST: "0.0.0.0",
      PORT: "provided by hosting platform"
    }
  },
  files: fileEntries
};

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(shaPath, `${tarballSha}  ${basename(tarballPath)}\n`);

console.log(`Deploy bundle written: ${tarballPath}`);
console.log(`Bundle manifest written: ${manifestPath}`);
console.log(`Bundle sha256 written: ${shaPath}`);
console.log(`Deploy bundle OK: ${files.length} files, sha256=${tarballSha}`);
