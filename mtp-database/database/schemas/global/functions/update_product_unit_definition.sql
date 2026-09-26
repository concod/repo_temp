--liquibase formatted sql
--changeset liquibase:update_product_unit_definition runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_product_unit_definition
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_product_unit_definition(input integer, jsonb, integer);
CREATE OR REPLACE FUNCTION global.update_product_unit_definition(input integer, jsonb, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
	_key text;
	_value text;
	_query text;
	_vals text[] := array[('updated_by = ' || $3), ('updated_at = now()')]::text[];
	_metrics json;
	_metric json;
	_metric_vals text[];
	_metric_query text;
	_metric_cleanup_query text;
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop 
			if _key = 'metrics' then
				_metrics := _value;
			else
				_vals := array_append(_vals, (_key || ' = ''' || _value || ''''));
			end if;
		end loop;
		_query := 'update "global".product_unit_definitions SET ' || (ARRAY_TO_STRING(_vals, ', ', '')) || ' where pud_code = ' || $1 || ';';
 		execute _query;
--		raise notice '%', _query;
		for _metric in SELECT * FROM json_array_elements(_metrics) loop
			_metric_vals := array_append(_metric_vals, ('(' || $1 || ', ''' || (_metric->>'size') || ''', ''' || (_metric->>'color') || ''', ''' || (_metric->>'value') || ''', ''' || (_metric->>'product_code') || ''')'));
		end loop;
		_metric_cleanup_query := 'delete from "global".product_unit_definition_metrics where pud_code = ' || $1 || ';';
		_metric_query := 'INSERT INTO "global".product_unit_definition_metrics (pud_code, "size", color, value, product_code) VALUES' || (ARRAY_TO_STRING(_metric_vals, ', ', '')) || ';';
--		raise notice '%',_metric_cleanup_query;
--		raise notice '%',_metric_query;
		execute _metric_cleanup_query;
		execute _metric_query;
	end $function$
;
