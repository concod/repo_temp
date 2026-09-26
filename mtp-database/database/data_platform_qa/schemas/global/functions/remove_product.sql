--liquibase formatted sql
--changeset liquibase:remove_product runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for remove_product
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.remove_product(input character varying, integer);
CREATE OR REPLACE FUNCTION global.remove_product(input character varying, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	begin
		update "global".product_master SET active = false, updated_by = $2, updated_at = now() where product_code = $1;
	end $function$
;
