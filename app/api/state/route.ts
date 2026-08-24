// Shared cloud store for cross-device sync. Holds a single document —
// { snapshot, rev } — for the whole team. GET reads it; PUT writes it with an
// optimistic revision check so a stale device can't silently clobber a newer
// write (it gets the current document back to merge and retry).
//
// Backend: a Redis REST store (Vercel KV / Upstash Marketplace injects
// KV_REST_API_URL + KV_REST_API_TOKEN). With none configured the endpoint
// reports `configured:false` and the app runs local-only. SYNC_DEV_STORE=1
// switches to a process-memory store for local testing only.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STORE_KEY = "roodogs:state:v1";

const REDIS_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const DEV_STORE = process.env.SYNC_DEV_STORE === "1";

function configured(): boolean {
  return Boolean((REDIS_URL && REDIS_TOKEN) || DEV_STORE);
}

// Process-memory fallback for local dev/testing. Not shared across serverless
// instances, so it is never used in a real deployment.
const memory: { value: string | null } = { value: null };

async function redis(command: unknown[]): Promise<unknown> {
  const res = await fetch(REDIS_URL as string, {
    method: "POST",
    headers: {
      authorization: `Bearer ${REDIS_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const json = (await res.json()) as { result: unknown };
  return json.result;
}

async function storeGet(): Promise<string | null> {
  if (REDIS_URL && REDIS_TOKEN) {
    const r = await redis(["GET", STORE_KEY]);
    return (r as string | null) ?? null;
  }
  return memory.value;
}

async function storeSet(value: string): Promise<void> {
  if (REDIS_URL && REDIS_TOKEN) {
    await redis(["SET", STORE_KEY, value]);
    return;
  }
  memory.value = value;
}

/** Optional bearer check. If SYNC_PASSWORD is set it must match; otherwise the
 *  endpoint is open (soft gate — matches the app's client-side password). */
function authorised(req: Request): boolean {
  const required = process.env.SYNC_PASSWORD;
  if (!required) return true;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${required}`;
}

interface Document {
  snapshot: unknown;
  rev: number;
}

function parseDoc(raw: string | null): Document {
  if (!raw) return { snapshot: null, rev: 0 };
  try {
    const d = JSON.parse(raw) as Document;
    return { snapshot: d.snapshot ?? null, rev: d.rev ?? 0 };
  } catch {
    return { snapshot: null, rev: 0 };
  }
}

export async function GET(req: Request) {
  if (!configured()) {
    return NextResponse.json({ configured: false, snapshot: null, rev: 0 });
  }
  if (!authorised(req)) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const doc = parseDoc(await storeGet());
  return NextResponse.json({
    configured: true,
    snapshot: doc.snapshot,
    rev: doc.rev,
  });
}

export async function PUT(req: Request) {
  if (!configured()) {
    return NextResponse.json({ configured: false, ok: false, rev: 0 });
  }
  if (!authorised(req)) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  let body: { snapshot?: unknown; baseRev?: number };
  try {
    body = (await req.json()) as { snapshot?: unknown; baseRev?: number };
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const current = parseDoc(await storeGet());
  const baseRev = body.baseRev ?? 0;
  if (baseRev !== current.rev) {
    // Someone else wrote in the meantime — hand back the current document so
    // the client can merge and retry.
    return NextResponse.json(
      {
        configured: true,
        ok: false,
        conflict: true,
        snapshot: current.snapshot,
        rev: current.rev,
      },
      { status: 409 }
    );
  }

  const nextRev = current.rev + 1;
  await storeSet(JSON.stringify({ snapshot: body.snapshot ?? null, rev: nextRev }));
  return NextResponse.json({ configured: true, ok: true, rev: nextRev });
}
