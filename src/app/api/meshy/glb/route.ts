import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_HOST = "assets.meshy.ai";
const MESHY_API_KEY = process.env.MESHY_API_KEY;

// anon client — uses update_3d_model_from_webhook (SECURITY DEFINER) to refresh URLs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function fetchFreshGlbUrl(taskId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.meshy.ai/openapi/v1/image-to-3d/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${MESHY_API_KEY}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const freshUrl = data.model_urls?.glb ?? null;
    if (freshUrl) {
      // Persist refreshed URL so future loads use it
      await supabase.rpc("update_3d_model_from_webhook", {
        p_task_id: taskId,
        p_status: "succeeded",
        p_glb_url: freshUrl,
        p_thumbnail_url: data.thumbnail_url ?? null,
      });
    }
    return freshUrl;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const taskId = req.nextUrl.searchParams.get("taskId");

  if (!url) {
    return new NextResponse("Missing url param", { status: 400 });
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname !== ALLOWED_HOST) {
      return new NextResponse("Invalid host", { status: 400 });
    }
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  const proxyUrl = async (targetUrl: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const upstream = await fetch(targetUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (!upstream.ok) {
        console.warn(`[glb proxy] upstream ${upstream.status} for ${targetUrl.substring(0, 80)}`);
        return null;
      }
      return new NextResponse(upstream.body, {
        headers: {
          "Content-Type": "model/gltf-binary",
          "Cache-Control": "public, max-age=86400", // 1 day (URLs expire in ~3 days)
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
    // Try original URL first
    const result = await proxyUrl(url);
    if (result) return result;

    // 403 / expired — try to refresh if we have taskId
    if (taskId && MESHY_API_KEY) {
      console.log(`[glb proxy] URL expired for task ${taskId}, fetching fresh URL...`);
      const freshUrl = await fetchFreshGlbUrl(taskId);
      if (freshUrl) {
        const retryResult = await proxyUrl(freshUrl);
        if (retryResult) return retryResult;
      }
    }

    return new NextResponse("GLB fetch failed", { status: 502 });
  } catch (err) {
    console.error("[glb proxy error]", err);
    return new NextResponse("Proxy error", { status: 502 });
  }
}
