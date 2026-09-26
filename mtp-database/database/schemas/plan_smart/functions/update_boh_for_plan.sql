--liquibase formatted sql
--changeset liquibase:update_boh_for_plan runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_boh_for_plan
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.update_boh_for_plan(p_plan_code integer);
CREATE OR REPLACE FUNCTION plan_smart.update_boh_for_plan(p_plan_code integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
declare
  v_weeks          int4[];
  v_channel        text;
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
  select channel,l2_name::text[],weeks::int[],status, business_unit
    into v_channel, v_l2_name, v_weeks, v_plan_status, v_business_unit
    from plan_smart.vw_plan_master 
   where plan_code = p_plan_code;
  
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
  raise notice 'v_business_unit=%',v_business_unit;
 
  if v_business_unit = 'Retail' 
  then
  	v_update_set_expr := $$
  		kpi98 = prev_wk_data.kpi23,
        kpi92 = prev_wk_data.kpi11,
        kpi107=	prev_wk_data.kpi11/nullif(prev_wk_data.kpi23,0),
        kpi23 = prev_wk_data.kpi23 + kpi41 - kpi148 - kpi44,
		kpi11 = prev_wk_data.kpi11 + kpi62 - kpi151 - kpi104,
		kpi113 = (prev_wk_data.kpi11 + kpi62 - kpi151 - kpi104)/nullif((prev_wk_data.kpi23 + kpi41 - kpi148 - kpi44),0),
		kpi86 = kpi128/nullif(((kpi92 + (prev_wk_data.kpi11 + kpi62 - kpi151 - kpi104))/2),0),
		kpi35 = (prev_wk_data.kpi23 + (prev_wk_data.kpi23 + kpi41 - kpi148 - kpi44))/2,
		kpi38 = kpi44/nullif((prev_wk_data.kpi23 + kpi41 - kpi148),0),
		kpi142 = (prev_wk_data.kpi23 + kpi41 - kpi148)/nullif(kpi44,0),
		kpi83 = kpi44/nullif((prev_wk_data.kpi23 + (prev_wk_data.kpi23 + kpi41 - kpi148 - kpi44)/2),0),
		kpi77 = kpi104/nullif((prev_wk_data.kpi11 + (prev_wk_data.kpi11 + kpi62 - kpi151 - kpi104)/2),0),
		kpi163 = kpi41 - kpi156,
		kpi161 = kpi62 - kpi157,
		kpi172 = (kpi62 - kpi157)/nullif((kpi41 - kpi156),0),
		kpi207 = (prev_wk_data.kpi11 + kpi62 - kpi151 - kpi104) - kpi200,
		kpi209 = (prev_wk_data.kpi11 + kpi62 - kpi151 - kpi104) - kpi203,
		kpi97 = prev_wk_data.kpi22,
		kpi91 = prev_wk_data.kpi10,
		kpi106 = prev_wk_data.kpi10/nullif(prev_wk_data.kpi22,0),
		kpi22 = prev_wk_data.kpi22 + kpi171 - kpi149 - kpi43,
		kpi10 = prev_wk_data.kpi10 + kpi170 - kpi152 - kpi103,
		kpi112 = (prev_wk_data.kpi10 + kpi170 - kpi152 - kpi103)/nullif((prev_wk_data.kpi22 + kpi171 - kpi149 - kpi43),0),
		kpi85 = kpi127/nullif(((prev_wk_data.kpi10 + (prev_wk_data.kpi10 + kpi170 - kpi152 - kpi103))/2),0),
		kpi34 = (prev_wk_data.kpi22 + (prev_wk_data.kpi22 + kpi171 - kpi149 - kpi43))/2,
		kpi37 = kpi43/nullif((prev_wk_data.kpi22 + kpi171 - kpi149),0),
		kpi185 = (prev_wk_data.kpi22 + kpi171 - kpi149)/nullif(kpi43,0),
		kpi82 = kpi43/nullif((prev_wk_data.kpi22 + (prev_wk_data.kpi22 + kpi171 - kpi149 - kpi43)/2),0),
		kpi76 = kpi103/nullif((prev_wk_data.kpi10 + (prev_wk_data.kpi10 + kpi170 - kpi152 - kpi103)/2),0),
		kpi183 = kpi171 - kpi184,
		kpi181 = kpi170 - kpi182,
		kpi174 = (kpi170 - kpi182)/nullif((kpi171 - kpi184),0),
		kpi208 = (prev_wk_data.kpi10 + kpi170 - kpi152 - kpi103) - kpi201,
		kpi210 = (prev_wk_data.kpi10 + kpi170 - kpi152 - kpi103) - kpi204
  	$$;
  elsif v_business_unit = 'CHESTER_DC' 
  then
  	v_update_set_expr := $$
  		kpi98 = prev_wk_data.kpi23,
		kpi218 = prev_wk_data.kpi222,
		kpi220 = prev_wk_data.kpi222/nullif(prev_wk_data.kpi23,0),
		kpi23 = prev_wk_data.kpi23 + kpi41 - kpi148 - kpi25,
		kpi222 = prev_wk_data.kpi222 + kpi226 - kpi230 - kpi27,
		kpi224 = (prev_wk_data.kpi222 + kpi226 - kpi230 - kpi27)/nullif((prev_wk_data.kpi23 + kpi41 - kpi148 - kpi25),0),
		kpi163 = kpi41 - kpi156,
		kpi238 = kpi226 - kpi234,
		kpi240 = (kpi226 - kpi234)/nullif((kpi41 - kpi156),0),
		kpi58 = (prev_wk_data.kpi222 + kpi226 - kpi230 - kpi27) - kpi53,
		kpi60 = (prev_wk_data.kpi222 + kpi226 - kpi230 - kpi27) - kpi55
  	$$;
  end if;
 
  if v_na_weeks is not null then 

    select plan_table_text,
           product_hierarchy_filter_level_id
      into v_plan_tbl_name,
           v_level_id
      from plan_smart.get_pg_query_source(4,v_plan_status);
   
     select array_agg(distinct hierarchy_code)::integer[]
      into v_hierarchy_code_list
      from plan_smart.product_hierarchies_filter 
     where l0_name = ANY(select unnest(l0_name::text[]) from plan_smart.vw_plan_master vpm where plan_code = p_plan_code)
	   and l1_name = ANY(select unnest(l1_name::text[]) from plan_smart.vw_plan_master vpm where plan_code = p_plan_code)
	   and l2_name = ANY(select unnest(l2_name::text[]) from plan_smart.vw_plan_master vpm where plan_code = p_plan_code)
	   and l3_name = ANY(select unnest(l3_name::text[]) from plan_smart.vw_plan_master vpm where plan_code = p_plan_code) 
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
        kpi10,  -- Non Comp EOH Cost
        kpi11,  -- Comp EOH Cost
        kpi22,  -- Non Comp EOH Units
        kpi23,   -- Comp EOH Units
		kpi222  -- Comp EOH LCst
      from (
        select
        channel,
        class,
        hierarchy_code,
        current_week,
        kpi113, -- Comp EOH AUC
        kpi11,  -- Comp EOH Cost
        kpi23,  -- Comp EOH Units
        kpi112, -- Non Comp EOH AUC
        kpi10,  -- Non Comp EOH Cost
        kpi22,  -- Non Comp EOH Units
        kpi114, -- Total EOH AUC
        kpi12,  -- Total EOH Cost
        kpi24,  -- Total EOH Units
        kpi222, -- Comp EOH LCst
        dense_rank() over (order by current_week desc) rnk
      from
        %s
      where
        channel = %L
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
      ,v_channel
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
