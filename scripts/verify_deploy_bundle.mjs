import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

const packageDir = process.env.DEPLOY_BUNDLE_DIR ?? "deploy/playmcp/package";
const evidenceOut = process.env.BUNDLE_VERIFY_OUT ?? "deploy/playmcp/evidence/bundle-verify.json";

function run(command, args, options = {}) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    encoding: "utf8",
    stdio: options.stdio ?? "pipe"
  });
  if (result.error) throw result.error;
  const endedAt = new Date().toISOString();
  const record = {
    command: `${command} ${args.join(" ")}`,
    cwd: options.cwd ?? process.cwd(),
    status: result.status,
    started_at: startedAt,
    ended_at: endedAt,
    stdout_tail: tail(result.stdout ?? ""),
    stderr_tail: tail(result.stderr ?? "")
  };
  if (options.stdio === "inherit") {
    return record;
  }
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return record;
}

function tail(text) {
  return text
    .trim()
    .split("\n")
    .slice(-20)
    .join("\n");
}

function latestBundle() {
  assert.ok(existsSync(packageDir), `package directory missing: ${packageDir}`);
  const names = readdirSync(packageDir)
    .filter((name) => name.endsWith(".tar.gz"))
    .sort();
  assert.ok(names.length > 0, `no deploy bundles found in ${packageDir}`);
  return join(packageDir, names.at(-1));
}

function shaFor(bundle) {
  const shaPath = `${bundle}.sha256`;
  if (!existsSync(shaPath)) return null;
  return readFileSync(shaPath, "utf8").trim().split(/\s+/)[0];
}

const bundle = latestBundle();
const manifest = bundle.replace(/\.tar\.gz$/, ".manifest.json");
assert.ok(existsSync(manifest), `bundle manifest missing: ${manifest}`);

const workspace = mkdtempSync(join(tmpdir(), "dongnesos-bundle-verify-"));
const commands = [];
let ok = false;

try {
  commands.push(run("tar", ["-xzf", bundle, "-C", workspace]));
  commands.push(run("npm", ["ci"], { cwd: workspace }));
  commands.push(run("npm", ["run", "preflight:release"], { cwd: workspace }));
  commands.push(run("npm", ["run", "evidence:submission"], { cwd: workspace }));

  const generatedEvidence = join(workspace, "deploy/playmcp/evidence/submission-evidence.generated.md");
  assert.ok(existsSync(generatedEvidence), "extracted bundle did not generate submission evidence");
  const evidenceText = readFileSync(generatedEvidence, "utf8");
  assert.match(evidenceText, /Local ready for external deployment: PASS/);
  assert.match(evidenceText, /Remote endpoint verified: PENDING/);

  ok = commands.every((command) => command.status === 0);
  assert.equal(ok, true, "one or more bundle verification commands failed");
} finally {
  const payload = {
    checked_at: new Date().toISOString(),
    ok,
    bundle,
    bundle_name: basename(bundle),
    bundle_bytes: statSync(bundle).size,
    bundle_sha256: shaFor(bundle),
    manifest,
    workspace_removed: true,
    commands
  };
  writeFileSync(evidenceOut, `${JSON.stringify(payload, null, 2)}\n`);
  rmSync(workspace, { recursive: true, force: true });
}

console.log(`Deploy bundle verification OK: ${bundle}`);
console.log(`Bundle verification evidence written: ${evidenceOut}`);
