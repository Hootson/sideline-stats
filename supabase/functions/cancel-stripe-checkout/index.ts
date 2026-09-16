import { createClient } from "npm:@supabase/supabase-js@2.57.4";
const allowedOrigins=new Set(["https://hootson.github.io","https://sidelinestats.net","https://www.sidelinestats.net"]);
function cors(req:Request){const origin=req.headers.get("origin")||"";return {"Access-Control-Allow-Origin":allowedOrigins.has(origin)?origin:"https://hootson.github.io","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"}}
function json(req:Request,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors(req),"Content-Type":"application/json"}})}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors(req)});if(req.method!=="POST")return json(req,{error:"Method not allowed"},405);
 try{
  const authorization=req.headers.get("Authorization")||"";if(!authorization.startsWith("Bearer "))return json(req,{error:"Authentication required"},401);
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient=createClient(url,anon,{global:{headers:{Authorization:authorization}}}),admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:userError}=await userClient.auth.getUser();if(userError||!user)return json(req,{error:"Authentication required"},401);
  const input=await req.json().catch(()=>({})),subscriptionId=String(input?.subscriptionId||"");if(!/^[0-9a-f-]{36}$/i.test(subscriptionId))return json(req,{error:"Invalid checkout"},400);
  const {data:sub,error:subError}=await admin.from("team_subscriptions").select("id,team_id,purchaser_user_id,status,provider_price_id").eq("id",subscriptionId).maybeSingle();if(subError)throw subError;if(!sub)return json(req,{ok:true,ignored:true});
  if(sub.purchaser_user_id!==user.id)return json(req,{error:"Checkout does not belong to this account"},403);
  if(sub.status!=="pending")return json(req,{ok:true,status:sub.status});
  const now=new Date().toISOString();
  const {error:updateError}=await admin.from("team_subscriptions").update({status:"cancelled",cancelled_at:now,updated_at:now}).eq("id",sub.id).eq("status","pending");if(updateError)throw updateError;
  const {error:eventError}=await admin.from("analytics_events").insert({event_name:"checkout_cancelled",user_id:user.id,team_id:sub.team_id,properties:{subscription_id:sub.id,provider_price_id:sub.provider_price_id}});if(eventError)console.warn("checkout_cancelled analytics skipped",eventError.message);
  return json(req,{ok:true,status:"cancelled"});
 }catch(error){console.error("cancel-stripe-checkout",error);return json(req,{error:error instanceof Error?error.message:"Could not record cancellation"},500)}
});
