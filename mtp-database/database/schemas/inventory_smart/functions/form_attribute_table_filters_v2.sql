--liquibase formatted sql
--changeset liquibase:form_attribute_table_filters_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for form_attribute_table_filters_v2
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.form_attribute_table_filters_v2(input text, text, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.form_attribute_table_filters_v2(input text, text, jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
	declare
	_key text;
	_value text;
	_query_pa text := '';
	_filter text;
	_dt text;
	_dt_sql text;
	_con text[];
	_con_val text;
	_combine_where text[];
	_attr_cols text[] := array[$2]::text[];
	_where text := '';
begin
	for _key, _value in SELECT * FROM jsonb_each_text($3) WHERE value IS NOT NULL loop
		_value := REGEXP_REPLACE(_value::text , $$([^'])'([^'])$$, $$\1''\2$$ ,'g'); 
			_attr_cols := array_append(_attr_cols, _key);
			_dt_sql := 'select coalesce(max(datatype), ''varchar'') from inventory_smart.' || $1 || '_list where attribute_name = ''' || _key || ''';';
			execute _dt_sql into _dt;
			for _filter in SELECT * FROM json_array_elements(_value::json) loop
				if (_filter::json)->>'type' = 'custom' then
					if (_filter::json)->>'values' = 'null' then
						_con_val := ((_filter::json)->>'values');
					else
						_con_val := '''' || ((_filter::json)->>'values') || '''::' || _dt;
					end if;
					_con := array_append(_con, '(' || _key || '::' || _dt || ' ' || ((_filter::json)->>'operator') || ' ' || _con_val || ')');
				elseif (_filter::json)->>'type' = 'list' then
					if (_filter::json)->>'operator' = 'in' then
						_con := array_append(_con, '(' || _key || '::' || _dt || ' = any(''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::' || _dt || '[]))');
					else
						_con := array_append(_con, 'NOT(' || _key || '::' || _dt || ' = any(''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::' || _dt || '[]))');
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
		if cardinality(_combine_where) > 0 then
			_where := ' WHERE ' || array_to_string(_combine_where, ' AND ', '');
		end if;
		_query_pa := 'SELECT ' || array_to_string(_attr_cols, ', ', '') ||' FROM inventory_smart.' || $1 || '_filter ' || _where;
	return _query_pa;
end $function$
;
