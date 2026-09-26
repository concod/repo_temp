--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:update_budget_scale_factor_chg2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-30962
--comment: initial changeset for update_budget_scale_factor
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.update_budget_scale_factor(p_plan_code integer, p_kpi_upd_cls text, p_week_id integer, p_prod_filter jsonb);
CREATE OR REPLACE FUNCTION plan_smart.update_budget_scale_factor(p_plan_code integer, p_kpi_upd_cls text, p_week_id integer, p_prod_filter jsonb)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE 
  v_query_filter   text;
  v_query_combine  text;
  v_affected_rows  int;
  v_channel        text;
  v_classes        text;
  v_plan_status    int4;
  v_plan_type      text;
  v_update_me      text;
  i                record;
BEGIN
  v_query_filter := "plan_smart".form_attribute_table_filters_v2('product_hierarchies', 'hierarchy_code', p_prod_filter);
  
  select channel,
         l2_name,
         status,
         coalesce(plan_type,'SALES')
    into v_channel,
         v_classes,
         v_plan_status,
         v_plan_type
    from plan_smart.vw_plan_master 
   where plan_code = p_plan_code;
  
  raise notice '%', v_channel;
  raise notice '%', v_classes;
  raise notice '%', v_plan_status;

  for i in (select distinct plan_upd_table ,product_hierarchy_filter_level
              from plan_smart.query_source_mappings
             where plan_status = v_plan_status
               and plan_type   = v_plan_type
           )
  loop
 	  if v_plan_status in (2,3)
 	  then
 	    v_update_me = i.plan_upd_table||'_'||p_plan_code::text;
 	  else
 	    v_update_me = i.plan_upd_table;
 	  end if;
 
    v_query_combine = '
 			update
 			    '|| v_update_me ||' pmd
 			set
 			    '||p_kpi_upd_cls ||'
 			from
 			  (' || v_query_filter || ' and level = ' || i.product_hierarchy_filter_level || ') phf
 			where
              pmd.channel = '''||v_channel||'''
            and
 			  pmd.current_week = ' || p_week_id || '
            and
              pmd.class = ANY('''||v_classes||''')
 			and
              pmd.hierarchy_code = phf.hierarchy_code';
              
    raise notice '%', v_query_combine;
    execute v_query_combine;
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    return v_affected_rows;
  end loop;
end
$function$
;
