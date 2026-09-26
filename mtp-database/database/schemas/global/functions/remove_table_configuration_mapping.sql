--liquibase formatted sql
--changeset liquibase:remove_table_configuration_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for remove_table_configuration_mapping
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.remove_table_configuration_mapping(input integer, text, text, integer);
CREATE OR REPLACE FUNCTION global.remove_table_configuration_mapping(input integer, text, text, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	begin
		  delete from "global".table_configurations_mapping where tc_code = $1 and dimension = $2 and column_name = $3;
		  update "global".table_configurations SET updated_by = $4, updated_at = now() where tc_code = $1;
	end $function$
;
