--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:delete_plan_v3_changes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Plan Smart V3 Architecture changes in delete_plan_code
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.delete_plan(p_plan_status integer);
CREATE OR REPLACE FUNCTION plan_smart.delete_plan(p_plan_status integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
-- Usuage : 
-- select plan_smart.delete_plan(3)
declare
  v_plan       int[];
  v_return     boolean;
begin
  select array_agg(plan_code) 
    into v_plan
    from plan_smart.vw_plan_master
   where status = p_plan_status;   
  select * into v_return from plan_smart.delete_plan(v_plan); 
  return v_return;
end
$function$
;


DROP FUNCTION IF EXISTS plan_smart.delete_plan(p_plan_code integer[]);
CREATE OR REPLACE FUNCTION plan_smart.delete_plan(p_plan_code integer[])
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 -- Usuage : 
 -- select plan_smart.delete_plan('{1508,1509}'::int[])
 declare 
   v_plan_type     text;
   v_channel       text;
   v_classes       text;
   v_classes_codes int[];
   v_weeks         text;
   v_status        int;
   v_plan_code     int;
   v_week          int;
   v_class         text;
   v_sql           text;
   v_return        boolean := false;
   i               record;
 begin	
   foreach v_plan_code in array p_plan_code
   loop
     select
       coalesce(plan_type,'SALES') as plan_type,
       channel,
       l2_name,
       weeks,
       status
     into
       v_plan_type,
       v_channel,
       v_classes,
       v_weeks,
       v_status
     from
       plan_smart.vw_plan_master 
     where
       plan_code = v_plan_code;     
     
     for i in (select distinct plan_table,product_hierarchy_filter_level 
                 from plan_smart.query_source_mappings qsm 
                where plan_status  = v_status
                  and plan_type    = v_plan_type
              )
     loop
	   v_sql := format('select array_agg(hierarchy_code)
                          from plan_smart.product_hierarchies_filter phf 
                         where l2_name = any(%L)
	                       and level = %L'
                      ,v_classes
                      ,i.product_hierarchy_filter_level
                      );
       execute v_sql into v_classes_codes;
      
       v_sql = format('delete from %s
                        where channel = %L
                          and current_week = ANY(%L)
                          and hierarchy_code = ANY(%L)' 
                       ,i.plan_table
                       ,v_channel
                       ,v_weeks
                       ,v_classes_codes
                       );
       raise notice '%', v_sql;
       execute v_sql;
 	 end loop;
 	
     v_sql := 'drop table if exists plan_smart.plan_modifictions_'||v_plan_code;
     raise notice '%', v_sql;
     execute v_sql;
    
     delete from plan_smart.plan_filter_mappings where plan_code = v_plan_code;
    
     update plan_smart.plan_master
     set is_deleted = true
     where plan_code = v_plan_code;
    
   end loop;
   v_return := true;
   return v_return;
 end
 $function$
;

DROP FUNCTION IF EXISTS plan_smart.delete_plan(p_season text[]);
CREATE OR REPLACE FUNCTION plan_smart.delete_plan(p_season text[])
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
-- Usuage : 
-- select plan_smart.delete_plan('{"in-season"}')
declare
  v_season     text;
  v_plan       int[];
  v_return     boolean;
begin
  foreach v_season in array p_season
  loop
    select array_agg(plan_code) 
      into v_plan
      from plan_smart.vw_plan_master
     where plan_type_desc = v_season;   
    select * into v_return from plan_smart.delete_plan(v_plan); 
  end loop;
  return v_return;
end
$function$
;
