--liquibase formatted sql
--changeset sri.harsha@impactanalytics.co:auto_allocation_input_articles_update_datatype_1 runOnChange:true stripComments:false splitStatements:false context:auto_allocation_input_articles labels:retrigger_aa_input_articles
--comment: retrigger updates auto_allocation_input_article_update_datatype_1
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.auto_allocation_input_articles();
CREATE OR REPLACE FUNCTION inventory_smart.auto_allocation_input_articles()
RETURNS TABLE( 
    "type" varchar,
    channel varchar,
    l0_name varchar,
    l1_name varchar,
    l2_name varchar,
    auto_approve_flag bool,
    int_div int4,
    user_code varchar,
    auto_approve_no int4,
    total_article_count int4,
    article_count_per_row int4,
    article_list _varchar,
    row_num int4,
    allocation_code varchar,
    article_dc_mapping jsonb,
    mapped_stores jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$ 
BEGIN
RETURN QUERY EXECUTE 
' 
  	select distinct type, channel, l0_name, l1_name, l2_name, auto_approve_flag, 
	int_div, user_code, auto_approve_no, total_article_count, article_count_per_row, 
	article_list, row_num, allocation_code,article_dc_mapping,mapped_stores
	from (
    SELECT *, unnest(article_list) article FROM inventory_smart.auto_allocation_input) a
    where concat(article::text, ''-'', l0_name::text, ''-'', channel::text)  not in (
    SELECT DISTINCT article FROM inventory_smart.create_allocation_result_flat_gurobi carfg
    WHERE 
    (created_at AT TIME ZONE ''UTC'')::date = (now() AT TIME ZONE ''UTC'')::date
    and allocation_code IN (
    SELECT plan_code FROM inventory_smart.plan_master pm
            WHERE type = 2   
            AND (created_at AT TIME ZONE ''UTC'')::date = (now() AT TIME ZONE ''UTC'')::date
            AND NOT is_deleted  
            )
    )'
    ;
end
$function$;