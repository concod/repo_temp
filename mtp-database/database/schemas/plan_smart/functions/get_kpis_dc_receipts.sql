--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:get_kpis_dc_receipts_for_pchi runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-19169
--comment: dc receipts bugs fixed
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.get_kpis_dc_receipts(p_refcursor refcursor, p_plan_code integer, p_formula_string_1 character varying, p_formula_string_2 character varying, p_formula_string_3 character varying, p_product_filter jsonb, p_channels text[], p_weeks integer[], p_plan_status integer);
CREATE OR REPLACE FUNCTION plan_smart.get_kpis_dc_receipts(p_refcursor refcursor, p_plan_code integer, p_formula_string_1 character varying, p_formula_string_2 character varying, p_formula_string_3 character varying, p_product_filter jsonb, p_channels text[], p_weeks integer[], p_plan_status integer)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*

select * from plan_smart.get_kpis_dc_receipts(
	'my_cur',
	2322,
	'sum(kpi152 + kpi174)/sum(kpi150) as cy_rec_wos,sum(kpi174) as cy_rec_rcpt_units,sum(kpi175) as cy_rec_rcpt_dollars,sum(kpi177) as cy_rec_rcpt_cost,sum(kpi175)/sum(kpi174) as cy_rec_rcpt_aur,sum(kpi177)/sum(kpi174) as cy_rec_rcpt_auc,sum(kpi180) as cy_final_rcpt_units,sum(kpi181) as cy_final_rcpt_dollars,sum(kpi183) as cy_final_rcpt_cost,sum(kpi181)/sum(kpi180) as cy_final_rcpt_aur,sum(kpi183)/sum(kpi180) as cy_final_rcpt_auc',
	'sum(kpi170) as cy_turn_cost,sum(kpi193) as cy_transfer_out_units,sum(kpi194) as cy_transfer_out_dollars,sum(kpi195) as cy_transfer_out_cost,sum(kpi191) as cy_transfer_in_dollars,sum(kpi192) as cy_transfer_in_cost,sum(kpi151) as cy_sales,sum(kpi152 + kpi174)/sum(kpi150) as cy_rec_wos,sum(kpi174) as cy_rec_rcpt_units,sum(kpi175) as cy_rec_rcpt_dollars,sum(kpi177) as cy_rec_rcpt_cost,sum(kpi175)/sum(kpi174) as cy_rec_rcpt_aur,sum(kpi177)/sum(kpi174) as cy_rec_rcpt_auc,sum(kpi150) as cy_qty,sum(kpi156) as cy_inv_required,sum(kpi180) as cy_final_rcpt_units,sum(kpi181) as cy_final_rcpt_dollars,sum(kpi183) as cy_final_rcpt_cost,sum(kpi181)/sum(kpi180) as cy_final_rcpt_aur,sum(kpi183)/sum(kpi180) as cy_final_rcpt_auc,sum(kpi154) as cy_eop_units,sum(kpi155) as cy_eop_dollars,sum(kpi159) as cy_buffer_units,sum(kpi152) as cy_bop_units,sum(kpi153) as cy_bop_dollars,sum(kpi167) as cy_adj_units,sum(kpi168) as cy_adj_dollars,sum(kpi169) as cy_adj_cost',
	'mp.cy_turn_cost as cy_turn_cost,mp.cy_transfer_out_units as cy_transfer_out_units,mp.cy_transfer_out_dollars as cy_transfer_out_dollars,mp.cy_transfer_out_cost as cy_transfer_out_cost,mp.cy_transfer_in_dollars as cy_transfer_in_dollars,mp.cy_transfer_in_cost as cy_transfer_in_cost,mp.cy_sales as cy_sales,coalesce(dc.cy_rec_wos,mp.cy_rec_wos) as cy_rec_wos,coalesce(dc.cy_rec_rcpt_units,mp.cy_rec_rcpt_units) as cy_rec_rcpt_units,coalesce(dc.cy_rec_rcpt_dollars,mp.cy_rec_rcpt_dollars) as cy_rec_rcpt_dollars,coalesce(dc.cy_rec_rcpt_cost,mp.cy_rec_rcpt_cost) as cy_rec_rcpt_cost,coalesce(dc.cy_rec_rcpt_aur,mp.cy_rec_rcpt_aur) as cy_rec_rcpt_aur,coalesce(dc.cy_rec_rcpt_auc,mp.cy_rec_rcpt_auc) as cy_rec_rcpt_auc,mp.cy_qty as cy_qty,mp.cy_inv_required as cy_inv_required,coalesce(dc.cy_final_rcpt_units,mp.cy_final_rcpt_units) as cy_final_rcpt_units,coalesce(dc.cy_final_rcpt_dollars,mp.cy_final_rcpt_dollars) as cy_final_rcpt_dollars,coalesce(dc.cy_final_rcpt_cost,mp.cy_final_rcpt_cost) as cy_final_rcpt_cost,coalesce(dc.cy_final_rcpt_aur,mp.cy_final_rcpt_aur) as cy_final_rcpt_aur,coalesce(dc.cy_final_rcpt_auc,mp.cy_final_rcpt_auc) as cy_final_rcpt_auc,mp.cy_eop_units as cy_eop_units,mp.cy_eop_dollars as cy_eop_dollars,mp.cy_buffer_units as cy_buffer_units,mp.cy_bop_units as cy_bop_units,mp.cy_bop_dollars as cy_bop_dollars,mp.cy_adj_units as cy_adj_units,mp.cy_adj_dollars as cy_adj_dollars,mp.cy_adj_cost as cy_adj_cost',
	'{"l0_name": [{"type": "list", "operator": "in", "values": ["Home"]}]}',
	'{"Factory Line Retail","Full Line Retail"}',
	'{202514}',
	1
);

