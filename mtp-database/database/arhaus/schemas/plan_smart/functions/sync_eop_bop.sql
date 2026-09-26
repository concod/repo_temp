--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:sync_eop_bop_chg1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:mtp-44157
--comment: updated formula for sync eop bop
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.sync_eop_bop(p_plan_code integer);
CREATE OR REPLACE FUNCTION plan_smart.sync_eop_bop(p_plan_code integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
declare
  v_weeks          int4[];
  v_channels        text[];
  v_l2_name        text[];
  v_plan_status    int4;
  v_level_id       int4;
  v_plan_tbl_name  text;
  v_sql            text;
  v_last_actualised_week int;
  v_hierarchy_code_list int[];
  v_na_weeks       int[];
  wk               int;
  v_business_unit  text;
  v_update_set_expr text;
 
begin
   select channels,l2_name::text[],weeks::int[],status
    into v_channels, v_l2_name, v_weeks, v_plan_status
    from plan_smart.vw_plan_master 
   where plan_code = p_plan_code;
  
  raise notice 'v_weeks=%',v_weeks;
  raise notice 'v_channels=%',v_channels;
  
  
  select (attribute_value -> 'value')::int
    into v_last_actualised_week
    from "global".default_attributes
   where attribute_type  = 'actual_refresh_min_week';
  
  v_sql :=format(
	     'select array_agg(week)
          from (select unnest(''%s''::int[]) as week) tab
          where week > %s'
         ,v_weeks
         ,v_last_actualised_week
         );
  
  raise notice 'sql=%',v_sql;
  execute v_sql into v_na_weeks;
  raise notice 'v_na_weeks=%',v_na_weeks;
 
 
  
  	v_update_set_expr := $$
  		kpi30 = prev_wk_data.kpi72,
  		kpi31 = prev_wk_data.kpi73,
  		kpi63 = prev_wk_data.kpi74,
  		kpi72 = prev_wk_data.kpi72 + curr_wk_data.kpi51 - curr_wk_data.kpi43 - curr_wk_data.kpi54,
  		kpi73 = prev_wk_data.kpi73 + curr_wk_data.kpi50 - curr_wk_data.kpi21 - curr_wk_data.kpi52,
  		kpi74 = (prev_wk_data.kpi73 + curr_wk_data.kpi50 - curr_wk_data.kpi21 - curr_wk_data.kpi52)/nullif(prev_wk_data.kpi72 + curr_wk_data.kpi51 - kpi43 -  curr_wk_data.kpi54,0),
  		kpi79 = (prev_wk_data.kpi72 + (prev_wk_data.kpi72 + curr_wk_data.kpi51 - curr_wk_data.kpi43 - curr_wk_data.kpi54))/2,
  		kpi80 = (prev_wk_data.kpi73 + (prev_wk_data.kpi73 + curr_wk_data.kpi50 - curr_wk_data.kpi21 - curr_wk_data.kpi52))/2,
  		kpi81 =  curr_wk_data.kpi43/nullif((prev_wk_data.kpi72 + (prev_wk_data.kpi72 + curr_wk_data.kpi51 - curr_wk_data.kpi43 - curr_wk_data.kpi54))/2,0),
  		kpi82 =  curr_wk_data.kpi21/nullif((prev_wk_data.kpi73 + (prev_wk_data.kpi73 + curr_wk_data.kpi50 - curr_wk_data.kpi21 - curr_wk_data.kpi52))/2,0),
  		kpi77 =  curr_wk_data.kpi75 - (prev_wk_data.kpi73 + curr_wk_data.kpi50 - curr_wk_data.kpi21 - curr_wk_data.kpi52),
  		kpi78 =  curr_wk_data.kpi76 - (prev_wk_data.kpi73 + curr_wk_data.kpi50 - curr_wk_data.kpi21 - curr_wk_data.kpi52),
  		kpi64 =  prev_wk_data.kpi64 + curr_wk_data.kpi51 - curr_wk_data.kpi33,
  		kpi65 =  prev_wk_data.kpi65 + curr_wk_data.kpi50 - curr_wk_data.kpi4 ,
  		kpi68 =  prev_wk_data.kpi64 + curr_wk_data.kpi51,
  		kpi70 =  prev_wk_data.kpi65 + curr_wk_data.kpi50,
  		kpi55 =  curr_wk_data.kpi54/nullif(prev_wk_data.kpi72,0),
  		kpi53 =  curr_wk_data.kpi52/nullif(prev_wk_data.kpi73,0)	 
  	$$;

 
  if v_na_weeks is not null then 

    select plan_table_text,
           product_hierarchy_filter_level_id
      into v_plan_tbl_name,
           v_level_id
      from plan_smart.get_pg_query_source(3,v_plan_status);
   
     select array_agg(distinct hierarchy_code)::integer[]
      into v_hierarchy_code_list
      from plan_smart.product_hierarchies_filter 
     where l0_name = ANY(select unnest(l0_name::text[]) from plan_smart.vw_plan_master vpm where plan_code = p_plan_code)
	   and l1_name = ANY(select unnest(l1_name::text[]) from plan_smart.vw_plan_master vpm where plan_code = p_plan_code)
	   and l2_name = ANY(select unnest(l2_name::text[]) from plan_smart.vw_plan_master vpm where plan_code = p_plan_code)
       and level = v_level_id;
      
    foreach wk in array v_na_weeks
    loop
      v_sql := format('
      with prev_wk_data as
      (select
        channel,
        class,
        hierarchy_code,
        current_week,
        kpi72,  
        kpi73,
        kpi74,
        kpi64,
        kpi51,
        kpi33,
        kpi54,
        kpi65,
        kpi50,
        kpi4,
        kpi52
      from (
        select
        channel,
        class,
        hierarchy_code,
        current_week,
        kpi72,  
        kpi73,
        kpi74,
        kpi64,
        kpi51,
        kpi33,
        kpi54,
        kpi65,
        kpi50,
        kpi4,
        kpi52,
        dense_rank() over (order by current_week desc) rnk
      from
        %s
      where
        channel = any(%L)
      and
        "class"  = ANY(%L)
      and
        hierarchy_code= ANY(%L)
      and
        current_week  < %L  
      ) eoh_que
      where eoh_que.rnk = 1)
      update plan_smart.wf_master_1 curr_wk_data
      set 
    	%s
      from prev_wk_data
      where curr_wk_data.channel = prev_wk_data.channel
      and curr_wk_data.class = prev_wk_data.class
      and curr_wk_data.hierarchy_code = prev_wk_data.hierarchy_code
      and curr_wk_data.current_week = %L '
      ,v_plan_tbl_name
      ,v_channels
      ,v_l2_name
      ,v_hierarchy_code_list
      ,wk
      ,v_update_set_expr
      ,wk
      );
      raise notice 'SQL: %',v_sql;
      execute v_sql;  	
    end loop;
  end if;
  RETURN true;
end
$function$
;
