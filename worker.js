// Cloudflare Worker: Security Block Page
// Renders a block page and logs attacker IP to console (R2 later)

const BLOCK_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Access Denied</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@300;400;600&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #0a0c0f;
      --surface: #111418;
      --border: #1e2329;
      --accent: #e63946;
      --accent-dim: rgba(230, 57, 70, 0.12);
      --text-primary: #e8eaed;
      --text-secondary: #6b7280;
      --text-mono: #94a3b8;
      --warn: #f59e0b;
    }

    body {
      background: var(--bg);
      color: var(--text-primary);
      font-family: 'IBM Plex Sans', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      position: relative;
      overflow: hidden;
    }

    /* Background grid */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image:
        linear-gradient(rgba(230,57,70,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(230,57,70,0.03) 1px, transparent 1px);
      background-size: 40px 40px;
      pointer-events: none;
    }

    /* Top status bar */
    .status-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--accent);
      box-shadow: 0 0 20px rgba(230, 57, 70, 0.6);
    }

    .container {
      max-width: 680px;
      width: 100%;
      position: relative;
      animation: fadeUp 0.4s ease both;
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 32px;
    }

    .shield-icon {
      width: 36px;
      height: 36px;
      flex-shrink: 0;
    }

    .brand {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--text-secondary);
    }

    /* Main card */
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 2px;
      overflow: hidden;
    }

    .card-header {
      padding: 24px 28px;
      border-bottom: 1px solid var(--border);
      background: var(--accent-dim);
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }

    .error-code {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 48px;
      font-weight: 600;
      color: var(--accent);
      line-height: 1;
      letter-spacing: -2px;
    }

    .error-info {
      padding-top: 4px;
    }

    .error-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .error-subtitle {
      font-size: 13px;
      color: var(--text-secondary);
      font-weight: 300;
    }

    .card-body {
      padding: 28px;
    }

    .description {
      font-size: 14px;
      line-height: 1.7;
      color: var(--text-secondary);
      margin-bottom: 28px;
    }

    /* Info rows */
    .info-grid {
      display: flex;
      flex-direction: column;
      gap: 0;
      border: 1px solid var(--border);
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 28px;
    }

    .info-row {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      gap: 16px;
    }

    .info-row:last-child { border-bottom: none; }

    .info-label {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-secondary);
      min-width: 120px;
      flex-shrink: 0;
    }

    .info-value {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 13px;
      color: var(--text-mono);
    }

    .info-value.highlight {
      color: var(--warn);
    }

    /* Notice box */
    .notice {
      background: rgba(245, 158, 11, 0.06);
      border: 1px solid rgba(245, 158, 11, 0.2);
      border-radius: 2px;
      padding: 14px 16px;
      font-size: 12px;
      color: var(--text-secondary);
      line-height: 1.6;
    }

    .notice strong {
      color: var(--warn);
      font-weight: 600;
    }

    .card-footer {
      padding: 16px 28px;
      border-top: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .timestamp {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11px;
      color: var(--text-secondary);
    }

    .ref-id {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11px;
      color: var(--border);
      letter-spacing: 0.05em;
    }
  </style>
</head>
<body>
  <div class="status-bar"></div>

  <div class="container">
    <div class="header">
      <svg class="shield-icon" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 3L6 8v10c0 7.18 5.16 13.9 12 15.93C24.84 31.9 30 25.18 30 18V8L18 3z"
              fill="rgba(230,57,70,0.15)" stroke="#e63946" stroke-width="1.5"/>
        <path d="M13 18l3.5 3.5L23 14" stroke="#e63946" stroke-width="1.5"
              stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>
      </svg>
      <span class="brand">Security Gateway</span>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="error-code">403</div>
        <div class="error-info">
          <div class="error-title">Access Denied</div>
          <div class="error-subtitle">Your request has been blocked by security policy</div>
        </div>
      </div>

      <div class="card-body">
        <p class="description">
          This request was flagged and blocked by an automated security rule.
          Your IP address and request details have been logged for security review.
          If you believe this is a mistake, contact the site administrator.
        </p>

        <div class="info-grid">
          <div class="info-row">
            <span class="info-label">Your IP</span>
            <span class="info-value highlight">{{CLIENT_IP}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Country</span>
            <span class="info-value">{{COUNTRY}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Blocked URL</span>
            <span class="info-value">{{BLOCKED_URL}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Rule</span>
            <span class="info-value">{{RULE_ID}}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Time</span>
            <span class="info-value">{{TIMESTAMP}}</span>
          </div>
        </div>

        <div class="notice">
          <strong>Notice:</strong> Repeated attempts to access restricted resources may result
          in a permanent block. This incident has been recorded.
        </div>
      </div>

      <div class="card-footer">
        <span class="timestamp">{{TIMESTAMP}}</span>
        <span class="ref-id">REF: {{REF_ID}}</span>
      </div>
    </div>
  </div>
</body>
</html>`;

// Generate a short reference ID for the log entry
function generateRefId() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Extract and normalize request metadata
function extractRequestMeta(request) {
    const url = new URL(request.url);
    const cf = request.cf || {};

    // When redirected via Custom Error rule, real IP/country come as query params
    const ip = url.searchParams.get('cip')
        || request.headers.get('CF-Connecting-IP')
        || 'unknown';

    const country = url.searchParams.get('cc')
        || cf.country
        || request.headers.get('CF-IPCountry')
        || 'unknown';

    return {
        ip,
        country,
        asn: cf.asn || null,
        asOrganization: cf.asOrganization || null,
        city: cf.city || null,
        userAgent: request.headers.get('User-Agent') || 'unknown',
        method: request.method,
        url: url.pathname,
        host: url.hostname,
        referer: request.headers.get('Referer') || null,
        timestamp: new Date().toISOString(),
        rayId: request.headers.get('CF-Ray') || null,
    };
}

// Returns true if the IP is IPv4
function isIPv4(ip) {
    return /^\d{1,3}(\.\d{1,3}){3}$/.test(ip);
}

// Returns true if the IP is IPv6
function isIPv6(ip) {
    return ip.includes(':');
}

// Append IP to the given R2 file if not already present
async function appendToList(bucket, key, ip) {
    const existing = await bucket.get(key);
    const prev = existing ? await existing.text() : '';
    const entries = prev ? prev.split('\n').filter(Boolean) : [];

    if (entries.includes(ip)) return;

    entries.push(ip);

    await bucket.put(key, entries.join('\n'), {
        httpMetadata: { contentType: 'text/plain; charset=utf-8' },
    });
}

// Add IP to Cloudflare auto_blocked_ips list
async function addToCloudflareList(ip, env) {
    if (!env.CLOUDFLARE_API_TOKEN) return;

    const url = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/rules/lists/${env.CLOUDFLARE_AUTO_BLOCK_LIST_ID}/items`;

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify([{ ip }]),
    });

    if (!res.ok) {
        const err = await res.text();
        console.error('[CF_LIST_ERROR]', res.status, err);
    }
}

// Log the blocked request to R2 and console
async function logBlockedRequest(meta, refId, env) {
    console.log('[BLOCKED]', JSON.stringify({ ref: refId, ...meta }));

    if (!env.BLOCK_LOG) return;

    if (isIPv4(meta.ip)) {
        await appendToList(env.BLOCK_LOG, 'export/ipv4_blocked.txt', meta.ip);
        await addToCloudflareList(meta.ip, env);
    } else if (isIPv6(meta.ip)) {
        await appendToList(env.BLOCK_LOG, 'export/ipv6_blocked.txt', meta.ip);
    }
}

// Mask last two octets of IPv4: 176.55.107.90 → 176.55.*.*
function maskIP(ip) {
    if (isIPv4(ip)) {
        const parts = ip.split('.');
        return `${parts[0]}.${parts[1]}.*.*`;
    }
    // IPv6: mask last 4 groups
    const parts = ip.split(':');
    return parts.slice(0, 4).join(':') + ':****:****:****:****';
}

// Build the HTML response with interpolated values
function buildBlockPage(meta, refId) {
    const displayUrl = meta.url.length > 60
        ? meta.url.substring(0, 57) + '...'
        : meta.url;

    const html = BLOCK_PAGE_HTML
        .replace(/{{CLIENT_IP}}/g, maskIP(meta.ip))
        .replace(/{{COUNTRY}}/g, meta.country.toUpperCase())
        .replace(/{{BLOCKED_URL}}/g, displayUrl)
        .replace(/{{RULE_ID}}/g, meta.rayId || 'SECURITY-RULE')
        .replace(/{{TIMESTAMP}}/g, meta.timestamp)
        .replace(/{{REF_ID}}/g, refId);

    return html;
}

// Handle Logpush POST - Cloudflare sends NDJSON (one JSON event per line)
async function handleLogpush(request, env) {
    // Validate secret (query param: /logpush?secret=xxx)
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');
    if (!env.LOGPUSH_SECRET || secret !== env.LOGPUSH_SECRET) {
        return new Response('Unauthorized', { status: 401 });
    }

    const body = await request.text();
    const lines = body.split('\n').filter(Boolean);

    for (const line of lines) {
        let event;
        try { event = JSON.parse(line); } catch { continue; }

        // Only process block actions
        if (event.Action !== 'block') continue;

        const ip = event.ClientIP;
        if (!ip) continue;

        console.log('[LOGPUSH_BLOCK]', JSON.stringify({
            ip,
            ruleId: event.RuleID,
            country: event.ClientCountry,
            rayId: event.RayID,
            datetime: event.Datetime,
        }));

        if (env.BLOCK_LOG) {
            if (isIPv4(ip)) {
                await appendToList(env.BLOCK_LOG, 'export/ipv4_blocked.txt', ip);
            } else if (isIPv6(ip)) {
                await appendToList(env.BLOCK_LOG, 'export/ipv6_blocked.txt', ip);
            }
        }

        if (isIPv4(ip)) {
            await addToCloudflareList(ip, env);
        }
    }

    return new Response('OK', { status: 200 });
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Logpush endpoint
        if (url.pathname === '/logpush') {
            if (request.method === 'POST') return handleLogpush(request, env);
            return new Response('OK', { status: 200 });
        }

        // Block page
        const meta = extractRequestMeta(request);
        const refId = generateRefId();

        const html = buildBlockPage(meta, refId);

        return new Response(html, {
            status: 403,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store, no-cache',
                'X-Block-Ref': refId,
            },
        });
    },
};
