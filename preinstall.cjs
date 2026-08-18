#!/usr/bin/env node
// Cross-platform preinstall guard.
//
// This runs via `node preinstall.cjs` from package.json's "preinstall"
// script instead of `sh -c '...'`, because `sh` doesn't exist on Windows
// (PowerShell/cmd.exe). Node itself is guaranteed to be present — it's what
// npm/pnpm/yarn run on — so invoking it directly works identically on
// Windows, macOS, and Linux with no shell-specific syntax involved.
//
// Behavior is unchanged from the original `sh -c` version:
//   1. Remove any stray package-lock.json / yarn.lock so a non-pnpm
//      install never lingers alongside pnpm-lock.yaml.
//   2. Refuse to continue unless the install was invoked via pnpm.

"use strict";

const fs = require("fs");

for (const lockfile of ["package-lock.json", "yarn.lock"]) {
  fs.rmSync(lockfile, { force: true });
}

const userAgent = process.env.npm_config_user_agent || "";
if (!userAgent.startsWith("pnpm/")) {
  console.error("Use pnpm instead (this repo requires pnpm; run `pnpm install`, not npm or yarn).");
  process.exit(1);
}
