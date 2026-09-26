--liquibase formatted sql
--changeset liquibase:form_filters runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for form_filters
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cache.form_filters(input text, text, jsonb);
CREATE OR REPLACE FUNCTION cache.form_filters(input text, text, jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
   	declare
	   	_key text;
	   	_value text;
	   	_filter text;
	   	_dt text;
	   	_con text[];
	   	_con_val text;
	   	_combine_where text[];
	   	_list_values text;
	   _table_name varchar := $1;
	   _table_type varchar := $2;
   begin
   	for _key, _value in SELECT * FROM jsonb_each_text($3) WHERE value IS NOT NULL loop
		select coalesce("datatype", 'varchar') into _dt from "cache".updateable_tables_schema where table_name = _table_name and table_type = _table_type and col = _key;
		for _filter in SELECT * FROM json_array_elements(_value::json) loop
			if (_filter::json)->>'type' = 'custom' then
				if (_filter::json)->>'values' = 'null' then
					_con_val := ((_filter::json)->>'values');
				else
					_con_val := '''' || ((_filter::json)->>'values') || '''::' || _dt;
				end if;
				_con := array_append(_con, '(' || _key || '::' || _dt || ' ' || ((_filter::json)->>'operator') || ' ' || _con_val || ')');
			elseif (_filter::json)->>'type' = 'list' then
				select concat(array_agg(value)) into _list_values from json_array_elements_text(((_filter::json)->>'values')::json);
				if (_filter::json)->>'operator' = 'in' then
					_con := array_append(_con, '(' || _key || '::' || _dt || ' = any(''' || _list_values || '''::' || _dt || '[]))');
				else
					_con := array_append(_con, 'NOT(' || _key || '::' || _dt || ' = any(''' || _list_values || '''::' || _dt || '[]))');
				end if;
			elseif (_filter::json)->>'type' = 'expression' then
				_con := array_append(_con, '(' || _key || '::' || _dt || ' ' || ((_filter::json)->>'operator') || ')');
			end if;
		end loop;
		if cardinality(_con) > 0 then
			_combine_where := array_append(_combine_where, ARRAY_TO_STRING(_con, ' AND ', ''));
			_con := array[]::text[];
  		end if;
	end loop;
	return array_to_string(_combine_where, ' AND ', '');
 end $function$
;
