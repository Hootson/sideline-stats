import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const PRICE_IDS = {
  statkeeper: "price_1UEMQ23e6AZi8Uuzv3iUo0uL",
  team_pro: "price_1UEMRT3e6AZi8UuzDxv4jLDJ",
  team_pro_upgrade: "price_1UEMRm3e6AZi8Uuzkedt8YYa",
} as const;

const PRODUCT_CODES = {
  statkeeper: "statkeeper_season",
  team_pro: "team_pro_season",
  team_pro_upgrade: "team_pro_season",
} as const;

const allowedOrigins = new Set([
  "https://hootson.github.io",
  "https://sidelinestats.net",
  "https://www.sidelinestats.net",
]);

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://hootson.github.io",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json(req, { error: "Stripe Sandbox is not configured yet" }, 503);

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json(req, { error: "Sign in before choosing a plan" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json(req, { error: "Your session has expired. Please sign in again." }, 401);

    const input = await req.json().catch(() => ({}));
    const teamId = String(input?.teamId || "");
    const requestedPlan = String(input?.plan || "");
    if (!/^[0-9a-f-]{36}$/i.test(teamId) || !["statkeeper", "team_pro"].includes(requestedPlan)) {
      return json(req, { error: "Choose a valid team plan" }, 400);
    }

    const [{ data: team }, { data: member }, { data: entitlement }] = await Promise.all([
      admin.from("teams").select("id,owner_user_id,name").eq("id", teamId).maybeSingle(),
      admin.from("team_members").select("is_admin,is_statkeeper,status").eq("team_id", teamId).eq("user_id", user.id).maybeSingle(),
      admin.from("team_entitlements").select("tier,paid_access_starts_at,paid_access_ends_at,access_source,complimentary").eq("team_id", teamId).maybeSingle(),
    ]);
    const authorized = team?.owner_user_id === user.id || (member?.status === "active" && (member.is_admin || member.is_statkeeper));
    if (!team || !authorized) return json(req, { error: "Only this team's statkeeper can purchase a plan" }, 403);
    if (entitlement?.complimentary || ["founder_comp", "internal_test"].includes(entitlement?.access_source)) {
      return json(req, { error: "This team already has complimentary Team Pro access" }, 409);
    }

    const now = Date.now();
    const paidEnd = entitlement?.paid_access_ends_at ? Date.parse(entitlement.paid_access_ends_at) : 0;
    const currentStatkeeper = entitlement?.tier === "statkeeper" && paidEnd > now;
    const purchaseKind = requestedPlan === "team_pro" && currentStatkeeper ? "team_pro_upgrade" : requestedPlan;
    const priceId = PRICE_IDS[purchaseKind as keyof typeof PRICE_IDS];
    const productCode = PRODUCT_CODES[purchaseKind as keyof typeof PRODUCT_CODES];

    const { data: product, error: productError } = await admin.from("billing_products").select("id").eq("code", productCode).eq("active", true).single();
    if (productError || !product) throw new Error("The selected product is not available");
    const { data: subscription, error: subscriptionError } = await admin.from("team_subscriptions").insert({
      team_id: teamId,
      purchaser_user_id: user.id,
      product_id: product.id,
      provider: "stripe",
      provider_price_id: priceId,
      status: "pending",
    }).select("id").single();
    if (subscriptionError || !subscription) throw subscriptionError || new Error("Could not start checkout");

    const appUrl = "https://hootson.github.io/sideline-stats/";
    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("line_items[0][price]", priceId);
    params.set("line_items[0][quantity]", "1");
    params.set("success_url", `${appUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
    params.set("cancel_url", `${appUrl}?checkout=cancelled`);
    params.set("client_reference_id", teamId);
    if (user.email) params.set("customer_email", user.email);
    params.set("metadata[team_id]", teamId);
    params.set("metadata[purchaser_user_id]", user.id);
    params.set("metadata[subscription_id]", subscription.id);
    params.set("metadata[purchase_kind]", purchaseKind);
    params.set("payment_intent_data[metadata][team_id]", teamId);
    params.set("payment_intent_data[metadata][subscription_id]", subscription.id);
    params.set("payment_intent_data[metadata][purchase_kind]", purchaseKind);

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const session = await stripeResponse.json();
    if (!stripeResponse.ok || !session?.url) {
      await admin.from("team_subscriptions").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", subscription.id);
      throw new Error(session?.error?.message || "Stripe could not open checkout");
    }
    await admin.from("team_subscriptions").update({ provider_subscription_id: session.id, updated_at: new Date().toISOString() }).eq("id", subscription.id);
    return json(req, { url: session.url });
  } catch (error) {
    console.error("create-stripe-checkout", error);
    return json(req, { error: error instanceof Error ? error.message : "Checkout could not be started" }, 500);
  }
});
