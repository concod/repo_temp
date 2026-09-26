--liquibase formatted sql
--changeset saran.srirama@impactanalytics.co:get_compatible_plans runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:mtp-40173
--comment: get_associated_plans_from_filters is now specific to client
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.get_associated_plans_from_filters(input text[], text[], integer[]);
CREATE OR REPLACE FUNCTION plan_smart.get_associated_plans_from_filters(input text[], text[], integer[])
 RETURNS integer[]
 LANGUAGE plpgsql
AS $function$
 declare
   v_associated_plans_sql  text;
   v_associated_plans int[];
 begin
 
   v_associated_plans_sql:=
   'select array_agg(distinct plan_code)::text[] as associated_plans
     from plan_smart.plan_filter_mappings
    where channel = ANY(''{"' || array_to_string($1, '","') || '"}'')
      and l2_name = ANY(''{"' || array_to_string($2, '","') || '"}'')
      and current_week = ANY(''{' || array_to_string($3, ',') || '}'')';
   --raise notice 'QUERY: %', v_associated_plans_sql;                   
   execute v_associated_plans_sql into v_associated_plans; 
   return v_associated_plans;
 end
 $function$
;