--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:get_kpis_change_for_pchi runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-41228
--comment: Implement Business Unit check while fetching product hierarchy codes
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
      1304,
      'sum(kpi43) as cy_non_comp_qty,sum(kpi44) as cy_comp_qty,sum(kpi45) as cy_total_qty,sum(kpi126) as cy_total_sales,sum(kpi124) as cy_non_comp_sales,sum(kpi125) as cy_comp_sales,sum(kpi126)/nullif(sum(kpi45),0) as cy_total_aur,sum(kpi125)/nullif(sum(kpi44),0) as cy_comp_aur,sum(kpi124)/nullif(sum(kpi43),0) as cy_non_comp_aur,sum(kpi104)/nullif(sum(kpi44),0) as cy_comp_auc
       ,sum(kpi103)/nullif(sum(kpi43),0) as cy_non_comp_auc
       ,sum(kpi105)/nullif(sum(kpi45),0) as cy_total_auc
       ,sum(kpi129) as cy_total_margin,sum(kpi127) as cy_non_comp_margin,sum(kpi128) as cy_comp_margin,sum(kpi129)/nullif(sum(kpi126),0) as cy_total_margin_per,sum(kpi127)/nullif(sum(kpi124),0) as cy_non_comp_margin_per,sum(kpi128)/nullif(sum(kpi125),0) as cy_comp_margin_per,sum((kpi44)*kpi8)/ nullif(sum(kpi44),0) as cy_comp_msrp,sum((kpi45)*kpi9)/ nullif(sum(kpi45),0) as cy_total_msrp,sum((kpi43)*kpi7)/ nullif(sum(kpi43),0) as cy_non_comp_msrp,sum(kpi104) as cy_comp_cogs,sum(kpi105) as cy_total_cogs,sum(kpi103) as cy_non_comp_cogs,sum((kpi51)*(kpi45))/nullif(sum(kpi45),0) as cy_total_disc,sum((kpi50)*(kpi44))/nullif(sum(kpi44),0) as cy_comp_disc,sum((kpi49)*(kpi43))/nullif(sum(kpi43),0) as cy_non_comp_disc,sum(kpi98) as cy_comp_bop_units,sum(kpi97) as cy_non_comp_bop_units,sum(kpi99) as cy_total_bop_units,sum(kpi96) as cy_total_bop_dollars,sum(kpi95) as cy_comp_bop_dollars,sum(kpi94) as cy_non_comp_bop_dollars,sum(kpi91)/nullif(sum(kpi97),0) as cy_non_comp_bop_auc,sum(kpi93)/nullif(sum(kpi99),0) as cy_total_bop_auc,sum(kpi92)/nullif(sum(kpi98),0) as cy_comp_bop_auc,sum(kpi94)/nullif(sum(kpi97),0) as cy_non_comp_bop_aur,sum(kpi95)/nullif(sum(kpi98),0) as cy_comp_bop_aur,sum(kpi96)/nullif(sum(kpi99),0) as cy_total_bop_aur,sum(kpi93) as cy_total_bop_cost,sum(kpi92) as cy_comp_bop_cost,sum(kpi91) as cy_non_comp_bop_cost,sum(kpi24) as cy_total_eop_units,sum(kpi23) as cy_comp_eop_units,sum(kpi22) as cy_non_comp_eop_units,sum(kpi19) as cy_non_comp_eop_dollars,sum(kpi21) as cy_total_eop_dollars,sum(kpi20) as cy_comp_eop_dollars,sum(kpi12)/nullif(sum(kpi24),0) as cy_total_eop_auc,sum(kpi10)/nullif(sum(kpi22),0) as cy_non_comp_eop_auc,sum(kpi11)/nullif(sum(kpi23),0) as cy_comp_eop_auc,sum(kpi4) as cy_non_comp_eop_aur,sum(kpi6) as cy_total_eop_aur,sum(kpi5) as cy_comp_eop_aur,sum(kpi12) as cy_total_eop_cost,sum(kpi11) as cy_comp_eop_cost,sum(kpi10) as cy_non_comp_eop_cost,sum(kpi34) as cy_non_comp_avg_inv,sum(kpi36) as cy_total_avg_inv,sum(kpi35) as cy_comp_avg_inv,sum(kpi37) as cy_non_comp_st_perc,sum(kpi38) as cy_comp_st_perc,sum(kpi39) as cy_total_st_perc,sum(kpi40) as cy_non_comp_rcpt_units,sum(kpi41) as cy_comp_rcpt_units,sum(kpi42) as cy_total_rcpt_units,sum(kpi65) as cy_comp_rcpt_dollars,sum(kpi64) as cy_non_comp_rcpt_dollars,sum(kpi66) as cy_total_rcpt_dollars,sum(kpi55) as cy_non_comp_rcpt_auc,sum(kpi56) as cy_comp_rcpt_auc,sum(kpi57) as cy_total_rcpt_auc,sum(kpi58) as cy_non_comp_rcpt_aur,sum(kpi59) as cy_comp_rcpt_aur,sum(kpi60) as cy_total_rcpt_aur,sum(kpi63) as cy_total_rcpt_cost,sum(kpi61) as cy_non_comp_rcpt_cost,sum(kpi62) as cy_comp_rcpt_cost,sum(kpi103)/nullif(sum(kpi91),0) as cy_non_comp_turn_cost,sum(kpi105)/nullif(sum(kpi93),0) as cy_total_turn_cost,sum(kpi104)/nullif(sum(kpi92),0) as cy_comp_turn_cost,sum(kpi79) as cy_non_comp_turn_dollars,sum(kpi81) as cy_total_turn_dollars,sum(kpi80) as cy_comp_turn_dollars,sum(kpi84) as cy_total_turn_units,sum(kpi82) as cy_non_comp_turn_units,sum(kpi83) as cy_comp_turn_units,sum(kpi85) as cy_non_comp_gmroi,sum(kpi87) as cy_total_gmroi,sum(kpi86) as cy_comp_gmroi,sum(kpi89) as cy_comp_markup_per,sum(kpi90) as cy_total_markup_per,sum(kpi88) as cy_non_comp_markup_per',
      '{"l0_name": [{"type": "list", "operator": "in", "values": ["1 - EVERYDAY","2 - SEASONAL","3 - SUPPLIES","999 - Catch All"]}], 
        "l1_name": [{"type": "list", "operator": "in", "values": ["101 - Mylar Balloons"]}],
        "l2_name": [{"type": "list", "operator": "in", "values": ["1 - Juvenile","10 - Solids","11 - NFL","12 - MLB","13 - NBA","15 - NCAA","16 - Web Mylar Balloon Kits","2 - 1st Birthday","3 - Themes","4 - Wedding","5 - Baby","6 - Sports","7 - General Birthday","8 - Milestone Birthday","9 - Sentiments","98 - PA OLD DEPT 1 BALLOON SALES","9999 - Default Class for Dept 101"]}],
        "l3_name": [{"type": "list", "operator": "in", "values": ["6 - Air Walkers","3 - Bouquet","1 - 18In Mylar","2 - Shapes","8 - Air Filled Letters","3 - Numbers","7 - Air Filled Phrases","5 - Shapes","11 - Web Kits","12 - Web Kits","99 - Default Line ","1 - 18in Mylar","2 - Super Shapes","1 - Solid 18in Shape","98 - PA OLD DEPT 1 BALLOON SALES","4 - Letters","5 - High School 18in Mylar","12 - Grab/Go Bouquets","9 - Air Filled Sitters","7 - Air Filled","2 - Bouquet","10 - Yard Sign Kits","8 - Airloonz","9 - Air Filled Numbers","3 - Juvenile Balloon Kits","6 - Air Filled Symbols","8 - Web Kits","8 - Misc Balloon Kits"]}]
       }'::jsonb,
      '{202414,202415,202416,202417,202418,202419,202420,202421,202422,202423,202424,202425,202426}',
      4
      );
FETCH ALL IN "my_cur";
 
 */
 
declare
  v_week           int4;
  v_channel        text;
  v_classes        text;
  v_business_unit  text;
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
  select channel, l2_name, status, business_unit
    into v_channel, v_classes, v_plan_status, v_business_unit
    from plan_smart.vw_plan_master 
   where plan_code = p_plan_code;
 
    
  select plan_table_text,
         product_hierarchy_filter_level_id
    into v_table_name,
         v_level_id
    from plan_smart.get_pg_query_source(p_query_level,v_plan_status);
  
  
  v_phf_code_sql := 'select string_agg(hierarchy_code::text,'','') 
                       from ('||v_query_filter|| ' 
                              and level = '||v_level_id||' 
                              and business_unit @> ''{"'||v_business_unit||'"}''
                            ) phf';
  raise notice '%', v_phf_code_sql;
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
          p.channel,
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
        
    v_query_week :=  '
            select p.current_week,
                  '|| p_formula_string || '
              from '||v_query_source||' p
            where channel = '''||v_channel||'''
              and hierarchy_code = any(''{'||v_hierarchy_code_list||'}'') 
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