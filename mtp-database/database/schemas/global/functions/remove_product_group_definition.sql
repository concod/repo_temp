--liquibase formatted sql
--changeset liquibase:remove_product_group_definition runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for remove_product_group_definition
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.remove_product_group_definition(input integer, integer);
CREATE OR REPLACE FUNCTION global.remove_product_group_definition(input integer, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare 
		_query text;
	begin
		_query := 'update
			"global".product_group_definitions
		set
			is_deleted = true,
			updated_at = now(),
			updated_by = ' || $2 || '
		where
			pgd_code = ' || $1 || ';';
		execute _query;
	end $function$
;
