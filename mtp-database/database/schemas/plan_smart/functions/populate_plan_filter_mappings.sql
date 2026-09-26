--liquibase formatted sql
--changeset liquibase:populate_plan_filter_mappings runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for populate_plan_filter_mappings
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.populate_plan_filter_mappings(input integer);
CREATE OR REPLACE FUNCTION plan_smart.populate_plan_filter_mappings(input integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
 declare
   v_channel text:='';
   v_classes text := '';
   v_weeeks  text := '';
   v_affected_rows int;
 begin
   select
     channel,
     l2_name,
     weeks
   into
     v_channel,
     v_classes,
     v_weeeks   
   from
     plan_smart.vw_plan_master
   where
     plan_code = $1;
    insert into plan_smart.plan_filter_mappings
    select
      channel::text,
      l2_name::text,
      current_week::int,
      plan_code::int
    from
      (select $1 as plan_code) a
    cross join
      (select v_channel as channel) b
    cross join
      (select unnest(v_classes::text[]) as l2_name) c
    cross join 
      (select unnest(v_weeeks::int[]) as current_week) d
    on conflict ON CONSTRAINT pk_plan_filter_mappings do nothing; 
       
   GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
   return v_affected_rows;
 end
 $function$

;