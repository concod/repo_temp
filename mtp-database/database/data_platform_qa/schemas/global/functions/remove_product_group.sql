--liquibase formatted sql
--changeset liquibase:remove_product_group runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for remove_product_group
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.remove_product_group(input integer, integer);
CREATE OR REPLACE FUNCTION global.remove_product_group(input integer, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare 
		_query text;
		_query_1 text;
	begin
		_query := 'update
			"global".product_groups
		set
			is_deleted = true,
			updated_at = now(),
			updated_by = ' || $2 || '
		where
			pg_code = ' || $1 || ';';
		_query_1 := 'UPDATE "global".product_group_definitions_rules_mapping
		SET 
			pg_code=null
		WHERE 
			pg_code = ' || $1 || ';';
	execute _query;
	execute _query_1;
	end $function$
;