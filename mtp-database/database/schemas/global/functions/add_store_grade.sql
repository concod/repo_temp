--liquibase formatted sql
--changeset liquibase:add_store_grade runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_store_grade
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_store_grade(input jsonb);
CREATE OR REPLACE FUNCTION global.add_store_grade(input jsonb)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
	declare
	_key text;
	_value text;
	_query text;

	_keys text[];
	_vals text[];
	_grade_id integer;

	begin 
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 
			
				_keys := array_append(_keys, _key);
				_vals := array_append(_vals, '''' || _value || '''');

		end loop;
		_query := 'INSERT INTO "global".store_grade_master (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ') returning grade_id ;' ;
	execute _query into _grade_id;
	
	raise notice '%',_query;
	return _grade_id;
	end $function$
;