--generic query how dc recipts KPIs is retrived
select coalesce(dc.kpi,mp.kpi)
from get_kpi_master_plan mp
left join get_kpi_dc dc
on dc.week = wp.week
and coalesce(dc.channel,'NA') =  coalesce(mp.channel,'NA')

*/
declare
  v_week           int4;
  v_channel        text;
  v_level_id       int4;
  v_table_name     text;
  v_tbl_prefix     text;
  v_query_source   text;
  v_query_combine  text   := '';
  v_query_filter   text   := '';
  v_kpi_str        text   := '';
  v_hierarchy_code_list   text;
  v_phf_code_sql   text;
  v_query_get_kpi_dc      text := '';
  v_query_get_kpi_master  text := '';
begin

  select string_agg(kpi,',') as kpi_str 
    into v_kpi_str
    from (select 'coalesce(pm.kpi'||kpino||',p.kpi'||kpino||') as kpi'||kpino as kpi
            from generate_series(1,250) kpino 
         ) a;

  v_query_filter := "plan_smart".form_attribute_table_filters_v2('product_hierarchies', 'hierarchy_code', p_product_filter);

  /*select channel, l2_name, status
    into v_channel, v_classes, v_plan_status
    from plan_smart.vw_plan_master 
   where plan_code = p_plan_code;*/
 
    
  select plan_table_text,
         product_hierarchy_filter_level_id
    into v_table_name,
         v_level_id
    from plan_smart.get_pg_query_source(1,p_plan_status);

  
  --v_phf_code_sql := 'select string_agg(hierarchy_code::text,'','') from ('||replace(v_query_filter, '"', '')|| ' and level = '||v_level_id||') phf';
  --raise notice '%', v_phf_code_sql;
  --execute v_phf_code_sql into v_hierarchy_code_list;
  --raise notice '%', v_hierarchy_code_list;
  if p_product_filter !='{}'
  then
    v_query_filter := "plan_smart".form_attribute_table_filters_v2('product_hierarchies', 'hierarchy_code', p_product_filter);
    v_phf_code_sql := 'select string_agg(hierarchy_code::text,'','') from ('||replace(v_query_filter, '"', '')|| ' and level = '||v_level_id||') phf';
    raise notice '%', v_phf_code_sql;
    execute v_phf_code_sql into v_hierarchy_code_list;
  end if;
  
 
  if p_plan_status in (0,2) then v_tbl_prefix :='WP';
  elsif
    p_plan_status in (3,4) then v_tbl_prefix :='WF';
  elsif
    p_plan_status = 1 then v_tbl_prefix :='OP';
  elsif
    p_plan_status = 5 then v_tbl_prefix :='LF';
  end if;

  v_query_source := 'plan_smart.'||v_tbl_prefix||'_master_dc_receipts';
  raise notice '%', v_query_source;
  if p_plan_status in (2,3) -- 2: "Scenario Plan", 3: "Scenario Forecast"
  then     
      v_query_source := 
      '(select
 	      p.hierarchy_code,
          p.channel,
          p.current_week,
          p.class,'
          ||v_kpi_str||'
        from 
          '||v_query_source||' p
        left join 
          plan_smart.plan_modifications pm
        on
 	      pm.plan_code = ' ||p_plan_code||'
        and 
          pm.current_week = p.current_week
        and 
 	      pm.hierarchy_code  = p.hierarchy_code
        )';	
      raise notice 'inside if : %', v_query_source;
  end if;
  raise notice '%', v_query_source;		
  v_query_get_kpi_dc :=  '
 			select p.current_week,p.channel,
                  '|| p_formula_string_1 || '
 			from '||v_query_source||' p
            where channel = ANY(''{"' || array_to_string(p_channels, '","') || '"}'')
            and current_week = ANY(''{"' || array_to_string(p_weeks, '","') || '"}'')';
    
  v_query_get_kpi_master :=  '
 			select p.current_week,p.channel,
                  '|| p_formula_string_2 || '
 			from '||v_table_name
 			||' p
            where channel = ANY(''{"' || array_to_string(p_channels, '","') || '"}'')
            and current_week = ANY(''{"' || array_to_string(p_weeks, '","') || '"}'')';
	       
  if v_hierarchy_code_list is not null
  then
    v_query_get_kpi_dc := v_query_get_kpi_dc||'
            and hierarchy_code = any(''{'||v_hierarchy_code_list||'}'')'; 
   
    v_query_get_kpi_master := v_query_get_kpi_master||'
            and hierarchy_code = any(''{'||v_hierarchy_code_list||'}'')';    
  end if;
 
  v_query_get_kpi_dc := v_query_get_kpi_dc|| '
 			group by
              grouping sets(
	              (p.current_week),
	              (p.current_week, p.channel))';
	             
  v_query_get_kpi_master := v_query_get_kpi_master|| '
 			group by
              grouping sets(
	              (p.current_week),
	              (p.current_week, p.channel))';	             
   
  v_query_combine :='
 			select mp.current_week,mp.channel,
                  '|| p_formula_string_3 || '
 			from ('||v_query_get_kpi_master||') mp
            left join ('||v_query_get_kpi_dc||') dc
            on dc.current_week = mp.current_week
            and coalesce(dc.channel,''NA'') =  coalesce(mp.channel,''NA'')' ;
             
  raise notice '%', v_query_combine;
  OPEN $1 FOR execute v_query_combine;
  RETURN $1;           
end
$function$
;
