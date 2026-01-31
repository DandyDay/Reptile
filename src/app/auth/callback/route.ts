import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const error = requestUrl.searchParams.get("error");
    const errorDescription = requestUrl.searchParams.get("error_description");

    // Handle OAuth errors
    if (error) {
        console.error("OAuth error:", error, errorDescription);
        return NextResponse.redirect(
            `${requestUrl.origin}?error=${encodeURIComponent(errorDescription || error)}`
        );
    }

    if (code) {
        const cookieStore = cookies();
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

        try {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

            if (exchangeError) {
                console.error("Session exchange error:", exchangeError);
                return NextResponse.redirect(
                    `${requestUrl.origin}?error=${encodeURIComponent(exchangeError.message)}`
                );
            }
        } catch (err) {
            console.error("Unexpected error during session exchange:", err);
            return NextResponse.redirect(
                `${requestUrl.origin}?error=${encodeURIComponent("로그인 처리 중 오류가 발생했습니다.")}`
            );
        }
    }

    // Redirect to home page after successful authentication
    return NextResponse.redirect(requestUrl.origin);
}
