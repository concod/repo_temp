--liquibase formatted sql
--changeset liquibase:extract_keys runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for extract_keys
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.extract_keys(input jsonb, text);
CREATE OR REPLACE FUNCTION global.extract_keys(input jsonb, text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
	_keys text := '';
	begin
		select
			string_agg(x.k, ', ')
		from (
			select
				concat($2, '.',
				jsonb_object_keys($1)) as k
		) x into _keys;
	return _keys;
	end $function$
;
