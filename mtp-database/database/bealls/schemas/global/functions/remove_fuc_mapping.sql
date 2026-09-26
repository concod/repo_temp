--liquibase formatted sql
--changeset karthikeswar.saravanan@impactanalytics.co:remove_fuc_mapping runOnChange:true stripComments:false splitStatements:false context:remove_fuc_mapping labels:remove_fuc_mapping
--comment: remove_fuc_mapping - intial sync version
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.remove_fuc_mapping(integer, integer);
CREATE OR REPLACE FUNCTION global.remove_fuc_mapping(integer, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
	_delete_query text;
	begin
		UPDATE "global".filter_user_configurations_mapping 
		SET is_deleted = TRUE, updated_at = now() 
		WHERE fuc_code = $1;
	end $function$
;