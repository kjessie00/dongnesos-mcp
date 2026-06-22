import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const sourceDirs = ["src/core", "src/tools", "src/data", "src/schemas"];
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  dependencies?: Record<string, string>;
};

const forbiddenPackages = ["axios", "got", "request", "undici", "sharp", "exifreader", "multer", "formidable", "geolib"];
const forbiddenSourcePatterns: Array<{ label: string; pattern: RegExp }> = [
  { label: "fetch/network call", pattern: /\bfetch\s*\(/ },
  { label: "actual report submit function", pattern: /\b(submitReport|autoSubmit|sendReport|sendMessage)\b/i },
  { label: "KakaoTalk read/send surface", pattern: /\b(KakaoTalk|kakaotalk|talkMessage|chatRoom)\b/ },
  { label: "geolocation collection", pattern: /\b(navigator\.geolocation|latitude|longitude|coords)\b/i },
  { label: "photo upload/EXIF pipeline", pattern: /\b(exif|sharp|multer|formData|uploadPhoto)\b/i }
];

function listTsFiles(dir: string): string[] {
  const abs = join(root, dir);
  return readdirSync(abs).flatMap((entry) => {
    const path = join(abs, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return listTsFiles(relative(root, path));
    return path.endsWith(".ts") ? [path] : [];
  });
}

for (const packageName of forbiddenPackages) {
  assert.equal(packageJson.dependencies?.[packageName], undefined, `forbidden runtime dependency: ${packageName}`);
}

const failures: string[] = [];
for (const file of sourceDirs.flatMap(listTsFiles)) {
  const text = readFileSync(file, "utf8");
  for (const check of forbiddenSourcePatterns) {
    if (check.pattern.test(text)) {
      failures.push(`${relative(root, file)}: ${check.label}`);
    }
  }
}

assert.equal(failures.length, 0, `Forbidden implementation surface found:\n${failures.join("\n")}`);

console.log("Policy scan OK: no external API, submit, location, photo/EXIF, or KakaoTalk read surface in core/tool code.");
