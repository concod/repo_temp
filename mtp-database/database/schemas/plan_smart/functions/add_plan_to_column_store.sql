--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:add_plan_to_column_store runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_plan_to_column_store
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.add_plan_to_column_store(p_plan_code integer);
CREATE OR REPLACE FUNCTION plan_smart.add_plan_to_column_store(p_plan_code integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare 
  v_channel        text;
  v_weeks          text;
  v_plan_code      int;
  v_status         int;
  v_week           int;
  v_return         int:=0;
  v_total          int:=0;
  v_leaf_part_name text;
  i                record;
begin
  select 
    channel,
    weeks,
    status
  into
    v_channel,
    v_weeks,
    v_status
  from
    plan_smart.vw_plan_master 
  where
    plan_code = p_plan_code;
  
  for i in (select distinct plan_table 
              from plan_smart.query_source_mappings qsm 
             where plan_status = v_status
               and plan_table_ce_enabled = true)
  loop
    foreach v_week in array v_weeks::int[]
    loop
	  v_leaf_part_name := i.plan_table||'_'||regexp_replace(v_channel, '[ /.-]', '', 'g')||'_'||v_week;
	  raise notice '%' , v_leaf_part_name;
	 
  	  begin  
	    select
  	      *
  	    into
  	      v_return
  	    from
  	      google_columnar_engine_add(v_leaf_part_name);
  	  exception
  	    when others then null;
  	  end;
  	 
  	  v_total := v_total + v_return;
    end loop;
  end loop;
 
  for i in (select distinct plan_upd_table 
              from plan_smart.query_source_mappings qsm 
             where plan_status = v_status
               and plan_upd_table_ce_enabled = true)
  loop
	v_leaf_part_name := i.plan_upd_table||'_'||p_plan_code;
    raise notice '%' , v_leaf_part_name;
  	
    begin  
	  select
  	    *
  	  into
  	    v_return
  	  from
  	    google_columnar_engine_add(v_leaf_part_name);
  	exception
  	  when others then null;
  	end;
    
    v_total := v_total + v_return;  
 
  end loop;
  return v_total;
exception
  when others then null;
end
$function$

;