--liquibase formatted sql
--changeset archa.prakash@impactanalytics.co:is_eop_equalto_bop_plan runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:mtp-41650
--comment: initial changeset for is_eop_equalto_bop_plan
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smartis_eop_equalto_bop_plan(p_plan_code integer);
CREATE OR REPLACE FUNCTION plan_smart.is_eop_equalto_bop_plan(p_plan_code integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
	declare
	  v_week           int4;
	  v_channels        text[];
	  v_l2_name        text[];
	  v_plan_status    int4;
	  v_level_id       int4;
	  v_plan_tbl_name  text;
	  v_query_filter   text   := '';
	  v_phf_code_sql   text;
	  v_hierarchy_code_list int[];
	  v_sql_1            text;
	  v_sql_2            text;
	  v_result1          text;
	  v_result2          text;
	 
	begin
	  select channels,l2_name::text[],status
	    into v_channels, v_l2_name, v_plan_status
	    from plan_smart.vw_plan_master 
	   where plan_code = p_plan_code;
	  
	  select plan_table_text,
	         product_hierarchy_filter_level_id
	    into v_plan_tbl_name,
	         v_level_id
	    from plan_smart.get_query_source(3,v_plan_status);
	   
      select  ARRAY_AGG(hierarchy_code)
      into v_hierarchy_code_list
					FROM plan_smart.product_hierarchies_filter 
				    where l0_name = ANY(select unnest(l0_name::text[]) from plan_smart.vw_plan_master vpm where plan_code = p_plan_code)
					and l1_name = ANY(select unnest(l1_name::text[]) from plan_smart.vw_plan_master vpm where plan_code = p_plan_code)
					and l2_name = ANY(select unnest(l2_name::text[]) from plan_smart.vw_plan_master vpm where plan_code = p_plan_code)
					and level = 3;
	  
	  v_sql_1 := format('
	  select
	    sum(kpi11)/nullif(sum(kpi23),0) as kpi113,
	    sum(kpi11)  as kpi11,
	    sum(kpi23)  as kpi23, 
	    sum(kpi10)/nullif(sum(kpi22),0) as kpi112,
	    sum(kpi10)  as kpi10,  
	    sum(kpi22)  as kpi22,  
	    sum(kpi12)/nullif(sum(kpi24),0) as kpi114, 
	    sum(kpi12)  as kpi12, 
	    sum(kpi24)  as kpi24  
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
	    kpi24,   -- Total EOH Units
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
	    current_week  <   (select min(week) 
	                         from (select unnest(weeks::int[]) as week
	                                 from plan_smart.vw_plan_master vpm 
	                                where plan_code = %L) min_wk
	                      )
	 ) eoh_que
	 where eoh_que.rnk = 1
	 group by current_week'
	  ,v_plan_tbl_name
	  ,v_channels
	  ,v_l2_name
	  ,v_hierarchy_code_list
	  ,p_plan_code
	  );
	 
	 
	 
	  v_sql_2 := format('
	  select
	    sum(kpi11)/nullif(sum(kpi23),0) as kpi113,
	    sum(kpi11)  as kpi11,
	    sum(kpi23)  as kpi23, 
	    sum(kpi10)/nullif(sum(kpi22),0) as kpi112,
	    sum(kpi10)  as kpi10,  
	    sum(kpi22)  as kpi22,  
	    sum(kpi12)/nullif(sum(kpi24),0) as kpi114, 
	    sum(kpi12)  as kpi12, 
	    sum(kpi24)  as kpi24  
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
	    kpi24,   -- Total EOH Units
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
	    current_week  =   (select min(week) 
	                         from (select unnest(weeks::int[]) as week
	                                 from plan_smart.vw_plan_master vpm 
	                                where plan_code = %L) min_wk
	                      )
	 ) eoh_que
	 where eoh_que.rnk = 1
	 group by current_week'
	  ,v_plan_tbl_name
	  ,v_channels
	  ,v_l2_name
	  ,v_hierarchy_code_list
	  ,p_plan_code
	  );
	 
	 
	  
    EXECUTE v_sql_1 INTO v_result1;


    EXECUTE v_sql_2 INTO v_result2;

    IF v_result1 = v_result2 THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$function$
;
