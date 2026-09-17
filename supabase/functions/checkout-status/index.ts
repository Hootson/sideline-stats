import { createClient } from "npm:@supabase/supabase-js@2.57.4";
const allowedOrigins=new Set(["https://hootson.github.io","https://sidelinestats.net","https://www.sidelinestats.net"]);
function cors(req:Request){const origin=req.headers.get("origin")||"";return {"Access-Control-Allow-Origin":allowedOrigins.has(origin)?origin:"https://hootson.github.io","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"}}
function json(req:Request,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors(req),"Content-Type":"application/json"}})}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors(req)});if(req.method!=="POST")return json(req,{error:"Method not allowed"},405);
 try{
  const authHeader=req.headers.get("Authorization")||"";if(!authHeader.startsWith("Bearer "))return json(req,{error:"Sign in to verify checkout"},401);
  const supabaseUrl=Deno.env.get("SUPABASE_URL")!,anonKey=Deno.env.get("SUPABASE_ANON_KEY")!,serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,userClient=createClient(supabaseUrl,anonKey,{global:{headers:{Authorization:authHeader}}}),admin=createClient(supabaseUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:userError}=await userClient.auth.getUser();if(userError||!user)return json(req,{error:"Your session has expired. Please sign in again."},401);
  const input=await req.json().catch(()=>({})),sessionId=String(input?.sessionId||"");if(!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId))return json(req,{error:"Invalid checkout session"},400);
  const {data:subscription,error:subscriptionError}=await admin.from("team_subscriptions").select("id,team_id,status,current_period_end,provider_price_id").eq("provider","stripe").eq("provider_subscription_id",sessionId).eq("purchaser_user_id",user.id).maybeSingle();if(subscriptionError)throw subscriptionError;if(!subscription)return json(req,{error:"Checkout session not found"},404);
  const stripeKey=Deno.env.get("STRIPE_SECRET_KEY");if(!stripeKey)return json(req,{error:"Checkout verification is unavailable"},503);
  const stripeResponse=await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,{headers:{Authorization:`Bearer ${stripeKey}`}}),stripeSession=await stripeResponse.json();if(!stripeResponse.ok)throw new Error("Stripe could not verify this checkout");if(stripeSession.client_reference_id!==subscription.team_id||stripeSession?.metadata?.subscription_id!==subscription.id)throw new Error("Checkout ownership verification failed");
  const {data:entitlement,error:entitlementError}=await admin.from("team_entitlements").select("tier,paid_access_ends_at").eq("team_id",subscription.team_id).maybeSingle();if(entitlementError)throw entitlementError;
  const paid=stripeSession.payment_status==="paid",active=subscription.status==="active"&&["statkeeper","team_pro","coach"].includes(entitlement?.tier)&&Date.parse(entitlement?.paid_access_ends_at||"")>Date.now();return json(req,{paid,active,status:subscription.status,tier:entitlement?.tier||null,accessEndsAt:entitlement?.paid_access_ends_at||subscription.current_period_end||null});
 }catch(error){console.error("checkout-status",error);return json(req,{error:error instanceof Error?error.message:"Checkout could not be verified"},500)}
});
