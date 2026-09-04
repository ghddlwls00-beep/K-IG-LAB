#!/usr/bin/env node
/**
 * Uploads the extracted audio and video to a Cloudflare R2 bucket.
 *
 * Why this exists rather than committing the media: MP3 and H.264 are already
 * compressed formats. Measured on this archive, gzip saves 1.9–3.9% on them —
 * so ~2GB of media stays ~2GB in git, permanently, in a history that clones in
 * full every time. Compressing before commit does not change that, and
 * decompressing on the way out would break HTTP range requests, which is what
 * audio seeking and video scrubbing rely on.
 *
 * The lesson JSON is the opposite case — text, ~88% compressible, diffable —
 * and belongs in the repo. So: JSON in git, media in R2.
 *
 * Setup:
 *   1. Create an R2 bucket in the Cloudflare dashboard (or `wrangler r2 bucket
 *      create <name>`).
 *   2. Put CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN (needs "Workers R2
 *      Storage: Edit") and R2_BUCKET_NAME into .env.local.
 *   3. node scripts/upload-media.mjs
 *   4. Make the bucket public (`wrangler r2 bucket dev-url enable <name>`, or
 *      bind a custom domain) and put that URL into NEXT_PUBLIC_MEDIA_URL —
 *      locally and in your deployment's project environment variables — then
 *      redeploy.
 *
 * Re-runs skip files already uploaded (by key, via the R2 API's object list),
 * so an interrupted run resumes. Uploading itself shells out to `wrangler r2
 * object put`, which already handles R2's auth and multipart behaviour —
 * reimplementing that against the S3-compatible API would just be a worse
 * version of the same thing.
 *
 * Flags:
 *   --dry-run          list what would upload, upload nothing
 *   --concurrency N    parallel uploads (default 8)
 *   --force            re-upload even if already present
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const FOLDERS = ["audio", "video"];

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
const CONCURRENCY = Math.max(1, Number(arg("--concurrency", 8)) || 8);

/** Read .env.local without adding a dependency just for this. */
function loadEnvLocal() {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf-8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}

function walk(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, base));
    else out.push(full);
  }
  return out;
}

function human(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let u = 0;
  while (n >= 1024 && u < units.length - 1) {
    n /= 1024;
    u++;
  }
  return `${n.toFixed(n < 10 && u > 0 ? 1 : 0)}${units[u]}`;
}

/** Every key currently in the bucket, via the Cloudflare R2 REST API. */
async function listExistingKeys({ accountId, apiToken, bucket }) {
  const keys = new Set();
  let cursor;
  for (;;) {
    const url = new URL(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucket}/objects`,
    );
    url.searchParams.set("per_page", "1000");
    if (cursor) url.searchParams.set("cursor", cursor);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiToken}` } });
    const data = await res.json();
    if (!data.success) {
      throw new Error(`R2 list failed: ${JSON.stringify(data.errors)}`);
    }
    for (const obj of data.result) keys.add(obj.key);
    if (data.result_info?.is_truncated) cursor = data.result_info.cursor;
    else break;
  }
  return keys;
}

async function main() {
  loadEnvLocal();
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const bucket = process.env.R2_BUCKET_NAME;
  if ((!accountId || !apiToken || !bucket) && !DRY_RUN) {
    console.error(
      "error: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN and R2_BUCKET_NAME must all be set.\n" +
        "See .env.example for where to find each one.",
    );
    process.exit(1);
  }

  // Gather local files, keyed by the path the app requests them at.
  const files = [];
  for (const folder of FOLDERS) {
    for (const full of walk(path.join(PUBLIC, folder))) {
      const pathname = path.relative(PUBLIC, full).split(path.sep).join("/");
      files.push({ full, pathname, size: fs.statSync(full).size });
    }
  }

  if (files.length === 0) {
    console.error(
      "error: no media found under public/audio or public/video.\n" +
        "Run scripts/extract.mjs first.",
    );
    process.exit(1);
  }

  const total = files.reduce((sum, f) => sum + f.size, 0);
  console.log(`found  : ${files.length} files, ${human(total)}`);

  // Skip what is already uploaded so an interrupted run resumes cheaply.
  let already = new Set();
  if (!FORCE && !DRY_RUN) {
    process.stdout.write("checking what is already uploaded… ");
    already = await listExistingKeys({ accountId, apiToken, bucket });
    console.log(`${already.size} present`);
  }

  const pending = files.filter((f) => !already.has(f.pathname));
  const pendingBytes = pending.reduce((sum, f) => sum + f.size, 0);
  console.log(`to send: ${pending.length} files, ${human(pendingBytes)}`);
  if (DRY_RUN) {
    for (const f of pending.slice(0, 20)) console.log(`  ${f.pathname}  ${human(f.size)}`);
    if (pending.length > 20) console.log(`  … and ${pending.length - 20} more`);
    console.log("\n(dry run — nothing uploaded)");
    return;
  }
  if (pending.length === 0) {
    console.log("nothing to do.");
    return;
  }

  let done = 0;
  let sent = 0;
  const failures = [];
  const startedAt = Date.now();
  const env = { ...process.env, CLOUDFLARE_ACCOUNT_ID: accountId, CLOUDFLARE_API_TOKEN: apiToken };

  // A fixed-size worker pool: uploading thousands of files one at a time is
  // far too slow, and unbounded parallelism gets rate-limited.
  let next = 0;
  async function worker() {
    for (;;) {
      const index = next++;
      if (index >= pending.length) return;
      const file = pending[index];
      try {
        await execFileAsync(
          "npx",
          [
            "wrangler",
            "r2",
            "object",
            "put",
            `${bucket}/${file.pathname}`,
            "--file",
            file.full,
            "--remote",
          ],
          { env, maxBuffer: 1024 * 1024 * 16 },
        );
        sent += file.size;
      } catch (err) {
        failures.push({ pathname: file.pathname, message: err.message });
      }
      done++;
      if (done % 5 === 0 || done === pending.length) {
        const pct = ((done / pending.length) * 100).toFixed(0);
        const elapsed = (Date.now() - startedAt) / 1000;
        const rate = sent / Math.max(elapsed, 0.1);
        process.stdout.write(
          `\r  ${done}/${pending.length} (${pct}%)  ${human(sent)} sent  ${human(rate)}/s   `,
        );
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker));
  process.stdout.write("\n");

  console.log(`\nuploaded : ${done - failures.length} files, ${human(sent)}`);
  if (failures.length) {
    console.log(`failed   : ${failures.length}`);
    for (const f of failures.slice(0, 10)) console.log(`  - ${f.pathname}: ${f.message}`);
    if (failures.length > 10) console.log(`  … and ${failures.length - 10} more`);
    console.log("\nRe-run to retry only the failures.");
  }

  if (!process.env.NEXT_PUBLIC_MEDIA_URL) {
    console.log(
      `\nBucket has no known public URL yet. Enable one and set it in .env.local:\n\n` +
        `  npx wrangler r2 bucket dev-url enable ${bucket}\n` +
        `  # then put the printed URL in NEXT_PUBLIC_MEDIA_URL\n`,
    );
  }
}

main().catch((err) => {
  console.error(`\nupload failed: ${err.message}`);
  process.exit(1);
});
