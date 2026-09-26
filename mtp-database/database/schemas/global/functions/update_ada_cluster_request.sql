--liquibase formatted sql
--changeset liquibase:update_ada_cluster_request runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_ada_cluster_request
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_ada_cluster_request(input text, jsonb);
CREATE OR REPLACE FUNCTION global.update_ada_cluster_request(input text, jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
	_key text;
	_value text;
	_vals text[] := array[('updated_at = now()')]::text[];
	_query text;
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop 
			_vals := array_append(_vals, (_key || ' = ''' || _value || ''''));
		end loop;
		_query := 'update "global".ada_cluster_request SET ' || (ARRAY_TO_STRING(_vals, ', ', '')) || ' where id = ''' || $1 || ''';';
		raise notice '%', _query;
 		execute _query;
	end $function$
;
