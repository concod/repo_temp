--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:auto_allocation_input_articles_v4 runOnChange:true stripComments:false splitStatements:false context:generate_all_rcl_constraint_data labels:VS-938
--comment: Updated SP for auto_allocation_input_articles
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.auto_allocation_input_articles();
CREATE OR REPLACE FUNCTION inventory_smart.auto_allocation_input_articles()
 RETURNS TABLE(brand character varying, category character varying, class character varying, sub_class character varying, auto_release boolean, auto_approve_flag boolean, int_div bigint, total_article_count bigint, article_count_per_row bigint, article_list character varying[], user_code bigint, row_num bigint, allocation_code character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$ 
BEGIN
RETURN QUERY EXECUTE ' 
  	select brand,category,"class",sub_class,auto_release,auto_approve_flag,int_div,total_article_count,article_count_per_row,article_list,coalesce(user_code,0)::bigint user_code,row_num,allocation_code::varchar allocation_code
	from (
    SELECT *, unnest(article_list) as article FROM inventory_smart.auto_allocation_input) a
    where article  not in (
    SELECT DISTINCT article FROM inventory_smart.create_allocation_result_flat_gurobi carfg
    WHERE 
    carfg.created_at >= (date((now() at TIME zone ''America/New_York''::text))::timestamp without time zone at TIME zone ''America/New_York''::text)
    and carfg.created_at <= ((date((now() at TIME zone ''America/New_York''::text))::timestamp without time zone at TIME zone ''America/New_York''::text) + ''23:59:59''::interval)
    and allocation_code IN (
    SELECT plan_code FROM inventory_smart.plan_master pm
            WHERE type = 2   
            AND (created_at AT TIME ZONE ''America/New_York'')::date = (now() AT TIME ZONE ''America/New_York'')::date
            AND NOT is_deleted  
            )
    )
	group by 1,2,3,4,5,6,7,8,9,10,11,12,13
	';
end
$function$
;

