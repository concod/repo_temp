--liquibase formatted sql
--changeset liquibase:remove_table_configuration runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for remove_table_configuration
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.remove_table_configuration(input integer, integer);
CREATE OR REPLACE FUNCTION global.remove_table_configuration(input integer, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	begin
		  update "global".table_configurations SET is_deleted = true, updated_by = $2, updated_at = now() where tc_code = $1;
	end $function$
;
