--liquibase formatted sql
--changeset liquibase:add_roles runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_roles
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_roles(input jsonb);
CREATE OR REPLACE FUNCTION global.add_roles(input jsonb)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
	declare
	_key text;
	_value text;
	_query text;
	_dc_store_map_query text;

	_keys text[];
	_vals text[];
	_role_code varchar;
	_dc_code int;
	_dc_name varchar;
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 
			if _key = 'role_code' then
				_role_code := _value;
			else 
				_keys := array_append(_keys, _key);
				_vals := array_append(_vals, '''' || _value || '''');
			end if;
		end loop;
		_query := 'INSERT INTO "global".roles_master (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ')' ;
	---raise notice '%',_query;	
	execute _query ;
	
	raise notice '%',_query;

	return _dc_code;
	end $function$
;
