import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOST = "assets.meshy.ai";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return new NextResponse("Missing url param", { status: 400 });
  }

  // Validate the URL is from Meshy's CDN
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== ALLOWED_HOST) {
      return new NextResponse("Invalid host", { status: 400 });
    }
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return new NextResponse("Upstream fetch failed", { status: upstream.status });
    }

    // Stream the GLB through with proper headers
    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": "model/gltf-binary",
        "Cache-Control": "public, max-age=604800", // 7 days
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("[glb proxy error]", err);
    return new NextResponse("Proxy error", { status: 502 });
  }
}
