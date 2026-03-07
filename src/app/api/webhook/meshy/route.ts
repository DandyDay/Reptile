import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const WEBHOOK_SECRET = process.env.MESHY_WEBHOOK_SECRET;

// anon client for DB RPC (SECURITY DEFINER)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// service role client — lazy so build doesn't fail when env var is absent
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;
function getAdmin() {
  if (!_supabaseAdmin) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
    _supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
  }
  return _supabaseAdmin;
}

const GLB_BUCKET = "models-3d";

/** Downloads a GLB from Meshy and uploads it to Supabase Storage.
 *  Returns the permanent public URL, or null on failure. */
async function persistGlb(taskId: string, meshyGlbUrl: string): Promise<string | null> {
  try {
    const admin = getAdmin();
    const res = await fetch(meshyGlbUrl);
    if (!res.ok) {
      console.warn(`[meshy webhook] GLB download failed: ${res.status}`);
      return null;
    }
    const buffer = await res.arrayBuffer();
    const path = `${taskId}.glb`;

    const { error } = await admin.storage
      .from(GLB_BUCKET)
      .upload(path, buffer, {
        contentType: "model/gltf-binary",
        upsert: true,
      });

    if (error) {
      console.error("[meshy webhook] Storage upload failed:", error.message);
      return null;
    }

    const { data } = admin.storage.from(GLB_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error("[meshy webhook] persistGlb error:", e);
    return null;
  }
}

export async function POST(req: NextRequest) {
  // 1. Secret 검증
  const secret = req.nextUrl.searchParams.get("secret");
  if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const taskId = payload.id as string | undefined;
  const status = payload.status as string | undefined;

  if (!taskId || !status) {
    return new NextResponse("Missing id or status", { status: 400 });
  }

  // 2. Meshy status → DB status 매핑
  if (status === "SUCCEEDED") {
    const modelUrls = payload.model_urls as Record<string, string> | undefined;
    const meshyGlbUrl = modelUrls?.glb ?? null;
    const thumbnailUrl = (payload.thumbnail_url as string) ?? null;

    // Upload to Supabase Storage for permanent URL
    let glbUrl = meshyGlbUrl;
    if (meshyGlbUrl) {
      const permanentUrl = await persistGlb(taskId, meshyGlbUrl);
      if (permanentUrl) {
        glbUrl = permanentUrl;
        console.log(`[meshy webhook] GLB persisted to Storage: ${permanentUrl}`);
      } else {
        console.warn(`[meshy webhook] Storage upload failed, falling back to Meshy URL`);
      }
    }

    const { error } = await supabase.rpc("update_3d_model_from_webhook", {
      p_task_id: taskId,
      p_status: "succeeded",
      p_glb_url: glbUrl,
      p_thumbnail_url: thumbnailUrl,
    });

    if (error) {
      console.error("[meshy webhook] DB update failed", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[meshy webhook] SUCCEEDED: ${taskId}`);
  } else if (status === "FAILED") {
    const { error } = await supabase.rpc("update_3d_model_from_webhook", {
      p_task_id: taskId,
      p_status: "failed",
    });

    if (error) {
      console.error("[meshy webhook] DB update failed", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[meshy webhook] FAILED: ${taskId}`);
  }
  // IN_PROGRESS 등 중간 상태는 무시 (SSE가 처리)

  return new NextResponse("OK", { status: 200 });
}
