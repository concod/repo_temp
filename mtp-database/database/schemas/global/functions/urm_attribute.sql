--liquibase formatted sql
--changeset liquibase:urm_attribute runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for urm_attribute
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.urm_attribute(input text, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.urm_attribute(input text, jsonb, jsonb)
 RETURNS TABLE(attribute character varying)
 LANGUAGE plpgsql
AS $function$
	declare
	_query_sm text := '';
	_query_sa text := '';

	_query_combine text := '';
	begin

		_query_sm := 'SELECT * FROM "global".urm_master' || ("global".form_main_table_filters('urm_master', $2));

		_query_sa := "global".form_attribute_table_filters('urm_attributes', 'user_code', $3);

 		--_query_table_filters := "global".form_table_query($4);

 		if $3 <> '{}' then
	 	 _query_combine := 'SELECT distinct '|| $1 || ' FROM (SELECT * FROM (' || _query_sm || ') main JOIN (' || _query_sa || ') attributes ON main.user_code = attributes.user_code) X ';

		 else
			 _query_combine := 'SELECT distinct '|| $1 || '  FROM (SELECT * FROM (' || _query_sm || ') main ) X';
		 end if;

		--_query_sm := 'select distinct ' || $1 || ' as attributes from (' || ("global".form_attribute_table_filters('urm_attributes', 'user_code', $2)) || ' ) X';
 		raise notice '%',_query_combine;
		RETURN QUERY EXECUTE _query_combine;
	end $function$
;