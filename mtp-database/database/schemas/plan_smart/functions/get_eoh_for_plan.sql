--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:get_eoh_for_plan_chg2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-21756
--comment: AUC formula changed
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.get_eoh_for_plan(p_refcursor refcursor, p_plan_code integer, p_product_filter jsonb);
CREATE OR REPLACE FUNCTION plan_smart.get_eoh_for_plan(p_refcursor refcursor, p_plan_code integer, p_product_filter jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
  v_week           int4;
  v_channel        text;
  v_l2_name        text[];
  v_plan_status    int4;
  v_level_id       int4;
  v_plan_tbl_name  text;
  v_query_filter   text   := '';
  v_phf_code_sql   text;
  v_hierarchy_code_list int[];
  v_sql            text;
 
begin
  select channel,l2_name::text[],status
    into v_channel, v_l2_name, v_plan_status
    from plan_smart.vw_plan_master 
   where plan_code = p_plan_code;
  
  select plan_table_text,
         product_hierarchy_filter_level_id
    into v_plan_tbl_name,
         v_level_id
    from plan_smart.get_pg_query_source(4,v_plan_status);
   
  v_query_filter := "plan_smart".form_attribute_table_filters_v2('product_hierarchies', 'hierarchy_code', p_product_filter);
  raise notice 'v_query_filter : %', v_query_filter;
  v_phf_code_sql := 'select array_agg(hierarchy_code) from ('||v_query_filter|| ' and level = '||v_level_id||') phf';
  raise notice 'v_phf_code_sql: %', v_phf_code_sql;
  execute v_phf_code_sql into v_hierarchy_code_list;
  
  v_sql := format('
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
  ,v_channel
  ,v_l2_name
  ,v_hierarchy_code_list
  ,p_plan_code
  );
  
  raise notice 'SQL: %',v_sql;
  OPEN $1 FOR execute v_sql;
  RETURN $1;
end
$function$
;
