--liquibase formatted sql
--changeset liquibase:update_product_group_rule runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_product_group_rule
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_product_group_rule(input integer, jsonb, integer);
CREATE OR REPLACE FUNCTION global.update_product_group_rule(input integer, jsonb, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
	_key text;
	_value text;
	_vals text[] := array[('updated_by = ' || $3), ('updated_at = now()')]::text[];
	_query text;
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop 
			_vals := array_append(_vals, (_key || ' = ''' || _value || ''''));
		end loop;
		_query := 'update "global".product_group_rules SET ' || (ARRAY_TO_STRING(_vals, ', ', '')) || ' where pgr_code = ' || $1 || ';';
		raise notice '%', _query;
 		execute _query;
	end $function$
;
