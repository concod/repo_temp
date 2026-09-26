--liquibase formatted sql
--changeset aman.lakkoju:changed_at_primary_trait_level runOnChange:true stripComments:false splitStatements:false context:auto_allocation_input_articles labels:retrigger_aa_input_articles
--comment: changed_at_primary_trait_level
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.auto_allocation_input_articles();
CREATE OR REPLACE FUNCTION inventory_smart.auto_allocation_input_articles()
RETURNS TABLE( 
"type" varchar , 
buyer varchar, 
primary_trait varchar,
auto_approve_flag bool, 
int_div int4,
user_code varchar, 
auto_approve_no int4, 
total_style_count int4,
style_count_per_row int4,
style_list _varchar,
row_num varchar, 
allocation_code varchar

)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$ 
BEGIN
RETURN QUERY EXECUTE 
'  	select distinct type,buyer, primary_trait,
	auto_approve_flag, int_div, user_code, auto_approve_no, total_style_count, style_count_per_row, 
	style_list, row_num, allocation_code
	from (
    SELECT *, unnest(style_list) style FROM inventory_smart.auto_allocation_input) a
    where style not in (
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
    )'
    ;
end
$function$;