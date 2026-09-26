--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:fn_refresh_dependent_kpis_chg10 runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:MTP-40005
--comment:  SP Performance Optimization 
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.fn_refresh_dependent_kpis(p_plan_code integer, p_product_filters jsonb, p_weeks integer[]);
CREATE OR REPLACE FUNCTION plan_smart.fn_refresh_dependent_kpis(p_plan_code integer, p_product_filters jsonb, p_weeks integer[])
 RETURNS integer
 LANGUAGE plpgsql
AS $function$

declare
  i                record;
  v_affected_rows  int:=0;
  v_edits_from     text;
  v_channel        text;
  v_classes        text;
  v_plan_status    int4;
  v_plan_type      text;
  v_insert_query   text;
  v_query_filter   text   := '';
  v_kpi_str        text   := '';
  v_plans          int[];
  v_plans_sql      text;
  v_cross_join_cls text:= ' ';
  v_business_unit text;
  v_wholesale_comp_sales_unit_sql text;  
  v_retail_com_ricipt_unit_sql text;
  v_channel_retail_sql text;
  v_channel_wholesale_sql text;
  hierarchy_cods_sql text;
  v_channel_chester_sql text;
  v_chester_select_sql text;
  v_chester_com_ricipt_unit_sql text;
  v_query_source  text;

  
begin	
  select string_agg('p.kpi'||kpino, ',') as kpi_str  
    into v_kpi_str
    from generate_series(1,250) kpino ;

  --v_query_filter := "plan_smart".form_attribute_table_filters_v2('product_hierarchies', 'hierarchy_code', p_product_filters);
   hierarchy_cods_sql = 'SELECT distinct hierarchy_code
					FROM plan_smart.product_hierarchies_filter 
					where l0_name = ANY(select unnest(l0_name::text[]) from plan_smart.vw_plan_master vpm where plan_code ='||p_plan_code||')
					and l1_name = ANY(select unnest(l1_name::text[]) from plan_smart.vw_plan_master vpm where plan_code ='||p_plan_code||')
					and l2_name = ANY(select unnest(l2_name::text[]) from plan_smart.vw_plan_master vpm where plan_code ='||p_plan_code||')
					and l3_name = ANY(select unnest(l3_name::text[]) from plan_smart.vw_plan_master vpm where plan_code = '||p_plan_code||')
                    and level = 4';
					
  raise notice '%', hierarchy_cods_sql;
