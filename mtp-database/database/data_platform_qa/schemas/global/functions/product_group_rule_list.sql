--liquibase formatted sql
--changeset liquibase:product_group_rule_list runAlways:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_group_rule_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_group_rule_list(input integer);
CREATE OR REPLACE FUNCTION global.product_group_rule_list(input integer)
 RETURNS SETOF global.product_group_rules
 LANGUAGE plpgsql
AS $function$
	begin
		return QUERY
		select
			*
		from
			"global".product_group_rules
		where
			pgr_code = $1
			and is_deleted = false;
	end $function$
;
