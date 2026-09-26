--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:assort_smart.form_attribute_table_filters runOnChange:true stripComments:false splitStatements:false context:MTP-21888 labels:liquibase_project_start
--comment: initial changeset for form_attribute_table_filters
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.form_attribute_table_filters(input text, text, jsonb);
CREATE OR REPLACE FUNCTION assort_smart.form_attribute_table_filters(input text, text, jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
 declare
 	_key text;
 	_value text;
 	_join_con text;
 	_query_pa text := '';
 	_filter text;
 	_dt text;
 	_dt_sql text;
 	_con text[];
 	_con_val text;
 	_where text;
 	_counter integer := 1;
 	_attr_cols text[] := array['pa1.' || $2]::text[];
 begin
 	for _key, _value, _join_con in select * from assort_smart.order_attributes($3, $1) loop 
 			_attr_cols := array_append(_attr_cols, _key);
 			_dt_sql := 'select coalesce(max(datatype), ''varchar'') from "assort_smart".' || $1 || '_list where attribute_name = ''' || _key || ''';';
 			execute _dt_sql into _dt;
 			_con := array['attribute_name = ''' || _key || '''']::text[];
 			for _filter in SELECT * FROM json_array_elements(_value::json) loop
 				if (_filter::json)->>'type' = 'custom' then
 					if (_filter::json)->>'values' = 'null' then
 						_con_val := ((_filter::json)->>'values');
 					else
 						_con_val := '''' || ((_filter::json)->>'values') || '''::' || _dt;
 					end if;
 					_con := array_append(_con, '(attribute_value::' || _dt || ' ' || ((_filter::json)->>'operator') || ' ' || _con_val || ')');
 				elseif (_filter::json)->>'type' = 'list' then
 					if (_filter::json)->>'operator' = 'in' then
 						if _dt = 'varchar[]' then
 							_con := array_append(_con, '(attribute_value::' || _dt || ' && ''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::' || _dt || ')');
 						else
 							_con := array_append(_con, '(attribute_value::' || _dt || ' = any(''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::' || _dt || '[]))');
 						end if;
 					else
 						if _dt = 'varchar[]' then
 							_con := array_append(_con, 'NOT(attribute_value::' || _dt || ' && ''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::' || _dt || ')');
 						else
 							_con := array_append(_con, 'NOT(attribute_value::' || _dt || ' = any(''' || replace(replace((_filter::json)->>'values', '[', '{'), ']', '}''') || '::' || _dt || '[]))');
 						end if;
 					end if;
 				elseif (_filter::json)->>'type' = 'expression' then
 					_con := array_append(_con, '(attribute_value::' || _dt || ' ' || ((_filter::json)->>'operator') || ')');
 				end if;
 			end loop;
 			_where = ARRAY_TO_STRING(_con, ' AND ', '');
 			if _counter = 1 then
 				_query_pa := _query_pa || '(select ' || $2 || ', attribute_value::' || _dt || ' as ' || _key || ' from "assort_smart".' || $1 || ' where ' || _where || ') pa' || _counter;
 			else
 				_query_pa := _query_pa || ' ' || _join_con || ' (select ' || $2 || ', attribute_value::' || _dt || ' as ' || _key || ' from "assort_smart".' || $1 || ' where ' || _where || ') pa' || _counter || ' on pa' || 1 || '.' || $2 || ' = pa' || _counter || '.' || $2;
 			end if;
 			_counter = _counter + 1;
 		end loop;
 		_query_pa := 'select ' || array_to_string(_attr_cols, ', ', '') ||' from' || _query_pa;
 	return _query_pa;
 end
 $function$
;
