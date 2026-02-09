// Supabase Edge Function: dispatch-worker
// Optional worker trigger that calls the app backend queue processor.
// Env vars required in Supabase:
// - DISPATCH_TARGET_URL (ex: https://ifoodbag.com.br/api/jobs/dispatch)
// - DISPATCH_TOKEN (same as DISPATCH_CRON_TOKEN in app backend)

Deno.serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const target = Deno.env.get("DISPATCH_TARGET_URL") || "";
  const token = Deno.env.get("DISPATCH_TOKEN") || "";
  if (!target) {
    return new Response(JSON.stringify({ error: "missing_dispatch_target_url" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(target);
  if (token) {
    url.searchParams.set("token", token);
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const text = await response.text();
  return new Response(text, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
});
