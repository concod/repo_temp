--liquibase formatted sql
--changeset archa.prakash@impactanalytics.co:get_query_source runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:mtp-34438
--comment: initial changeset for get_query_source
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.get_query_source(p_query_level integer, p_plan_status integer, p_plan_type character varying);
CREATE OR REPLACE FUNCTION plan_smart.get_query_source(p_query_level integer, p_plan_status integer, p_plan_type character varying DEFAULT 'SALES'::character varying)
 RETURNS TABLE(plan_table_text character varying, product_hierarchy_filter_level_id integer)
 LANGUAGE plpgsql
AS $function$
begin 
  return query
  select plan_table 
        ,product_hierarchy_filter_level
    from plan_smart.query_source_mappings
   where input_query_level = p_query_level
     and plan_type   = p_plan_type
     and plan_status = p_plan_status;
end 
$function$
;
