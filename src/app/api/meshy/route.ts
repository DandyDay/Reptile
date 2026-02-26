import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const MESHY_API_KEY = process.env.MESHY_API_KEY;
const MESHY_BASE = "https://api.meshy.ai/openapi/v2/image-to-3d";

// Allowed Supabase storage domain for imageUrl validation
const ALLOWED_IMAGE_DOMAINS = [
  "supabase.co",
  "supabase.in",
];

function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_IMAGE_DOMAINS.some((d) => parsed.hostname.endsWith(d));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!MESHY_API_KEY) {
    return NextResponse.json({ error: "MESHY_API_KEY not configured" }, { status: 500 });
  }

  // Verify authenticated Supabase session
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action, taskId, imageUrl } = body;

  if (action === "create") {
    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
    }
    if (!isAllowedImageUrl(imageUrl)) {
      return NextResponse.json({ error: "imageUrl must be from Supabase storage" }, { status: 400 });
    }

    const res = await fetch(MESHY_BASE, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MESHY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: imageUrl,
        enable_pbr: false,
        should_remesh: true,
        topology: "quad",
        target_polycount: 30000,
      }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  }

  if (action === "poll") {
    if (!taskId || typeof taskId !== "string" || taskId.length > 100) {
      return NextResponse.json({ error: "Invalid taskId" }, { status: 400 });
    }

    const res = await fetch(`${MESHY_BASE}/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${MESHY_API_KEY}` },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
