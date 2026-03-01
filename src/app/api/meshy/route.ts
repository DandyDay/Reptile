import { NextRequest, NextResponse } from "next/server";

const MESHY_API_KEY = process.env.MESHY_API_KEY;
const MESHY_BASE = "https://api.meshy.ai/openapi/v1/image-to-3d";

const ALLOWED_IMAGE_DOMAINS = ["supabase.co", "supabase.in"];

function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_IMAGE_DOMAINS.some((d) => parsed.hostname.endsWith(d));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!MESHY_API_KEY) {
      return NextResponse.json({ error: "MESHY_API_KEY not configured" }, { status: 500 });
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

      const meshyRes = await fetch(MESHY_BASE, {
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

      const text = await meshyRes.text();
      if (!text) {
        return NextResponse.json({ error: "Empty response from Meshy" }, { status: 502 });
      }
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: meshyRes.ok ? 200 : meshyRes.status });
    }

    if (action === "poll") {
      if (!taskId || typeof taskId !== "string" || taskId.length > 100) {
        return NextResponse.json({ error: "Invalid taskId" }, { status: 400 });
      }

      const meshyRes = await fetch(`${MESHY_BASE}/${encodeURIComponent(taskId)}`, {
        headers: { Authorization: `Bearer ${MESHY_API_KEY}` },
      });

      const text = await meshyRes.text();
      if (!text) {
        return NextResponse.json({ error: "Empty response from Meshy" }, { status: 502 });
      }
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: meshyRes.ok ? 200 : meshyRes.status });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[meshy route error]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
