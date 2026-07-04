module.exports = [
"[externals]/next/dist/build/adapter/setup-node-env.external.js [external] (next/dist/build/adapter/setup-node-env.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/build/adapter/setup-node-env.external.js", () => require("next/dist/build/adapter/setup-node-env.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/lib/incremental-cache/tags-manifest.external.js [external] (next/dist/server/lib/incremental-cache/tags-manifest.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/lib/incremental-cache/tags-manifest.external.js", () => require("next/dist/server/lib/incremental-cache/tags-manifest.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[externals]/next/dist/server/lib/incremental-cache/memory-cache.external.js [external] (next/dist/server/lib/incremental-cache/memory-cache.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/lib/incremental-cache/memory-cache.external.js", () => require("next/dist/server/lib/incremental-cache/memory-cache.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/lib/incremental-cache/shared-cache-controls.external.js [external] (next/dist/server/lib/incremental-cache/shared-cache-controls.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/lib/incremental-cache/shared-cache-controls.external.js", () => require("next/dist/server/lib/incremental-cache/shared-cache-controls.external.js"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/artifacts/mzuka-gilbert/src/lib/rate-limit.ts [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Simple in-process rate limiter using a sliding-window token bucket.
 * Works in Next.js serverless (per-instance) and long-running Node processes.
 *
 * For multi-instance production deployments, swap the in-memory store
 * for a Redis-backed implementation (e.g. @upstash/ratelimit).
 */ __turbopack_context__.s([
    "Limiters",
    ()=>Limiters,
    "getStoreSnapshot",
    ()=>getStoreSnapshot,
    "rateLimit",
    ()=>rateLimit
]);
const store = new Map();
function rateLimit(key, config) {
    const now = Date.now();
    const windowMs = config.windowSecs * 1000;
    let bucket = store.get(key);
    if (!bucket || now - bucket.lastRefill >= windowMs) {
        // New window — full bucket
        bucket = {
            tokens: config.limit,
            lastRefill: now
        };
    }
    const resetAt = bucket.lastRefill + windowMs;
    if (bucket.tokens <= 0) {
        store.set(key, bucket);
        return {
            allowed: false,
            remaining: 0,
            resetAt
        };
    }
    bucket.tokens -= 1;
    store.set(key, bucket);
    return {
        allowed: true,
        remaining: bucket.tokens,
        resetAt
    };
}
const Limiters = {
    /** Login / register — increased to 30 attempts per 15 minutes per IP (less aggressive) */ auth: (ip)=>rateLimit(`auth:${ip}`, {
            limit: 30,
            windowSecs: 900
        }),
    /** Gallery view — 60 requests per minute per IP */ gallery: (ip)=>rateLimit(`gallery:${ip}`, {
            limit: 60,
            windowSecs: 60
        }),
    /** Cron endpoint — 20 calls per minute per IP */ cron: (ip)=>rateLimit(`cron:${ip}`, {
            limit: 20,
            windowSecs: 60
        }),
    /** Stripe webhook — 100 per minute (Stripe sends bursts) */ webhook: (ip)=>rateLimit(`webhook:${ip}`, {
            limit: 100,
            windowSecs: 60
        })
};
function getStoreSnapshot() {
    const now = Date.now();
    const snapshots = [];
    for (const [key, bucket] of store.entries()){
        let windowSecs = 60; // default
        if (key.startsWith("auth:")) windowSecs = 900;
        else if (key.startsWith("gallery:")) windowSecs = 60;
        else if (key.startsWith("cron:")) windowSecs = 60;
        else if (key.startsWith("webhook:")) windowSecs = 60;
        const resetAt = bucket.lastRefill + windowSecs * 1000;
        snapshots.push({
            key,
            tokens: bucket.tokens,
            lastRefill: bucket.lastRefill,
            resetAt,
            remaining: bucket.tokens,
            windowSecs
        });
    }
    return {
        now,
        snapshots
    };
}
}),
"[project]/artifacts/mzuka-gilbert/src/proxy.ts [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "proxy",
    ()=>proxy
]);
/**
 * Next.js 16 proxy (previously middleware) — rate limiting on sensitive routes.
 * Runs before every matched request.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$9_react$2d$dom$40$19$2e$2$2e$7_react$40$19$2e$2$2e$7_$5f$react$40$19$2e$2$2e$7$2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.2.9_react-dom@19.2.7_react@19.2.7__react@19.2.7/node_modules/next/server.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$mzuka$2d$gilbert$2f$src$2f$lib$2f$rate$2d$limit$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/artifacts/mzuka-gilbert/src/lib/rate-limit.ts [middleware] (ecmascript)");
;
;
// Routes and their rate-limit profiles
const RATE_LIMITED_ROUTES = [
    {
        pattern: /^\/(login|register)$/,
        limiter: __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$mzuka$2d$gilbert$2f$src$2f$lib$2f$rate$2d$limit$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["Limiters"].auth
    },
    {
        pattern: /^\/client\/galleries\//,
        limiter: __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$mzuka$2d$gilbert$2f$src$2f$lib$2f$rate$2d$limit$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["Limiters"].gallery
    },
    {
        pattern: /^\/api\/cron\//,
        limiter: __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$mzuka$2d$gilbert$2f$src$2f$lib$2f$rate$2d$limit$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["Limiters"].cron
    },
    {
        pattern: /^\/api\/webhooks\//,
        limiter: __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$mzuka$2d$gilbert$2f$src$2f$lib$2f$rate$2d$limit$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["Limiters"].webhook
    }
];
function proxy(request) {
    const { pathname } = request.nextUrl;
    // Extract real client IP (Vercel, Cloudflare, or direct)
    const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    // Expose a debug snapshot endpoint from the proxy process so we can inspect
    // the in-memory limiter used by the proxy (same-process). Guarded by
    // DEBUG_RATE_LIMIT=1 or x-debug-key matching DEBUG_SECRET.
    if (pathname === "/api/debug/rate-limit") {
        const enabled = process.env.DEBUG_RATE_LIMIT === "1";
        const headerKey = request.headers.get("x-debug-key");
        const secretMatch = headerKey && process.env.DEBUG_SECRET && headerKey === process.env.DEBUG_SECRET;
        if (!enabled && !secretMatch) {
            return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$9_react$2d$dom$40$19$2e$2$2e$7_react$40$19$2e$2$2e$7_$5f$react$40$19$2e$2$2e$7$2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"](JSON.stringify({
                error: "Forbidden"
            }), {
                status: 403,
                headers: {
                    "Content-Type": "application/json"
                }
            });
        }
        const ipFilter = request.nextUrl.searchParams.get("ip");
        const { now, snapshots } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$artifacts$2f$mzuka$2d$gilbert$2f$src$2f$lib$2f$rate$2d$limit$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["getStoreSnapshot"])();
        const filtered = ipFilter ? snapshots.filter((s)=>s.key.includes(ipFilter)) : snapshots;
        return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$9_react$2d$dom$40$19$2e$2$2e$7_react$40$19$2e$2$2e$7_$5f$react$40$19$2e$2$2e$7$2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"](JSON.stringify({
            now,
            count: filtered.length,
            entries: filtered
        }), {
            status: 200,
            headers: {
                "Content-Type": "application/json"
            }
        });
    }
    for (const { pattern, limiter } of RATE_LIMITED_ROUTES){
        if (pattern.test(pathname)) {
            const result = limiter(ip);
            if (!result.allowed) {
                // Log blocked attempts for debugging (IP + route + reset)
                try {
                    // eslint-disable-next-line no-console
                    console.warn(`[rate-limit] blocked ${ip} -> ${pathname}, resetAt=${new Date(result.resetAt).toISOString()}`);
                } catch  {}
                return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$9_react$2d$dom$40$19$2e$2$2e$7_react$40$19$2e$2$2e$7_$5f$react$40$19$2e$2$2e$7$2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"](JSON.stringify({
                    error: "Too many requests. Please slow down.",
                    resetAt: new Date(result.resetAt).toISOString()
                }), {
                    status: 429,
                    headers: {
                        "Content-Type": "application/json",
                        "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
                        "X-RateLimit-Limit": "see config",
                        "X-RateLimit-Remaining": "0"
                    }
                });
            }
            const response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$9_react$2d$dom$40$19$2e$2$2e$7_react$40$19$2e$2$2e$7_$5f$react$40$19$2e$2$2e$7$2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].next();
            response.headers.set("X-RateLimit-Remaining", String(result.remaining));
            return response;
        }
    }
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$2$2e$9_react$2d$dom$40$19$2e$2$2e$7_react$40$19$2e$2$2e$7_$5f$react$40$19$2e$2$2e$7$2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].next();
}
const config = {
    matcher: [
        "/login",
        "/register",
        "/client/galleries/:path*",
        "/api/cron/:path*",
        "/api/webhooks/:path*"
    ]
};
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__06_xphf._.js.map