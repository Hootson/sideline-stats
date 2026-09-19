begin;

revoke all on function public.claim_debrief_workflow_job(text) from public, anon, authenticated;
revoke all on function public.finish_debrief_workflow_job(text,boolean,text) from public, anon, authenticated;
revoke all on function public.publish_generated_coach_read(text,jsonb,text,text,text) from public, anon, authenticated;

grant execute on function public.claim_debrief_workflow_job(text) to service_role;
grant execute on function public.finish_debrief_workflow_job(text,boolean,text) to service_role;
grant execute on function public.publish_generated_coach_read(text,jsonb,text,text,text) to service_role;

commit;
