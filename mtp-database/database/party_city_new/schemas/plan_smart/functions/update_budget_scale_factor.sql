--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:update_budget_scale_factor_chg5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-39944
--comment:  bu changes related to partycity 
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.update_budget_scale_factor(p_plan_code integer, p_kpi_upd_cls text, p_week_id integer, p_prod_filter jsonb);
DROP FUNCTION IF EXISTS plan_smart.update_budget_scale_factor(p_plan_code integer, p_kpi_upd_cls text, p_week_id integer, p_prod_filter jsonb, p_user_code integer);
DROP FUNCTION IF EXISTS plan_smart.update_budget_scale_factor(p_query_level integer, p_plan_code integer, p_channel text, p_prod_filter jsonb, p_week_kpi_upd_details jsonb, p_user_code integer);
CREATE OR REPLACE FUNCTION plan_smart.update_budget_scale_factor(p_query_level integer, p_plan_code integer, p_channel text, p_prod_filter jsonb, p_week_kpi_upd_details jsonb, p_user_code integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE 
  v_query_filter         text; 
  v_hierarchy_code_list  int[];
  v_phf_code_sql         text;
  v_kpi_upd_cls          text;
  v_query_combine        text;
  v_plan_upd_table       text;
  v_phf_level_id         int;
  v_affected_rows        int;
  v_classes              text[];
  v_week                 int4;
  v_plan_version         int4;
  v_plan_type            text;
  v_business_unit        text;
  v_update_me            text;
  v_tot_affected_rows    int4:=0;
  i                      record;
  j                      record;
  v_actioned_ts     timestamptz := now();
BEGIN
  select l2_name::text[],
         status,
         coalesce(plan_type,'SALES'),
         business_unit
    into v_classes,
         v_plan_version,
         v_plan_type,
         v_business_unit
    from plan_smart.vw_plan_master 
   where plan_code = p_plan_code;
  
  select plan_upd_table ,product_hierarchy_filter_level
    into v_plan_upd_table, v_phf_level_id
    from plan_smart.query_source_mappings
   where input_query_level = p_query_level
     and plan_status = v_plan_version
     and plan_type   = v_plan_type ;   
  
  v_query_filter := "plan_smart".form_attribute_table_filters_v2('product_hierarchies', 'hierarchy_code', p_prod_filter);
 
v_phf_code_sql := format('select array_agg(hierarchy_code) 
                             from (%s 
                                   and level = %L %s
                                  ) phf'
                          ,v_query_filter
                          ,v_phf_level_id
                          ,case 
	                         when v_business_unit is not null 
	                         then format(' and business_unit @> %L', format('{"%s"}', v_business_unit))
                             else ' '
                           end
                          );
  raise notice 'v_phf_code_sql:%',v_phf_code_sql;                         
  execute v_phf_code_sql into v_hierarchy_code_list;
 
  raise notice 'hierarchy_codes:%',v_hierarchy_code_list;
 
  if v_plan_version in (2,3)
  then
    v_update_me = v_plan_upd_table||'_'||p_plan_code::text;
  else
 	v_update_me = v_plan_upd_table;
  end if;
 
  raise notice 'v_update_me:%',v_update_me;
 
  for i in (select
              jsonb_array_elements_text(value)  upd_info
            from 
              jsonb_each(p_week_kpi_upd_details) 
           )
  loop
    for j in (select key, value from jsonb_each_text(i.upd_info::jsonb))
    loop 
      raise notice 'v_kpi_upd_cls:%',j.value;
      raise notice 'v_week:%',j.key::int;
      v_query_combine := format('
         update %s
            set %s ,%s=%L, %s=%L
          where channel = %L
            and current_week = %L
            and hierarchy_code = any(%L)'
         ,v_update_me
         ,j.value
         ,'updated_by'
         ,p_user_code
         ,'updated_at'
         ,v_actioned_ts
         ,p_channel
         ,j.key::int
         ,v_hierarchy_code_list);
             
      raise notice 'v_query_combine : %', v_query_combine;
      execute v_query_combine;
      GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
      v_tot_affected_rows := v_tot_affected_rows + v_affected_rows;
    end loop;
  end loop; 
 
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
        ,v_actioned_ts
        ,v_query_combine
        );
 
  return v_tot_affected_rows;
end
$function$
;
