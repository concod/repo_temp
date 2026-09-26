--liquibase formatted sql
--changeset liquibase:remove_product_group_rule runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for remove_product_group_rule
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.remove_product_group_rule(input integer, integer);
CREATE OR REPLACE FUNCTION global.remove_product_group_rule(input integer, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare 
		_query text;
	begin
		_query := 'update
			"global".product_group_rules
		set
			is_deleted = true,
			updated_at = now(),
			updated_by = ' || $2 || '
		where
			pgr_code = ' || $1 || ';';
		execute _query;
	end $function$
;
