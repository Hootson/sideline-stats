import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import webpush from "npm:web-push@3.6.7";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const text = (value: unknown) => String(value ?? "").trim();
const num = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const sha256 = async (value: string) => {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

type Job = { job_id: string; cycle_id: string; game_id: string; job_kind: "notify_open" | "generate_read" | "notify_published" };

function outputText(response: any) {
  if (typeof response?.output_text === "string") return response.output_text;
  for (const item of response?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return "";
}

function playSummary(row: any) {
  const raw = row?.event_data?.raw || {};
  return {
    sequence: num(row.sequence),
    quarter: num(row.quarter),
    possession: row.possession,
    down: row.down,
    distance: row.distance,
    play_type: row.play_type,
    subtype: row.subtype,
    yards: row.yards,
    first_down: !!row.first_down,
    turnover: !!row.turnover,
    team_points: num(row.team_points),
    opponent_points: num(row.opponent_points),
    play_call: raw.playCall ? { number: raw.playCall.number, name: raw.playCall.name } : null,
    defensive_events: {
      sack: raw.sub === "Sack" || raw.tackleKind === "Sack",
      interception: !!raw.interceptionPlayerId || raw.sub === "INT",
      forced_fumble: !!raw.forcedFumblePlayerId,
      fumble_recovery: !!raw.fumbleRecoveryPlayerId,
    },
  };
}

function redactCoachText(value: string, players: any[]) {
  let result = value;
  for (const player of players || []) {
    const name = text(player.name);
    const jersey = text(player.jersey_number);
    if (!name) continue;
    result = result.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), jersey ? `#${jersey}` : "a player");
  }
  return result.slice(0, 12000);
}

async function gameContext(admin: any, gameId: string) {
  const { data: game, error: gameError } = await admin.from("games").select("*").eq("id", gameId).single();
  if (gameError) throw gameError;
  const [{ data: season, error: seasonError }, { data: plays, error: playsError }, { data: debriefs, error: debriefError }] = await Promise.all([
    admin.from("seasons").select("id,team_id,name,season_year").eq("id", game.season_id).single(),
    admin.from("plays").select("id,sequence,quarter,possession,down,distance,play_type,subtype,yards,first_down,turnover,team_points,opponent_points,event_data").eq("game_id", gameId).is("deleted_at", null).order("sequence"),
    admin.from("coach_debriefs").select("structured_context,energy_rating,execution_rating,status").eq("game_id", gameId).eq("status", "submitted"),
  ]);
  if (seasonError) throw seasonError;
  if (playsError) throw playsError;
  if (debriefError) throw debriefError;
  const [{ data: team, error: teamError }, { data: players, error: playersError }] = await Promise.all([
    admin.from("teams").select("id,name,grade").eq("id", season.team_id).single(),
    admin.from("players").select("id,jersey_number,name").eq("season_id", season.id).eq("active", true),
  ]);
  if (teamError) throw teamError;
  if (playersError) throw playersError;
  const submitted = (debriefs || []).map((d: any) => ({
    energy_rating: d.energy_rating,
    execution_rating: d.execution_rating,
    observations: Object.fromEntries(Object.entries(d.structured_context || {}).filter(([key, value]) => key !== "coach_name" && text(value)).map(([key, value]) => [key, redactCoachText(text(value), players || [])])),
  }));
  return {
    team: { name: team.name, grade: team.grade, season: season.name },
    game: {
      week: game.week_number,
      opponent: game.opponent_name,
      location: game.location_type,
      team_score: game.team_score,
      opponent_score: game.opponent_score,
    },
    plays: (plays || []).map(playSummary),
    coach_debriefs: submitted,
  };
}

async function generateCoachRead(admin: any, job: Job, token: string) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  const model = Deno.env.get("OPENAI_DEBRIEF_MODEL") || "gpt-5-mini";
  const context = await gameContext(admin, job.game_id);
  const sourceMode = context.coach_debriefs.length ? "data_and_debrief" : "data_only";
  const snapshot = JSON.stringify(context);
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      overview: { type: "string" },
      offense: { type: "string" },
      defense: { type: "string" },
      play_calls: { type: "string" },
      personnel: { type: "string" },
      practice_priorities: { type: "string" },
    },
    required: ["overview", "offense", "defense", "play_calls", "personnel", "practice_priorities"],
  };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: "You write concise, practical postgame coaching reads for youth football. Treat recorded statistics as facts. Treat coach observations as context, not verified facts. Reconcile the two naturally without labeling separate data and human sections. Do not invent plays, causes, player identities, or diagnoses. Use no player names; jersey numbers are allowed. Each section must be 1-3 useful sentences. If the sample is thin, say so. Practice priorities must be specific and age-appropriate." }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: `Create the combined Coaching Read from this game snapshot. Source mode: ${sourceMode}.\n${snapshot}` }],
        },
      ],
      text: { format: { type: "json_schema", name: "sideline_stats_coach_read", strict: true, schema } },
    }),
  });
  const responseBody = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(responseBody?.error?.message || `OpenAI request failed (${response.status})`);
  const raw = outputText(responseBody);
  if (!raw) throw new Error("OpenAI returned no Coaching Read");
  const sections = JSON.parse(raw);
  const snapshotHash = await sha256(snapshot);
  const { data: published, error } = await admin.rpc("publish_generated_coach_read", {
    p_token: token,
    p_sections: sections,
    p_source_mode: sourceMode,
    p_model: model,
    p_snapshot_hash: snapshotHash,
  });
  if (error) throw error;
  if (!published) throw new Error("The generated Coaching Read could not be published");
  return { sourceMode, model };
}

