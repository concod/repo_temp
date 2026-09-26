--liquibase formatted sql
--changeset liquibase:remove_fuc_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for remove_fuc_mapping
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.remove_fuc_mapping(integer);
CREATE OR REPLACE FUNCTION global.remove_fuc_mapping(integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
	_delete_query text;
	begin
		delete from "global".filter_user_configurations_mapping where fuc_code = $1;
	end $function$
;
