--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:get_prev_wk_sales_build_ratio_kpis runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-38035
--comment: Get Sales build KPIS for previous week of the plan
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.get_prev_wk_sales_build_ratio_kpis(p_refcursor refcursor, p_channel text[], p_product_filter jsonb, p_week integer, p_plan_status integer);
CREATE OR REPLACE FUNCTION plan_smart.get_prev_wk_sales_build_ratio_kpis(p_refcursor refcursor, p_channel text[], p_product_filter jsonb, p_week integer, p_plan_status integer)
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
  v_query_filter   text:= '';
  v_phf_code_sql   text;
  v_hierarchy_code_list int[];
  v_sql            text;
 
begin
  
  select plan_table_text,
         product_hierarchy_filter_level_id
    into v_plan_tbl_name,
         v_level_id
    from plan_smart.get_pg_query_source(4,p_plan_status);
   
  v_query_filter := "plan_smart".form_attribute_table_filters_v2('product_hierarchies', 'hierarchy_code', p_product_filter);
  raise notice 'v_query_filter : %', v_query_filter;
  v_phf_code_sql := 'select array_agg(hierarchy_code) from ('||v_query_filter|| ' and level = '||v_level_id||') phf';
  raise notice 'v_phf_code_sql: %', v_phf_code_sql;
  execute v_phf_code_sql into v_hierarchy_code_list;
  select max(fiscal_year_week) into v_week from global.fiscal_date_mapping fdm where fiscal_year_week < p_week;

  v_sql := format('
  select
    current_week as prev_wk,
    sum(kpi43)  as non_comp_qty,
    sum(kpi44)  as comp_qty,
    sum(kpi45)  as total_qty,
    sum(kpi124) as non_comp_sales,
    sum(kpi125) as comp_sales,
    sum(kpi126) as total_sales
  from
    %s
  where
    channel = any(%L)
  and
    current_week =  %s
  and
    hierarchy_code= ANY(%L)
 group by current_week'
  ,v_plan_tbl_name
  ,p_channel
  ,v_week
  ,v_hierarchy_code_list
  );
  raise notice 'SQL: %',v_sql;
  OPEN $1 FOR execute v_sql;
  RETURN $1;
end
$function$
;
