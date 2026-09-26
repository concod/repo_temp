--liquibase formatted sql
--changeset swapnil.bhange@impactanalytics.co:auto_allocation_input_article_v7 runOnChange:true stripComments:false splitStatements:false context:auto_allocation_input_articles labels:retrigger_aa_input_articles
--comment: retrigger updates auto_allocation_input_article_v7
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.auto_allocation_input_articles();
DROP FUNCTION IF EXISTS inventory_smart.auto_allocation_input_articles(int4);
CREATE OR REPLACE FUNCTION inventory_smart.auto_allocation_input_articles(batch_id int4 DEFAULT 1)
 returns table(
	auto_approve_flag boolean,
	int_div character varying,
	user_code integer,
	article_list character varying[],
	row_num integer,
	allocation_code character varying,
	auto_approve_no integer,
	allocation_status character varying,
	range_name character varying,
	l0_name_article_list_map jsonb,
    store_groups jsonb,
    batch_number integer)
 language plpgsql
 security definer
as $function$ 
begin
return QUERY execute 
' 
  	select distinct auto_approve_flag, int_div, user_code, article_list, row_num, allocation_code, auto_approve_no, allocation_status,
	range_name, l0_name_article_list_map, store_groups, batch_number
	from (
    SELECT *, unnest(article_list) as article FROM inventory_smart.auto_allocation_input
    WHERE batch_number = ' || batch_id || ') a
    where article::text not in (
    SELECT DISTINCT article FROM inventory_smart.create_allocation_result_flat_gurobi carfg
    WHERE 
    (created_at AT TIME ZONE ''Australia/Melbourne'')::date = (now() AT TIME ZONE ''Australia/Melbourne'')::date
    and allocation_code IN (
    SELECT plan_code FROM inventory_smart.plan_master pm
            WHERE type = 2   
            AND (created_at AT TIME ZONE ''Australia/Melbourne'')::date = (now() AT TIME ZONE ''Australia/Melbourne'')::date
            AND NOT is_deleted  
            )
    )'
    ;
end
$function$
;