select channel,
         l2_name,
         status,
		 business_unit,
         case when status = 2 then '''SP'''
              when status = 3 then '''SF'''
              when status = 0 then '''WP'''
              when status = 4 then '''WF'''
         end as edits_from,
         coalesce(plan_type,'SALES')
    into v_channel,
         v_classes,
         v_plan_status,
		 v_business_unit,
         v_edits_from,
         v_plan_type
    from plan_smart.vw_plan_master 
   where plan_code = p_plan_code;
  
  raise notice '%', v_channel;
  --raise notice '%', v_classes;
  --raise notice '%', v_plan_status;
  --raise notice '%', v_edits_from;
  --raise notice '%', v_query_filter;

  for i in (select distinct plan_table ,product_hierarchy_filter_level
              from plan_smart.query_source_mappings
             where plan_status = v_plan_status
               and plan_type = v_plan_type
           )
  loop
   Begin
    if v_business_unit = 'CHESTER_DC' then
	
	v_channel_wholesale_sql = ' select channel from (select business_unit , channel from global.store_attributes_filter group by channel ,business_unit) foo where business_unit = ''Wholesale'' and channel is not null ';
	 
	v_channel_retail_sql  = ' select channel from (select business_unit , channel from global.store_attributes_filter group by channel ,business_unit) foo where business_unit  = ''Retail'' and channel is not null ';
	 	 
	 v_wholesale_comp_sales_unit_sql = 'select p.hierarchy_code,p.current_week, Sum(kpi44) as kpi44, Sum(kpi216) as kpi216, sum(kpi45) as kpi45, sum(kpi217) as kpi217  from '|| i.plan_table ||' p 
	 where  p.hierarchy_code in (' || hierarchy_cods_sql || ') and p.channel in ('||v_channel_wholesale_sql||') and p.current_week = any(''{' || array_to_string(p_weeks, ',') || '}'') group by p.hierarchy_code,p.current_week ';
	 
	 raise notice '%' , 'v_wholesale_comp_sales_unit query ::' || v_wholesale_comp_sales_unit_sql;
	 
	 v_retail_com_ricipt_unit_sql = 'select p.hierarchy_code,p.current_week, SUM(kpi118) as kpi118, sum(kpi120) as kpi120, sum(kpi119) as kpi119, sum(kpi121) as kpi121  from '|| i.plan_table ||' p 
	 where  p.hierarchy_code in (' || hierarchy_cods_sql || ') and p.channel in ('||v_channel_retail_sql||') and p.current_week = any(''{' || array_to_string(p_weeks, ',') || '}'') group by p.hierarchy_code,p.current_week ';
	 
	raise notice '%' , 'v_retail_com_ricipt_unit_sql query ::' || v_retail_com_ricipt_unit_sql;
	 v_chester_com_ricipt_unit_sql = 'select p.hierarchy_code,p.current_week, SUM(kpi25) as kpi25, SUM(kpi27) as kpi27 from '|| i.plan_table ||' p 
	 where  p.hierarchy_code in (' || hierarchy_cods_sql || ') and p.current_week = any(''{' || array_to_string(p_weeks, ',') || '}'') group by p.hierarchy_code,p.current_week ';
	

	
	raise notice '%' , 'v_chester_com_ricipt_unit_sql query ::' || v_chester_com_ricipt_unit_sql;
	 
     v_query_source := '(select
                         c.hierarchy_code as hierarchy_code,
                         c.current_week,
                         coalesce(s.kpi118,0) AS kpi118,
						 coalesce(s.kpi119,0) AS kpi119,
						 coalesce(s.kpi120,0) AS kpi120, 
                         coalesce(s.kpi121,0) AS kpi121,
                         coalesce(r.kpi44,0) AS kpi44,
						 coalesce(r.kpi45,0) AS kpi45,
                         coalesce(r.kpi216,0) AS kpi216,
                         coalesce(r.kpi217,0) AS kpi217,
                         coalesce(c.kpi25,0) AS kpi25,
                         coalesce(c.kpi27,0) AS kpi27
                       from 
                         (' || v_chester_com_ricipt_unit_sql || ') c 
                       left join 
                         ('|| v_wholesale_comp_sales_unit_sql || ') r 
                       on 
                         c.hierarchy_code = r.hierarchy_code
                       and 
                         c.current_week = r.current_week
                       left join
                       ( '|| v_retail_com_ricipt_unit_sql ||') s
                       on
                         c.hierarchy_code = s.hierarchy_code
                       and 
                         c.current_week = s.current_week)';

	 v_plans_sql  = ' 
    update '|| i.plan_table ||' a 
    set 
        kpi16 = coalesce(src.kpi118 + src.kpi44,0),
        kpi18 = coalesce(src.kpi120 + src.kpi216,0),
        kpi31 = coalesce(src.kpi25 - (src.kpi118 + src.kpi44),0),
        kpi33 = coalesce(src.kpi27 - (src.kpi120 + src.kpi216),0),
        kpi17 = coalesce(src.kpi119 + src.kpi45,0),
        kpi19 = coalesce(src.kpi121 + src.kpi217,0)
    from 
       '|| v_query_source ||' src
    where 
       a.channel = '''||v_channel||'''
    and
       a.hierarchy_code = src.hierarchy_code 
    and  
	   a.current_week = src.current_week ';
	raise notice '%', v_plans_sql;
	 
	elsif v_business_unit = 'Retail' then
		 v_channel_chester_sql = ' select channel from (select business_unit , 
		 channel from global.store_attributes_filter group by channel ,business_unit) foo 
		 where business_unit = ''CHESTER_DC'' and channel is not null ';

		 v_chester_select_sql = '
         create temporary table tmp_chester as
           select p.hierarchy_code,p.current_week, 
		   SUM(kpi98) as comp_bop_units, 
		   sum(kpi41) as comp_rcpt_units,
		   SUM(kpi23) as comp_eop_units,
		   SUM(kpi218) as comp_bop_landed_cost,
		   SUM(kpi220) as comp_bop_aulc,
		   SUM(kpi222) as comp_eop_landed_cost,
		   SUM(kpi224) as comp_eop_aulc,
		   SUM(kpi226) as comp_rcpt_landed_cost
	    from '|| i.plan_table ||' p 
		where p.channel = ''CHESTER_DC'' 
        and p.current_week = any(''{' || array_to_string(p_weeks, ',') || '}'') 
        and p.hierarchy_code in (' || hierarchy_cods_sql || ') 
	    group by p.hierarchy_code,p.current_week ';
		
	    execute 'drop table if exists tmp_chester';
        execute v_chester_select_sql;	
       
		v_plans_sql  = ' 
              update '|| i.plan_table ||' a 
              set 
				 kpi65  = coalesce(comp_bop_units * x.chester_net_implied_percent,0),
				 kpi69 = coalesce(comp_bop_landed_cost * x.chester_net_implied_percent,0),
				 kpi71 = coalesce(comp_bop_units,0),	
				 kpi73 = coalesce(comp_bop_landed_cost,0),
				 kpi80 = coalesce(comp_eop_units * x.chester_net_implied_percent,0),
				 kpi90 = coalesce(comp_eop_landed_cost * x.chester_net_implied_percent,0),
				 kpi95 = coalesce(comp_eop_units,0),	
				 kpi109 = coalesce(comp_eop_landed_cost,0),
				 kpi154 = coalesce(comp_rcpt_units,0),
				 kpi166 = coalesce(comp_rcpt_landed_cost,0)
	          FROM 
			     (select * from tmp_chester) r 
			  LEFT JOIN 
                 plan_smart.net_implied_derived x 
			  ON x.channel  = ''' || v_channel || '''
			  AND r.hierarchy_code = x.hierarchy_code
			  WHERE a.channel = ''' || v_channel || ''' 
			  AND a.current_week = r.current_week 
		      AND a.hierarchy_code = r.hierarchy_code
			  AND a.hierarchy_code = x.hierarchy_code 
			  AND a.channel = x.channel';
			    
		  elsif v_business_unit = 'Wholesale' then
					 v_channel_chester_sql = ' select channel from (select business_unit , channel from global.store_attributes_filter group by channel ,business_unit) foo where business_unit = ''CHESTER_DC'' and channel is not null ';
                     
					 v_chester_select_sql = '
                     create temporary table tmp_chester as 
                     select p.hierarchy_code,p.current_week, 
					 SUM(kpi98) as comp_bop_units, 
					 sum(kpi41) as comp_rcpt_units,
					 SUM(kpi23) as comp_eop_units,
					 SUM(kpi218) as comp_bop_landed_cost,
					 SUM(kpi220) as comp_bop_aulc,
					 SUM(kpi222) as comp_eop_landed_cost,
					 SUM(kpi224) as comp_eop_aulc,
					 SUM(kpi226) as comp_rcpt_landed_cost
					 from '|| i.plan_table ||' p 
					 where p.channel = ''CHESTER_DC'' 
                     and p.current_week = any(''{' || array_to_string(p_weeks, ',') || '}'') 
                     and p.hierarchy_code in (' || hierarchy_cods_sql || ') 
					 group by p.hierarchy_code,p.current_week ';
					 
					 execute 'drop table if exists tmp_chester';
                     execute v_chester_select_sql;
                
					 v_plans_sql := 'UPDATE ' || i.plan_table || ' a 
					                 SET
                                        kpi65 = COALESCE(comp_bop_units * x.chester_net_implied_percent, 0),
					                    kpi67 = COALESCE(comp_bop_landed_cost * x.chester_net_implied_percent, 0),
					                    kpi75 = COALESCE(comp_bop_aulc, 0),
					                    kpi80 = COALESCE(comp_eop_units * x.chester_net_implied_percent, 0),
					                    kpi88 = COALESCE(comp_eop_landed_cost * x.chester_net_implied_percent, 0),
					                    kpi111 = COALESCE(comp_eop_aulc, 0)
					                FROM 
					                    (select * from tmp_chester) r 
									LEFT JOIN 
                                         plan_smart.net_implied_derived x 
									  ON x.channel  = ''' || v_channel || '''
									 AND r.hierarchy_code = x.hierarchy_code
					               WHERE a.channel = ''' || v_channel || ''' 
					                 AND a.current_week = r.current_week 
					                 AND a.hierarchy_code = r.hierarchy_code
					                 AND a.hierarchy_code = x.hierarchy_code 
					                 AND a.channel = x.channel';

       end if;
	  End;
	 raise notice '%' , 'Update query for :'|| v_business_unit ||' ::' || v_plans_sql;
   	 EXECUTE v_plans_sql;
	 GET DIAGNOSTICS v_affected_rows = ROW_COUNT;    
  end loop;
  return v_affected_rows;
end 
$function$
;
