import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const supabase = supabaseServer();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Check admin
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .single();

  if (me?.role !== "admin") {
    return NextResponse.json({ error: "Not admin" }, { status: 403 });
  }

  const body = await req.json();

  const { error } = await supabase
    .from("player_stats")
    .update({
      appearances: body.appearances,
      goals: body.goals,
      assists: body.assists,
      clean_sheets: body.clean_sheets,
      motm: body.motm,
    })
    .eq("player_id", body.player_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
