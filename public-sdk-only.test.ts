import { fileURLToPath } from "node:url";
import { cpSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { experimental_scanPublicSdkOnly as scanPublicSdkOnly } from "@get-bb/plugin-sdk/testing";
import { expect, it } from "vitest";

it("imports only the public SDK, npm packages, and node builtins", () => {
  // Scan plugin code, excluding the separately patched upstream runtime and
  // the generated published SDK bundle. Neither is authored plugin source.
  const root = fileURLToPath(new URL('.', import.meta.url));
  const projection = mkdtempSync(join(tmpdir(), 'kimi-plugin-imports-'));
  for (const entry of readdirSync(root)) {
    if (entry.endsWith('.ts') || entry === 'package.json') cpSync(join(root, entry), join(projection, entry));
  }
  cpSync(join(root, 'src'), join(projection, 'src'), {
    recursive: true, filter: path => !path.endsWith('acp-native.js'),
  });
  try {
    const scan = scanPublicSdkOnly(
      projection,
      {
        allow: [
          /^vitest(?:\/|$)/,
          // Deprecated alias of the ACP entrypoint, but the only published
          // build that publishes provider commands and session options (checked
          // against SDK 0.6.49 and 0.6.54). Re-evaluate on SDK upgrades.
          /^@get-bb\/plugin-sdk\/provider-bridge\/acp-next$/,
        ],
      },
    );
    expect(scan.files.length).toBeGreaterThan(0);
    expect(scan.violations).toEqual([]);
    expect(scan.privateDependencies).toEqual([]);
  } finally {
    rmSync(projection, { recursive: true, force: true });
  }
});
