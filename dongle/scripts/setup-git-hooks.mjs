import { chmodSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
chmodSync(path.join(repositoryRoot, ".githooks", "pre-commit"), 0o755);
execFileSync("git", ["config", "core.hooksPath", ".githooks"], {
  cwd: repositoryRoot,
  stdio: "ignore",
});
