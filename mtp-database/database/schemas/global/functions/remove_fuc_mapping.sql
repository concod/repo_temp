--liquibase formatted sql
--changeset liquibase:remove_fuc_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: introducing soft delete | MTP-95928
--rollback: SELECT 1

DROP FUNCTION IF EXISTS global.remove_fuc_mapping(integer);
CREATE OR REPLACE FUNCTION global.remove_fuc_mapping(integer)
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

--changeset liquibase:remove_fuc_mapping_updated runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: introducing soft delete | MTP-95928 | MTP-101654
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