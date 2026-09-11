import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) throw new Error("Authentication required");
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authClient = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) throw new Error("Authentication required");
    if (user.app_metadata?.platform_admin !== true) {
      return new Response(JSON.stringify({ error: "Owner access is required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(url, serviceRole, { auth: { persistSession: false } });
    const [usersResult, teamsResult, entitlementsResult, gamesResult, playsResult] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      admin.from("teams").select("id,intended_plan,created_at", { count: "exact" }),
      admin.from("team_entitlements").select("tier,trial_started_at,trial_ends_at,paid_access_starts_at,complimentary"),
      admin.from("games").select("id", { count: "exact", head: true }),
      admin.from("plays").select("id", { count: "exact", head: true }).is("deleted_at", null),
    ]);
    if (usersResult.error) throw usersResult.error;
    if (teamsResult.error) throw teamsResult.error;
    if (entitlementsResult.error) throw entitlementsResult.error;
    if (gamesResult.error) throw gamesResult.error;
    if (playsResult.error) throw playsResult.error;

    const users = usersResult.data.users || [];
    const teams = teamsResult.data || [];
    const entitlements = entitlementsResult.data || [];
    const now = Date.now();
    const trialsStarted = entitlements.filter((x) => x.trial_started_at).length;
    const activeTrials = entitlements.filter((x) => x.tier === "trial" && new Date(x.trial_ends_at || 0).getTime() > now).length;
    const paidTeams = entitlements.filter((x) => !x.complimentary && ["statkeeper", "team_pro"].includes(x.tier) && x.paid_access_starts_at).length;
    const planIntent = ["statkeeper", "team_pro"].map((plan) => ({ plan, count: teams.filter((x) => x.intended_plan === plan).length }));
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - (13 - i));
      const next = new Date(d); next.setUTCDate(next.getUTCDate() + 1);
      return { day: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }), count: users.filter((x) => { const t = new Date(x.created_at).getTime(); return t >= d.getTime() && t < next.getTime(); }).length };
    });
    const max = Math.max(1, ...days.map((x) => x.count));
    const recentSignups = days.map((x) => ({ ...x, percent: Math.round((x.count / max) * 100) }));
    return new Response(JSON.stringify({
      accounts: users.length, teams: teamsResult.count ?? teams.length, trialsStarted, activeTrials, paidTeams,
      conversionRate: trialsStarted ? Math.round((paidTeams / trialsStarted) * 100) : 0,
      games: gamesResult.count || 0, plays: playsResult.count || 0, planIntent, recentSignups,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || "Could not load metrics" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
