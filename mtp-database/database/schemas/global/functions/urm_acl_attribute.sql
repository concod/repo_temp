--liquibase formatted sql
--changeset liquibase:urm_acl_attribute runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for urm_acl_attribute
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.urm_acl_attribute(input text, jsonb);
CREATE OR REPLACE FUNCTION global.urm_acl_attribute(input text, jsonb)
 RETURNS TABLE(attribute character varying)
 LANGUAGE plpgsql
AS $function$
	declare
	_query text := '';
	begin
		_query := 'select distinct ' || $1 || ' as attributes from (' || ("global".form_attribute_table_filters('urm_acl_attributes', 'acl_code', $2)) || ' ) X';
 		raise notice '%',_query;
		RETURN QUERY EXECUTE _query;
	end $function$
;
