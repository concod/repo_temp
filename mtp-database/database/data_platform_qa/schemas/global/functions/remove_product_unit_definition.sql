--liquibase formatted sql
--changeset liquibase:remove_product_unit_definition runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for remove_product_unit_definition
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.remove_product_unit_definition(input integer, integer);
CREATE OR REPLACE FUNCTION global.remove_product_unit_definition(input integer, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	begin
		update "global".product_unit_definitions SET updated_by = $2, updated_at = now(), is_deleted = true where pud_code = $1;
	end $function$
;
