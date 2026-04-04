//API Route: POST /api/alert-rules

import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    //cet user for auth
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    const body = await request.json();

    //validate fields
    if (!body.metric_type || !body.threshold_value || !body.operator || !body.severity) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: metric_type, threshold_value, operator, severity",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    // fwd to fastapi
    const fastApiUrl = process.env.FASTAPI_URL || "http://localhost:8000";
    const response = await fetch(`${fastApiUrl}/alert-rules`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[api/alert-rules] Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
