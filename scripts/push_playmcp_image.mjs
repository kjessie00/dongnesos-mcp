import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const localImage = process.env.LOCAL_DOCKER_IMAGE ?? "dongnesos-mcp:playmcp-amd64";
const repo = process.env.DOCKER_IMAGE_REPO ?? "kjessie00/dongnesos-mcp";
const tag = process.env.DOCKER_IMAGE_TAG ?? "playmcp-20260622";
const targetImage = `${repo}:${tag}`;
const evidenceOut = process.env.IMAGE_PUSH_EVIDENCE_OUT ?? "deploy/playmcp/evidence/image-push.json";
const dryRun = process.env.DRY_RUN !== "0";
const pushConfirmed = process.env.CONFIRM_EXTERNAL_IMAGE_PUSH === "1";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
    env: process.env
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status}${details ? `\n${details}` : ""}`);
  }
  return (result.stdout ?? "").trim();
}

function imagePlatform(image) {
  const output = run("docker", ["image", "inspect", image, "--format", "{{.Os}}/{{.Architecture}}"]);
  return output.trim();
}

const platform = imagePlatform(localImage);
assert.equal(platform, "linux/amd64", `${localImage} must be linux/amd64 for PlayMCP in KC`);

const plannedCommands = [
  `docker tag ${localImage} ${targetImage}`,
  `docker push ${targetImage}`
];

const evidence = {
  checked_at: new Date().toISOString(),
  dry_run: dryRun,
  local_image: localImage,
  local_platform: platform,
  target_image: targetImage,
  planned_commands: plannedCommands,
  pushed: false,
  stop_rule: "Set DRY_RUN=0 and CONFIRM_EXTERNAL_IMAGE_PUSH=1 only after Jessie approves external Docker registry publication."
};

if (dryRun) {
  mkdirSync(dirname(evidenceOut), { recursive: true });
  writeFileSync(evidenceOut, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Docker image push dry-run OK: ${targetImage}`);
  console.log(`Evidence written: ${evidenceOut}`);
  console.log("No external registry mutation performed. Set DRY_RUN=0 CONFIRM_EXTERNAL_IMAGE_PUSH=1 to push after approval.");
  process.exit(0);
}

assert.equal(
  pushConfirmed,
  true,
  "External Docker registry push blocked. Set CONFIRM_EXTERNAL_IMAGE_PUSH=1 only after Jessie approves image publication."
);

run("docker", ["tag", localImage, targetImage], { stdio: "inherit" });
run("docker", ["push", targetImage], { stdio: "inherit" });

evidence.pushed = true;
evidence.pushed_at = new Date().toISOString();

mkdirSync(dirname(evidenceOut), { recursive: true });
writeFileSync(evidenceOut, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Docker image pushed: ${targetImage}`);
console.log(`Evidence written: ${evidenceOut}`);
