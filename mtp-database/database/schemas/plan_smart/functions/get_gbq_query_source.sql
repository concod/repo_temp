--liquibase formatted sql
--changeset liquibase:get_gbq_query_source runOnChange:true stripComments:false splitStatements:false context:Release_4_0 labels:liquibase_project_start
--comment: added lly changeset for get_gbq_query_source
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.get_gbq_query_source(p_query_level integer, p_plan_status integer, p_plan_type character varying);
CREATE OR REPLACE FUNCTION plan_smart.get_gbq_query_source(p_query_level integer, p_plan_status integer, p_plan_type character varying DEFAULT 'SALES'::character varying)
 RETURNS TABLE(gbq_plan_table_ly character varying, gbq_plan_table_lly character varying, product_hierarchy_filter_level_id integer, gbq_plan_table_iaf character varying)
 LANGUAGE plpgsql
AS $function$
begin
  RETURN QUERY
    SELECT query_source_mappings.gbq_plan_table_ly AS ly,
    		query_source_mappings.gbq_plan_table_lly AS lly,
	           query_source_mappings.product_hierarchy_filter_level,
           query_source_mappings.gbq_plan_table_iaf AS iaf
    FROM plan_smart.query_source_mappings
    WHERE query_source_mappings.input_query_level = p_query_level
        AND query_source_mappings.plan_type = p_plan_type
        AND query_source_mappings.plan_status = p_plan_status;
end 
$function$
;
