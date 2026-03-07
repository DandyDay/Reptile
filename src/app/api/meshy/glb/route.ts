import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MESHY_HOST = "assets.meshy.ai";
const MESHY_API_KEY = process.env.MESHY_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const GLB_BUCKET = "models-3d";

// anon client for DB RPC
const supabase = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
// service role client — lazy so build doesn't fail when env var is absent
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;
function getAdmin() {
  if (!_supabaseAdmin) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
    _supabaseAdmin = createClient(SUPABASE_URL, key);
  }
  return _supabaseAdmin;
}

function isSupabaseStorageUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname.endsWith(".supabase.co");
  } catch { return false; }
}

/** Download from Meshy and persist to Supabase Storage. Returns permanent URL or null. */
async function persistGlb(taskId: string, meshyGlbUrl: string): Promise<string | null> {
  try {
    const admin = getAdmin();
    const res = await fetch(meshyGlbUrl);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();

    const { error } = await admin.storage
      .from(GLB_BUCKET)
      .upload(`${taskId}.glb`, buffer, { contentType: "model/gltf-binary", upsert: true });

    if (error) { console.error("[glb proxy] Storage upload failed:", error.message); return null; }

    const { data } = admin.storage.from(GLB_BUCKET).getPublicUrl(`${taskId}.glb`);
    const permanentUrl = data.publicUrl;

    // Update DB with permanent URL
    await supabase.rpc("update_3d_model_from_webhook", {
      p_task_id: taskId,
      p_status: "succeeded",
      p_glb_url: permanentUrl,
      p_thumbnail_url: null,
    });

    console.log(`[glb proxy] GLB persisted: ${permanentUrl}`);
    return permanentUrl;
  } catch (e) {
    console.error("[glb proxy] persistGlb error:", e);
    return null;
  }
}

async function fetchFreshMeshyUrl(taskId: string): Promise<{ glbUrl: string | null; thumbnailUrl: string | null }> {
  try {
    const res = await fetch(`https://api.meshy.ai/openapi/v1/image-to-3d/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${MESHY_API_KEY}` },
    });
    if (!res.ok) return { glbUrl: null, thumbnailUrl: null };
    const data = await res.json();
    return { glbUrl: data.model_urls?.glb ?? null, thumbnailUrl: data.thumbnail_url ?? null };
  } catch {
    return { glbUrl: null, thumbnailUrl: null };
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const taskId = req.nextUrl.searchParams.get("taskId");

  if (!url) return new NextResponse("Missing url param", { status: 400 });

  // Supabase Storage URLs are already permanent and public — redirect directly
  if (isSupabaseStorageUrl(url)) {
    return NextResponse.redirect(url, { status: 302 });
  }

  // Only proxy Meshy CDN URLs
  try {
    const { hostname } = new URL(url);
    if (hostname !== MESHY_HOST) return new NextResponse("Invalid host", { status: 400 });
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  const proxyMeshy = async (targetUrl: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const upstream = await fetch(targetUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (!upstream.ok) {
        console.warn(`[glb proxy] upstream ${upstream.status}`);
        return null;
      }
      return new NextResponse(upstream.body, {
        headers: {
          "Content-Type": "model/gltf-binary",
          "Cache-Control": "public, max-age=3600",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (e) {
      clearTimeout(timeout);
      console.warn("[glb proxy] fetch error:", e);
      return null;
    }
  };

  try {
    // Try original Meshy URL
    const result = await proxyMeshy(url);
    if (result) {
      // Opportunistically persist to Storage in background (don't await)
      if (taskId && MESHY_API_KEY) {
        persistGlb(taskId, url).catch(() => {});
      }
      return result;
    }

    // URL expired — refresh from Meshy API then persist to Storage
    if (taskId && MESHY_API_KEY) {
      console.log(`[glb proxy] URL expired for task ${taskId}, refreshing...`);
      const { glbUrl: freshUrl } = await fetchFreshMeshyUrl(taskId);
      if (freshUrl) {
        const permanentUrl = await persistGlb(taskId, freshUrl);
        if (permanentUrl) {
          return NextResponse.redirect(permanentUrl, { status: 302 });
        }
        const retryResult = await proxyMeshy(freshUrl);
        if (retryResult) return retryResult;
      }
    }

    return new NextResponse("GLB fetch failed", { status: 502 });
  } catch (err) {
    console.error("[glb proxy error]", err);
    return new NextResponse("Proxy error", { status: 502 });
  }
}
