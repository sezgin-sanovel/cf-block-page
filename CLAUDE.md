# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Cloudflare Worker (`security-block-page`) that serves a 403 block page when requests are flagged by security rules. It captures request metadata and displays a formatted incident page to the user.

## Commands

**Local development:**
```bash
wrangler dev
```

**Deploy:**
```bash
wrangler deploy
```

No package.json or build step — pure JavaScript with no dependencies.

## Architecture

The entire application lives in two files:

- **`worker.js`** — Single Cloudflare Worker module with an embedded HTML/CSS block page template. Exports a `fetch` handler that extracts request metadata (IP, country, ASN, Ray ID, etc.), generates a reference ID, logs the blocked request, renders the HTML template with interpolated values, and returns a 403 response.
- **`wrangler.toml`** — Wrangler config. Routes are commented out and must be configured per domain before deploying.

### Key functions in `worker.js`

- `extractRequestMeta(request)` — pulls Cloudflare headers (CF-Connecting-IP, CF-IPCountry, CF-Ray, etc.) into a structured object
- `generateRefId()` — creates an 8-char alphanumeric reference ID
- `logBlockedRequest(meta, refId)` — currently logs to console; Phase 2 will write to an R2 bucket (`BLOCK_LOG` binding, bucket `security-block-logs` — disabled in wrangler.toml)
- `buildBlockPage(meta, refId)` — interpolates metadata into the HTML template string

### Planned Phase 2

R2 persistent logging is stubbed out in `wrangler.toml` (commented) and referenced in `logBlockedRequest`. When enabling, uncomment the `[[r2_buckets]]` section and implement the R2 write in `logBlockedRequest`.
