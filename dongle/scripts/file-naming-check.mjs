import { readdir } from "node:fs/promises";
import path from "node:path";

const roots = ["services", "hooks", "utils"];
const allowed = {
  services: /^(?:index|[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*\.service)\.ts$/,
  hooks: /^(?:index|use[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)\.ts$/,
  utils: /^(?:index|[a-z0-9]+(?:-[a-z0-9]+)*\.util)\.ts$/,
};

async function collectFiles(directory, root, files = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(entryPath, root, files);
    } else if (entry.isFile() && !allowed[root].test(entry.name)) {
      files.push(entryPath);
    }
  }
  return files;
}

const violations = [];
for (const root of roots) {
  violations.push(...await collectFiles(root, root));
}

if (violations.length > 0) {
  console.error("Invalid file names:");
  for (const file of violations.sort()) {
    console.error(`- ${file}`);
  }
  process.exitCode = 1;
}
