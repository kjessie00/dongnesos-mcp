import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const image = process.env.DOCKER_IMAGE ?? "dongnesos-mcp:local-smoke";
const platform = process.env.DOCKER_PLATFORM ?? "linux/amd64";
const evidenceOut = process.env.EVIDENCE_OUT ?? "deploy/playmcp/evidence/docker-runtime-smoke.json";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
    env: options.env ?? process.env
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status}${details ? `\n${details}` : ""}`);
  }
  return (result.stdout ?? "").trim();
}

async function waitForHealth(baseUrl) {
  let lastError = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/healthz`);
      if (response.status === 200) {
        const body = await response.json();
        assert.equal(body.ok, true);
        assert.deepEqual(body.tools, ["classify_civic_issue", "draft_civic_report"]);
        return body;
      }
      lastError = new Error(`status ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw lastError ?? new Error("container health check timed out");
}

const buildArgs = ["build"];
if (platform && platform !== "local") {
  buildArgs.push("--platform", platform);
}
buildArgs.push("-t", image, ".");

console.log(`Building Docker image ${image}${platform && platform !== "local" ? ` platform=${platform}` : ""}`);
run("docker", buildArgs, { stdio: "inherit" });

const containerId = run("docker", ["run", "-d", "-p", "127.0.0.1::3000", image]);
let cleanedUp = false;

function cleanup() {
  if (!cleanedUp) {
    cleanedUp = true;
    run("docker", ["rm", "-f", containerId]);
  }
}

process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});

try {
  const portOutput = run("docker", ["port", containerId, "3000/tcp"]);
  const portMatch = portOutput.match(/127\.0\.0\.1:(\d+)/);
  assert.ok(portMatch, `could not parse docker port output: ${portOutput}`);
  const baseUrl = `http://127.0.0.1:${portMatch[1]}`;

  await waitForHealth(baseUrl);

  const taxonomyCount = run("docker", [
    "exec",
    containerId,
    "node",
    "-e",
    "import('./dist/src/data/loadData.js').then((m) => console.log(m.taxonomyData.items.length))"
  ]);
  assert.equal(taxonomyCount, "28");

  const endpointSmoke = spawnSync("npm", ["run", "smoke:endpoint"], {
    encoding: "utf8",
    stdio: "inherit",
    env: {
      ...process.env,
      MCP_URL: `${baseUrl}/mcp`,
      EVIDENCE_OUT: evidenceOut
    }
  });
  if (endpointSmoke.error) {
    throw endpointSmoke.error;
  }
  assert.equal(endpointSmoke.status, 0);

  if (existsSync(evidenceOut)) {
    const evidence = JSON.parse(readFileSync(evidenceOut, "utf8"));
    evidence.docker_runtime = {
      image,
      platform: platform && platform !== "local" ? platform : "local",
      container_id: containerId,
      mcp_url: `${baseUrl}/mcp`
    };
    writeFileSync(evidenceOut, `${JSON.stringify(evidence, null, 2)}\n`);
  }

  console.log(`Docker runtime smoke OK: ${baseUrl}/mcp image=${image} platform=${platform}`);
  console.log(`Evidence written: ${evidenceOut}`);
} finally {
  cleanup();
}
