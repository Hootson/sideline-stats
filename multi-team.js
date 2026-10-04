(function(){
  const URL='https://eyuvgzhkhcpwtcbmsvct.supabase.co',KEY='sb_publishable_uMOkwO4jyHen4pz4zCkIuQ_Ss-wUf2l';let sb=null,user=null;
  async function context(){if(!window.supabase?.createClient)throw new Error('Cloud service unavailable');if(!sb)sb=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});const r=await sb.auth.getSession();user=r.data?.session?.user||null;if(!user)throw new Error('Sign in first');return {sb,user,session:r.data.session}}
  async