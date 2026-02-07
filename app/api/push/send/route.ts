import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // ✅ Set VAPID details at request-time (avoids build-time crash)
    const subject = process.env.VAPID_SUBJECT;
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!subject) return new NextResponse("Missing VAPID_SUBJECT", { status: 500 });
    if (!publicKey) return new NextResponse("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY", { status: 500 });
    if (!privateKey) return new NextResponse("Missing VAPID_PRIVATE_KEY", { status: 500 });

    webpush.setVapidDetails(subject, publicKey, privateKey);

    // ✅ Auth via Bearer token from admin page
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";

    if (!token) return new NextResponse("Not authenticated", { status: 401 });

    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userRes?.user) return new NextResponse("Not authenticated", { status: 401 });

    const { data: profile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userRes.user.id)
      .maybeSingle();

    if (profErr) return new NextResponse(profErr.message, { status: 500 });
    if (profile?.role !== "admin") return new NextResponse("Forbidden (admin only)", { status: 403 });

    const { title, body, url } = await req.json();

    const { data: subs, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth");

    if (error) return new NextResponse(error.message, { status: 500 });

    const payload = JSON.stringify({
      title: title || "Wiseman West FC",
      body: body || "Update",
      url: url || "/",
    });

    const results = await Promise.allSettled(
      (subs || []).map((s) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        )
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - sent;

    return NextResponse.json({ ok: true, sent, failed });
  } catch (e: any) {
    return new NextResponse(e?.message || "Server error", { status: 500 });
  }
}
