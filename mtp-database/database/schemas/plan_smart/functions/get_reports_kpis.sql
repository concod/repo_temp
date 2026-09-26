--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:get_reports_kpis_change_for_pchi runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-13435, MTP-15533, MTP-19169
--comment: pchi fix for hierarchy code mismatch due to replace in v_phf_code_sql
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.get_reports_kpis(p_refcursor refcursor, p_formula_string character varying, p_product_filter jsonb, p_channels text[], p_weeks integer[], p_plan_status integer);
CREATE OR REPLACE FUNCTION plan_smart.get_reports_kpis(p_refcursor refcursor, p_formula_string character varying, p_product_filter jsonb, p_channels text[], p_weeks integer[], p_plan_status integer)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
select * 
from plan_smart.get_reports_kpis(
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
	fdm.fiscal_year,
	season_temp.season,
	fiscal_year1 || ''_'' || fiscal_month_name fp_month_name,
    p.current_week,
	phv.l0_name,
    phv.l1_name,
    phv.l2_name,
    '|| p_formula_string || '
  from 
    '||v_table_name||' p
  join plan_smart.product_hierarchies_filter phv 
  on p.hierarchy_code = phv.hierarchy_code
  join (
  	select
  	distinct fiscal_week_in_year,
 TO_CHAR(
    TO_DATE (fiscal_month_in_year::text, ''MM''), ''Month''
    ) as fiscal_month_name,
  fiscal_year_week,
 fiscal_year_begin_date as fiscal_year1,
 fiscal_year as fiscal_year
    from global.fiscal_date_mapping
    group by 1,2,3,4,5
) fdm
  on fdm.fiscal_year_week  = p.current_week
  join ( 
	with temp as (
		select
			"name" season,
			season_start_date,
			season_end_date
		from
			global.season_master
		)
		select
			distinct(fiscal_year_week),
			temp.season
		from
			global.fiscal_date_mapping,
			temp
		where
			calendar_date >= temp.season_start_date
			and calendar_date <= temp.season_end_date
		order by
			fiscal_year_week
		) season_temp on p.current_week = season_temp.fiscal_year_week
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
    phv.hierarchy_code = any(''{'||v_hierarchy_code_list||'}'')'; 
  end if;
 
  v_query_combine := v_query_combine|| '
  group by	
  grouping sets(
	(phv.l0_name, fdm.fiscal_year),
    (phv.l1_name, fdm.fiscal_year),
    (phv.l2_name, fdm.fiscal_year),
    (phv.l0_name, fdm.fiscal_year, season_temp.season),
    (phv.l1_name, fdm.fiscal_year, season_temp.season),
    (phv.l2_name, fdm.fiscal_year, season_temp.season),
    (phv.l0_name, fdm.fiscal_year, season_temp.season, fp_month_name),
    (phv.l1_name, fdm.fiscal_year, season_temp.season, fp_month_name),
    (phv.l2_name, fdm.fiscal_year, season_temp.season, fp_month_name),
    (phv.l0_name, fdm.fiscal_year, season_temp.season, fp_month_name, p.current_week),
    (phv.l1_name, fdm.fiscal_year, season_temp.season, fp_month_name, p.current_week),
    (phv.l2_name, fdm.fiscal_year, season_temp.season, fp_month_name, p.current_week)
	)
 order by 
  phv.l0_name,
    phv.l1_name,
    phv.l2_name,
    current_week';

  raise notice '%', v_query_combine;
  OPEN $1 FOR execute v_query_combine;
  RETURN $1;
end
$function$
;
