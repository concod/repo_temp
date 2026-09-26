--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:get_kpis_change_for_pchi runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-19169
--comment: pchi fix for heirarchy code mismatch due to replace in v_phf_code_sql 
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.get_kpis(p_refcursor refcursor, p_plan_code integer, p_formula_string character varying, p_product_filter jsonb, p_weeks integer[], p_query_level integer);
CREATE OR REPLACE FUNCTION plan_smart.get_kpis(p_refcursor refcursor, p_plan_code integer, p_formula_string character varying, p_product_filter jsonb, p_weeks integer[], p_query_level integer)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
   
Function for Scenario Plan KPI

Call to API get_scenario_plan_kpis : 
   

select plan_smart.get_kpis(
 	  'my_cur',
 	  1512,
 	  'sum(kpi1) as kpi_1,sum(kpi2) as kpi_2,sum(kpi3) as kpi_3,sum(kpi4) as kpi_4,sum(kpi5) as kpi_5,sum(kpi6) as kpi_6,sum(kpi7) as kpi_7,sum(kpi8) as kpi_8,sum(kpi9) as kpi_9,sum(kpi10) as kpi_10',
 	  '{"l0_name": [{"type": "list", "operator": "in", "values": ["Bags"]}], 
        "l1_name": [{"type": "list", "operator": "in", "values": ["Backpacks/Lunch Bags"]}]
       }'::jsonb,
 	  '{202401,202402}',
 	  2
 	  );
FETCH ALL IN "my_cur";
 
 */
 
declare
  v_week           int4;
  v_channel        text;
  v_classes        text;
  v_plan_status    int4;
  v_level_id       int4;
  v_table_name     text;
  v_query_source   text;
  v_query_combine  text   := '';
  v_query_filter   text   := '';
  v_query_week     text   := '';
  v_kpi_str        text   := '';
  v_hierarchy_code_list text;
  v_phf_code_sql   text;
begin

  select string_agg(kpi,',') as kpi_str into v_kpi_str
    from (select 'coalesce(pm.kpi'||kpino||',p.kpi'||kpino||') as kpi'||kpino as kpi
            from generate_series(1,250) kpino 
         ) a;

  v_query_filter := "plan_smart".form_attribute_table_filters_v2('product_hierarchies', 'hierarchy_code', p_product_filter);

  select channel, l2_name, status
    into v_channel, v_classes, v_plan_status
    from plan_smart.vw_plan_master 
   where plan_code = p_plan_code;
 
    
  select plan_table_text,
         product_hierarchy_filter_level_id
    into v_table_name,
         v_level_id
    from plan_smart.get_pg_query_source(p_query_level,v_plan_status);
  
  
  v_phf_code_sql := 'select string_agg(hierarchy_code::text,'','') from ('||v_query_filter|| ' and level = '||v_level_id||') phf';
  --raise notice '%', v_phf_code_sql;
  execute v_phf_code_sql into v_hierarchy_code_list;
  --raise notice '%', v_hierarchy_code_list;

  foreach v_week in array p_weeks
  loop
	v_query_source := null;
	v_query_source := v_table_name||'_'||regexp_replace(v_channel,'[ /.-]', '', 'g')||'_'||v_week;
    
    if v_plan_status in (2,3) -- 2: "Scenario Plan", 3: "Scenario Forecast"
    then     
      v_query_source := 
      '(select
 	      p.hierarchy_code,
          p.current_week,
          p.class,'
          ||v_kpi_str||'
        from 
        '|| v_query_source ||' p
        left join 
          plan_smart.plan_modifications pm
        on
 	      pm.plan_code = ' ||p_plan_code||'
        and 
          pm.current_week = p.current_week
        and
          pm.class = p.class
        and 
 	        pm.hierarchy_code  = p.hierarchy_code
        )';	   
    end if;
	 
    /*v_query_week :=  '
 			select p.current_week,
                  '|| p_formula_string || '
 			from '||v_query_source||' p
 			inner join (' || (replace(v_query_filter, '"', '')) || ' and level = '||v_level_id||') phf
 			on p.hierarchy_code = phf.hierarchy_code
            where p.class = any('''|| v_classes ||'''::text[])
 			group by p.current_week';*/
 		
    v_query_week :=  '
 			select p.current_week,
                  '|| p_formula_string || '
 			from '||v_query_source||' p
      where hierarchy_code = any(''{'||v_hierarchy_code_list||'}'') 
 			group by p.current_week';		
	 
	if cardinality(p_weeks) = 1
	then
	  v_query_combine :=  v_query_week;
	else
	  v_query_combine :=  v_query_combine ||' union all ' || v_query_week;
	end if;

  end loop;      

  perform plan_smart.add_plan_to_column_store(p_plan_code);

  if cardinality(p_weeks) = 1
  then
	raise notice '%', v_query_week;
    --insert into plan_smart.db_api_logging values(nextval('db_api_logging_id_seq'),p_plan_code||chr(10)||v_query_week,now(),null);
	OPEN $1 FOR execute v_query_week;
  else
    raise notice '%', substring(v_query_combine,11);
    --insert into plan_smart.db_api_logging values(nextval('db_api_logging_id_seq'),p_plan_code||chr(10)||v_query_combine,now(),null);
	OPEN $1 FOR execute substring(v_query_combine,11);
  end if; 
  
  RETURN $1;
end
$function$

;