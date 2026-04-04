import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    //auth user session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }
    //parse query params
    const url = new URL(request.url);
    const table = url.searchParams.get("table");
    const action = url.searchParams.get("action");
    const limit = url.searchParams.get("limit") || "200";

    //make fastapi url w query params
    const queryParams = new URLSearchParams();
    if (table) queryParams.append("table", table);
    if (action) queryParams.append("action", action);
    queryParams.append("limit", limit);

    //fwd to fastapi
    const fastApiUrl = process.env.FASTAPI_URL || "http://localhost:8000";
    const response = await fetch(
      `${fastApiUrl}/audit?${queryParams.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      }
    );
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[api/audit] Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
