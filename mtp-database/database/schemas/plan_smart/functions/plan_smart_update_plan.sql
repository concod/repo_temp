--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.com:plan_smart_update_plan runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-22118
--comment: initial changeset for plan_smart_update_plan
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.plan_smart_update_plan(jsonb);
CREATE OR REPLACE FUNCTION plan_smart.plan_smart_update_plan(jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
--Usage 
--select * 
--from plan_smart.plan_smart_update_plan('{"plan_code" : 428, "user_code" : 155 , "action_code" : "match_with_ly", "comment" : ""}'::jsonb);
declare
  v_updated_at timestamptz := now();
begin
  update plan_smart.plan_master 
     set updated_by  = ($1::jsonb ->> 'user_code')::int 
        ,updated_at=v_updated_at
   where plan_code   = ($1::jsonb ->> 'plan_code')::int;
  
  --insert record in audit table
  insert into plan_smart.plan_master_audit
        (plan_code
        ,action_code
        ,user_code
        ,comment
        ,plan_actioned_ts
        )
  values(
        ($1::jsonb  ->> 'plan_code')::int
        ,($1::jsonb ->> 'action_code')::text
        ,($1::jsonb ->> 'user_code')::int
        ,($1::jsonb ->> 'comment')::text
        ,v_updated_at
        );
  return true;
end
$function$
;
