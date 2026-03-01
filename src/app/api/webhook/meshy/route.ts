import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const WEBHOOK_SECRET = process.env.MESHY_WEBHOOK_SECRET;

// anon key로 충분 — DB 업데이트는 SECURITY DEFINER 함수를 통해 처리
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
    const glbUrl = modelUrls?.glb ?? null;
    const thumbnailUrl = (payload.thumbnail_url as string) ?? null;

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
