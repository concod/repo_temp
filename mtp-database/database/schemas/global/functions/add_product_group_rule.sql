--liquibase formatted sql
--changeset liquibase:add_product_group_rule runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_product_group_rule
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_product_group_rule(input jsonb, integer);
CREATE OR REPLACE FUNCTION global.add_product_group_rule(input jsonb, integer)
 RETURNS TABLE(pk integer)
 LANGUAGE plpgsql
AS $function$
	declare
	_key text;
	_value text;
	_keys text[] := array['created_by']::text[];
	_vals text[] := array[$2]::text[];
	_query text;
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 
			_keys := array_append(_keys, _key);
			_vals := array_append(_vals, '''' || _value || '''');
		end loop;
		_query := 'INSERT INTO "global".product_group_rules (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ') returning pgr_code;';
 		return query execute _query;
	end $function$
;
