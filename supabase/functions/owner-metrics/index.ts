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
    const [usersResult, teamsResult, entitlementsResult, subscriptionsResult, gamesResult, playsResult] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      admin.from("teams").select("id,name,owner_user_id,intended_plan,created_at", { count: "exact" }),
      admin.from("team_entitlements").select("team_id,tier,trial_used,trial_started_at,trial_ends_at,paid_access_starts_at,paid_access_ends_at,complimentary,access_source"),
      admin.from("team_subscriptions").select("team_id,status,created_at,current_period_start,current_period_end"),
      admin.from("games").select("id", { count: "exact", head: true }),
      admin.from("plays").select("id", { count: "exact", head: true }).is("deleted_at", null),
    ]);
    for (const result of [usersResult, teamsResult, entitlementsResult, subscriptionsResult, gamesResult, playsResult]) if (result.error) throw result.error;

    const users = usersResult.data.users || [];
    const teams = teamsResult.data || [];
    const entitlements = entitlementsResult.data || [];
    const subscriptions = subscriptionsResult.data || [];
    const now = Date.now();
    const trialRows = entitlements.filter((x) => !!x.trial_started_at && !x.complimentary);
    const trialsStarted = trialRows.length;
    const convertedRows = trialRows.filter((x) => !!x.paid_access_starts_at && ["statkeeper", "team_pro"].includes(x.tier));
    const paidTeams = entitlements.filter((x) => !x.complimentary && !!x.paid_access_starts_at && ["statkeeper", "team_pro"].includes(x.tier)).length;
    const activeTrials = trialRows.filter((x) => !x.paid_access_starts_at && new Date(x.trial_ends_at || 0).getTime() > now).length;
    const expiredNoPurchase = trialRows.filter((x) => !x.paid_access_starts_at && new Date(x.trial_ends_at || 0).getTime() <= now).length;
    const conversionRate = trialsStarted ? Math.round((convertedRows.length / trialsStarted) * 1000) / 10 : 0;
    const conversionHours = convertedRows.map((x) => (new Date(x.paid_access_starts_at).getTime() - new Date(x.trial_started_at).getTime()) / 3600000).filter((x) => Number.isFinite(x) && x >= 0);
    const averageHoursToPurchase = conversionHours.length ? Math.round((conversionHours.reduce((a,b)=>a+b,0) / conversionHours.length) * 10) / 10 : null;
    const checkoutStarted = subscriptions.length;
    const checkoutCompleted = subscriptions.filter((x) => x.status === "active").length;
    const checkoutAbandoned = subscriptions.filter((x) => ["expired","cancelled"].includes(x.status)).length;
    const planIntent = ["statkeeper", "team_pro"].map((plan) => ({ plan, count: teams.filter((x) => x.intended_plan === plan).length }));
    const emailByUser = new Map(users.map((x) => [x.id, x.email || null]));
    const teamById = new Map(teams.map((x) => [x.id, x]));
    const recentTrials = trialRows
      .map((x) => {
        const team = teamById.get(x.team_id);
        const paid = !!x.paid_access_starts_at && ["statkeeper", "team_pro"].includes(x.tier);
        const ended = new Date(x.trial_ends_at || 0).getTime() <= now;
        return {
          teamId: x.team_id,
          teamName: team?.name || "Unknown team",
          ownerEmail: team?.owner_user_id ? emailByUser.get(team.owner_user_id) || null : null,
          planIntent: team?.intended_plan || null,
          tier: x.tier,
          trialStartedAt: x.trial_started_at,
          trialEndsAt: x.trial_ends_at,
          paidAt: x.paid_access_starts_at,
          status: paid ? "purchased" : ended ? "expired" : "active_trial",
        };
      })
      .sort((a,b) => new Date(b.trialStartedAt || 0).getTime() - new Date(a.trialStartedAt || 0).getTime())
      .slice(0,50);
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - (13 - i));
      const next = new Date(d); next.setUTCDate(next.getUTCDate() + 1);
      return { day: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }), count: users.filter((x) => { const t = new Date(x.created_at).getTime(); return t >= d.getTime() && t < next.getTime(); }).length };
    });
    const max = Math.max(1, ...days.map((x) => x.count));
    const recentSignups = days.map((x) => ({ ...x, percent: Math.round((x.count / max) * 100) }));
    return new Response(JSON.stringify({
      accounts: users.length,
      teams: teamsResult.count ?? teams.length,
      trialsStarted,
      activeTrials,
      expiredNoPurchase,
      convertedTrials: convertedRows.length,
      paidTeams,
      conversionRate,
      averageHoursToPurchase,
      checkoutStarted,
      checkoutCompleted,
      checkoutAbandoned,
      games: gamesResult.count || 0,
      plays: playsResult.count || 0,
      planIntent,
      recentSignups,
      recentTrials,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || "Could not load metrics" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
