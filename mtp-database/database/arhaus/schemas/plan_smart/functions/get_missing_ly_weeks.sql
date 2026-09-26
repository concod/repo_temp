--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:get_missing_ly_weeks_chg1 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:mtp-39831
--comment:  added new kpis
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.get_missing_ly_weeks(p_channel text[], p_product_filter jsonb);
CREATE OR REPLACE FUNCTION plan_smart.get_missing_ly_weeks(p_channel text[], p_product_filter jsonb)
 RETURNS integer[]
 LANGUAGE plpgsql
AS $function$
declare
  v_query_filter        text   := '';
  v_query               text   := '';
  v_hierarchy_code_list text;
  v_phf_code_sql        text;
  v_max_week            int4;
  date_array            int[]='{}';
  tbl                   text;
 

begin
	--> Delete till the comment
  raise notice '******************** Starting the plan_smart.get_missing_ly_weeks ***************************';
 raise notice '******************** Parameter passed: p_channel: %', p_channel;
raise notice '******************** Parameter passed: p_product_filter: %', p_product_filter;
  --> Delete till here
  if p_product_filter <> '{}'::jsonb
  then
    v_query_filter := "plan_smart".form_attribute_table_filters_v2('product_hierarchies', 'hierarchy_code', p_product_filter);
    v_phf_code_sql := 'select string_agg(hierarchy_code::text,'','') from ('||replace(v_query_filter, '"', '')|| ' and level = 4 ) phf';
    raise notice '%', v_phf_code_sql;
    execute v_phf_code_sql into v_hierarchy_code_list;
    raise notice '%', v_hierarchy_code_list;
  end if;
  
  FOREACH tbl IN ARRAY ARRAY['plan_smart.lf_master_1','plan_smart.wf_master_1','plan_smart.op_master_1']
  loop
    v_query := format('
               select max(current_week) 
                 from %s
where (coalesce(abs(kpi32),0)+coalesce(abs(kpi33),0)+coalesce(abs(kpi50),0)+coalesce(abs(kpi51),0)+coalesce(abs(kpi30),0)+coalesce(abs(kpi31),0)) > 0
                %s
                %s'
                ,tbl
                ,case 
	               when p_channel = '{}'::text[] then ' '
                   else ('AND channel = any(''{' || array_to_string(p_channel, ',') || '}''::text[])') 
                end
                ,case
                   when  p_product_filter = '{}'::jsonb  then ' '
                   else ('AND hierarchy_code  = any(''{' || v_hierarchy_code_list || '}''::int[])') 
                end
                );
   raise notice 'v_query:%',v_query;
   EXECUTE v_query INTO v_max_week;
  
    date_array := date_array || v_max_week;
  end loop;
 --> Delete till the comment
 raise notice '******************** date_array: %', date_array;
  raise notice '============================== Ending the plan_smart.get_missing_ly_weeks ===================================='; 
  --> Delete till here
  return date_array;
end
$function$
;
