const SUPABASE_URL='https://eyuvgzhkhcpwtcbmsvct.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_uMOkwO4jyHen4pz4zCkIuQ_Ss-wUf2l';
const AUTH_KEY='sb-eyuvgzhkhcpwtcbmsvct-hardcourt-auth-token';
const authOptions={auth:{storageKey:AUTH_KEY,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}};
if(window.supabase?.createClient){
  const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,authOptions);
  const session=(await sb.auth.getSession()).data?.session;
  if(!session?.user){
    const {runHardcourtAccountGate}=await import('./account-gate.js');
    await runHardcourtAccountGate(sb);
  }
}
await import('./app.js');
