--liquibase formatted sql
--changeset linu.nazil:form_filters_gbq runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:new_sp
--comment: initial changeset for form_filters_gbq cold_updates
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cache.form_filters_gbq(_table_name varchar, _table_type varchar, _filters jsonb);
CREATE OR REPLACE FUNCTION cache.form_filters_gbq(_table_name character varying, _table_type character varying, _filters jsonb)
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
   begin
   	--raise notice '%',_filters::text;
	for _key, _value in SELECT * FROM jsonb_each_text(_filters) WHERE value IS NOT NULL loop
		select "datatype" into _dt from "cache".updateable_tables_schema where table_name = _table_name and table_type = _table_type and col = _key;
		for _filter in SELECT * FROM json_array_elements(_value::json) loop
			if (_filter::json)->>'type' = 'custom' then
				if (_filter::json)->>'values' = 'null' then
					 _con_val := ((_filter::json)->>'values');
				else
					_con_val := case when _dt ~* 'float|int|bool' then ((_filter::json)->>'values') else 'CAST(''' || ((_filter::json)->>'values') || ''' AS ' || _dt || ')' end;
				end if;
				_con := array_append(_con, '(' || _key || ' ' || ((_filter::json)->>'operator') || ' ' || _con_val || ')');
			elseif (_filter::json)->>'type' = 'list' then
				select case when _dt ~* 'float|int|bool' then string_agg(value, ', ') else ('''' || string_agg(value, ''', ''') || '''') end into _list_values from json_array_elements_text(((_filter::json)->>'values')::json);
				if (_filter::json)->>'operator' = 'in' then
					_con := array_append(_con, '(' || _key || ' IN(' || _list_values || '))');
				else
					_con := array_append(_con, '(' || _key || ' NOT IN(' || _list_values || '))');
				end if;
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
