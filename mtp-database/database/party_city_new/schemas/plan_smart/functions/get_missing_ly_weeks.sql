--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:get_missing_ly_weeks_change7 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-41228
--comment: Implement Business Unit check while fetching product hierarchy codes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.get_missing_ly_weeks(p_plan_code integer, p_product_filter jsonb, p_query_level integer);
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
  if p_product_filter <> '{}'::jsonb
  then
    v_query_filter := "plan_smart".form_attribute_table_filters_v2('product_hierarchies', 'hierarchy_code', p_product_filter);
    v_phf_code_sql := 'select string_agg(hierarchy_code::text,'','') 
                        from ('||v_query_filter|| ' 
                               and level = 4 
                               and business_unit @> plan_smart.get_bu(''{' || array_to_string(p_channel, ',') || '}'')
                             ) phf';
    raise notice '%', v_phf_code_sql;
    execute v_phf_code_sql into v_hierarchy_code_list;
    raise notice '%', v_hierarchy_code_list;
  end if;
  
  FOREACH tbl IN ARRAY ARRAY['plan_smart.lf_master_1','plan_smart.wf_master_1','plan_smart.op_master_1']
  loop
    v_query := format('
               select max(current_week)+100 
                 from %s
where (coalesce(abs(kpi124),0)+coalesce(abs(kpi125),0)+coalesce(abs(kpi43),0)+coalesce(abs(kpi44),0)) > 0
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
  return date_array;
end
$function$
;
