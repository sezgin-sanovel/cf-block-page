// Cloudflare Worker: Logpush receiver
// Accepts Firewall Events from Cloudflare Logpush, logs IPs to R2 and CF list

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

        if (url.pathname === '/logpush') {
            if (request.method === 'POST') return handleLogpush(request, env);
            return new Response('OK', { status: 200 });
        }

        return new Response('Not Found', { status: 404 });
    },
};
