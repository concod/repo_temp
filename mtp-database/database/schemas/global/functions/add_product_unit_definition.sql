--liquibase formatted sql
--changeset liquibase:add_product_unit_definition runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_product_unit_definition
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_product_unit_definition(input jsonb, text, integer);
CREATE OR REPLACE FUNCTION global.add_product_unit_definition(input jsonb, text, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
	pud_code int;
	_key text;
	_value text;
	_query text;
	_keys text[] := array['created_by']::text[];
	_vals text[] := array[$3]::text[];
	_metrics json;
	_metric json;
	_metric_vals text[];
	_metric_query text;
	_mapping_query text;
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 
			if _key = 'metrics' then
				_metrics := _value;
			else
				_keys := array_append(_keys, _key);
				_vals := array_append(_vals, '''' || _value || '''');
			end if;
		end loop;
		_query := 'INSERT INTO "global".product_unit_definitions (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ') returning pud_code;';
 		execute _query into pud_code;
		for _metric in SELECT * FROM json_array_elements(_metrics) loop
			_metric_vals := array_append(_metric_vals, ('(' || pud_code || ', ''' || (_metric->>'size') || ''', ''' || (_metric->>'color') || ''', ''' || (_metric->>'value') || ''', ''' || (_metric->>'product_code') || ''')'));
		end loop;
		_metric_query := 'INSERT INTO "global".product_unit_definition_metrics (pud_code, "size", color, value, product_code) VALUES' || (ARRAY_TO_STRING(_metric_vals, ', ', '')) || ';';
		execute _metric_query;
		_mapping_query := 'INSERT INTO "global".style_mapping (mapping_type, "style", pud_code) VALUES (''style_product_unit_mapping'', ''' || $2 || ''', ' || pud_code || ');';
		execute _mapping_query;
	end $function$
;
