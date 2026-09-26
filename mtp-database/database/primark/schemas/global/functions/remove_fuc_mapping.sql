--liquibase formatted sql
--changeset liquibase:remove_fuc_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: introducing soft delete | MTP-95928 | MTP-101654 
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.remove_fuc_mapping(integer);
DROP FUNCTION IF EXISTS global.remove_fuc_mapping(integer, integer);
CREATE OR REPLACE FUNCTION global.remove_fuc_mapping(integer, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
	_delete_query text;
	begin
		UPDATE "global".filter_user_configurations_mapping 
		SET is_deleted = TRUE, updated_at = now(), updated_by = $2
		WHERE fuc_code = $1;
	end $function$
;
