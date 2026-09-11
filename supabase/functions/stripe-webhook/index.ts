import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const PRICE_IDS = {
  statkeeper: "price_1UEMQ23e6AZi8Uuzv3iUo0uL",
  team_pro: "price_1UEMRT3e6AZi8UuzDxv4jLDJ",
  team_pro_upgrade: "price_1UEMRm3e6AZi8Uuzkedt8YYa",
} as const;

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function verifyStripeSignature(payload: string, header: string, secret: string) {
  const parts = header.split(",").map((part) => part.split("=", 2));
  const timestamp = parts.find(([key]) => key === "t")?.[1] || "";
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`)));
  return signatures.some((signature) => safeEqual(signature, digest));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const payload = await req.text();
  const signature = req.headers.get("Stripe-Signature") || "";
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
  if (!webhookSecret || !(await verifyStripeSignature(payload, signature, webhookSecret))) {
    return new Response("Invalid Stripe signature", { status: 400 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
  const event = JSON.parse(payload);
  const object = event?.data?.object || {};
  const metadata = object?.metadata || {};
  const teamId = metadata.team_id || null;
  const subscriptionId = metadata.subscription_id || null;

  const { error: eventInsertError } = await admin.from("payment_events").insert({
    provider: "stripe", provider_event_id: event.id, event_type: event.type,
    team_id: teamId, user_id: metadata.purchaser_user_id || null,
    subscription_id: subscriptionId, event_data: event, processed: false,
  });
  if (eventInsertError?.code === "23505") return new Response(JSON.stringify({ received: true, duplicate: true }), { headers: { "Content-Type": "application/json" } });
  if (eventInsertError) throw eventInsertError;

  try {
    if (event.type === "checkout.session.completed" && object.payment_status === "paid") {
      const purchaseKind = String(metadata.purchase_kind || "");
      const expectedPrice = PRICE_IDS[purchaseKind as keyof typeof PRICE_IDS];
      if (!teamId || !subscriptionId || !expectedPrice) throw new Error("Checkout metadata is incomplete");

      const linesResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(object.id)}/line_items?limit=1`, {
        headers: { Authorization: `Bearer ${stripeKey}` },
      });
      const lines = await linesResponse.json();
      if (!linesResponse.ok || lines?.data?.[0]?.price?.id !== expectedPrice) throw new Error("Checkout price verification failed");

      const { data: subscription } = await admin.from("team_subscriptions").select("id,team_id,status").eq("id", subscriptionId).eq("team_id", teamId).single();
      if (!subscription) throw new Error("Pending team purchase was not found");
      const now = new Date();
      const oneYear = new Date(now); oneYear.setUTCFullYear(oneYear.getUTCFullYear() + 1);
      const tier = purchaseKind === "statkeeper" ? "statkeeper" : "team_pro";
      const { data: oldEntitlement } = await admin.from("team_entitlements").select("tier,paid_access_starts_at,paid_access_ends_at").eq("team_id", teamId).maybeSingle();
      const existingEnd = oldEntitlement?.paid_access_ends_at ? new Date(oldEntitlement.paid_access_ends_at) : null;
      const accessEnd = purchaseKind === "team_pro_upgrade" && existingEnd && existingEnd > now ? existingEnd : oneYear;

      await admin.from("team_subscriptions").update({ status: "active", current_period_start: now.toISOString(), current_period_end: accessEnd.toISOString(), updated_at: now.toISOString() }).eq("id", subscriptionId);
      await admin.from("team_entitlements").upsert({
        team_id: teamId, tier, trial_used: true, paid_access_starts_at: oldEntitlement?.paid_access_starts_at || now.toISOString(),
        paid_access_ends_at: accessEnd.toISOString(), coach_seat_limit: tier === "team_pro" ? 5 : 5,
        access_source: "stripe", complimentary: false, updated_at: now.toISOString(),
      }, { onConflict: "team_id" });
      await admin.from("entitlement_history").insert({ team_id: teamId, from_tier: oldEntitlement?.tier || null, to_tier: tier, reason: purchaseKind, subscription_id: subscriptionId });
    } else if (event.type === "checkout.session.expired" && subscriptionId) {
      await admin.from("team_subscriptions").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", subscriptionId);
    }

    await admin.from("payment_events").update({ processed: true, processed_at: new Date().toISOString() }).eq("provider", "stripe").eq("provider_event_id", event.id);
    return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("stripe-webhook", error);
    return new Response("Webhook processing failed", { status: 500 });
  }
});
