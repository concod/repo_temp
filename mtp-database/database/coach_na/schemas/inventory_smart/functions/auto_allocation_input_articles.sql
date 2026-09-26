--liquibase formatted sql
--changeset aiyush.prasad@impactanalytics.co:auto_allocation_input_articles_func runOnChange:true stripComments:false splitStatements:false context:MTP-69074 commit labels:Auto_allocations
--comment: auto_allocations_SP
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.auto_allocation_input_articles();
CREATE OR REPLACE FUNCTION inventory_smart.auto_allocation_input_articles()
 RETURNS TABLE(type character varying, channel character varying, l0_name character varying, l1_name character varying, l2_name character varying, l3_name character varying, auto_approve_flag boolean, auto_release boolean,  int_div integer, user_code character varying, auto_approve_no integer, total_article_count integer, article_count_per_row integer, article_list character varying[], row_num integer, allocation_code character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$ 
BEGIN
RETURN QUERY EXECUTE 
' 
  	select distinct type, channel, l0_name, l1_name, l2_name, l3_name, auto_approve_flag,  auto_release,
	int_div, user_code, auto_approve_no, total_article_count, article_count_per_row, 
	article_list, row_num, allocation_code
	from (
    SELECT *, unnest(article_list) article FROM inventory_smart.auto_allocation_input) a
    where article  not in (
    SELECT DISTINCT article FROM inventory_smart.create_allocation_result_flat_gurobi carfg
    WHERE 
    (created_at AT TIME ZONE ''America/New_York'')::date = (now() AT TIME ZONE ''America/New_York'')::date
    and allocation_code IN (
    SELECT plan_code FROM inventory_smart.plan_master pm
            WHERE type = 2   
            AND (created_at AT TIME ZONE ''America/New_York'')::date = (now() AT TIME ZONE ''America/New_York'')::date
            AND NOT is_deleted  
            )
    )'
    ;
end
$function$
;