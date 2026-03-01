import { NextRequest, NextResponse } from "next/server";

const MESHY_API_KEY = process.env.MESHY_API_KEY;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  if (!MESHY_API_KEY) {
    return NextResponse.json({ error: "MESHY_API_KEY not configured" }, { status: 500 });
  }

  const { taskId } = await params;
  if (!taskId || taskId.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(taskId)) {
    return NextResponse.json({ error: "Invalid taskId" }, { status: 400 });
  }

  try {
    const meshyRes = await fetch(
      `https://api.meshy.ai/openapi/v1/image-to-3d/${encodeURIComponent(taskId)}/stream`,
      {
        headers: {
          Authorization: `Bearer ${MESHY_API_KEY}`,
          Accept: "text/event-stream",
        },
      }
    );

    if (!meshyRes.ok || !meshyRes.body) {
      return NextResponse.json({ error: "Failed to connect to Meshy stream" }, { status: 502 });
    }

    // Proxy the SSE stream directly to the client
    return new Response(meshyRes.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("[meshy stream error]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
