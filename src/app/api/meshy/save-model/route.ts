import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const GLB_BUCKET = "models-3d";

const supabase = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

let _admin: ReturnType<typeof createClient> | null = null;
function getAdmin() {
  if (!_admin) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
    _admin = createClient(SUPABASE_URL, key);
  }
  return _admin;
}

export async function POST(req: NextRequest) {
  let body: { taskId: string; glbUrl: string; thumbnailUrl?: string | null; reptileId: string; slot: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { taskId, glbUrl, thumbnailUrl, reptileId, slot } = body;
  if (!taskId || !glbUrl || !reptileId || !slot) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Download GLB from Meshy and upload to Supabase Storage
  let permanentUrl = glbUrl;
  try {
    const admin = getAdmin();
    const res = await fetch(glbUrl);
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const { error: uploadError } = await admin.storage
        .from(GLB_BUCKET)
        .upload(`${taskId}.glb`, buffer, { contentType: "model/gltf-binary", upsert: true });

      if (!uploadError) {
        const { data } = admin.storage.from(GLB_BUCKET).getPublicUrl(`${taskId}.glb`);
        permanentUrl = data.publicUrl;
        console.log(`[save-model] GLB persisted: ${permanentUrl}`);
      } else {
        console.error("[save-model] Storage upload failed:", uploadError.message);
      }
    } else {
      console.warn(`[save-model] GLB download failed: ${res.status}`);
    }
  } catch (e) {
    console.error("[save-model] persist error:", e);
    // Fall back to Meshy URL if storage fails
  }

  // Update DB with permanent URL
  const { error: dbError } = await supabase
    .from("reptile_3d_models")
    .update({
      status: "succeeded",
      glb_url: permanentUrl,
      thumbnail_url: thumbnailUrl ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("reptile_id", reptileId)
    .eq("slot", slot);

  if (dbError) {
    console.error("[save-model] DB update failed:", dbError.message);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ permanentUrl });
}
