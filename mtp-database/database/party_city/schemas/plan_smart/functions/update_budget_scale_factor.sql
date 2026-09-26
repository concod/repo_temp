--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:update_budget_scale_factor_chg4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-39944
--comment: Create and persist Audit Trail of all PlanSmart Edit operations and link it to Plan Version tables
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.update_budget_scale_factor(p_plan_code integer, p_kpi_upd_cls text, p_week_id integer, p_prod_filter jsonb);
DROP FUNCTION IF EXISTS plan_smart.update_budget_scale_factor(p_plan_code integer, p_kpi_upd_cls text, p_week_id integer, p_prod_filter jsonb, p_user_code integer);
CREATE OR REPLACE FUNCTION plan_smart.update_budget_scale_factor(p_plan_code integer, p_kpi_upd_cls text, p_week_id integer, p_prod_filter jsonb, p_user_code integer)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE 
  v_query_filter   text;
  v_query_combine  text;
  v_affected_rows  int;
  v_updated_at     timestamptz := now();
  v_channel        text;
  v_classes        text;
  v_plan_status    int4;
  v_plan_type      text;
  v_update_me      text;
  v_business_unit  text;
  v_result_json    json;
  i                record;
BEGIN
  v_query_filter := "plan_smart".form_attribute_table_filters_v2('product_hierarchies', 'hierarchy_code', p_prod_filter);
  
  select channel,
         l2_name,
         status,
         coalesce(plan_type,'SALES'),
         business_unit
    into v_channel,
         v_classes,
         v_plan_status,
         v_plan_type,
         v_business_unit
    from plan_smart.vw_plan_master 
   where plan_code = p_plan_code;
  
  raise notice '%', v_channel;
  raise notice '%', v_classes;
  raise notice '%', v_plan_status;
  raise notice '%', v_business_unit;

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
 	
    raise notice '%', v_update_me;
 
    v_query_combine = '
 			update
 			    '|| v_update_me ||' pmd
 			set
 			    '||p_kpi_upd_cls ||', updated_by = '||p_user_code||', updated_at = '''||v_updated_at||''' 
 			from
 			  (' || v_query_filter 
 			     || ' and level = ' || i.product_hierarchy_filter_level 
 			     || ' and business_unit @> ''{"'||v_business_unit||'"}''
 			  ) phf
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
   
    insert into plan_smart.plan_master_audit
        (plan_code
        ,action_code
        ,user_code
        ,plan_actioned_ts
        ,"comment"
        )
    values
        (p_plan_code
        ,'FE Edit'
        ,p_user_code
        ,v_updated_at
        ,v_query_combine
        );
    v_result_json := jsonb_build_object('rows_affected', v_affected_rows, 'updated_at', v_updated_at);
    return v_result_json;
  end loop;
end
$function$
;
