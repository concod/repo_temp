--liquibase formatted sql
--changeset liquibase:create_ada_cluster_request runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for create_ada_cluster_request
--rollback: SELECT 1
DROP FUNCTION IF EXISTS ada.create_ada_cluster_request(input jsonb, integer);
CREATE OR REPLACE FUNCTION ada.create_ada_cluster_request(input jsonb, integer)
 RETURNS TABLE(pk character varying)
 LANGUAGE plpgsql
AS $function$
	declare
	_key text;
	_value text;
	_query text := '';
	_keys text[] := array['created_by']::text[];
	_vals text[] := array[$2]::text[];
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 
			_keys := array_append(_keys, _key);
			_vals := array_append(_vals, '''' || _value || '''');
		end loop;
		_query := 'INSERT INTO "ada".ada_cluster_request (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ') returning id;';
 		--raise notice '%',_query;
		return query execute  _query;
	end $function$
;
