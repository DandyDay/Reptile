import { NextRequest, NextResponse } from "next/server";

const MESHY_API_KEY = process.env.MESHY_API_KEY;
const MESHY_BASE = "https://api.meshy.ai/openapi/v2/image-to-3d";

export async function POST(req: NextRequest) {
  if (!MESHY_API_KEY) {
    return NextResponse.json({ error: "MESHY_API_KEY not configured" }, { status: 500 });
  }

  const body = await req.json();
  const { action, taskId, imageUrl } = body;

  if (action === "create") {
    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
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
    if (!taskId) {
      return NextResponse.json({ error: "taskId required" }, { status: 400 });
    }

    const res = await fetch(`${MESHY_BASE}/${taskId}`, {
      headers: { Authorization: `Bearer ${MESHY_API_KEY}` },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
