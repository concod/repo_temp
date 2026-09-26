--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:populate_plan_filter_mappings runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:mtp-58202
--comment:  updated populate_plan_filter_mappings for new hierarchy levels.
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.populate_plan_filter_mappings(input integer);
CREATE OR REPLACE FUNCTION plan_smart.populate_plan_filter_mappings(input integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
 declare
   v_channels text[];
   v_classes text := '';
   v_weeeks  text := '';
   v_affected_rows int;
 begin
   select
     channels,
     l3_name,
     weeks
   into
     v_channels,
     v_classes,
     v_weeeks   
   from
     plan_smart.vw_plan_master
   where
     plan_code = $1;
    insert into plan_smart.plan_filter_mappings
    select
      channel::text,
      l3_name::text,
      current_week::int,
      plan_code::int
    from
      (select $1 as plan_code) a
    cross join
      (select unnest(v_channels) as channel) b
    cross join
      (select unnest(v_classes::text[]) as l3_name) c
    cross join 
      (select unnest(v_weeeks::int[]) as current_week) d
    on conflict ON CONSTRAINT pk_plan_filter_mappings do nothing; 
       
   GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
   return v_affected_rows;
 end
 $function$
;
