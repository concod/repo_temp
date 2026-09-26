--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:get_kpis_master_plan_change_for_pchi runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-19169
--comment: pchi fix for hierarchy code mismatch due to replace in v_phf_code_sql 
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.get_kpis_master_plan(p_refcursor refcursor, p_formula_string character varying, p_product_filter jsonb, p_channels text[], p_weeks integer[], p_plan_status integer);
CREATE OR REPLACE FUNCTION plan_smart.get_kpis_master_plan(p_refcursor refcursor, p_formula_string character varying, p_product_filter jsonb, p_channels text[], p_weeks integer[], p_plan_status integer)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
select * 
from plan_smart.get_kpis_master_plan(
  'my_cur',
  'sum(kpi1) as kpi_1,sum(kpi2) as kpi_2,sum(kpi3) as kpi_3,sum(kpi4) as kpi_4,sum(kpi5) as kpi_5,sum(kpi6) as kpi_6,sum(kpi7) as kpi_7,sum(kpi8) as kpi_8,sum(kpi9) as kpi_9,sum(kpi10) as kpi_10',
  '{"l0_name": [{"type": "list", "operator": "in", "values": ["Bags"]}],
    "l1_name": [{"type": "list", "operator": "in", "values": ["Baby Bags","Handbags"]}],
    "l2_name": [{"type": "list", "operator": "in", "values": ["Baby Bags"]}]
   }'::jsonb,
  '{"Full Line Retail"}'::text[],
  '{202401,202402}'::integer[],
  0 );
FETCH ALL IN "my_cur";
*/
declare
  v_week           int4;
  v_channel        text;
  v_level_id       int4;
  v_table_name     text;
  v_query_source   text;
  v_query_combine  text   := '';
  v_query_filter   text   := '';
  v_query_week     text   := '';
  v_hierarchy_code_list text;
  v_phf_code_sql   text;
begin
  select
    plan_table_text,
    product_hierarchy_filter_level_id
  into
    v_table_name,
    v_level_id
  from
    -- p_query_level is hardcoded to 1 
    -- for master plan KPI listing to aggregate on closest source of truth
    plan_smart.get_pg_query_source(1,p_plan_status); 
  
  if p_product_filter !='{}'
  then
    v_query_filter := "plan_smart".form_attribute_table_filters_v2('product_hierarchies', 'hierarchy_code', p_product_filter);
    v_phf_code_sql := 'select string_agg(hierarchy_code::text,'','') from ('||v_query_filter|| ' and level = '||v_level_id||') phf';
    raise notice '%', v_phf_code_sql;
    execute v_phf_code_sql into v_hierarchy_code_list;
  end if;
  
  v_query_combine :='
  select
    p.current_week,
    '|| p_formula_string || '
  from 
    '||v_table_name||' p
  where
    current_week = ANY(''{"' || array_to_string(p_weeks, '","') || '"}'')';
  
  if cardinality(p_channels) != 0
  then
    v_query_combine:= v_query_combine||'
  and
    channel = ANY(''{"' || array_to_string(p_channels, '","') || '"}'')';
  end if; 
 		
  if v_hierarchy_code_list is not null
  then
    v_query_combine := v_query_combine||'
  and
    hierarchy_code = any(''{'||v_hierarchy_code_list||'}'')'; 
  end if;
 
  v_query_combine := v_query_combine|| '
  group by
    p.current_week';
  
  /*foreach v_channel in array p_channels
  loop
    foreach v_week in array p_weeks
    loop
	  v_query_source := null;
	  v_query_source := v_table_name||'_'||regexp_replace(v_channel,'[ /.-]', '', 'g')||'_'||v_week;
      v_query_week :=  '
 			select p.current_week,
                  '|| p_formula_string || '
 			from '||v_query_source||' p';
 		
 	  if v_hierarchy_code_list is not null
 	  then
 	    v_query_week := v_query_week|| ' where hierarchy_code = any(''{'||v_hierarchy_code_list||'}'')'; 
        if cardinality(p_classes) != 0
	    then
	      v_query_week:= v_query_week||(' and class = ANY(''{"' || array_to_string(p_classes, '","') || '"}'')');
	    end if; 
	  else
        if cardinality(p_classes) != 0
	    then
	      v_query_week:= v_query_week||(' where class = ANY(''{"' || array_to_string(p_classes, '","') || '"}'')');
	    end if;
      end if;
 	  v_query_week := v_query_week|| ' group by p.current_week';

	  if cardinality(p_weeks) = 1
	  then
	    v_query_combine :=  v_query_week;
	  else
	    v_query_combine :=  v_query_combine ||' union all ' || v_query_week;
	  end if;
    end loop;   
  end loop;

  if cardinality(p_weeks) = 1
  then
	raise notice '%', v_query_week;
	OPEN $1 FOR execute v_query_week;
  else
    raise notice '%', substring(v_query_combine,11);
	OPEN $1 FOR execute substring(v_query_combine,11);
  end if; 
 */

  raise notice '%', v_query_combine;
  OPEN $1 FOR execute v_query_combine;
  RETURN $1;
end
$function$

;