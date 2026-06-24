import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const roots = ["build", "dist"];

function copyExtension(appPath) {
  const target = join(appPath, "Contents", "Resources", "extension");
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  cpSync("extension", target, {
    recursive: true,
    filter: (source) => !source.includes(`${join("extension", "tests")}`),
  });
  for (const file of ["manifest.json", "background.js", "save_response.js"]) {
    if (!existsSync(join(target, file))) throw new Error(`extension copy missing ${file}`);
  }
  console.log(`copied extension -> ${target}`);
}

let copied = 0;
for (const root of roots) {
  if (!existsSync(root)) continue;
  const { readdirSync, statSync } = await import("node:fs");
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (name.endsWith(".app") && statSync(path).isDirectory()) {
        copyExtension(path);
        copied += 1;
        continue;
      }
      if (statSync(path).isDirectory()) stack.push(path);
    }
  }
}

if (!copied) throw new Error("no .app found; extension copy failed");