async function sendEmail(to: string, notification: any) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM_EMAIL");
  if (!apiKey || !from) return { status: "unconfigured" };
  const link = `https://hootson.github.io/sideline-stats${notification.action_url || "/"}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: notification.title,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.5;max-width:560px"><h2>${notification.title}</h2><p>${notification.body}</p><p><a href="${link}" style="display:inline-block;background:#111;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Open Sideline Stats</a></p><p style="color:#666;font-size:13px">Sideline Stats • Gridiron Edition</p></div>`,
    }),
  });
  if (!response.ok) throw new Error(`Email delivery failed (${response.status})`);
  return { status: "sent", sent_at: new Date().toISOString() };
}

async function sendPush(subscription: any, notification: any) {
  const subject = Deno.env.get("VAPID_SUBJECT");
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!subject || !publicKey || !privateKey) return { status: "unconfigured" };
  webpush.setVapidDetails(subject, publicKey, privateKey);
  await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth_secret } }, JSON.stringify({
    title: notification.title,
    body: notification.body,
    url: `https://hootson.github.io/sideline-stats${notification.action_url || "/"}`,
    tag: notification.dedupe_key,
  }));
  return { status: "sent", sent_at: new Date().toISOString() };
}

async function deliverNotifications(admin: any, job: Job) {
  const type = job.job_kind === "notify_open" ? "debrief_opened" : "coach_read_published";
  const { data: notifications, error } = await admin.from("user_notifications").select("*").eq("game_id", job.game_id).eq("notification_type", type);
  if (error) throw error;
  for (const notification of notifications || []) {
    const state: Record<string, unknown> = { ...(notification.channel_state || {}) };
    try {
      const { data: user } = await admin.auth.admin.getUserById(notification.user_id);
      if (user?.user?.email && (state.email as any)?.status !== "sent") state.email = await sendEmail(user.user.email, notification);
    } catch (error) {
      state.email = { status: "failed", error: text((error as Error).message).slice(0, 200) };
    }
    const { data: subscriptions } = await admin.from("push_subscriptions").select("*").eq("user_id", notification.user_id).eq("active", true);
    const pushResults = [];
    for (const subscription of subscriptions || []) {
      try { pushResults.push(await sendPush(subscription, notification)); }
      catch (error) {
        pushResults.push({ status: "failed", error: text((error as Error).message).slice(0, 200) });
        if (["410", "404"].some((code) => text((error as Error).message).includes(code))) await admin.from("push_subscriptions").update({ active: false }).eq("id", subscription.id);
      }
    }
    state.push = pushResults.length ? pushResults : [{ status: "no_subscription" }];
    await admin.from("user_notifications").update({ channel_state: state, updated_at: new Date().toISOString() }).eq("id", notification.id);
  }
  return { delivered: (notifications || []).length };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.action === "config") return json({
      vapidPublicKey: Deno.env.get("VAPID_PUBLIC_KEY") || null,
      capabilities: {
        ai: Boolean(Deno.env.get("OPENAI_API_KEY")),
        email: Boolean(Deno.env.get("RESEND_API_KEY") && Deno.env.get("RESEND_FROM_EMAIL")),
        push: Boolean(Deno.env.get("VAPID_PUBLIC_KEY") && Deno.env.get("VAPID_PRIVATE_KEY") && Deno.env.get("VAPID_SUBJECT")),
      },
    });
    const token = text(body?.job_token);
    if (token.length < 64) return json({ error: "Invalid workflow token" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: claimed, error: claimError } = await admin.rpc("claim_debrief_workflow_job", { p_token: token });
    if (claimError) throw claimError;
    const job = (claimed || [])[0] as Job | undefined;
    if (!job) return json({ ok: true, duplicate: true });
    try {
      const result = job.job_kind === "generate_read" ? await generateCoachRead(admin, job, token) : await deliverNotifications(admin, job);
      if (job.job_kind !== "generate_read") {
        const { error } = await admin.rpc("finish_debrief_workflow_job", { p_token: token, p_success: true, p_error: null });
        if (error) throw error;
      }
      return json({ ok: true, job: job.job_kind, result });
    } catch (error) {
      await admin.rpc("finish_debrief_workflow_job", { p_token: token, p_success: false, p_error: text((error as Error).message) });
      throw error;
    }
  } catch (error) {
    console.error("coach-debrief-workflow", error);
    return json({ error: text((error as Error).message) || "Workflow failed" }, 500);
  }
});
